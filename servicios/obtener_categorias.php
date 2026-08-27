<?php
/*
Archivo: servicios/obtener_categorias.php
Proyecto: Minimarket Meilanys
*/

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db.php';

try {
    // Consulta la tabla 'categorias' de tu base de datos
    $stmt = $pdo->prepare("SELECT id, nombre, slug, icono FROM categorias WHERE activo = TRUE ORDER BY nombre ASC");
    $stmt->execute();
    $categorias = $stmt->fetchAll();

    echo json_encode([
        'exito' => true,
        'categorias' => $categorias
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Error al consultar categorías: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'exito' => false,
        'error' => 'No se pudieron cargar las categorías.'
    ], JSON_UNESCAPED_UNICODE);
}
?>
