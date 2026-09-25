<?php
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM maintenance_tickets ORDER BY id DESC");
    $rows = $stmt->fetchAll();
    $data = array_map(function($t) {
        return array_merge($t, ['resolution_image' => $t['resolution_image'] ?? null]);
    }, $rows);
    sendJsonResponse(['success' => true, 'data' => $data]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    $ticketNo = $input['id'] ?? ('SR-' . date('Y') . '-' . rand(1000, 9999));
    $cCode = $input['consumerId'] ?? '';
    
    $cStmt = $pdo->prepare("SELECT id, zone FROM consumers WHERE consumer_code = ? OR full_name = ?");
    $cStmt->execute([$cCode, $input['consumerName'] ?? '']);
    $cRow = $cStmt->fetch();
    $cDbId = $cRow ? $cRow['id'] : null;
    $zone = $input['zone'] ?? ($cRow['zone'] ?? 'Mabuhay');

    $issueType = $input['issueType'] ?? 'Service Request';
    $priority = $input['priority'] ?? 'Medium';
    $status = $input['status'] ?? 'Reported';
    $technician = $input['assignedTo'] ?? 'Roberto Ramos';
    $description = $input['description'] ?? '';

    try {
        $pdo->beginTransaction();

        $ins = $pdo->prepare("
            INSERT INTO maintenance_tickets (ticket_no, consumer_id, zone, issue_type, priority, status, technician_name, reported_at, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        ");
        $ins->execute([
            $ticketNo,
            $cDbId,
            $zone,
            $issueType,
            $priority,
            $status,
            $technician,
            $description
        ]);
        $ticketDbId = $pdo->lastInsertId();

        // Audit
        $insAudit = $pdo->prepare("
            INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
            VALUES (?, 1, 'Jamie Dizon', 'Administrator', 'Service', 'Dispatched Service Ticket', ?, ?, ?)
        ");
        $logCode = 'AUD-' . rand(1000, 9999);
        $insAudit->execute([
            $logCode,
            "{$ticketNo} ({$issueType})",
            "Assigned to {$technician} for {$input['consumerName']} ({$zone}).",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $pdo->commit();
        sendJsonResponse([
            'success' => true,
            'id' => $ticketNo,
            'dbId' => $ticketDbId,
            'message' => 'Ticket created successfully.'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $ticketNo = $input['id'] ?? '';
    $status = $input['status'] ?? 'Resolved';
    $resolution = $input['resolution'] ?? 'Completed field inspection and resolution.';
    $technician = $input['assignedTo'] ?? null;
    $resolutionImage = $input['resolutionImage'] ?? null;

    try {
        $pdo->beginTransaction();

        $sql = "UPDATE maintenance_tickets SET status = ?, resolution_notes = ?, resolved_at = " . ($status === 'Resolved' ? "NOW()" : "resolved_at");
        $params = [$status, $resolution];

        if ($resolutionImage !== null) {
            $sql .= ", resolution_image = ?";
            $params[] = $resolutionImage;
        }

        if ($technician) {
            $sql .= ", technician_name = ?";
            $params[] = $technician;
        }

        $sql .= " WHERE ticket_no = ?";
        $params[] = $ticketNo;

        $upd = $pdo->prepare($sql);
        $upd->execute($params);

        // Audit
        $insAudit = $pdo->prepare("
            INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
            VALUES (?, 1, 'Jamie Dizon', 'Administrator', 'Service', 'Updated Ticket Status', ?, ?, ?)
        ");
        $logCode = 'AUD-' . rand(1000, 9999);
        $insAudit->execute([
            $logCode,
            $ticketNo,
            "Status updated to {$status}. Notes: {$resolution}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $pdo->commit();
        sendJsonResponse(['success' => true, 'message' => 'Ticket updated successfully.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendJsonResponse(['success' => false, 'error' => 'Method not supported'], 405);
