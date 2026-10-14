<?php
/**
 * Circulation routes. Issue / return / lost each run inside a DB transaction
 * that updates BOTH the loan and the copy's status, so they never disagree.
 *
 *   POST /loans/issue        admin   { barcode | copy_id, member_id }
 *   POST /loans/{id}/return  admin   compute overdue fine, free the copy
 *   POST /loans/{id}/lost    admin   charge replacement + overdue, retire copy
 *   POST /loans/{id}/pay     admin   mark fine paid
 *   GET  /loans              admin   all loans (?status=issued|overdue|returned|lost&member=)
 *   GET  /loans/mine         member  own loans + fines
 */

declare(strict_types=1);

/** Read the single settings row. */
function lms_settings(): array
{
    return db()->query('SELECT * FROM settings WHERE id = 1')->fetch() ?: [
        'loan_period_days' => 14, 'fine_per_day' => 1.0,
        'max_books_per_member' => 3, 'currency' => 'INR',
    ];
}

/** Whole days `$a` is past `$b` (0 if not past). Both 'Y-m-d'. */
function days_overdue(string $today, string $due): int
{
    $d = (new DateTime($due))->diff(new DateTime($today));
    return $today > $due ? (int)$d->days : 0;
}

return function (string $method, array $segments): void {
    $a = $segments[1] ?? null;   // "issue", "mine", or a numeric id
    $b = $segments[2] ?? null;   // "return", "lost", "pay"

    // ---- POST /loans/issue ------------------------------------------------
    if ($method === 'POST' && $a === 'issue') {
        require_admin();
        $in       = body();
        $memberId = (int)($in['member_id'] ?? 0);
        $copyId   = (int)($in['copy_id'] ?? 0);
        $barcode  = trim((string)($in['barcode'] ?? ''));
        $admin    = current_user();

        if ($memberId <= 0 || ($copyId <= 0 && $barcode === '')) {
            json_error('member_id and a copy_id or barcode are required', 422);
        }

        $set = lms_settings();
        $pdo = db();
        try {
            $pdo->beginTransaction();

            // Resolve & lock the copy.
            if ($copyId > 0) {
                $cs = $pdo->prepare('SELECT id, status FROM book_copies WHERE id = ? FOR UPDATE');
                $cs->execute([$copyId]);
            } else {
                $cs = $pdo->prepare('SELECT id, status FROM book_copies WHERE barcode = ? FOR UPDATE');
                $cs->execute([$barcode]);
            }
            $copy = $cs->fetch();
            if (!$copy) {
                $pdo->rollBack();
                json_error('Copy not found', 404);
            }
            if ($copy['status'] !== 'available') {
                $pdo->rollBack();
                json_error('That copy is not available (' . $copy['status'] . ')', 409);
            }

            // Member must exist, be a member, and be active.
            $ms = $pdo->prepare("SELECT id, status FROM users WHERE id = ? AND role = 'member'");
            $ms->execute([$memberId]);
            $member = $ms->fetch();
            if (!$member) {
                $pdo->rollBack();
                json_error('Member not found', 404);
            }
            if ($member['status'] !== 'active') {
                $pdo->rollBack();
                json_error('Member is inactive', 409);
            }

            // Enforce borrow limit.
            $ac = $pdo->prepare("SELECT COUNT(*) FROM loans WHERE user_id = ? AND status = 'issued'");
            $ac->execute([$memberId]);
            if ((int)$ac->fetchColumn() >= (int)$set['max_books_per_member']) {
                $pdo->rollBack();
                json_error('Member has reached the borrow limit of ' . $set['max_books_per_member'], 409);
            }

            $today = date('Y-m-d');
            $due   = date('Y-m-d', strtotime("+{$set['loan_period_days']} days"));

            $pdo->prepare(
                'INSERT INTO loans (copy_id, user_id, issued_by, issue_date, due_date, status)
                 VALUES (?, ?, ?, ?, ?, "issued")'
            )->execute([$copy['id'], $memberId, $admin['id'], $today, $due]);

            $pdo->prepare("UPDATE book_copies SET status = 'issued' WHERE id = ?")
                ->execute([$copy['id']]);

            $pdo->commit();
            json_ok(['loan_id' => (int)$pdo->lastInsertId(), 'due_date' => $due], 201);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            json_error('Issue failed', 500);
        }
    }

    // ---- GET /loans/mine --------------------------------------------------
    if ($method === 'GET' && $a === 'mine') {
        $user  = require_login();
        $set   = lms_settings();
        $today = date('Y-m-d');

        $stmt = db()->prepare(
            "SELECT l.id, l.issue_date, l.due_date, l.return_date,
                    l.fine_amount, l.fine_paid, l.status, bc.barcode, b.title
             FROM loans l
             JOIN book_copies bc ON bc.id = l.copy_id
             JOIN books b ON b.id = bc.book_id
             WHERE l.user_id = ?
             ORDER BY l.issue_date DESC"
        );
        $stmt->execute([$user['id']]);
        $rows = $stmt->fetchAll();

        // Projected fine for still-out overdue loans (not persisted).
        foreach ($rows as &$r) {
            $r['projected_fine'] = 0;
            if ($r['status'] === 'issued') {
                $od = days_overdue($today, $r['due_date']);
                $r['projected_fine'] = round($od * (float)$set['fine_per_day'], 2);
            }
        }
        json_ok(['loans' => $rows, 'currency' => $set['currency']]);
    }

    // ---- actions on a specific loan: /loans/{id}/{action} -----------------
    if ($a !== null && ctype_digit((string)$a)) {
        $loanId = (int)$a;

        // POST /loans/{id}/return
        if ($method === 'POST' && $b === 'return') {
            require_admin();
            $set = lms_settings();
            $pdo = db();
            try {
                $pdo->beginTransaction();
                $ls = $pdo->prepare('SELECT id, copy_id, due_date, status FROM loans WHERE id = ? FOR UPDATE');
                $ls->execute([$loanId]);
                $loan = $ls->fetch();
                if (!$loan) { $pdo->rollBack(); json_error('Loan not found', 404); }
                if ($loan['status'] !== 'issued') { $pdo->rollBack(); json_error('Loan is not open', 409); }

                $today = date('Y-m-d');
                $fine  = round(days_overdue($today, $loan['due_date']) * (float)$set['fine_per_day'], 2);

                $pdo->prepare("UPDATE loans SET return_date = ?, fine_amount = ?, status = 'returned' WHERE id = ?")
                    ->execute([$today, $fine, $loanId]);
                $pdo->prepare("UPDATE book_copies SET status = 'available' WHERE id = ?")
                    ->execute([$loan['copy_id']]);

                $pdo->commit();
                json_ok(['returned' => true, 'fine_amount' => $fine]);
            } catch (PDOException $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                json_error('Return failed', 500);
            }
        }

        // POST /loans/{id}/lost
        if ($method === 'POST' && $b === 'lost') {
            require_admin();
            $set = lms_settings();
            $pdo = db();
            try {
                $pdo->beginTransaction();
                $ls = $pdo->prepare(
                    'SELECT l.id, l.copy_id, l.due_date, l.status, b.replacement_cost
                     FROM loans l
                     JOIN book_copies bc ON bc.id = l.copy_id
                     JOIN books b ON b.id = bc.book_id
                     WHERE l.id = ? FOR UPDATE'
                );
                $ls->execute([$loanId]);
                $loan = $ls->fetch();
                if (!$loan) { $pdo->rollBack(); json_error('Loan not found', 404); }
                if ($loan['status'] !== 'issued') { $pdo->rollBack(); json_error('Loan is not open', 409); }

                $today   = date('Y-m-d');
                $overdue = round(days_overdue($today, $loan['due_date']) * (float)$set['fine_per_day'], 2);
                $fine    = round((float)$loan['replacement_cost'] + $overdue, 2);

                $pdo->prepare("UPDATE loans SET return_date = ?, fine_amount = ?, status = 'lost' WHERE id = ?")
                    ->execute([$today, $fine, $loanId]);
                $pdo->prepare("UPDATE book_copies SET status = 'lost' WHERE id = ?")
                    ->execute([$loan['copy_id']]);

                $pdo->commit();
                json_ok(['lost' => true, 'fine_amount' => $fine]);
            } catch (PDOException $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                json_error('Mark-lost failed', 500);
            }
        }

        // POST /loans/{id}/pay
        if ($method === 'POST' && $b === 'pay') {
            require_admin();
            db()->prepare('UPDATE loans SET fine_paid = 1 WHERE id = ?')->execute([$loanId]);
            json_ok(['paid' => true]);
        }

        json_error('Unknown loan action', 404);
    }

    // ---- GET /loans (admin list) ------------------------------------------
    if ($method === 'GET') {
        require_admin();
        $set    = lms_settings();
        $today  = date('Y-m-d');
        $status = $_GET['status'] ?? '';
        $member = (int)($_GET['member'] ?? 0);

        $where = [];
        $args  = [];
        if ($status === 'overdue') {
            $where[] = "l.status = 'issued' AND l.due_date < ?";
            $args[]  = $today;
        } elseif (in_array($status, ['issued', 'returned', 'lost'], true)) {
            $where[] = 'l.status = ?';
            $args[]  = $status;
        }
        if ($member > 0) {
            $where[] = 'l.user_id = ?';
            $args[]  = $member;
        }
        $clause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $stmt = db()->prepare(
            "SELECT l.id, l.issue_date, l.due_date, l.return_date,
                    l.fine_amount, l.fine_paid, l.status,
                    bc.barcode, b.title, u.name AS member_name, u.id AS member_id
             FROM loans l
             JOIN book_copies bc ON bc.id = l.copy_id
             JOIN books b ON b.id = bc.book_id
             JOIN users u ON u.id = l.user_id
             {$clause}
             ORDER BY l.issue_date DESC, l.id DESC"
        );
        $stmt->execute($args);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['overdue_days'] = $r['status'] === 'issued' ? days_overdue($today, $r['due_date']) : 0;
            $r['projected_fine'] = round($r['overdue_days'] * (float)$set['fine_per_day'], 2);
        }
        json_ok(['loans' => $rows, 'currency' => $set['currency']]);
    }

    json_error('Method not allowed', 405);
};
