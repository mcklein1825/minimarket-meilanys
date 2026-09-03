<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

function respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Método no permitido.']);
}

if (empty($_SESSION['user_id'])) {
    respond(401, ['error' => 'Debes iniciar sesión para crear un pedido.']);
}

$input = json_decode(file_get_contents('php://input'), true);
$items = $input['items'] ?? [];
$total = (float)($input['total'] ?? 0);
$paymentMethod = trim((string)($input['metodo_pago'] ?? 'mercado_pago'));
$orderId = trim((string)($input['id_pedido'] ?? ''));

if ($orderId === '' || !is_array($items) || count($items) === 0 || $total <= 0) {
    respond(400, ['error' => 'Los datos del pedido están incompletos.']);
}

try {
    $pdo->beginTransaction();

    $order = $pdo->prepare(
        'INSERT INTO pedidos (id_pedido, usuario_id, fecha, total, estado, metodo_pago)
         VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)'
    );
    $order->execute([$orderId, (int)$_SESSION['user_id'], $total, 'pendiente', $paymentMethod]);

    $detail = $pdo->prepare(
        'INSERT INTO detalle_pedidos (id_pedido, producto_id, cantidad, precio_unitario)
         VALUES (?, ?, ?, ?)'
    );
    foreach ($items as $item) {
        $productId = (int)($item['product_id'] ?? 0);
        $quantity = (int)($item['quantity'] ?? 0);
        $unitPrice = (float)($item['unit_price'] ?? 0);
        if ($productId <= 0 || $quantity <= 0 || $unitPrice < 0) {
            throw new InvalidArgumentException('Un producto del pedido no es válido.');
        }
        $detail->execute([$orderId, $productId, $quantity, $unitPrice]);
    }

    $pdo->commit();
    respond(201, ['ok' => true, 'id_pedido' => $orderId]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Error al crear pedido: ' . $error->getMessage());
    respond(500, ['error' => 'No se pudo guardar el pedido.']);
}
