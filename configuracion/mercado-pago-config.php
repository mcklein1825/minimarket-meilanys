<?php
/*
Archivo: crear_preferencia.php
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\servicios\crear_preferencia.php
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
*/

session_start();
require_once __DIR__ . '/../configuracion/mercado-pago-config.php';

header('Content-Type: application/json');

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

// 3) Verificamos los ítems y validamos el correo enviado desde el Frontend
$rawItems = $input['items'] ?? [];
$payerEmail = trim($input['payerEmail'] ?? '');

if (empty($rawItems)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'El carrito está vacío.'
    ]);
    exit;
}

if (empty($payerEmail) || !filter_var($payerEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Debes iniciar sesión con un correo válido para procesar el pago.'
    ]);
    exit;
}

// 4) Preparamos y limpiamos los ítems en Soles Peruanos (PEN)
$items = [];
foreach ($rawItems as $item) {
    $items[] = [
        'title'       => (string) ($item['title'] ?? 'Producto'),
        'quantity'    => (int) ($item['quantity'] ?? 1),
        'unit_price'  => (float) ($item['unit_price'] ?? 0),
        'currency_id' => 'PEN'
    ];
}

// 5) Preparamos el payload para Mercado Pago
$payload = [
    'items' => $items,
    'payer' => [
        'email' => $payerEmail
    ],
    'back_urls' => [
        'success' => defined('MP_SUCCESS_URL') ? MP_SUCCESS_URL : 'http://localhost/',
        'failure' => defined('MP_FAILURE_URL') ? MP_FAILURE_URL : 'http://localhost/',
        'pending' => defined('MP_PENDING_URL') ? MP_PENDING_URL : 'http://localhost/'
    ],
    'auto_return' => 'approved'
];

// 6) Llamamos a la API de Mercado Pago usando el Access Token de la configuración
$ch = curl_init('https://api.mercadopago.com/checkout/preferences');

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . MP_ACCESS_TOKEN
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 7) Manejo de respuestas y errores
if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code(400);
    $errorData = json_decode($response, true);
    
    $mensajeReal = isset($errorData['message']) ? $errorData['message'] : 'Error al comunicar con Mercado Pago';
    
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

// 8) Enviamos la URL de pago al frontend
$_SESSION['checkout_started'] = true;

echo json_encode([
    'init_point' => $data['init_point']
]);
?>
