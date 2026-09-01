<?php
/*
Archivo: mercado-pago-config.php
Ruta: configuracion/mercado-pago-config.php
Proyecto: Minimarket Meilanys
Propósito: Definición segura de credenciales y rutas para Mercado Pago.
*/

ini_set('display_errors', '0');
error_reporting(E_ALL);

$token = getenv('MP_ACCESS_TOKEN');
if (is_string($token)) {
    $token = trim($token);
} else {
    $token = '';
}

define('MP_ACCESS_TOKEN', $token);

$baseUrl = getenv('APP_BASE_URL');
if (empty($baseUrl)) {
    $baseUrl = (!empty($_SERVER['HTTPS']) ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}
$baseUrl = rtrim($baseUrl, '/');

if ($baseUrl === '') {
    $baseUrl = 'http://localhost';
}

define('APP_BASE_URL', $baseUrl);
define('MP_SUCCESS_URL', APP_BASE_URL . '/publico/paginas/pago-exitoso.php?status=approved');
define('MP_FAILURE_URL', APP_BASE_URL . '/publico/paginas/pago-fallido.php?status=failed');
define('MP_PENDING_URL', APP_BASE_URL . '/publico/paginas/pago-pendiente.php?status=pending');
