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
