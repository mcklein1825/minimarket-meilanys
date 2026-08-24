<?php
session_start();
if (empty($_SESSION['checkout_started'])) {
    header('Location: ../index.html');
    exit;
}

/*
Archivo: pago-exitoso.php
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\pago-exitoso.php
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Autor: Yo, como responsable del desarrollo, creo y mantengo este archivo.
Propósito: mostrar el resultado de un pago aprobado y verificar el estado de la transacción con Mercado Pago.
Tecnologías: PHP, HTML, cURL, API de pagos.
Dependencias: mercado-pago-config.php.
Estado: activo.
*/
// Pago exitoso: muestra información y verifica el pago con Mercado Pago
require __DIR__ . '/../../configuracion/mercado-pago-config.php';

// Comentarios:
// - Mercado Pago redirige al usuario con parámetros GET como collection_id, payment_id, status, preference_id.
// - Aquí intentamos leer payment_id o collection_id y verificar el pago usando la API de Mercado Pago.
// - El Access Token se carga desde mercado-pago-config.php (MP_ACCESS_TOKEN).

function api_get($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . MP_ACCESS_TOKEN,
            'Content-Type: application/json'
        ]
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, $res];
}

// Obtenemos parámetros
$payment_id = $_GET['payment_id'] ?? $_GET['collection_id'] ?? null;
$collection_status = $_GET['collection_status'] ?? $_GET['status'] ?? null;

// Si no hay payment_id ni collection_id, mostramos un mensaje amigable
if (!$payment_id) {
    ?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago recibido</title>
    <style>
        body { font-family: Arial, sans-serif; background:#f4f6f8; display:grid; place-items:center; min-height:100vh; margin:0 }
        .card { background:white; padding:28px 36px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.08); text-align:center; max-width:640px }
        a{ display:inline-block; margin-top:18px; padding:10px 16px; background:#2d7ff9;color:#fff;border-radius:8px; text-decoration:none }
    </style>
</head>
<body>
    <div class="card">
        <h1>Pago recibido</h1>
        <p>No se recibió un identificador de pago en la URL.</p>
        <p>Si acabas de completar el pago, intenta abrir esta página desde el enlace de Mercado Pago nuevamente o revisa el historial de pedidos en tu cuenta.</p>
        <a href="../index.html">Volver al inicio</a>
    </div>
</body>
</html><?php
    exit;
}

// Si tenemos un payment_id, consultamos la API de pagos para verificar el estado
list($code, $response) = api_get('https://api.mercadopago.com/v1/payments/' . urlencode($payment_id));
$data = json_decode($response, true);

// Construimos la vista con la información del pago
$status = $data['status'] ?? $collection_status ?? 'unknown';
$status_detail = $data['status_detail'] ?? '';
$amount = $data['transaction_amount'] ?? ($data['transaction_amount'] ?? 0);
$method = $data['payment_method_id'] ?? '';
$payer_email = $data['payer']['email'] ?? '';

unset($_SESSION['checkout_started']);

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultado del pago</title>
    <style>
        body { font-family: Arial, sans-serif; background:#f4f6f8; display:grid; place-items:center; min-height:100vh; margin:0 }
        .card { background:white; padding:28px 36px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.08); text-align:center; max-width:720px }
        .ok { color:#1f8a4d }
        .bad { color:#d94545 }
        .warn { color:#d38b19 }
        table { margin: 18px auto 0; border-collapse:collapse; width:100%; max-width:560px }
        th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #eee }
        a{ display:inline-block; margin-top:18px; padding:10px 16px; background:#2d7ff9;color:#fff;border-radius:8px; text-decoration:none }
    </style>
</head>
<body>
    <div class="card">
        <h1>Resultado del pago</h1>
        <?php if ($status === 'approved' || ($code === 200 && ($data['status'] ?? '') === 'approved')): ?>
            <p class="ok">¡Pago aprobado! Gracias por tu compra.</p>
        <?php elseif ($status === 'pending' || ($data['status'] ?? '') === 'in_process'): ?>
            <p class="warn">El pago está pendiente. En cuanto se confirme, te avisaremos.</p>
        <?php else: ?>
            <p class="bad">El pago no fue aprobado. Estado: <?php echo htmlspecialchars($status); ?> <?php echo htmlspecialchars($status_detail); ?></p>
        <?php endif; ?>

        <table>
            <tr><th>Payment ID / Collection ID</th><td><?php echo htmlspecialchars($payment_id); ?></td></tr>
            <tr><th>Estado</th><td><?php echo htmlspecialchars($data['status'] ?? $collection_status ?? 'desconocido'); ?></td></tr>
            <tr><th>Método</th><td><?php echo htmlspecialchars($method); ?></td></tr>
            <tr><th>Monto</th><td><?php echo htmlspecialchars(number_format((float)$amount,2)); ?></td></tr>
            <tr><th>Comprador</th><td><?php echo htmlspecialchars($payer_email); ?></td></tr>
        </table>

        <a href="../index.html">Volver al inicio</a>
    </div>
</body>
</html>
