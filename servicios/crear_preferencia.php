<?php
/*
Archivo: crear_preferencia.php
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\crear_preferencia.php
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
*/

session_start();
require __DIR__ . '/../configuracion/mercado-pago-config.php';

header('Content-Type: application/json');

if (empty($_SESSION['user_id']) && empty($_SESSION['usuario'])) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Debes iniciar sesión antes de pagar.'
    ]);
    exit;
}

// 1) Solo aceptamos peticiones POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'error' => 'Este endpoint solo acepta peticiones POST.'
    ]);
    exit;
}

// 2) Leemos el JSON que viene desde JavaScript
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode([
        'error' => 'No se recibió información del carrito.'
    ]);
    exit;
}

// 3) Verificamos que el carrito no esté vacío
$items = $input['items'] ?? [];
$payerEmail = $input['payerEmail'] ?? 'cliente@ejemplo.com';

if (empty($items)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'El carrito está vacío.'
    ]);
    exit;
}

// 4) Preparamos el payload que Mercado Pago espera
$payload = [
    'items' => $items,
    'payer' => [
        'email' => $payerEmail
    ],
    'back_urls' => [
        'success' => MP_SUCCESS_URL,
        'failure' => MP_FAILURE_URL,
        'pending' => MP_PENDING_URL
    ],
    'auto_return' => 'approved'
];

// 5) Llamamos a la API de Mercado Pago
$ch = curl_init('https://api.mercadopago.com/checkout/preferences');

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . MP_ACCESS_TOKEN
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 6) Manejo de errores REALES de Mercado Pago
if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code(400);
    $errorData = json_decode($response, true);
    
    // Extraemos el mensaje real de Mercado Pago
    $mensajeReal = isset($errorData['message']) ? $errorData['message'] : 'Error desconocido';
    
    echo json_encode([
        'error' => 'Error de Mercado Pago: ' . $mensajeReal,
        'detalle_completo' => $errorData
    ]);
    exit;
}

$data = json_decode($response, true);

if (empty($data['init_point'])) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Mercado Pago no devolvió la URL de pago.',
        'detalle' => $data
    ]);
    exit;
}

// 7) Enviamos la URL de pago al frontend
$_SESSION['checkout_started'] = true;

echo json_encode([
    'init_point' => $data['init_point']
]);
?>
