<?php
/*
Archivo: mercado-pago-config.php
Ruta: configuracion/mercado-pago-config.php
Proyecto: Minimarket Meilanys
Propósito: Definición de credenciales y rutas para la integración con Mercado Pago.
*/

// Ocultar la salida de errores directos en HTML para no corruptar las respuestas JSON
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Lee la variable de entorno de Render o usa el token local/prueba entre comillas
$token = getenv('MP_ACCESS_TOKEN') ?: 'TEST-4181627865895635-082111-1b683d82281659e956da68ecaacc9bee-2991320569';
define('MP_ACCESS_TOKEN', $token);

// URLs de retorno para redirección del cliente tras la compra
define('MP_SUCCESS_URL', 'https://minimarket-meilanys.onrender.com/publico/index.html?status=success');
define('MP_FAILURE_URL', 'https://minimarket-meilanys.onrender.com/publico/index.html?status=failure');
define('MP_PENDING_URL', 'https://minimarket-meilanys.onrender.com/publico/index.html?status=pending');
