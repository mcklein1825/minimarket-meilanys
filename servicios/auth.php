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

function getUserEmailColumn($pdo) {
    $columns = ['email', 'correo'];
    foreach ($columns as $column) {
        try {
            $stmt = $pdo->query('SELECT 1 FROM usuarios LIMIT 1');
            $stmt = $pdo->query('SELECT ' . $column . ' FROM usuarios LIMIT 1');
            return $column;
        } catch (PDOException $e) {
            continue;
        }
    }
    return 'email';
}

function userExistsByEmail($pdo, $email) {
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE LOWER(COALESCE(email, correo)) = LOWER(?) LIMIT 1');
    $stmt->execute([$email]);
    return (bool) $stmt->fetch();
}

function resolveUserRecord($pdo, $email) {
    $stmt = $pdo->prepare('SELECT id, nombre, email, correo, password FROM usuarios WHERE LOWER(COALESCE(email, correo)) = LOWER(?) LIMIT 1');
    $stmt->execute([$email]);
    return $stmt->fetch();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['user_id'])) {
        respondJson(200, ['user' => null]);
    }

    $stmt = $pdo->prepare('SELECT id, nombre, email, correo FROM usuarios WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        session_unset();
        session_destroy();
        respondJson(200, ['user' => null]);
    }

    $email = $user['email'] ?? $user['correo'] ?? null;
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
    $username = preg_replace('/[^a-zA-Z0-9._-]+/', '', strtolower(str_replace(' ', '.', $displayName))) ?: 'usuario';
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    try {
        $hasEmail = false;
        $hasCorreo = false;
        foreach (['email', 'correo'] as $column) {
            try {
                $pdo->query('SELECT ' . $column . ' FROM usuarios LIMIT 1');
                if ($column === 'email') {
                    $hasEmail = true;
                } else {
                    $hasCorreo = true;
                }
            } catch (PDOException $e) {
            }
        }

        if ($hasEmail) {
            $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, username, email, password) VALUES (?, ?, ?, ?)');
            $stmt->execute([$displayName, $username, $email, $passwordHash]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, username, correo, password) VALUES (?, ?, ?, ?)');
            $stmt->execute([$displayName, $username, $email, $passwordHash]);
        }
    } catch (PDOException $e) {
        respondJson(500, ['error' => 'Error al registrar.', 'detalle' => $e->getMessage()]);
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
        'email' => $user['email'] ?? $user['correo']
    ]]);
}

$identifier = normalizeEmail($input['identifier'] ?? '');
$password = (string)($input['password'] ?? '');

if ($identifier === '' || $password === '') {
    respondJson(400, ['error' => 'Debes ingresar credenciales.']);
}

$user = resolveUserRecord($pdo, $identifier);
$passwordMatches = $user && isset($user['password']) && (
    password_verify($password, $user['password']) || hash_equals((string)$user['password'], $password)
);

if (!$user || !$passwordMatches) {
    respondJson(401, ['error' => 'Credenciales incorrectas.']);
}

$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['user_name'] = $user['nombre'];

respondJson(200, ['user' => [
    'id' => (int)$user['id'],
    'nombre' => $user['nombre'],
    'email' => $user['email'] ?? $user['correo']
]]);
