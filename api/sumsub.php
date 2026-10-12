<?php
require_once __DIR__ . '/config.php';

function sumsub_request(string $method, string $path, string $body = ''): array {
    $ts  = time();
    $msg = $ts . $method . $path . $body;
    $sig = hash_hmac('sha256', $msg, SUMSUB_SECRET);

    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'X-App-Token: ' . SUMSUB_APP_TOKEN,
        'X-App-Access-Sig: ' . $sig,
        'X-App-Access-Ts: ' . $ts,
    ];

    $ch = curl_init(SUMSUB_BASE . $path);
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

function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function cors_preflight(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
