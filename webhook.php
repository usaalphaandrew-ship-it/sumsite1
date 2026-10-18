<?php
require_once __DIR__ . '/sumsub.php';

$rawBody = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_X_PAYLOAD_DIGEST'] ?? '';
$webhookSecret = 'JQrJ3c8_LOCynhKFHGFLauR-sBN';

$expected = hash_hmac('sha256', $rawBody, $webhookSecret);
if (!hash_equals($expected, $sigHeader)) {
    http_response_code(403);
    exit('Forbidden');
}

$payload = json_decode($rawBody, true);
// Process verification status updates securely
http_response_code(200);
echo 'OK';
