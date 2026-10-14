<?php
/**
 * Auth routes:
 *   POST /auth/login     { email, password }  -> sets session, returns user
 *   POST /auth/logout                         -> destroys session
 *   GET  /auth/me                             -> current user (for app load)
 *   POST /auth/password  { current, new }     -> change own password
 *
 * Returns a callable invoked by the front controller as ($method, $segments).
 */

declare(strict_types=1);

return function (string $method, array $segments): void {
    $action = $segments[1] ?? '';

    switch ("{$method} {$action}") {

        // -------------------------------------------------------------------
        case 'POST login':
            $in    = body();
            $email = trim((string)($in['email'] ?? ''));
            $pass  = (string)($in['password'] ?? '');

            if ($email === '' || $pass === '') {
                json_error('Email and password are required', 422);
            }

            $stmt = db()->prepare(
                'SELECT id, name, email, password_hash, role, status
                 FROM users WHERE email = ? LIMIT 1'
            );
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($pass, $user['password_hash'])) {
                json_error('Invalid email or password', 401);
            }
            if ($user['status'] !== 'active') {
                json_error('Account is inactive', 403);
            }

            // Store a minimal user record in the session (never the hash).
            session_regenerate_id(true);
            $_SESSION['user'] = [
                'id'    => (int)$user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role'],
            ];
            json_ok($_SESSION['user']);
            break;

        // -------------------------------------------------------------------
        case 'POST logout':
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $p = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
            }
            session_destroy();
            json_ok(['loggedOut' => true]);
            break;

        // -------------------------------------------------------------------
        case 'GET me':
            json_ok(current_user());   // null if not logged in (not an error)
            break;

        // -------------------------------------------------------------------
        case 'POST password':
            $user = require_login();
            $in   = body();
            $cur  = (string)($in['current'] ?? '');
            $new  = (string)($in['new'] ?? '');

            if (strlen($new) < 6) {
                json_error('New password must be at least 6 characters', 422);
            }

            $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
            $stmt->execute([$user['id']]);
            $row = $stmt->fetch();

            if (!$row || !password_verify($cur, $row['password_hash'])) {
                json_error('Current password is incorrect', 403);
            }

            $hash = password_hash($new, PASSWORD_BCRYPT);
            db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute([$hash, $user['id']]);

            json_ok(['changed' => true]);
            break;

        // -------------------------------------------------------------------
        default:
            json_error('Unknown auth route', 404);
    }
};
