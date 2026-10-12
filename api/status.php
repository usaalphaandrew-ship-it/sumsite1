<?php
require_once __DIR__ . '/sumsub.php';
cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['error' => 'Method not allowed'], 405);
}

$applicantId = trim($_GET['applicantId'] ?? '');
if (!$applicantId) {
    json_response(['error' => 'Missing applicantId'], 400);
}

$result = sumsub_request('GET', '/resources/applicants/' . $applicantId . '/one');

if ($result['status'] !== 200) {
    json_response(['error' => 'Could not fetch status'], 502);
}

$review = $result['body']['review'] ?? [];
json_response([
    'reviewStatus' => $review['reviewStatus'] ?? 'pending',
    'reviewResult' => $review['reviewResult'] ?? null,
]);
