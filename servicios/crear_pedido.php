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
        "SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = ?
         ORDER BY ordinal_position"
    );
    $stmt->execute([$table]);
    $columns = [];
    foreach ($stmt->fetchAll() as $row) {
        $columns[$row['column_name']] = $row['data_type'];
    }
    return $columns;
}

function requiredColumn(array $columns, array $candidates, $table) {
    foreach ($candidates as $candidate) {
        if (array_key_exists($candidate, $columns)) {
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
    $detailOrderType = $detailColumns[$detailOrderColumn] ?? '';
    $usesNumericOrderReference = in_array($detailOrderType, [
        'smallint', 'integer', 'bigint'
    ], true);
    if ($usesNumericOrderReference && array_key_exists('id', $orderColumns)) {
        $parent = $pdo->prepare("SELECT id FROM pedidos WHERE {$orderIdColumn} = ? LIMIT 1");
        $parent->execute([$orderId]);
        $parentId = $parent->fetchColumn();
        if ($parentId === false) {
            throw new RuntimeException('No se pudo identificar el pedido creado.');
        }
        $detailOrderValue = (int)$parentId;
    }

    $detailSubtotalColumn = null;
    foreach (['subtotal', 'total', 'importe'] as $candidate) {
        if (array_key_exists($candidate, $detailColumns)) {
            $detailSubtotalColumn = $candidate;
            break;
        }
    }

    $detailColumnsToInsert = [
        $detailOrderColumn,
        $detailProductColumn,
        $detailQuantityColumn,
        $detailPriceColumn
    ];
    if ($detailSubtotalColumn !== null) {
        $detailColumnsToInsert[] = $detailSubtotalColumn;
