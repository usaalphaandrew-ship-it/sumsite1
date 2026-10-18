<?php
require_once __DIR__ . '/sumsub.php';
cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$key   = trim($input['key'] ?? '');

if ($key !== ACCESS_KEY) {
    json_response(['error' => 'Unauthorized'], 401);
}

$userId     = USER_PREFIX . bin2hex(random_bytes(8));
$applicant  = sumsub_request('POST', '/resources/applicants?levelName=' . SUMSUB_LEVEL,
    json_encode(['externalUserId' => $userId]));

if ($applicant['status'] !== 201 && $applicant['status'] !== 200) {
    json_response(['error' => 'Could not initialize applicant profile'], 502);
}

$applicantId = $applicant['body']['id'] ?? '';
if (!$applicantId) {
    json_response(['error' => 'No applicant ID returned'], 502);
}

$token = sumsub_request('POST',
    '/resources/accessTokens?userId=' . urlencode($userId) . '&levelName=' . SUMSUB_LEVEL);

if ($token['status'] !== 200) {
    json_response(['error' => 'Could not generate access token'], 502);
}

json_response([
    'token'       => $token['body']['token'] ?? '',
    'applicantId' => $applicantId,
    'userId'      => $userId,
]);
