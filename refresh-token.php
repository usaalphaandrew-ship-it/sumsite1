<?php
require_once __DIR__ . '/sumsub.php';
cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

$input  = json_decode(file_get_contents('php://input'), true);
$userId = trim($input['userId'] ?? '');

if (!$userId) {
    json_response(['error' => 'Missing userId'], 400);
}

$token = sumsub_request('POST',
    '/resources/accessTokens/sdk?userId=' . urlencode($userId) . '&levelName=' . SUMSUB_LEVEL);

if ($token['status'] !== 200) {
    json_response(['error' => 'Could not refresh token'], 502);
}

json_response(['token' => $token['body']['token'] ?? '']);
