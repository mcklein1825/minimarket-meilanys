<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

function inventoryResponse($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$role = $_SESSION['user_role'] ?? '';
if (!in_array($role, ['dueno', 'encargado', 'trabajador'], true)) {
    inventoryResponse(403, ['error' => 'No tienes permisos para acceder al inventario.']);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $query = $pdo->query(
            'SELECT i.producto_id, p.nombre, p.categoria, i.stock, i.stock_minimo, i.actualizado_en
             FROM inventario i INNER JOIN productos p ON p.id = i.producto_id
             ORDER BY p.nombre'
        );
        inventoryResponse(200, ['inventario' => $query->fetchAll()]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        inventoryResponse(405, ['error' => 'Método no permitido.']);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $productId = (int)($input['producto_id'] ?? 0);
    $stock = (int)($input['stock'] ?? -1);
    $minimum = (int)($input['stock_minimo'] ?? 0);
    if ($productId <= 0 || $stock < 0 || $minimum < 0) {
        inventoryResponse(400, ['error' => 'Datos de inventario inválidos.']);
    }
    $stmt = $pdo->prepare(
        'INSERT INTO inventario (producto_id, stock, stock_minimo, actualizado_en)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (producto_id) DO UPDATE SET stock = EXCLUDED.stock,
         stock_minimo = EXCLUDED.stock_minimo, actualizado_en = CURRENT_TIMESTAMP'
    );
    $stmt->execute([$productId, $stock, $minimum]);
    inventoryResponse(200, ['ok' => true]);
} catch (Throwable $error) {
    error_log('Error en inventario: ' . $error->getMessage());
    inventoryResponse(500, ['error' => 'No se pudo consultar el inventario.']);
}
