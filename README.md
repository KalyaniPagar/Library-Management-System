# Library Management System (LMS)

A web app for running a small library. The admin manages books, copies and members, and issues and returns books. Members browse the catalog and see their own loans and fines.

## Tech stack

- **Backend:** PHP REST API with MySQL, running on XAMPP (Apache + MySQL)
- **Frontend:** React 19, React Router, Vite, Axios, Bootstrap 5
- **Design:** full schema, API contract, roles and fines logic in [DESIGN.md](DESIGN.md)

## Folder layout

```
LMS/
  api/         PHP REST API (entry point: api/index.php)
  client/      React frontend (see client/README.md)
  db/
    schema.sql   creates the empty tables
    seed.sql     loads sample data (users, books, copies)
  DESIGN.md    system design
```

## Setup

The project folder must be `C:\xampp\htdocs\LMS`, because the frontend expects the API at `http://localhost/LMS/api`.

1. **Start XAMPP.** Open the XAMPP Control Panel and start **Apache** and **MySQL**.
2. **Create the database.** Open http://localhost/phpmyadmin, go to the **Import** tab, and import `db/schema.sql`, then `db/seed.sql`.
3. **Run the frontend.** From the `client` folder:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:5173 and log in.

> **Warning:** `seed.sql` deletes all existing rows before loading the sample data. Do not run it again once you have real data.

The database connection uses the XAMPP defaults (user `root`, empty password). To change them, set the `LMS_DB_USER` and `LMS_DB_PASS` environment variables. See `api/config/db.php`.

More frontend details are in [client/README.md](client/README.md).

## Demo logins

These accounts come from `seed.sql` and are for demo use only. Change the passwords before using the system for real.

| Role   | Email           | Password |
|--------|-----------------|----------|
| Admin  | admin@lms.test  | admin123 |
| Member | alice@lms.test  | admin123 |
| Member | bob@lms.test    | admin123 |

## Copies

A book is a title. Each physical copy is a separate record with a unique barcode and a status: `available`, `issued` or `lost`. "1 of 2 available" means the library owns 2 copies and 1 can be borrowed now. The admin adds copies one at a time by typing a barcode, and there is no limit on how many copies a book can have.

## Member codes

The member code is an optional, unique ID label the admin gives a member, such as a student or staff number. It is shown in the Members list and can be used to search for a member. It is not used for login, and not used when issuing or returning books.

## Circulation

The admin issues a book by entering the copy's barcode, then returns it or marks it lost. Issuing, returning and marking lost update both the loan and the copy's status together.

## Fines

- A late return is charged per day overdue. The default is INR 1 per day, with a 14-day loan period and a limit of 3 books per member (set in the `settings` table).
- A lost book is charged its replacement cost plus any overdue fine.
- The dashboard's outstanding fines figure is unpaid recorded fines plus fines building up on books that are currently overdue. The admin marks a fine as paid in Circulation.

## Roles

| Role   | Can do |
|--------|--------|
| Member | Browse the catalog, view own loans and fines, change password |
| Admin  | Everything above, plus manage books, copies and members, issue, return or mark lost, record fine payments, and view the dashboard |
