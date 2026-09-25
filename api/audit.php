<?php
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM audit_trail ORDER BY id DESC LIMIT 100");
    sendJsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    $category = $input['category'] ?? 'System';
    $action = $input['action'] ?? 'Operation';
    $target = $input['target'] ?? 'System';
    $details = $input['details'] ?? '';
    $user = $input['user'] ?? 'Administrator';
    $role = $input['role'] ?? 'Administrator';
    $ip = $input['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

    try {
        $countStmt = $pdo->query("SELECT COUNT(*) as c FROM audit_trail");
        $cnt = (int)$countStmt->fetch()['c'];
        $logCode = $input['id'] ?? ('AUD-' . (906 + $cnt));

        $ins = $pdo->prepare("
            INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $logCode,
            $user,
            $role,
            $category,
            $action,
            $target,
            $details,
            $ip
        ]);

        sendJsonResponse(['success' => true, 'id' => $logCode]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendJsonResponse(['success' => false, 'error' => 'Method not supported'], 405);
