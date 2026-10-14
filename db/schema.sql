-- Library Management System — schema
-- MySQL 5.7+/8, InnoDB, utf8mb4. Run this once to create the database.

CREATE DATABASE IF NOT EXISTS lms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lms_db;

-- Drop in reverse-dependency order so the script is re-runnable.
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS book_copies;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------------
-- users — both admins/librarians and members
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(120)        NOT NULL,
  email         VARCHAR(160)        NOT NULL,
  password_hash VARCHAR(255)        NOT NULL,
  role          ENUM('admin','member') NOT NULL DEFAULT 'member',
  member_code   VARCHAR(40)         NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_member_code (member_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- books — the bibliographic record (a title)
-- ---------------------------------------------------------------------------
CREATE TABLE books (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  title            VARCHAR(255) NOT NULL,
  author           VARCHAR(160) NOT NULL,
  category_id      INT          NULL,
  year             SMALLINT     NULL,
  replacement_cost DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  description      TEXT         NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_books_category (category_id),
  FULLTEXT KEY ft_books_title_author (title, author),
  CONSTRAINT fk_books_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- book_copies — physical copies; availability lives here
-- ---------------------------------------------------------------------------
CREATE TABLE book_copies (
  id      INT PRIMARY KEY AUTO_INCREMENT,
  book_id INT NOT NULL,
  barcode VARCHAR(40) NOT NULL,
  status  ENUM('available','issued','lost') NOT NULL DEFAULT 'available',
  UNIQUE KEY uq_copies_barcode (barcode),
  KEY idx_copies_book (book_id),
  KEY idx_copies_status (status),
  CONSTRAINT fk_copies_book FOREIGN KEY (book_id)
    REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- loans — one row per issue event
-- ---------------------------------------------------------------------------
CREATE TABLE loans (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  copy_id     INT NOT NULL,
  user_id     INT NOT NULL,
  issued_by   INT NOT NULL,
  issue_date  DATE NOT NULL,
  due_date    DATE NOT NULL,
  return_date DATE NULL,
  fine_amount DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  fine_paid   TINYINT(1)   NOT NULL DEFAULT 0,
  status      ENUM('issued','returned','lost') NOT NULL DEFAULT 'issued',
  KEY idx_loans_copy (copy_id),
  KEY idx_loans_user (user_id),
  KEY idx_loans_status (status),
  CONSTRAINT fk_loans_copy   FOREIGN KEY (copy_id)   REFERENCES book_copies(id),
  CONSTRAINT fk_loans_user   FOREIGN KEY (user_id)   REFERENCES users(id),
  CONSTRAINT fk_loans_issuer FOREIGN KEY (issued_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- settings — single-row config (id is always 1)
-- ---------------------------------------------------------------------------
CREATE TABLE settings (
  id                   TINYINT PRIMARY KEY DEFAULT 1,
  loan_period_days     INT          NOT NULL DEFAULT 14,
  fine_per_day         DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  max_books_per_member INT          NOT NULL DEFAULT 3,
  currency             VARCHAR(8)   NOT NULL DEFAULT 'INR'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
