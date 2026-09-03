<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode(['error' => 'Error interno al guardar el pedido.']);
    }
});

function respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function tableColumns($pdo, $table) {
    $stmt = $pdo->prepare(
        "SELECT column_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = ?"
    );
    $stmt->execute([$table]);
    return array_map(static function ($row) {
        return $row['column_name'];
    }, $stmt->fetchAll());
}

function requiredColumn(array $columns, array $candidates, $table) {
    foreach ($candidates as $candidate) {
        if (in_array($candidate, $columns, true)) {
            return $candidate;
        }
    }
    throw new RuntimeException("La tabla {$table} no tiene la columna requerida.");
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
    $orderColumns = tableColumns($pdo, 'pedidos');
    $detailColumns = tableColumns($pdo, 'detalle_pedidos');
    $orderIdColumn = requiredColumn($orderColumns, ['id_pedido', 'pedido_id'], 'pedidos');
    $userColumn = requiredColumn($orderColumns, ['usuario_id', 'user_id'], 'pedidos');
    $dateColumn = requiredColumn($orderColumns, ['fecha', 'created_at'], 'pedidos');
    $totalColumn = requiredColumn($orderColumns, ['total', 'monto'], 'pedidos');
    $statusColumn = requiredColumn($orderColumns, ['estado', 'status'], 'pedidos');
    $paymentColumn = requiredColumn($orderColumns, ['metodo_pago', 'metodo'], 'pedidos');
    $detailOrderColumn = requiredColumn($detailColumns, ['id_pedido', 'pedido_id'], 'detalle_pedidos');
    $detailProductColumn = requiredColumn($detailColumns, ['producto_id', 'id_producto', 'product_id'], 'detalle_pedidos');
    $detailQuantityColumn = requiredColumn($detailColumns, ['cantidad', 'quantity'], 'detalle_pedidos');
    $detailPriceColumn = requiredColumn($detailColumns, ['precio_unitario', 'precio', 'unit_price'], 'detalle_pedidos');

    $pdo->beginTransaction();

    $order = $pdo->prepare(
        "INSERT INTO pedidos ({$orderIdColumn}, {$userColumn}, {$dateColumn}, {$totalColumn}, {$statusColumn}, {$paymentColumn})
         VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)"
    );
    $order->execute([$orderId, (int)$_SESSION['user_id'], $total, 'pendiente', $paymentMethod]);

    $detailOrderValue = $orderId;
    if ($detailOrderColumn === 'pedido_id' && in_array('id', $orderColumns, true)) {
        $parent = $pdo->prepare("SELECT id FROM pedidos WHERE {$orderIdColumn} = ? LIMIT 1");
        $parent->execute([$orderId]);
        $parentId = $parent->fetchColumn();
        if ($parentId === false) {
            throw new RuntimeException('No se pudo identificar el pedido creado.');
        }
        $detailOrderValue = (int)$parentId;
    }

    $detail = $pdo->prepare(
        "INSERT INTO detalle_pedidos ({$detailOrderColumn}, {$detailProductColumn}, {$detailQuantityColumn}, {$detailPriceColumn})
         VALUES (?, ?, ?, ?)"
    );
    foreach ($items as $item) {
        $productId = (int)($item['product_id'] ?? 0);
        $quantity = (int)($item['quantity'] ?? 0);
        $unitPrice = (float)($item['unit_price'] ?? 0);
        if ($productId <= 0 || $quantity <= 0 || $unitPrice < 0) {
            throw new InvalidArgumentException('Un producto del pedido no es válido.');
        }
        $detail->execute([$detailOrderValue, $productId, $quantity, $unitPrice]);
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
