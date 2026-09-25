<?php
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM meter_assets ORDER BY id DESC");
    sendJsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    $serialNo = trim($input['serialNo'] ?? '');
    $brand = $input['brand'] ?? 'Aquaflow Pro';
    $model = $input['model'] ?? 'AF-20-Brass';
    $size = $input['size'] ?? '1/2 inch';
    $installDate = $input['installDate'] ?? date('Y-m-d');
    $zone = $input['zone'] ?? 'Mabuhay';
    $status = $input['status'] ?? 'Active';

    if (empty($serialNo)) {
        sendJsonResponse(['success' => false, 'error' => 'Serial number is required.'], 400);
    }

    try {
        $pdo->beginTransaction();

        $ins = $pdo->prepare("
            INSERT INTO meter_assets (serial_no, brand, model, pipe_size, install_date, zone, last_calibration, next_calibration, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $nextCalib = date('Y-m-d', strtotime($installDate . ' + 2 years'));
        $ins->execute([
            $serialNo,
            $brand,
            $model,
            $size,
            $installDate,
            $zone,
            $installDate,
            $nextCalib,
            $status
        ]);
        $meterDbId = $pdo->lastInsertId();

        // Audit
        $insAudit = $pdo->prepare("
            INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
            VALUES (?, 1, 'Jamie Dizon', 'Administrator', 'Meter', 'Intake New Meter Asset', ?, ?, ?)
        ");
        $logCode = 'AUD-' . rand(1000, 9999);
        $insAudit->execute([
            $logCode,
            $serialNo,
            "Registered {$brand} ({$size}) in warehouse inventory.",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $pdo->commit();
        sendJsonResponse(['success' => true, 'id' => $meterDbId, 'serialNo' => $serialNo]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $serialNo = trim($input['serialNo'] ?? '');
    $status = $input['status'] ?? 'Active';
    $lastCalib = $input['lastCalibration'] ?? date('Y-m-d');
    $nextCalib = $input['nextCalibration'] ?? date('Y-m-d', strtotime('+2 years'));

    try {
        $pdo->beginTransaction();

        $upd = $pdo->prepare("
            UPDATE meter_assets 
            SET status = ?, last_calibration = ?, next_calibration = ? 
            WHERE serial_no = ?
        ");
        $upd->execute([$status, $lastCalib, $nextCalib, $serialNo]);

        // Find meter id
        $mStmt = $pdo->prepare("SELECT id FROM meter_assets WHERE serial_no = ?");
        $mStmt->execute([$serialNo]);
        $mId = $mStmt->fetch()['id'] ?? null;

        if ($mId && !empty($input['historyEntry'])) {
            $h = $input['historyEntry'];
            $insCal = $pdo->prepare("
                INSERT INTO meter_calibrations (meter_id, calibration_date, event_type, technician_name, accuracy_margin, test_result, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $insCal->execute([
                $mId,
                $h['date'] ?? date('Y-m-d'),
                $h['type'] ?? 'Routine Calibration',
                $h['technician'] ?? 'Roberto Ramos',
                $h['accuracyMargin'] ?? '+/- 0.3%',
                $h['testResult'] ?? 'Passed',
                $h['notes'] ?? 'Calibration benchmark test passed.'
            ]);
        }

        // Audit
        $insAudit = $pdo->prepare("
            INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
            VALUES (?, 1, 'Jamie Dizon', 'Administrator', 'Meter', 'Logged Meter Service/Calibration', ?, ?, ?)
        ");
        $logCode = 'AUD-' . rand(1000, 9999);
        $insAudit->execute([
            $logCode,
            $serialNo,
            "Status: {$status}. Calibrated on {$lastCalib}.",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $pdo->commit();
        sendJsonResponse(['success' => true, 'message' => 'Meter updated successfully.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendJsonResponse(['success' => false, 'error' => 'Method not supported'], 405);
