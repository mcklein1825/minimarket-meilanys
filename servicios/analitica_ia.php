<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Debes iniciar sesión para consultar la analítica.']);
    exit;
}

try {
    $query = $pdo->query(
        'SELECT p.id_pedido, p.fecha, d.producto_id, d.nombre_producto,
                d.cantidad, d.precio_unitario
         FROM pedidos p
         INNER JOIN detalle_pedidos d ON d.pedido_id = p.id
         ORDER BY p.fecha ASC'
    );
    $payload = json_encode($query->fetchAll(), JSON_UNESCAPED_UNICODE);
    $command = 'python3 ' . escapeshellarg(__DIR__ . '/../ia/analizar_ventas.py');
    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w']
    ];
    $process = proc_open($command, $descriptor, $pipes, __DIR__ . '/../');
    if (!is_resource($process)) {
        throw new RuntimeException('No se pudo iniciar el analizador de Python.');
    }
    fwrite($pipes[0], $payload);
    fclose($pipes[0]);
    $result = stream_get_contents($pipes[1]);
    $error = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);
    if ($exitCode !== 0 || trim($result) === '') {
        error_log('Error del analizador IA: ' . $error);
        throw new RuntimeException('El analizador no devolvió resultados.');
    }
    echo $result;
} catch (Throwable $error) {
    error_log('Error en analítica IA: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo generar la analítica.']);
}
