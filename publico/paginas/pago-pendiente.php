<?php
session_start();
if (empty($_SESSION['checkout_started'])) {
    header('Location: ../index.html');
    exit;
}
unset($_SESSION['checkout_started']);
?>
<!--
Archivo: pago-pendiente.php
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\pago-pendiente.php
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Autor: Yo, como responsable del desarrollo, creo y mantengo este archivo.
Propósito: informar al cliente que la transacción quedó pendiente y necesita confirmación.
Tecnologías: PHP, HTML, CSS.
Dependencias: mercado-pago-config.php, flujo de pago de Mercado Pago.
Estado: activo para notificar pagos en revisión.
-->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago pendiente</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f4f6f8;
            display: grid;
            place-items: center;
            min-height: 100vh;
            margin: 0;
        }
        .card {
            background: white;
            padding: 32px 40px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            text-align: center;
            max-width: 500px;
        }
        h1 { color: #d38b19; }
        a {
            display: inline-block;
            margin-top: 20px;
            text-decoration: none;
            background: #2d7ff9;
            color: white;
            padding: 12px 18px;
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Pago pendiente</h1>
        <p>Tu pago está en revisión o pendiente de confirmación.</p>
        <p>Te avisaremos cuando se confirme.</p>
        <a href="../index.html">Volver al inicio</a>
    </div>
</body>
</html>
