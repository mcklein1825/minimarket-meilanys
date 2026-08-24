<?php
$baseUrl = getenv('APP_BASE_URL') ?: getenv('RENDER_EXTERNAL_URL') ?: getenv('BASE_URL') ?: 'https://tu-app.onrender.com';
$baseUrl = rtrim($baseUrl, '/');

$accessToken = getenv('MP_ACCESS_TOKEN') ?: 'TEST-4181627865895635-082111-1b683d82281659e956da68ecaacc9bee-2991320569';
$publicKey = getenv('MP_PUBLIC_KEY') ?: 'TEST-b38652c0-cb7-5e3a-adbb-c5a93a8a059c';

if (stripos($baseUrl, 'localhost') !== false || stripos($baseUrl, '127.0.0.1') !== false) {
    $baseUrl = 'https://tu-app.onrender.com';
}

define('MP_ACCESS_TOKEN', $accessToken);
define('MP_PUBLIC_KEY', $publicKey);
define('MP_BASE_URL', $baseUrl);
define('MP_SUCCESS_URL', MP_BASE_URL . '/publico/paginas/pago-exitoso.php');
define('MP_FAILURE_URL', MP_BASE_URL . '/publico/paginas/pago-fallido.php');
define('MP_PENDING_URL', MP_BASE_URL . '/publico/paginas/pago-pendiente.php');
