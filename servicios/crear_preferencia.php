<?php
/*
Archivo: crear_preferencia.php
Ruta: servicios/crear_preferencia.php
Proyecto: Minimarket Meilanys
*/

// Silenciamos advertencias HTML automáticas de PHP para evitar corruptos en la respuesta JSON
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Captura de errores fatales en formato JSON
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'error' => 'Error crítico en el servidor PHP: ' . $error['message'],
            'linea' => $error['line'],
            'archivo' => basename($error['file'])
        ]);
    }
});

header('Content-Type: application/json; charset=utf-8');

session_start();

// 1. Verificación del archivo de configuración
$configFile = __DIR__ . '/../configuracion/mercado-pago-config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'No se encontró el archivo mercado-pago-config.php en el servidor.']);
    exit;
}

require_once $configFile;

// 2. Validación de método HTTP POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Solo se acepta POST.']);
    exit;
}

// 3. Lectura y validación del cuerpo JSON
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibieron datos JSON válidos.']);
    exit;
}

$rawItems = $input['items'] ?? [];
$payerEmail = trim($input['payerEmail'] ?? '');

if (empty($rawItems)) {
    http_response_code(400);
    echo json_encode(['error' => 'El carrito está vacío.']);
    exit;
}

if (empty($payerEmail) || !filter_var($payerEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Debes haber iniciado sesión con un correo válido para procesar el pago.']);
    exit;
}

// 4. Formateo de los ítems para la API de Mercado Pago (en PEN)
$items = [];
foreach ($rawItems as $item) {
    $items[] = [
        'title'       => (string) ($item['title'] ?? 'Producto'),
        'quantity'    => (int) ($item['quantity'] ?? 1),
        'unit_price'  => (float) ($item['unit_price'] ?? 0),
        'currency_id' => 'PEN'
    ];
}

// 5. Construcción de la preferencia
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
    'auto_return' => 'approved'
];

// 6. Solicitud a la API de Mercado Pago vía cURL
$accessToken = defined('MP_ACCESS_TOKEN') ? MP_ACCESS_TOKEN : '';

$ch = curl_init('https://api.mercadopago.com/checkout/preferences');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $accessToken
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 7. Verificación del estado de respuesta
if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code(400);
    $errorData = json_decode($response, true);
    $msg = $errorData['message'] ?? 'Error al comunicarse con Mercado Pago.';
    echo json_encode([
        'error' => 'Error de Mercado Pago: ' . $msg,
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

echo json_encode([
    'init_point' => $data['init_point']
]);
?>
