<?php
session_start();
require __DIR__ . '/db.php';

header('Content-Type: application/json');

function respondJson($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function normalizeEmail($value) {
    return strtolower(trim((string)$value));
}

function userExistsByEmail($pdo, $email) {
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(?) LIMIT 1');
    $stmt->execute([$email]);
    return (bool) $stmt->fetch();
}

function resolveUserRecord($pdo, $identifier) {
    $stmt = $pdo->prepare('SELECT id, nombre, correo, password FROM usuarios WHERE LOWER(correo) = LOWER(?) OR LOWER(nombre) = LOWER(?) LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    return $stmt->fetch();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['user_id'])) {
        respondJson(200, ['user' => null]);
    }

    $stmt = $pdo->prepare('SELECT id, nombre, correo FROM usuarios WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        session_unset();
        session_destroy();
        respondJson(200, ['user' => null]);
    }

    $email = $user['correo'];
    respondJson(200, ['user' => [
        'id' => (int)$user['id'],
        'nombre' => $user['nombre'],
        'email' => $email
    ]]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondJson(405, ['error' => 'Método no permitido.']);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = isset($input['action']) ? strtolower((string)$input['action']) : 'login';

if ($action === 'logout') {
    session_unset();
    session_destroy();
    respondJson(200, ['ok' => true]);
}

if ($action === 'update_profile') {
    if (empty($_SESSION['user_id'])) {
        respondJson(401, ['error' => 'Debes iniciar sesión.']);
    }

    $nombre = trim((string)($input['nombre'] ?? ''));
    $email = normalizeEmail($input['email'] ?? '');
    if ($nombre === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respondJson(400, ['error' => 'Ingresa un nombre y un correo válidos.']);
    }

    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(?) AND id <> ? LIMIT 1');
    $stmt->execute([$email, $_SESSION['user_id']]);
    if ($stmt->fetch()) {
        respondJson(409, ['error' => 'El correo ya está registrado.']);
    }

    $stmt = $pdo->prepare('UPDATE usuarios SET nombre = ?, correo = ? WHERE id = ?');
    $stmt->execute([$nombre, $email, $_SESSION['user_id']]);
    $_SESSION['user_name'] = $nombre;

    respondJson(200, ['user' => [
        'id' => (int)$_SESSION['user_id'],
        'nombre' => $nombre,
        'email' => $email
    ]]);
}

if ($action === 'register') {
    $nombre = trim((string)($input['nombre'] ?? ''));
    $email = normalizeEmail($input['email'] ?? ($input['identifier'] ?? ''));
    $password = (string)($input['password'] ?? '');

    if ($email === '' || $password === '') {
        respondJson(400, ['error' => 'Debes ingresar correo y contraseña.']);
    }

    if (userExistsByEmail($pdo, $email)) {
        respondJson(409, ['error' => 'El correo ya está registrado.']);
    }

    $displayName = $nombre !== '' ? $nombre : explode('@', $email)[0];
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    try {
        $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)');
        $stmt->execute([$displayName, $email, $passwordHash]);
    } catch (PDOException $e) {
        error_log('Error al registrar usuario: ' . $e->getMessage());
        respondJson(500, ['error' => 'Error al registrar.']);
    }

    $user = resolveUserRecord($pdo, $email);
    if (!$user) {
        respondJson(500, ['error' => 'No se pudo crear el usuario.']);
    }

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['user_name'] = $user['nombre'];

    respondJson(201, ['user' => [
        'id' => (int)$user['id'],
        'nombre' => $user['nombre'],
        'email' => $user['correo']
    ]]);
}

$identifier = trim((string)($input['identifier'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($identifier === '' || $password === '') {
    respondJson(400, ['error' => 'Debes ingresar credenciales.']);
}

$user = resolveUserRecord($pdo, $identifier);
$storedPassword = (string)($user['password'] ?? '');
$passwordMatches = $user && (
    password_verify($password, $storedPassword) ||
    hash_equals($storedPassword, $password)
);

if (!$user || !$passwordMatches) {
    respondJson(401, ['error' => 'Credenciales incorrectas.']);
}

// Migra contraseñas antiguas en texto plano después de un acceso válido.
if ($user && !password_get_info($storedPassword)['algo']) {
    $newPasswordHash = password_hash($password, PASSWORD_BCRYPT);
    $updatePassword = $pdo->prepare('UPDATE usuarios SET password = ? WHERE id = ?');
    $updatePassword->execute([$newPasswordHash, $user['id']]);
}

$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['user_name'] = $user['nombre'];

respondJson(200, ['user' => [
    'id' => (int)$user['id'],
    'nombre' => $user['nombre'],
    'email' => $user['correo']
]]);
