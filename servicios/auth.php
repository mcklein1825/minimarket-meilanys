<?php
session_start();
require __DIR__ . '/db.php';

header('Content-Type: application/json');

function respondJson($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['user_id'])) {
        respondJson(200, ['user' => null]);
    }

    $stmt = $pdo->prepare('SELECT id, nombre, username, email FROM usuarios WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        session_unset();
        session_destroy();
        respondJson(200, ['user' => null]);
    }

    respondJson(200, ['user' => [
        'id' => (int)$user['id'],
        'nombre' => $user['nombre'],
        'username' => $user['username'],
        'email' => $user['email']
    ]]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondJson(405, ['error' => 'Método no permitido.']);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? 'login';

if ($action === 'logout') {
    session_unset();
    session_destroy();
    respondJson(200, ['ok' => true]);
}

// Registration flow
if ($action === 'register') {
    $nombre = trim((string)($input['nombre'] ?? ''));
    $identifier = trim((string)($input['identifier'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $password = (string)($input['password'] ?? '');

    if ($identifier === '' || $password === '') {
        respondJson(400, ['error' => 'Debes ingresar usuario y contraseña.']);
    }

    // Normalize email if provided; default to empty string to satisfy NOT NULL columns
    $email = $email ?: (filter_var($identifier, FILTER_VALIDATE_EMAIL) ? $identifier : '');

    // Check if username or email already exists
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE username = ? OR email = ? LIMIT 1');
    $stmt->execute([$identifier, $email]);
    $existing = $stmt->fetch();
    if ($existing) {
        respondJson(409, ['error' => 'Usuario o email ya registrado.']);
    }

    // Hash password and insert
    $hash = password_hash($password, PASSWORD_BCRYPT);

    // derive a display name if none provided
    $displayName = $nombre ?: (strpos($identifier, '@') !== false ? strstr($identifier, '@', true) : $identifier);

    // Insert the new user (Postgres supports RETURNING, MySQL doesn't). To keep it compatible, insert then fetch by username.
    $insertStmt = $pdo->prepare('INSERT INTO usuarios (nombre, username, email, password) VALUES (?, ?, ?, ?)');
    try {
        $pdo->beginTransaction();
        $insertStmt->execute([$displayName, $identifier, $email, $hash]);
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        respondJson(500, ['error' => 'Error al insertar el usuario.', 'detalle' => $e->getMessage()]);
    }

    // Fetch the created user by username
    $stmt = $pdo->prepare('SELECT id, nombre, username, email FROM usuarios WHERE username = ? LIMIT 1');
    $stmt->execute([$identifier]);
    $user = $stmt->fetch();

    if (!$user) {
        respondJson(500, ['error' => 'No se pudo crear el usuario.']);
    }

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['user_name'] = $user['nombre'];

    respondJson(201, ['user' => [
        'id' => (int)$user['id'],
        'nombre' => $user['nombre'],
        'username' => $user['username'],
        'email' => $user['email']
    ]]);
}

// Default: login flow
$identifier = trim((string)($input['identifier'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($identifier === '' || $password === '') {
    respondJson(400, ['error' => 'Debes ingresar usuario y contraseña.']);
}

$stmt = $pdo->prepare('SELECT id, nombre, username, email, password FROM usuarios WHERE username = ? OR email = ? LIMIT 1');
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();

if (!$user) {
    respondJson(401, ['error' => 'Credenciales incorrectas.']);
}

$validPassword = password_verify($password, $user['password']) || $user['password'] === $password;

if (!$validPassword) {
    respondJson(401, ['error' => 'Credenciales incorrectas.']);
}

$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['user_name'] = $user['nombre'];

respondJson(200, ['user' => [
    'id' => (int)$user['id'],
    'nombre' => $user['nombre'],
    'username' => $user['username'],
    'email' => $user['email']
]]);
