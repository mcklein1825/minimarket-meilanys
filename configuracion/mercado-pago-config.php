<?php
// 1. Obtenemos la URL base estrictamente desde el entorno (Render o tu .env local)
$baseUrl = getenv('APP_BASE_URL') ?: getenv('RENDER_EXTERNAL_URL') ?: getenv('BASE_URL');

if (!$baseUrl) {
    die(json_encode(['error' => 'Falta configurar la URL base (APP_BASE_URL o RENDER_EXTERNAL_URL) en el entorno.']));
}
$baseUrl = rtrim($baseUrl, '/');

// 2. Obtenemos las credenciales SOLO desde las variables de entorno, sin "fallbacks"
$accessToken = getenv('MP_ACCESS_TOKEN');
$publicKey = getenv('MP_PUBLIC_KEY');

// Bloqueamos la ejecución si faltan las credenciales para evitar fugas o cobros en cuentas equivocadas
if (!$accessToken || !$publicKey) {
    die(json_encode(['error' => 'Faltan configurar las credenciales de Mercado Pago en el entorno.']));
}

// 3. Definimos las constantes globales
define('MP_ACCESS_TOKEN', $accessToken);
define('MP_PUBLIC_KEY', $publicKey);
define('MP_BASE_URL', $baseUrl);

// 4. Armamos las URLs de retorno dinámicamente
define('MP_SUCCESS_URL', MP_BASE_URL . '/publico/paginas/pago-exitoso.php');
define('MP_FAILURE_URL', MP_BASE_URL . '/publico/paginas/pago-fallido.php');
define('MP_PENDING_URL', MP_BASE_URL . '/publico/paginas/pago-pendiente.php');
?>
