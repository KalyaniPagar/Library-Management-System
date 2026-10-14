<?php
/**
 * PDO connection to lms_db.
 *
 * Credentials come from environment variables when set, otherwise fall back to
 * the XAMPP defaults (root / empty password on localhost). Override in
 * production by setting LMS_DB_* in the environment — never hardcode prod creds.
 *
 * Usage:  $pdo = db();
 */

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('LMS_DB_HOST') ?: '127.0.0.1';
    $port = getenv('LMS_DB_PORT') ?: '3306';
    $name = getenv('LMS_DB_NAME') ?: 'lms_db';
    $user = getenv('LMS_DB_USER') ?: 'root';
    $pass = getenv('LMS_DB_PASS') ?: '';

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // throw on error
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // assoc arrays
        PDO::ATTR_EMULATE_PREPARES   => false,                   // real prepares
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
        // Don't leak credentials/DSN to the client.
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'Database connection failed']);
        // Log the real reason server-side.
        error_log('LMS DB connection error: ' . $e->getMessage());
        exit;
    }

    return $pdo;
}
