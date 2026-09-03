<?php
/*
Archivo: crear_preferencia.php
Ruta: servicios/crear_preferencia.php
Proyecto: Minimarket Meilanys
Propósito: Endpoint backend para procesar el carrito y generar la preferencia en Mercado Pago.
*/

// 1. Capturar errores fatales de PHP para responder siempre en JSON válido
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'error' => 'Error interno en el servidor PHP: ' . $error['message'],
            'linea' => $error['line'],
            'archivo' => basename($error['file'])
        ]);
    }
});

header('Content-Type: application/json; charset=utf-8');
session_start();

// 2. Carga de configuración global de Mercado Pago
$configFile = __DIR__ . '/../configuracion/mercado-pago-config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'No se encontró el archivo mercado-pago-config.php en la ruta especificada.']);
    exit;
}

require_once $configFile;

// 3. Validar la existencia de la constante MP_ACCESS_TOKEN
if (!defined('MP_ACCESS_TOKEN') || empty(MP_ACCESS_TOKEN)) {
    http_response_code(500);
    echo json_encode(['error' => 'La constante MP_ACCESS_TOKEN no está definida en mercado-pago-config.php.']);
    exit;
}

// 4. Validar método HTTP POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Este endpoint requiere peticiones POST.']);
    exit;
}

// 5. Leer y procesar datos enviados desde el Frontend
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibieron datos JSON válidos desde el carrito.']);
    exit;
}

$rawItems   = $input['items'] ?? [];
$payerEmail = trim($input['payerEmail'] ?? '');
$externalReference = trim((string)($input['externalReference'] ?? ''));

if (empty($rawItems)) {
    http_response_code(400);
    echo json_encode(['error' => 'El carrito se encuentra vacío.']);
    exit;
}

if (empty($payerEmail) || !filter_var($payerEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Se requiere un correo electrónico válido para procesar el pago.']);
    exit;
}

// 6. Formatear ítems en Soles Peruanos (PEN)
$items = [];
foreach ($rawItems as $item) {
    $items[] = [
        'title'       => (string) ($item['title'] ?? 'Producto'),
        'quantity'    => (int) ($item['quantity'] ?? 1),
        'unit_price'  => (float) ($item['unit_price'] ?? 0),
        'currency_id' => 'PEN'
    ];
}

// 7. Construcción de la preferencia
$payload = [
    'items' => $items,
    'payer' => [
        'email' => $payerEmail
    ],
    'back_urls' => [
        'success' => defined('MP_SUCCESS_URL') ? MP_SUCCESS_URL : '',
        'failure' => defined('MP_FAILURE_URL') ? MP_FAILURE_URL : '',
        'pending' => defined('MP_PENDING_URL') ? MP_PENDING_URL : ''
    ],
    'auto_return' => 'approved',
    'external_reference' => $externalReference
];

// 8. Petición cURL a la API de Mercado Pago
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

// 9. Manejo de respuesta HTTP
if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code(400);
    $errorData = json_decode($response, true);
    $mensaje = $errorData['message'] ?? 'Error desconocido al comunicar con Mercado Pago';
    echo json_encode([
        'error' => 'Error de Mercado Pago: ' . $mensaje,
        'detalle_completo' => $errorData
    ]);
    exit;
}

$data = json_decode($response, true);

if (empty($data['init_point'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Mercado Pago no devolvió el enlace de pago (init_point).']);
    exit;
}

$_SESSION['checkout_started'] = true;

// 10. Devolver URL de redirección al cliente
echo json_encode([
    'init_point' => $data['init_point']
]);
