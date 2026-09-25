<?php
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM notifications ORDER BY id DESC');
    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        $items[] = [
            'id'              => $row['notification_code'],
            'type'            => $row['type'],
            'recipient'       => $row['recipient_name'],
            'accountNo'       => $row['account_no'],
            'consumerId'      => $row['consumer_id']      ?? null,
            'ticketId'        => $row['ticket_id']        ?? null,
            'resolutionImage' => $row['resolution_image'] ?? null,
            'message'         => $row['message'],
            'channel'         => $row['channel'],
            'status'          => $row['status'],
            'sentAt'          => $row['sent_at'],
        ];
    }
    sendJsonResponse(['success' => true, 'data' => $items]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    $code           = $input['id']              ?? ('NTF-' . date('YmdHis') . rand(100, 999));
    $type           = $input['type']            ?? 'Service Alert';
    $recipient      = trim($input['recipient']  ?? '');
    $accountNo      = trim($input['accountNo']  ?? '');
    $consumerId     = trim($input['consumerId'] ?? '');
    $ticketId       = trim($input['ticketId']   ?? '');
    $resolutionImage = $input['resolutionImage'] ?? null;
    $message        = trim($input['message']    ?? '');
    $channel        = $input['channel']         ?? 'System Push';

    if ($recipient === '' || $accountNo === '' || $message === '') {
        sendJsonResponse(['success' => false, 'error' => 'Recipient, account number, and message are required.'], 400);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO notifications
            (notification_code, type, recipient_name, account_no, consumer_id, ticket_id, resolution_image, message, channel, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'Sent\')'
    );
    $stmt->execute([
        $code,
        $type,
        $recipient,
        $accountNo,
        $consumerId  ?: null,
        $ticketId    ?: null,
        $resolutionImage,
        $message,
        $channel,
    ]);
    sendJsonResponse(['success' => true, 'id' => $code], 201);
}

sendJsonResponse(['success' => false, 'error' => 'Method not supported'], 405);
