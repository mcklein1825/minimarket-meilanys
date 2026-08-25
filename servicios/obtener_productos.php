<?php
/*
Archivo: obtener_productos.php
Ruta: servicios/obtener_productos.php
*/

header('Content-Type: application/json');
require __DIR__ . '/db.php';

try {
    $stmt = $pdo->query("SELECT id, nombre, descripcion, precio, stock, imagen_url, categoria FROM productos WHERE activo = TRUE ORDER BY id ASC");
    $productos = $stmt->fetchAll();

    echo json_encode([
        'exito' => true,
        'productos' => $productos
    ]);
} catch (PDOException $e) {
    error_log("Error al consultar productos: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'exito' => false,
        'error' => 'No se pudieron cargar los productos.'
    ]);
}
?>
