<?php
/*
Archivo: servicios/obtener_productos.php
Proyecto: Minimarket Meilanys
Autor: MCKLEIN
*/

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';

try {
    // Consulta compatible tanto con PostgreSQL (Supabase) como con MySQL
    $stmt = $pdo->prepare("SELECT id, nombre, descripcion, precio, stock, imagen_url, categoria FROM productos WHERE activo = TRUE ORDER BY id ASC");
    $stmt->execute();
    $productos = $stmt->fetchAll();

    // Formateo explícito de tipos para evitar errores en JavaScript
    $productosParseados = array_map(function($p) {
        return [
            'id'          => (int)$p['id'],
            'nombre'      => (string)$p['nombre'],
            'descripcion' => (string)($p['descripcion'] ?? ''),
            'precio'      => (float)$p['precio'],
            'stock'       => (int)($p['stock'] ?? 0),
            'imagen_url'  => (string)($p['imagen_url'] ?? ''),
            'categoria'   => (string)($p['categoria'] ?? 'varios')
        ];
    }, $productos);

    echo json_encode([
        'exito' => true,
        'productos' => $productosParseados
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Error al consultar productos: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'exito' => false,
        'error' => 'No se pudieron cargar los productos.',
        'detalle' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
