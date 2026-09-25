<?php
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && ($_GET['action'] ?? '') === 'scheduled') {
    $today = new DateTimeImmutable('today');
    $force = ($_GET['force'] ?? '') === '1';

    if ((int)$today->format('j') !== 25 && !$force) {
        sendJsonResponse([
            'success' => true,
            'scheduled' => false,
            'message' => 'Automatic billing runs on the 25th of each month.'
        ]);
    }

    $runKey = $today->format('Y-m');
    $billingPeriod = $today->format('F 1, Y') . ' - ' . $today->format('F t, Y');
    $dueDate = $today->modify('+15 days')->format('Y-m-d');

    try {
        $pdo->beginTransaction();
        $claim = $pdo->prepare('INSERT IGNORE INTO billing_runs (run_key, billing_period, run_date) VALUES (?, ?, ?)');
        $claim->execute([$runKey, $billingPeriod, $today->format('Y-m-d')]);

        if ($claim->rowCount() === 0) {
            $pdo->commit();
            sendJsonResponse(['success' => true, 'scheduled' => true, 'already_processed' => true, 'run_key' => $runKey]);
        }

        $consumers = $pdo->query("SELECT id, account_no, full_name, classification, last_reading
            FROM consumers WHERE status IN ('Active', 'Overdue') AND approval_status = 'Approved'")->fetchAll();
        $tariffs = [];
        foreach ($pdo->query('SELECT * FROM tariff_rates WHERE is_active = 1')->fetchAll() as $tariff) {
            $tariffs[$tariff['classification']] = $tariff;
        }

        $latestBill = $pdo->prepare('SELECT pres_reading FROM bills WHERE consumer_id = ? ORDER BY id DESC LIMIT 1');
        $insertBill = $pdo->prepare("INSERT INTO bills
            (bill_no, consumer_id, billing_period, prev_reading, pres_reading, consumption_cum, base_amount, env_fee, maint_fee, arrears, penalty, total_amount, status, due_date, days_overdue)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ready', ?, 0)");
        $updateConsumer = $pdo->prepare('UPDATE consumers SET last_reading = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $insertNotification = $pdo->prepare("INSERT INTO notifications
            (notification_code, type, recipient_name, account_no, message, channel, status)
            VALUES (?, 'Billing Notice', ?, ?, ?, 'System Push', 'Sent')");
        $inserted = 0;
        $notifications = 0;

        foreach ($consumers as $consumer) {
            $latestBill->execute([$consumer['id']]);
            $previous = $latestBill->fetchColumn();
            $previous = $previous === false ? 0 : (float)$previous;
            $present = max($previous, (float)($consumer['last_reading'] ?? 0));
            $consumption = max(0, $present - $previous);
            $tariff = $tariffs[$consumer['classification']] ?? null;
            $minCharge = (float)($tariff['min_charge'] ?? 180);
            $minCum = (float)($tariff['min_cum'] ?? 10);
            $base = $consumption <= $minCum
                ? $minCharge
                : $minCharge + (($consumption - $minCum) * (float)($tariff['bracket_1_rate'] ?? 22.5));
            $envFee = round($base * (float)($tariff['environmental_fee_rate'] ?? 0.1), 2);
            $maintFee = (float)($tariff['meter_maintenance_fee'] ?? 25);
            $total = round($base + $envFee + $maintFee, 2);
            $billNo = 'WS-' . $today->format('Ym') . '-' . str_pad((string)$consumer['id'], 4, '0', STR_PAD_LEFT);

            $insertBill->execute([$billNo, $consumer['id'], $billingPeriod, $previous, $present, $consumption, $base, $envFee, $maintFee, 0, 0, $total, $dueDate]);
            $updateConsumer->execute([$present, $consumer['id']]);
            $insertNotification->execute([
                'NTF-' . $today->format('Ymd') . '-' . str_pad((string)$consumer['id'], 4, '0', STR_PAD_LEFT),
                $consumer['full_name'],
                $consumer['account_no'],
                "Your water bill for {$billingPeriod} is ready. Total due: PHP " . number_format($total, 2) . ". Due {$dueDate}."
            ]);
            $inserted++;
            $notifications++;
        }

        $complete = $pdo->prepare("UPDATE billing_runs SET inserted_count = ?, notification_count = ?, status = 'Completed', completed_at = NOW() WHERE run_key = ?");
        $complete->execute([$inserted, $notifications, $runKey]);
        $pdo->commit();
        sendJsonResponse(['success' => true, 'scheduled' => true, 'run_key' => $runKey, 'inserted_count' => $inserted, 'notification_count' => $notifications]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bills ORDER BY id DESC");
    sendJsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    $action = $input['action'] ?? 'single';

    try {
        $pdo->beginTransaction();

        if ($action === 'batch') {
            $billsList = $input['bills'] ?? [];
            $inserted = 0;

            foreach ($billsList as $b) {
                // Find consumer db id
                $cCode = $b['consumerId'] ?? '';
                $cStmt = $pdo->prepare("SELECT id FROM consumers WHERE consumer_code = ? OR account_no = ?");
                $cStmt->execute([$cCode, $b['accountNo'] ?? '']);
                $cRow = $cStmt->fetch();
                $cDbId = $cRow ? $cRow['id'] : null;

                if (!$cDbId) continue;

                $ins = $pdo->prepare("
                    INSERT INTO bills (bill_no, consumer_id, billing_period, prev_reading, pres_reading, consumption_cum, base_amount, env_fee, maint_fee, arrears, penalty, total_amount, status, due_date, days_overdue)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                ");
                $ins->execute([
                    $b['id'],
                    $cDbId,
                    $b['period'] ?? 'Aug 01 – Aug 31, 2026',
                    $b['prevReading'] ?? 0,
                    $b['presReading'] ?? 0,
                    $b['consumption'] ?? 0,
                    $b['baseAmount'] ?? 0,
                    $b['envFee'] ?? 0,
                    $b['maintFee'] ?? 0,
                    $b['arrears'] ?? 0,
                    $b['penalty'] ?? 0,
                    $b['totalAmount'] ?? 0,
                    $b['status'] ?? 'Ready',
                    $b['dueDate'] ?? date('Y-m-d', strtotime('+15 days'))
                ]);

                // Update consumer last_reading
                $updLast = $pdo->prepare("UPDATE consumers SET last_reading = ? WHERE id = ?");
                $updLast->execute([$b['presReading'] ?? 0, $cDbId]);

                $inserted++;
            }

            // Audit
            $insAudit = $pdo->prepare("
                INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
                VALUES (?, 1, 'Jamie Dizon', 'Administrator', 'Billing', 'Batch Bill Generation Run', ?, ?, ?)
            ");
            $logCode = 'AUD-' . rand(1000, 9999);
            $cycle = $input['cycle'] ?? 'Current Cycle';
            $insAudit->execute([
                $logCode,
                $cycle,
                "Batch billing run completed. Inserted {$inserted} billing statements.",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            $pdo->commit();
            sendJsonResponse(['success' => true, 'inserted_count' => $inserted]);
        } else {
            // Single bill creation
            $cCode = $input['consumerId'] ?? '';
            $cStmt = $pdo->prepare("SELECT id FROM consumers WHERE consumer_code = ? OR account_no = ?");
            $cStmt->execute([$cCode, $input['accountNo'] ?? '']);
            $cRow = $cStmt->fetch();
            $cDbId = $cRow ? $cRow['id'] : null;

            if (!$cDbId) {
                // Fallback to first consumer
                $first = $pdo->query("SELECT id FROM consumers LIMIT 1")->fetch();
                $cDbId = $first['id'];
            }

            $billNo = $input['id'] ?? ('WS-' . rand(240000, 250000));
            $ins = $pdo->prepare("
                INSERT INTO bills (bill_no, consumer_id, billing_period, prev_reading, pres_reading, consumption_cum, base_amount, env_fee, maint_fee, arrears, penalty, total_amount, status, due_date, days_overdue)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ");
            $ins->execute([
                $billNo,
                $cDbId,
                $input['period'] ?? 'Sep 01 – Sep 30, 2026',
                $input['prevReading'] ?? 0,
                $input['presReading'] ?? 0,
                $input['consumption'] ?? 0,
                $input['baseAmount'] ?? 0,
                $input['envFee'] ?? 0,
                $input['maintFee'] ?? 0,
                $input['arrears'] ?? 0,
                $input['penalty'] ?? 0,
                $input['totalAmount'] ?? 0,
                $input['status'] ?? 'Ready',
                $input['dueDate'] ?? date('Y-m-d', strtotime('+15 days'))
            ]);
            $billDbId = $pdo->lastInsertId();

            // Update consumer last reading
            $updLast = $pdo->prepare("UPDATE consumers SET last_reading = ? WHERE id = ?");
            $updLast->execute([$input['presReading'] ?? 0, $cDbId]);

            // Audit
            $insAudit = $pdo->prepare("
                INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
                VALUES (?, 1, 'Jamie Dizon', 'Billing Officer', 'Billing', 'Calculated & Queued Bill Statement', ?, ?, ?)
            ");
            $logCode = 'AUD-' . rand(1000, 9999);
            $insAudit->execute([
                $logCode,
                "{$billNo} ({$input['name']})",
                "Queued billing statement. Total payable: ₱ " . number_format((float)$input['totalAmount'], 2),
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            $pdo->commit();
            sendJsonResponse(['success' => true, 'id' => $billNo, 'dbId' => $billDbId]);
        }
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendJsonResponse(['success' => false, 'error' => 'Method not supported'], 405);
