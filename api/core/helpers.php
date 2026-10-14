<?php
/**
 * Shared helpers: CORS, session, JSON responses, request body, auth guards.
 * Included by index.php before any route runs.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// CORS — allow the React dev server to call us WITH cookies.
// Origin must be echoed back exactly (not "*") when credentials are allowed.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // Vite falls back to the next free port when 5173 is taken.
    'http://localhost:5174',
    'http://127.0.0.1:5174',
];

function cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    // Preflight request — answer and stop.
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// ---------------------------------------------------------------------------
// Session — cookie config suitable for local dev (SameSite=Lax).
// ---------------------------------------------------------------------------
function start_session(): void
{
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ---------------------------------------------------------------------------
// JSON responses — every endpoint returns { ok: true, data } or { ok: false, error }.
// ---------------------------------------------------------------------------
function json_ok($data = null, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'data' => $data]);
    exit;
}

function json_error(string $message, int $code = 400): void
{
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

// ---------------------------------------------------------------------------
// Request body — parse JSON POST/PUT bodies into an array.
// ---------------------------------------------------------------------------
function body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ---------------------------------------------------------------------------
// Auth guards — call at the top of protected routes.
// ---------------------------------------------------------------------------
function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function require_login(): array
{
    $user = current_user();
    if (!$user) {
        json_error('Not authenticated', 401);
    }
    return $user;
}

function require_admin(): array
{
    $user = require_login();
    if (($user['role'] ?? '') !== 'admin') {
        json_error('Admin access required', 403);
    }
    return $user;
}
