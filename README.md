# Job-Tracker---Kye

A local-first job application tracker: log applications, track recruitment stages and interviews, keep the full job description and notes, and see your search at a glance on a dashboard. It runs on `localhost` and stores everything in your own local PostgreSQL database. No accounts, no cloud, no external APIs.

## Running it

Requires Node.js 20+ (developed on Node 24) and a running PostgreSQL server (developed against PostgreSQL 18) with an existing database, e.g. `job_tracker`.

### First-time setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the connection string in `.env.local` (git-ignored; `.env.example` shows the format):
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/job_tracker
   ```
   URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `%` → `%25`, `:` → `%3A`, `/` → `%2F`).
3. Test the connection. This prints the server version and existing tables, never the password:
   ```bash
   npm run db:check
   ```
4. Create the tables and default role categories:
   ```bash
   npm run db:migrate
   ```

### Starting the app

```bash
npm run dev        # development server → http://localhost:3000
```

For a faster, production-mode server:

```bash
npm run build
npm run start      # → http://localhost:3000
```

The server listens on `127.0.0.1` only, so other devices on your network can't reach your data.

Other scripts: `npm run lint` (ESLint), `npx tsc --noEmit` (type-check), `npm run db:generate` (create a new migration after changing `src/db/schema.ts`).

## Where your data lives

All records are stored in the PostgreSQL database named in `DATABASE_URL`, in four tables: `applications`, `stage_history`, `events` and `categories`. Foreign keys cascade, so deleting an application also deletes its history and events. CHECK constraints only allow the defined stage, source, work-mode, employment-type and event values.

The browser never talks to the database directly. Pages read data on the server, and every change goes through validated server actions in `src/lib/actions.ts`. The connection string is only read on the server and is never sent to the browser.

**Backups:** use Data & Settings → **Export CSV**, or PostgreSQL's own tools:

```bash
pg_dump -U postgres -d job_tracker -f job_tracker_backup.sql
```

**Moving from the earlier browser-only version:** if this browser still holds applications saved by the old IndexedDB version, Data & Settings shows a **Records found in browser storage** card. It imports them into PostgreSQL, with the usual preview and duplicate checks.

## Using it

- **Add Application** (sidebar button) opens a sectioned form. Company, job title, role category and application date are required.
- **Applications** has search (company or title), filters (stage, category, source, location, work mode, employment type) and sortable columns. Filters are kept in the URL, so you can open a record and come back to the same view. Click a row for the full detail view: job description, notes, details, status history, and interviews/assessments.
- **Update stage** moves an application to *any* stage. Stages can be skipped or revisited, and each change is recorded in the status history with an optional date/time and note. Editing other fields never creates history entries.
- **Log event** records each interview or assessment round, with notes.
- **Dashboard** shows summary cards, a role-category donut chart, application sources (count and %) and the application trend line (weekly or monthly). Everything responds to the All time / Last 30 days / Last 90 days / Last 180 days filter, which applies to the application date.
- **Data & Settings** covers the database connection, CSV export/import, role categories (add, rename, delete; deleted categories move their applications to "Other"), and sample data.

### Metric definitions

| Metric | Definition |
| --- | --- |
| Total applications | All application records in the period |
| In progress | Current stage is not a final outcome (Rejected, Withdrawn, No Response, Position Closed). Offer counts as in progress. |
| Reached interview | Unique applications that were ever at First, Second or Technical Interview, or have a logged interview event |
| Offers | Unique applications that ever reached the Offer stage |
| Rejections | Applications whose *current* stage is Rejected |

Each application counts once per metric, however many stages or rounds it went through. Phone Screen is tracked separately and does not count as an interview.

### CSV import / export

Export writes one UTF-8 CSV per backup. It includes every field, with the status history and interview events as JSON columns, so the file is a complete backup. Cells that spreadsheet apps would run as formulas are escaped.

Import shows a preview before saving anything:

- At least **Company Name** and **Job Title** columns are required. Common alternative headers (`Company`, `Title`, `Status`, `Date Applied`, …) are recognised.
- Stages, sources, work modes and employment types match their labels case-insensitively. Unknown values fall back to a default and are flagged.
- Dates may be `YYYY-MM-DD`, `DD/MM/YYYY`, or `5 Mar 2026`. Unrecognised dates are left empty and flagged.
- **Duplicates** match an existing record by ID, or by company + job title + application date. You can skip them or replace the existing records. Rows that repeat within the file, or are missing required fields, are skipped.
- The server re-validates the file against the current database and writes it in a single transaction: if anything fails, nothing is written.

### Sample data

Data & Settings → **Load sample data** adds 10 demo records. Their company names start with "Sample Co", and they carry a *Sample* badge. **Remove sample data** deletes only those records.

## Tech stack

Next.js 16 (App Router, server components and server actions), TypeScript, PostgreSQL via `pg` and Drizzle ORM (with drizzle-kit migrations), Tailwind CSS v4, shadcn/ui (Radix), Recharts, date-fns and PapaParse.

```
drizzle/               SQL migrations (tables + default categories)
scripts/db-check.mjs   connection test (npm run db:check)
src/
  app/                 routes: dashboard (/), applications, settings; api/export (CSV download)
  db/                  Drizzle schema, connection pool, error messages
  components/
    applications/      form, table, filters, detail view, dialogs
    dashboard/         summary cards and charts
    settings/          database info, backup/import, legacy import, categories, sample data
    shared/, layout/   app shell, badges, empty/loading/error states
    ui/                shadcn/ui primitives
  lib/
    constants.ts       stages, sources, work modes, … (single source of truth)
    types.ts           data model
    repository.ts      server-only database reads/writes (transactions, stage history)
    actions.ts         server actions: input validation + calls into the repository
    metrics.ts         pure dashboard calculations
    application-query.ts  search / filter / sort
    csv.ts, validation.ts, dates.ts, sample-data.ts
```

## Limitations

- Single user, no login: anyone who can open `localhost:3000` on this computer can see and edit the data.
- There are no automated tests in the repo. Logic and UI were verified manually and with throwaway scripts during development.
- The interview metrics only count recorded interview stages or logged interview events. An application imported straight at "Offer", with no history, counts as an offer but not as interviewed.
- Light theme only. The layout is designed for desktop and tablet, and works on phones but isn't optimised for them.
