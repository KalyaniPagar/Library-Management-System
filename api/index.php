<?php
/**
 * Front controller for the LMS API.
 * Every request to /LMS/api/* lands here (see .htaccess) and is dispatched
 * to a route handler based on HTTP method + path.
 */

declare(strict_types=1);

require __DIR__ . '/config/db.php';
require __DIR__ . '/core/helpers.php';

cors();
start_session();

// ---------------------------------------------------------------------------
// Work out the route path relative to /LMS/api.
// e.g. request "/LMS/api/auth/login" -> "/auth/login"
// ---------------------------------------------------------------------------
$uri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$base = '/LMS/api';
if (str_starts_with($uri, $base)) {
    $uri = substr($uri, strlen($base));
}
$path   = '/' . trim($uri, '/');          // normalise: leading slash, no trailing
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Split into segments for routes with ids, e.g. /books/5
$segments = $path === '/' ? [] : explode('/', trim($path, '/'));
$resource = $segments[0] ?? '';

// ---------------------------------------------------------------------------
// Dispatch by top-level resource. Each routes/*.php returns a callable that
// receives ($method, $segments).
// ---------------------------------------------------------------------------
switch ($resource) {
    case '':
        json_ok(['service' => 'LMS API', 'status' => 'running']);
        break;

    case 'auth':
        (require __DIR__ . '/routes/auth.php')($method, $segments);
        break;

    case 'books':
        (require __DIR__ . '/routes/books.php')($method, $segments);
        break;

    case 'copies':
        (require __DIR__ . '/routes/copies.php')($method, $segments);
        break;

    case 'categories':
        (require __DIR__ . '/routes/categories.php')($method, $segments);
        break;

    case 'members':
        (require __DIR__ . '/routes/members.php')($method, $segments);
        break;

    case 'loans':
        (require __DIR__ . '/routes/loans.php')($method, $segments);
        break;

    case 'reports':
        (require __DIR__ . '/routes/reports.php')($method, $segments);
        break;

    default:
        json_error('Not found: ' . $path, 404);
}
