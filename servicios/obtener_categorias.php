<?php
/*
Archivo: servicios/obtener_categorias.php
Proyecto: Minimarket Meilanys
*/

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db.php';

try {
    // Se ajusta la consulta a las columnas reales de Supabase: 'estado' en lugar de 'activo'
    // Se asigna '🛒' como icono genérico por defecto para evitar el "undefined"
    $stmt = $pdo->prepare("SELECT id, nombre, '🛒' AS icono FROM categorias WHERE estado = TRUE ORDER BY nombre ASC");
    $stmt->execute();
    $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'exito' => true,
        'categorias' => $categorias
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Error al consultar categorías: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'exito' => false,
        'error' => 'No se pudieron cargar las categorías: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
