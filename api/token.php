<?php
require_once __DIR__ . '/sumsub.php';
cors_preflight();

// Allow both POST and GET to prevent 405 on redirects or custom calls
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? $_POST;
} else {
    $input = $_GET;
}

$appToken  = trim($input['appToken'] ?? SUMSUB_APP_TOKEN);
$secret    = trim($input['secret'] ?? SUMSUB_SECRET);
$levelName = trim($input['levelName'] ?? SUMSUB_LEVEL);
$action    = trim($input['action'] ?? 'create');
$userId    = trim($input['userId'] ?? '');

if (!$appToken || !$secret) {
    json_response(['error' => 'App Token and Secret Key are required'], 400);
}

if (!$userId) {
    $prefix = (strpos($appToken, 'sbx:') === 0) ? 'sbx_usr_' : 'prd_usr_';
    $userId = $prefix . bin2hex(random_bytes(6)) . '_' . time();
}

/**
 * Custom request helper with dynamic credentials
 */
function sumsub_custom_request(string $method, string $path, string $body, string $appToken, string $secret): array {
    $ts  = time();
    $msg = $ts . $method . $path . $body;
    $sig = hash_hmac('sha256', $msg, $secret);

    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'X-App-Token: ' . $appToken,
        'X-App-Access-Sig: ' . $sig,
        'X-App-Access-Ts: ' . $ts,
    ];

    $ch = curl_init('https://api.sumsub.com' . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($body !== '') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $resp   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($resp, true);
    return ['status' => $status, 'body' => $data ?? []];
}

$applicantId = null;
$independentUrl = null;

// 1. Create applicant if fresh session with site tracking
if ($action === 'create') {
    $applicantPayload = json_encode([
        'externalUserId' => $userId,
        'sourceKey'      => 'aicodehelper.us',
        'metadata'       => [
            ['key' => 'Source', 'value' => 'aicodehelper.us'],
            ['key' => 'InitiatedFrom', 'value' => 'https://aicodehelper.us/verifyss.html'],
            ['key' => 'Domain', 'value' => 'aicodehelper.us']
        ]
    ]);

    $appRes = sumsub_custom_request(
        'POST',
        '/resources/applicants?levelName=' . urlencode($levelName),
        $applicantPayload,
        $appToken,
        $secret
    );

    if ($appRes['status'] === 200 || $appRes['status'] === 201) {
        $applicantId = $appRes['body']['id'] ?? null;
    }
}

// 2. Generate SDK Access Token (for in-page WebSDK iframe)
$tokPath = '/resources/accessTokens?userId=' . urlencode($userId) . '&levelName=' . urlencode($levelName);
$tokRes  = sumsub_custom_request('POST', $tokPath, '', $appToken, $secret);
$token   = $tokRes['body']['token'] ?? null;

// 3. Generate Independent Standalone WebSDK Link (for opening in new tab)
$linkPath = '/resources/sdkIntegrations/levels/' . urlencode($levelName) . '/websdkLink?ttlInSecs=3600&externalUserId=' . urlencode($userId) . '&lang=en';
$linkRes  = sumsub_custom_request('POST', $linkPath, '{}', $appToken, $secret);
if ($linkRes['status'] === 200 && !empty($linkRes['body']['url'])) {
    $independentUrl = $linkRes['body']['url'];
}

if (!$token && !$independentUrl) {
    $desc = $tokRes['body']['description'] ?? $linkRes['body']['description'] ?? 'Token generation failed';
    json_response([
        'error'   => $desc,
        'status'  => $tokRes['status'] ?: $linkRes['status'],
        'details' => $tokRes['body'] ?: $linkRes['body']
    ], 502);
}

json_response([
    'success'        => true,
    'token'          => $token,
    'independentUrl' => $independentUrl,
    'userId'         => $userId,
    'applicantId'    => $applicantId,
    'environment'    => (strpos($appToken, 'sbx:') === 0) ? 'sandbox' : 'production'
]);
