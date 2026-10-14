<?php
/**
 * Member routes (admin only). Members are rows in `users` with role='member'.
 *   GET  /members            list/search (?q=)
 *   POST /members            create { name, email, member_code, password }
 *   GET  /members/{id}       detail + loan history
 *   PUT  /members/{id}       update { name, email, member_code, status, password? }
 */

declare(strict_types=1);

return function (string $method, array $segments): void {
    require_admin();
    $id = $segments[1] ?? null;

    // ---- /members/{id} ----------------------------------------------------
    if ($id !== null) {
        switch ($method) {
            case 'GET':
                $stmt = db()->prepare(
                    "SELECT id, name, email, member_code, status, created_at
                     FROM users WHERE id = ? AND role = 'member'"
                );
                $stmt->execute([(int)$id]);
                $member = $stmt->fetch();
                if (!$member) {
                    json_error('Member not found', 404);
                }
                // Loan history (joined to title/barcode). Empty until circulation runs.
                $ls = db()->prepare(
                    "SELECT l.id, l.issue_date, l.due_date, l.return_date,
                            l.fine_amount, l.fine_paid, l.status,
                            bc.barcode, b.title
                     FROM loans l
                     JOIN book_copies bc ON bc.id = l.copy_id
                     JOIN books b ON b.id = bc.book_id
                     WHERE l.user_id = ?
                     ORDER BY l.issue_date DESC"
                );
                $ls->execute([(int)$id]);
                $member['loans'] = $ls->fetchAll();
                json_ok($member);
                break;

            case 'PUT':
                $in  = body();
                $set = [];
                $vals = [];
                foreach (['name', 'email', 'member_code', 'status'] as $f) {
                    if (array_key_exists($f, $in)) {
                        $set[] = "{$f} = ?";
                        $vals[] = $in[$f] === '' ? null : $in[$f];
                    }
                }
                if (!empty($in['password'])) {
                    $set[] = 'password_hash = ?';
                    $vals[] = password_hash((string)$in['password'], PASSWORD_BCRYPT);
                }
                if (!$set) {
                    json_error('Nothing to update', 422);
                }
                $vals[] = (int)$id;
                try {
                    db()->prepare("UPDATE users SET " . implode(', ', $set) . " WHERE id = ? AND role = 'member'")
                        ->execute($vals);
                } catch (PDOException $e) {
                    json_error('Email or member code already in use', 409);
                }
                json_ok(['updated' => true]);
                break;

            default:
                json_error('Method not allowed', 405);
        }
    }

    // ---- /members collection ----------------------------------------------
    switch ($method) {
        case 'GET':
            $q = trim((string)($_GET['q'] ?? ''));
            if ($q !== '') {
                $stmt = db()->prepare(
                    "SELECT id, name, email, member_code, status, created_at
                     FROM users
                     WHERE role = 'member'
                       AND (name LIKE ? OR email LIKE ? OR member_code LIKE ?)
                     ORDER BY name"
                );
                $like = "%{$q}%";
                $stmt->execute([$like, $like, $like]);
            } else {
                $stmt = db()->query(
                    "SELECT id, name, email, member_code, status, created_at
                     FROM users WHERE role = 'member' ORDER BY name"
                );
            }
            json_ok($stmt->fetchAll());
            break;

        case 'POST':
            $in    = body();
            $name  = trim((string)($in['name'] ?? ''));
            $email = trim((string)($in['email'] ?? ''));
            $pass  = (string)($in['password'] ?? '');
            $code  = trim((string)($in['member_code'] ?? ''));

            if ($name === '' || $email === '') {
                json_error('Name and email are required', 422);
            }
            if (strlen($pass) < 6) {
                json_error('Password must be at least 6 characters', 422);
            }
            try {
                db()->prepare(
                    "INSERT INTO users (name, email, password_hash, role, member_code, status)
                     VALUES (?, ?, ?, 'member', ?, 'active')"
                )->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT), $code ?: null]);
            } catch (PDOException $e) {
                json_error('Email or member code already in use', 409);
            }
            json_ok(['id' => (int)db()->lastInsertId()], 201);
            break;

        default:
            json_error('Method not allowed', 405);
    }
};
