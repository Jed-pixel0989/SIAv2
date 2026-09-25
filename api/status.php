<?php
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();

try {
    $versionStmt = $pdo->query("SELECT VERSION() as version");
    $version = $versionStmt->fetch()['version'] ?? 'Unknown';

    $tablesStmt = $pdo->query("
        SELECT table_name, table_rows 
        FROM information_schema.tables 
        WHERE table_schema = 'waterline_db'
    ");
    $tables = $tablesStmt->fetchAll();

    $counts = [];
    foreach ($tables as $t) {
        $tableName = $t['table_name'];
        // Accurate count
        try {
            $cnt = $pdo->query("SELECT COUNT(*) as c FROM `{$tableName}`")->fetch()['c'];
            $counts[$tableName] = (int)$cnt;
        } catch (Exception $e) {
            $counts[$tableName] = (int)$t['table_rows'];
        }
    }

    sendJsonResponse([
        'success' => true,
        'connected' => true,
        'database' => 'waterline_db',
        'host' => '127.0.0.1:3306',
        'server_version' => $version,
        'timestamp' => date('Y-m-d H:i:s'),
        'table_counts' => $counts
    ]);
} catch (Exception $e) {
    sendJsonResponse([
        'success' => false,
        'connected' => false,
        'error' => $e->getMessage()
    ], 500);
}
