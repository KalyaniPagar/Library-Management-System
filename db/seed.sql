-- Library Management System — seed data
-- Run AFTER schema.sql. Safe to re-run (clears tables first).
--
-- Default login:
--   admin@lms.test / admin123   (role: admin)
--   alice@lms.test / admin123   (role: member, same hash for convenience)

USE lms_db;

-- Clear in child-first order. DELETE (not TRUNCATE) because TRUNCATE is
-- rejected on tables referenced by a foreign key (MySQL error #1701).
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM loans;
DELETE FROM book_copies;
DELETE FROM books;
DELETE FROM categories;
DELETE FROM settings;
DELETE FROM users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- settings (single row) — design defaults
-- ---------------------------------------------------------------------------
INSERT INTO settings (id, loan_period_days, fine_per_day, max_books_per_member, currency)
VALUES (1, 14, 1.00, 3, 'INR');

-- ---------------------------------------------------------------------------
-- users — bcrypt hash below is for the password "admin123"
-- ---------------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role, member_code, status) VALUES
('Library Admin', 'admin@lms.test', '$2y$10$hxyfvo3OgQvC2eENMdMyze9.o4xJZo5eGjqOpM/RtxiaGdcgT8glm', 'admin',  NULL,      'active'),
('Alice Member',  'alice@lms.test', '$2y$10$hxyfvo3OgQvC2eENMdMyze9.o4xJZo5eGjqOpM/RtxiaGdcgT8glm', 'member', 'STU-001', 'active'),
('Bob Member',    'bob@lms.test',   '$2y$10$hxyfvo3OgQvC2eENMdMyze9.o4xJZo5eGjqOpM/RtxiaGdcgT8glm', 'member', 'STU-002', 'active');

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, name) VALUES
(1, 'Computer Science'),
(2, 'Fiction'),
(3, 'History'),
(4, 'Science');

-- ---------------------------------------------------------------------------
-- books
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, category_id, year, replacement_cost, description) VALUES
(1, 'Clean Code', 'Robert C. Martin', 1, 2008, 600.00, 'A handbook of agile software craftsmanship.'),
(2, 'The Pragmatic Programmer', 'Andrew Hunt, David Thomas', 1, 1999, 650.00, 'Your journey to mastery.'),
(3, 'Sapiens', 'Yuval Noah Harari', 3, 2011, 500.00, 'A brief history of humankind.'),
(4, 'A Brief History of Time', 'Stephen Hawking', 4, 1998, 450.00, 'From the big bang to black holes.'),
(5, '1984', 'George Orwell', 2, 1949, 300.00, 'Dystopian social science fiction.');

-- ---------------------------------------------------------------------------
-- book_copies — a couple per title; barcodes are <book>-cNN
-- ---------------------------------------------------------------------------
INSERT INTO book_copies (book_id, barcode, status) VALUES
(1, 'CC-c01', 'available'),
(1, 'CC-c02', 'available'),
(2, 'PP-c01', 'available'),
(3, 'SAP-c01', 'available'),
(3, 'SAP-c02', 'available'),
(4, 'BHT-c01', 'available'),
(5, '1984-c01', 'available'),
(5, '1984-c02', 'available');
