<?php
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

function readBoundaryConfig(PDO $pdo) {
    $rows = $pdo->query("SELECT boundary_key, boundary_data FROM system_boundaries")->fetchAll();
    $config = [
        'serviceBoundary' => null,
        'clusterBoundaries' => [],
    ];

    foreach ($rows as $row) {
        $decoded = json_decode($row['boundary_data'], true);
        if ($row['boundary_key'] === 'service' && is_array($decoded)) {
            $config['serviceBoundary'] = $decoded;
        }
        if ($row['boundary_key'] === 'clusters' && is_array($decoded)) {
            $config['clusterBoundaries'] = $decoded;
        }
    }

    return $config;
}

function pointInsideBoundary($latitude, $longitude, $coordinates) {
    $inside = false;
    $previous = count($coordinates) - 1;
    for ($index = 0; $index < count($coordinates); $index++) {
        $current = $coordinates[$index];
        $prior = $coordinates[$previous];
        $intersects = (($current[1] > $longitude) !== ($prior[1] > $longitude))
            && ($latitude < (($prior[0] - $current[0]) * ($longitude - $current[1])) / ($prior[1] - $current[1]) + $current[0]);
        if ($intersects) $inside = !$inside;
        $previous = $index;
    }
    return $inside;
}

if ($method === 'GET') {
    $config = readBoundaryConfig($pdo);
    $config['clusterBoundaries'] = array_values(array_filter(
        $config['clusterBoundaries'],
        fn($cluster) => strtolower(trim($cluster['name'] ?? '')) !== 'northbank'
    ));
    sendJsonResponse(['success' => true, 'data' => $config]);
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $serviceBoundary = $input['serviceBoundary'] ?? null;
    $clusterBoundaries = array_values(array_filter(
        $input['clusterBoundaries'] ?? [],
        fn($cluster) => strtolower(trim($cluster['name'] ?? '')) !== 'northbank'
    ));

    if (!is_array($clusterBoundaries)) {
        sendJsonResponse(['success' => false, 'error' => 'Cluster boundaries must be an array.'], 400);
    }

    try {
        $pdo->beginTransaction();
        $save = $pdo->prepare(
            'INSERT INTO system_boundaries (boundary_key, boundary_data) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE boundary_data = VALUES(boundary_data)'
        );
        if (is_array($serviceBoundary)) {
            $save->execute(['service', json_encode($serviceBoundary)]);
        }
        $save->execute(['clusters', json_encode($clusterBoundaries)]);

        $consumerRows = $pdo->query(
                'SELECT c.id, c.zone,
                    COALESCE(g.latitude, c.requested_latitude) AS latitude,
                    COALESCE(g.longitude, c.requested_longitude) AS longitude
             FROM consumers c LEFT JOIN geo_connections g ON g.consumer_id = c.id'
        )->fetchAll();
        $updateConsumer = $pdo->prepare('UPDATE consumers SET zone = ? WHERE id = ?');
        $updateGeo = $pdo->prepare('UPDATE geo_connections SET zone = ? WHERE consumer_id = ?');
        $updateMeter = $pdo->prepare('UPDATE meter_assets SET zone = ? WHERE consumer_id = ?');

        foreach ($consumerRows as $consumer) {
            if ($consumer['latitude'] === null || $consumer['longitude'] === null) continue;
            foreach ($clusterBoundaries as $cluster) {
                $coordinates = $cluster['coordinates'] ?? [];
                if (!is_array($coordinates) || count($coordinates) < 3 || empty($cluster['name'])) continue;
                if (pointInsideBoundary((float)$consumer['latitude'], (float)$consumer['longitude'], $coordinates)) {
                    $zone = trim($cluster['name']);
                    $updateConsumer->execute([$zone, $consumer['id']]);
                    $updateGeo->execute([$zone, $consumer['id']]);
                    $updateMeter->execute([$zone, $consumer['id']]);
                    break;
                }
            }
        }

        $pdo->commit();
        sendJsonResponse(['success' => true, 'data' => readBoundaryConfig($pdo)]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendJsonResponse(['success' => false, 'error' => 'Method not supported'], 405);