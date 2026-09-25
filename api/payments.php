<?php
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM payments ORDER BY id DESC");
    sendJsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    $billNo = $input['billId'] ?? '';
    $orNumber = $input['orNumber'] ?? ('OR-' . date('Y') . '-' . rand(1000, 9999));
    $consumerIdCode = $input['consumerId'] ?? '';
    $amountPaid = (float)($input['amountPaid'] ?? 0);
    $tendered = (float)($input['tendered'] ?? $amountPaid);
    $change = (float)($input['change'] ?? 0);
    $method = $input['method'] ?? 'Cash';
    $notes = $input['notes'] ?? 'Over-the-counter bill settlement.';
    $cashierName = $input['cashier'] ?? 'Counter Cashier Alpha';

    try {
        $pdo->beginTransaction();

        // Find bill
        $bStmt = $pdo->prepare("SELECT id, consumer_id, status FROM bills WHERE bill_no = ?");
        $bStmt->execute([$billNo]);
        $billRow = $bStmt->fetch();

        $billDbId = $billRow ? $billRow['id'] : null;
        $consumerDbId = $billRow ? $billRow['consumer_id'] : null;

        // If consumerDbId still null, try finding by consumer_code
        if (!$consumerDbId && !empty($consumerIdCode)) {
            $cStmt = $pdo->prepare("SELECT id FROM consumers WHERE consumer_code = ? OR account_no = ?");
            $cStmt->execute([$consumerIdCode, $consumerIdCode]);
            $cRow = $cStmt->fetch();
            if ($cRow) $consumerDbId = $cRow['id'];
        }

        // 1. Insert payment record
        $insPay = $pdo->prepare("
            INSERT INTO payments (or_number, bill_id, consumer_id, cashier_id, amount_paid, tendered_amount, change_amount, payment_method, payment_date, notes)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, NOW(), ?)
        ");
        $insPay->execute([
            $orNumber,
            $billDbId,
            $consumerDbId,
            $amountPaid,
            $tendered,
            $change,
            $method,
            $notes
        ]);
        $paymentId = $pdo->lastInsertId();

        // 2. Mark bill as Paid
        if ($billDbId) {
            $updBill = $pdo->prepare("
                UPDATE bills 
                SET status = 'Paid', paid_date = NOW(), days_overdue = 0, penalty = 0 
                WHERE id = ?
            ");
            $updBill->execute([$billDbId]);
        }

        // 3. Update consumer status if they were overdue
        if ($consumerDbId) {
            // Check if consumer has other unpaid bills
            $chkOverdue = $pdo->prepare("SELECT COUNT(*) as c FROM bills WHERE consumer_id = ? AND status = 'Overdue' AND id != ?");
            $chkOverdue->execute([$consumerDbId, $billDbId ?? 0]);
            $otherOverdue = (int)$chkOverdue->fetch()['c'];

            if ($otherOverdue === 0) {
                $updConsumer = $pdo->prepare("UPDATE consumers SET status = 'Active' WHERE id = ?");
                $updConsumer->execute([$consumerDbId]);

                $updGeo = $pdo->prepare("UPDATE geo_connections SET status = 'Normal' WHERE consumer_id = ?");
                $updGeo->execute([$consumerDbId]);
            }
        }

        // 4. Log in Audit Trail
        $insAudit = $pdo->prepare("
            INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
            VALUES (?, 1, ?, 'Cashier / POS', 'Payment', 'Processed Counter Payment', ?, ?, ?)
        ");
        $logCode = 'AUD-' . rand(1000, 9999);
        $insAudit->execute([
            $logCode,
            $cashierName,
            "{$orNumber} / Bill {$billNo}",
            "Received ₱ " . number_format($amountPaid, 2) . " via {$method}. Bill updated to PAID.",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Payment processed and committed to database successfully.',
            'data' => [
                'id' => $paymentId,
                'orNumber' => $orNumber,
                'billId' => $billNo,
                'amountPaid' => $amountPaid,
                'method' => $method,
                'status' => 'Paid'
            ]
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendJsonResponse(['success' => false, 'error' => 'Method not supported'], 405);
