<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

if (empty($_SESSION['user_id'])) {
    echo json_encode(['pedidos' => []]);
    exit;
}

try {
    $orders = $pdo->prepare(
        'SELECT p.id_pedido, p.fecha, p.total, p.estado,
                d.producto_id, d.nombre_producto, d.cantidad, d.precio_unitario, d.subtotal
         FROM pedidos p
         LEFT JOIN detalle_pedidos d ON d.pedido_id = p.id
         WHERE p.usuario_id = ?
         ORDER BY p.fecha DESC, p.id DESC'
    );
    $orders->execute([(int)$_SESSION['user_id']]);

    $history = [];
    foreach ($orders->fetchAll() as $row) {
        $id = (string)$row['id_pedido'];
        if (!isset($history[$id])) {
            $history[$id] = [
                'id' => $id,
                'date' => $row['fecha'],
                'total' => (float)$row['total'],
                'status' => $row['estado'],
                'items' => []
            ];
        }
        if ($row['producto_id'] !== null) {
            $history[$id]['items'][] = [
                'name' => $row['nombre_producto'],
                'qty' => (int)$row['cantidad'],
                'price' => (float)$row['precio_unitario'],
                'subtotal' => (float)$row['subtotal']
            ];
        }
    }

    echo json_encode(['pedidos' => array_values($history)], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('Error al consultar historial: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo cargar el historial.']);
}
