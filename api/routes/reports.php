<?php
/**
 * Report routes (admin only).
 *   GET /reports/summary   KPI counts for the dashboard cards
 *   GET /reports/popular   most-borrowed books
 *   GET /reports/overdue   currently overdue loans
 */

declare(strict_types=1);

return function (string $method, array $segments): void {
    require_admin();
    $what = $segments[1] ?? 'summary';
    $pdo  = db();
    $today = date('Y-m-d');

    if ($method !== 'GET') {
        json_error('Method not allowed', 405);
    }

    switch ($what) {
        // -------------------------------------------------------------------
        case 'summary': {
            $set = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
            $finePerDay = (float)($set['fine_per_day'] ?? 1);

            $scalar = fn(string $sql, array $a = []) => (function () use ($pdo, $sql, $a) {
                $s = $pdo->prepare($sql); $s->execute($a); return $s->fetchColumn();
            })();

            // Outstanding = unpaid persisted fines + projected fines on overdue open loans.
            $persisted = (float)$scalar('SELECT COALESCE(SUM(fine_amount),0) FROM loans WHERE fine_paid = 0');
            $projected = (float)$scalar(
                "SELECT COALESCE(SUM(DATEDIFF(?, due_date)),0) FROM loans
                 WHERE status = 'issued' AND due_date < ?",
                [$today, $today]
            ) * $finePerDay;

            json_ok([
                'currency'          => $set['currency'] ?? 'INR',
                'total_books'       => (int)$scalar('SELECT COUNT(*) FROM books'),
                'total_copies'      => (int)$scalar('SELECT COUNT(*) FROM book_copies'),
                'available_copies'  => (int)$scalar("SELECT COUNT(*) FROM book_copies WHERE status = 'available'"),
                'total_members'     => (int)$scalar("SELECT COUNT(*) FROM users WHERE role = 'member'"),
                'active_loans'      => (int)$scalar("SELECT COUNT(*) FROM loans WHERE status = 'issued'"),
                'issued_today'      => (int)$scalar('SELECT COUNT(*) FROM loans WHERE issue_date = ?', [$today]),
                'overdue_count'     => (int)$scalar("SELECT COUNT(*) FROM loans WHERE status = 'issued' AND due_date < ?", [$today]),
                'lost_count'        => (int)$scalar("SELECT COUNT(*) FROM loans WHERE status = 'lost'"),
                'outstanding_fines' => round($persisted + $projected, 2),
            ]);
            break;
        }

        // -------------------------------------------------------------------
        case 'popular': {
            $rows = $pdo->query(
                "SELECT b.id, b.title, b.author, COUNT(l.id) AS times_borrowed
                 FROM loans l
                 JOIN book_copies bc ON bc.id = l.copy_id
                 JOIN books b ON b.id = bc.book_id
                 GROUP BY b.id, b.title, b.author
                 ORDER BY times_borrowed DESC, b.title
                 LIMIT 10"
            )->fetchAll();
            json_ok($rows);
            break;
        }

        // -------------------------------------------------------------------
        case 'overdue': {
            $stmt = $pdo->prepare(
                "SELECT l.id, l.due_date, DATEDIFF(?, l.due_date) AS overdue_days,
                        b.title, bc.barcode, u.name AS member_name
                 FROM loans l
                 JOIN book_copies bc ON bc.id = l.copy_id
                 JOIN books b ON b.id = bc.book_id
                 JOIN users u ON u.id = l.user_id
                 WHERE l.status = 'issued' AND l.due_date < ?
                 ORDER BY l.due_date"
            );
            $stmt->execute([$today, $today]);
            json_ok($stmt->fetchAll());
            break;
        }

        default:
            json_error('Unknown report', 404);
    }
};
