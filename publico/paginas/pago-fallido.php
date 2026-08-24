<?php
session_start();
if (empty($_SESSION['checkout_started'])) {
    header('Location: ../index.html');
    exit;
}
unset($_SESSION['checkout_started']);
?>
<!--
Archivo: pago-fallido.php
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\pago-fallido.php
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Autor: Yo, como responsable del desarrollo, creo y mantengo este archivo.
Propósito: informar al cliente que la transacción no fue aprobada y ofrecer repetir el intento.
Tecnologías: PHP, HTML, CSS.
Dependencias: flujo de pago de Mercado Pago y la página principal.
Estado: activo para manejo de errores de pago.
-->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago fallido</title>
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
        h1 { color: #d94545; }
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
        <h1>Pago fallido</h1>
        <p>Hubo un problema con la transacción.</p>
        <p>Puedes intentarlo nuevamente o revisar tu método de pago.</p>
        <a href="../index.html">Volver al inicio</a>
    </div>
</body>
</html>
