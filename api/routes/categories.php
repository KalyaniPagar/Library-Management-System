<?php
/**
 * Category routes:
 *   GET  /categories   any    list (for filters & forms)
 *   POST /categories   admin  create { name }
 */

declare(strict_types=1);

return function (string $method, array $segments): void {
    switch ($method) {
        case 'GET':
            $rows = db()->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
            json_ok($rows);
            break;

        case 'POST':
            require_admin();
            $name = trim((string)(body()['name'] ?? ''));
            if ($name === '') {
                json_error('Name is required', 422);
            }
            try {
                db()->prepare('INSERT INTO categories (name) VALUES (?)')->execute([$name]);
            } catch (PDOException $e) {
                json_error('Category already exists', 409);
            }
            json_ok(['id' => (int)db()->lastInsertId()], 201);
            break;

        default:
            json_error('Method not allowed', 405);
    }
};
