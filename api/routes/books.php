<?php
/**
 * Book routes:
 *   GET    /books                 any    list + search (?q=&category=&page=)
 *   GET    /books/{id}            any    detail incl. copies & availability
 *   POST   /books                 admin  create
 *   PUT    /books/{id}            admin  update
 *   DELETE /books/{id}            admin  delete (cascades copies)
 *   POST   /books/{id}/copies     admin  add a copy { barcode }
 *
 * Returns a callable invoked as ($method, $segments).
 */

declare(strict_types=1);

const PAGE_SIZE = 12;

return function (string $method, array $segments): void {
    $id  = $segments[1] ?? null;          // /books/{id}
    $sub = $segments[2] ?? null;          // /books/{id}/copies

    // ---- POST /books/{id}/copies : add a copy -----------------------------
    if ($method === 'POST' && $id !== null && $sub === 'copies') {
        require_admin();
        $barcode = trim((string)(body()['barcode'] ?? ''));
        if ($barcode === '') {
            json_error('Barcode is required', 422);
        }
        try {
            db()->prepare('INSERT INTO book_copies (book_id, barcode) VALUES (?, ?)')
                ->execute([(int)$id, $barcode]);
        } catch (PDOException $e) {
            json_error('Barcode already exists', 409);
        }
        json_ok(['added' => true], 201);
    }

    // ---- /books/{id} : single book ----------------------------------------
    if ($id !== null) {
        switch ($method) {
            case 'GET':
                $stmt = db()->prepare(
                    'SELECT b.*, c.name AS category_name
                     FROM books b LEFT JOIN categories c ON c.id = b.category_id
                     WHERE b.id = ?'
                );
                $stmt->execute([(int)$id]);
                $book = $stmt->fetch();
                if (!$book) {
                    json_error('Book not found', 404);
                }
                // Attach copies.
                $cs = db()->prepare('SELECT id, barcode, status FROM book_copies WHERE book_id = ? ORDER BY id');
                $cs->execute([(int)$id]);
                $copies = $cs->fetchAll();
                $book['copies'] = $copies;
                $book['available'] = count(array_filter($copies, fn($c) => $c['status'] === 'available'));
                json_ok($book);
                break;

            case 'PUT':
                require_admin();
                $in = body();
                $fields = ['title','author','category_id','year','replacement_cost','description'];
                $set = [];
                $vals = [];
                foreach ($fields as $f) {
                    if (array_key_exists($f, $in)) {
                        $set[] = "{$f} = ?";
                        $vals[] = $in[$f] === '' ? null : $in[$f];
                    }
                }
                if (!$set) {
                    json_error('Nothing to update', 422);
                }
                $vals[] = (int)$id;
                db()->prepare('UPDATE books SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($vals);
                json_ok(['updated' => true]);
                break;

            case 'DELETE':
                require_admin();
                db()->prepare('DELETE FROM books WHERE id = ?')->execute([(int)$id]);
                json_ok(['deleted' => true]);
                break;

            default:
                json_error('Method not allowed', 405);
        }
    }

    // ---- /books : collection ----------------------------------------------
    switch ($method) {
        case 'GET':
            $q        = trim((string)($_GET['q'] ?? ''));
            $category = (int)($_GET['category'] ?? 0);
            $page     = max(1, (int)($_GET['page'] ?? 1));
            $offset   = ($page - 1) * PAGE_SIZE;

            $where = [];
            $args  = [];
            if ($q !== '') {
                $where[] = '(b.title LIKE ? OR b.author LIKE ?)';
                $args[] = "%{$q}%";
                $args[] = "%{$q}%";
            }
            if ($category > 0) {
                $where[] = 'b.category_id = ?';
                $args[] = $category;
            }
            $clause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

            // Total for pagination.
            $countStmt = db()->prepare("SELECT COUNT(*) FROM books b {$clause}");
            $countStmt->execute($args);
            $total = (int)$countStmt->fetchColumn();

            // Page of books, with availability computed via a subquery.
            $sql = "SELECT b.id, b.title, b.author, b.year,
                           c.name AS category_name,
                           (SELECT COUNT(*) FROM book_copies bc
                              WHERE bc.book_id = b.id AND bc.status = 'available') AS available,
                           (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) AS total_copies
                    FROM books b LEFT JOIN categories c ON c.id = b.category_id
                    {$clause}
                    ORDER BY b.title
                    LIMIT ? OFFSET ?";
            $stmt = db()->prepare($sql);
            // Bind search args, then LIMIT/OFFSET as integers.
            $i = 1;
            foreach ($args as $a) {
                $stmt->bindValue($i++, $a);
            }
            $stmt->bindValue($i++, PAGE_SIZE, PDO::PARAM_INT);
            $stmt->bindValue($i++, $offset, PDO::PARAM_INT);
            $stmt->execute();

            json_ok([
                'books' => $stmt->fetchAll(),
                'page'  => $page,
                'pages' => (int)ceil($total / PAGE_SIZE),
                'total' => $total,
            ]);
            break;

        case 'POST':
            require_admin();
            $in = body();
            $title  = trim((string)($in['title'] ?? ''));
            $author = trim((string)($in['author'] ?? ''));
            if ($title === '' || $author === '') {
                json_error('Title and author are required', 422);
            }
            $stmt = db()->prepare(
                'INSERT INTO books (title, author, category_id, year, replacement_cost, description)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $title,
                $author,
                ($in['category_id'] ?? '') ?: null,
                ($in['year'] ?? '') ?: null,
                $in['replacement_cost'] ?? 0,
                ($in['description'] ?? '') ?: null,
            ]);
            json_ok(['id' => (int)db()->lastInsertId()], 201);
            break;

        default:
            json_error('Method not allowed', 405);
    }
};
