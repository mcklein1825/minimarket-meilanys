<?php
/*
Archivo: crear_preferencia.php
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\crear_preferencia.php
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Autor: Yo, como responsable del desarrollo, creo y mantengo este archivo.
Propósito: recibir el carrito del frontend y generar la preferencia de pago para Mercado Pago.
Tecnologías: PHP, cURL, JSON, integración con Mercado Pago.
Dependencias: mercado-pago-config.php, index.html, script.js.
Estado: activo y listo para crear pagos.
*/
// ================================================================
// crear_preferencia.php
// ================================================================
// Este archivo recibe la información del carrito desde el frontend y
// crea una preferencia de pago en Mercado Pago usando el Access Token.
//
// Importante:
// - La Public Key va en el frontend.
// - El Access Token va SOLO aquí, en el servidor.
// - El navegador nunca debe ver el Access Token.
// - Mercado Pago no acepta localhost como back_url. Requiere una URL pública HTTPS.
// ================================================================

session_start();
require __DIR__ . '/../configuracion/mercado-pago-config.php';

header('Content-Type: application/json');

if (empty($_SESSION['user_id'])) {
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
        'error' => 'Este endpoint solo acepta peticiones POST.',
        'hint' => 'Abre la página principal y haz clic en pagar. No abras este archivo directamente en el navegador.'
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

// 4) Validamos que la URL de retorno sea pública y no localhost
$baseUrl = MP_BASE_URL;
if (stripos($baseUrl, 'localhost') !== false || stripos($baseUrl, '127.0.0.1') !== false || !preg_match('#^https://#i', $baseUrl)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Mercado Pago requiere una URL pública HTTPS en back_urls.',
        'hint' => 'Usa ngrok o un dominio real. Por ejemplo: https://tu-nombre.ngrok-free.app/Empresa/Paginaweb_v1',
        'config' => [
            'MP_BASE_URL' => $baseUrl
        ]
    ]);
    exit;
}

// 5) Preparamos el payload que Mercado Pago espera
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

// 6) Llamamos a la API de Mercado Pago
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

if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Mercado Pago rechazó la preferencia.',
        'detalle' => json_decode($response, true),
        'hint' => 'Revisa que la URL de retorno sea pública y HTTPS. Si estás usando localhost, debes usar ngrok.'
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

// 7) Enviamos la URL de pago al frontend y marcamos la sesión para validar el flujo del pago
$_SESSION['checkout_started'] = true;

echo json_encode([
    'init_point' => $data['init_point']
]);
?>
