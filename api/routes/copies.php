<?php
/**
 * Copy routes:
 *   DELETE /copies/{id}   admin   remove a copy (only if it's available)
 */

declare(strict_types=1);

return function (string $method, array $segments): void {
    $id = $segments[1] ?? null;

    if ($method === 'DELETE' && $id !== null) {
        require_admin();

        // Don't delete a copy that's currently issued or lost — it has history.
        $stmt = db()->prepare('SELECT status FROM book_copies WHERE id = ?');
        $stmt->execute([(int)$id]);
        $status = $stmt->fetchColumn();

        if ($status === false) {
            json_error('Copy not found', 404);
        }
        if ($status !== 'available') {
            json_error('Only available copies can be removed', 409);
        }

        db()->prepare('DELETE FROM book_copies WHERE id = ?')->execute([(int)$id]);
        json_ok(['deleted' => true]);
    }

    json_error('Method not allowed', 405);
};
