# Pre-RLS data cleanup — delete abandoned test orgs

**Purpose:** before PR C-2 turns on tenant isolation, remove the 4 test
organizations (and their users) that accumulated during pre-launch
testing. They have no production data and no real owner. Leaving them
in place would mean a tester logging in as one of those test users
post-RLS would see an empty workspace — confusing during pen testing,
worse if anyone later forgets why those orgs exist.

**Scope:** orgs 21, 22, 23, 24 — confirmed empty per data audit on
2026-05-07 (1 user each, 0 clients, 0 products, 0 reports). Org 20 is
the real Ecom Era and is preserved.

| org_id | username (1 each) | email                  |
|--------|-------------------|------------------------|
| 21     | user1774514545657 | (synthetic test)       |
| 22     | test              | murtuxa@gmail.com      |
| 23     | testuser          | (synthetic test)       |
| 24     | murtaza_test      | (synthetic test)       |

**This file is a record of what was run, NOT an Alembic migration.**
The DELETE is run once by Murtaza out-of-band between the C-1 merge
and the C-2 merge. We commit it so we have a permanent answer to
"what did we delete and when?"

## Step 0 — Take a manual DB snapshot

Before any SQL runs, take a manual Railway DB snapshot:

1. Open Railway dashboard → your project → Postgres service → Backups tab
2. Click "Create Backup" or "New Backup"
3. Wait for "Backup successful" confirmation
4. Note the backup ID and timestamp in the Run log table at the bottom of this file

This is your rollback target. **Do NOT proceed with the cleanup SQL without it.** The Rollback section at the bottom assumes a recent snapshot exists.

## Pre-flight verification (run first; confirm audit hasn't drifted)

```sql
-- Confirm we're targeting the right orgs
SELECT id, name, plan, created_at
FROM organizations
WHERE id IN (21, 22, 23, 24)
ORDER BY id;

-- Confirm child-row counts before deleting
SELECT 'users'          AS tbl, COUNT(*) FROM users          WHERE org_id IN (21, 22, 23, 24)
UNION ALL
SELECT 'clients',                COUNT(*) FROM clients         WHERE org_id IN (21, 22, 23, 24)
UNION ALL
SELECT 'products',               COUNT(*) FROM products        WHERE org_id IN (21, 22, 23, 24)
UNION ALL
SELECT 'weekly_reports',         COUNT(*) FROM weekly_reports  WHERE org_id IN (21, 22, 23, 24)
UNION ALL
SELECT 'suppliers',              COUNT(*) FROM suppliers       WHERE org_id IN (21, 22, 23, 24)
UNION ALL
SELECT 'scout_results',          COUNT(*) FROM scout_results   WHERE org_id IN (21, 22, 23, 24)
UNION ALL
SELECT 'activity_logs',          COUNT(*) FROM activity_logs   WHERE org_id IN (21, 22, 23, 24)
ORDER BY tbl;
```

If any of `clients` / `products` / `weekly_reports` / `suppliers` / `scout_results` returns >0, **STOP**. The audit said empty; if it isn't, something else is going on. `activity_logs` may have rows (users logged in once) — that's fine, the script clears them too.

## Cleanup (single transaction; verify before COMMIT)

```sql
BEGIN;

-- Order matters because of FK constraints.
-- activity_logs.user_id → users.id, so clear child rows first.
DELETE FROM activity_logs WHERE org_id IN (21, 22, 23, 24);

-- Defense-in-depth: delete from every other tenant-data table
-- targeting these orgs. If the audit is correct these are no-ops,
-- but the SQL is safe either way.
DELETE FROM scout_results  WHERE org_id IN (21, 22, 23, 24);
DELETE FROM clients        WHERE org_id IN (21, 22, 23, 24);
DELETE FROM products       WHERE org_id IN (21, 22, 23, 24);
DELETE FROM weekly_reports WHERE org_id IN (21, 22, 23, 24);
DELETE FROM suppliers      WHERE org_id IN (21, 22, 23, 24);

-- Now safe: no FK references remain.
DELETE FROM users         WHERE org_id IN (21, 22, 23, 24);
DELETE FROM organizations WHERE id     IN (21, 22, 23, 24);

-- Verify — should show only org 20 (Ecom Era).
SELECT id, name FROM organizations ORDER BY id;

-- If the result above shows EXACTLY one row, id=20, name='Ecom Era':
COMMIT;
-- Anything else appears or unsure → ROLLBACK; investigate.
```

## Post-cleanup verification

```sql
SELECT id, name FROM organizations;
-- Expected: 1 row, (20, 'Ecom Era')

SELECT id, username, org_id, role FROM users ORDER BY id;
-- Expected: 6 rows — murtaza, bilal, hussain, areeb, jawwad, adnan
-- (all org_id=20, roles per seed.py)
```

## Rollback

If something goes wrong, restore from the Step 0 Railway snapshot:

1. Railway dashboard → Postgres service → Backups tab
2. Find the snapshot you took in Step 0 (by ID and timestamp from the Run log)
3. Click "Restore" — this reverts the database to its pre-cleanup state

If a single test org is needed later (after a successful cleanup), re-run `/auth/signup` as that user. The new id will be 25+, not the original 21–24.

## Run log

| Date | Operator | Snapshot ID / timestamp | Pre-count | Result | Notes |
|------|----------|-------------------------|-----------|--------|-------|
| _(empty until run)_ |  |  |  |  |  |
