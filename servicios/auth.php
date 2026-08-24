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

    $stmt = $pdo->prepare('SELECT id, nombre, correo FROM usuarios WHERE id = ? LIMIT 1');
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
        'email' => $user['correo']
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

// Registro
if ($action === 'register') {
    $nombre = trim((string)($input['nombre'] ?? ''));
    $identifier = trim((string)($input['identifier'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $password = (string)($input['password'] ?? '');

    $correoFinal = $email !== '' ? $email : $identifier;

    if ($correoFinal === '' || $password === '') {
        respondJson(400, ['error' => 'Debes ingresar correo y contraseña.']);
    }

    // Verificar si ya existe el correo
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE correo = ? LIMIT 1');
    $stmt->execute([$correoFinal]);
    if ($stmt->fetch()) {
        respondJson(409, ['error' => 'El correo ya está registrado.']);
    }

    $displayName = $nombre !== '' ? $nombre : explode('@', $correoFinal)[0];

    // Insertar adaptado a las columnas reales de tu Supabase (nombre, correo, password)
    $insertStmt = $pdo->prepare('INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)');
    try {
        $insertStmt->execute([$displayName, $correoFinal, $password]);
    } catch (PDOException $e) {
        respondJson(500, ['error' => 'Error al registrar.', 'detalle' => $e->getMessage()]);
    }

    // Buscar el usuario recién creado
    $stmt = $pdo->prepare('SELECT id, nombre, correo FROM usuarios WHERE correo = ? LIMIT 1');
    $stmt->execute([$correoFinal]);
    $user = $stmt->fetch();

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

// Login por defecto
$identifier = trim((string)($input['identifier'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($identifier === '' || $password === '') {
    respondJson(400, ['error' => 'Debes ingresar credenciales.']);
}

// Consulta usando la columna 'correo' y 'password' tal cual está en tu Supabase
$stmt = $pdo->prepare('SELECT id, nombre, correo, password FROM usuarios WHERE correo = ? LIMIT 1');
$stmt->execute([$identifier]);
$user = $stmt->fetch();

if (!$user || $user['password'] !== $password) {
    respondJson(401, ['error' => 'Credenciales incorrectas.']);
}

$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['user_name'] = $user['nombre'];

respondJson(200, ['user' => [
    'id' => (int)$user['id'],
    'nombre' => $user['nombre'],
    'email' => $user['correo']
]]);
