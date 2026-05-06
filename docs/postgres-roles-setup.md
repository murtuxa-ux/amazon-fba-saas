# Postgres roles bootstrap for tenant isolation

**Purpose:** create the two-role split that PR C-2's RLS depends on.

- `migration_role` — `LOGIN` + `BYPASSRLS` + owns the 27 canonical
  tables. Used by Alembic, used by the runtime DB connection (the
  pool sees this role; per-request `SET LOCAL ROLE app_role` flips
  the active role inside each transaction).
- `app_role` — `LOGIN` + `NOBYPASSRLS` + has DML grants on the 27
  tables but does not own them. Cannot bypass RLS. The role the app
  effectively runs as for every authenticated request when
  `RLS_ENFORCED=true`.

**This file is a one-time bootstrap doc.** Murtaza runs the SQL in a
Railway `psql` console against prod, between the C-1 merge and the
C-2 merge. It is not an Alembic migration — role and ownership
changes touch the same role that's currently serving prod traffic;
keeping them out of Alembic avoids deadlock and Alembic-state
fragility.

## Prerequisites

- Connected to prod as the existing Railway-supplied superuser
  (today's `DATABASE_URL` role).
- A maintenance window or low-traffic period — step 3 transfers
  ownership and briefly takes an `ACCESS EXCLUSIVE` lock on each
  table.

## Step 1 — Create roles

Pick two strong passwords. Store them in your password manager AND
in Railway env vars (`MIGRATION_ROLE_PASSWORD`, `APP_ROLE_PASSWORD`)
before running these statements; otherwise you'll lock yourself out
of either account.

```sql
CREATE ROLE migration_role WITH LOGIN BYPASSRLS PASSWORD '<MIGRATION_ROLE_PASSWORD>';
CREATE ROLE app_role       WITH LOGIN NOBYPASSRLS PASSWORD '<APP_ROLE_PASSWORD>';
```

### Verify

```sql
SELECT rolname, rolcanlogin, rolbypassrls
FROM pg_roles
WHERE rolname IN ('migration_role', 'app_role')
ORDER BY rolname;
```

Expected: two rows; `app_role rolbypassrls=false`; `migration_role rolbypassrls=true`.

## Step 2 — Grant `app_role` connect + schema usage

```sql
GRANT CONNECT ON DATABASE <db_name> TO app_role;
GRANT USAGE ON SCHEMA public TO app_role;
```

(`<db_name>` is whatever Railway provisioned, visible via `\l`.)

## Step 3 — Transfer table ownership to `migration_role`

The 27 canonical tables. Run as one block — keep the list in lockstep with `models.py`:

```sql
ALTER TABLE organizations             OWNER TO migration_role;
ALTER TABLE users                     OWNER TO migration_role;
ALTER TABLE clients                   OWNER TO migration_role;
ALTER TABLE products                  OWNER TO migration_role;
ALTER TABLE weekly_reports            OWNER TO migration_role;
ALTER TABLE suppliers                 OWNER TO migration_role;
ALTER TABLE scout_results             OWNER TO migration_role;
ALTER TABLE activity_logs             OWNER TO migration_role;
ALTER TABLE buybox_trackers           OWNER TO migration_role;
ALTER TABLE buybox_history            OWNER TO migration_role;
ALTER TABLE buybox_alerts             OWNER TO migration_role;
ALTER TABLE ppc_campaigns             OWNER TO migration_role;
ALTER TABLE ppc_keywords              OWNER TO migration_role;
ALTER TABLE ppc_ad_groups             OWNER TO migration_role;
ALTER TABLE profit_analyses           OWNER TO migration_role;
ALTER TABLE brand_approvals           OWNER TO migration_role;
ALTER TABLE brand_documents           OWNER TO migration_role;
ALTER TABLE brand_timeline            OWNER TO migration_role;
ALTER TABLE fba_shipments             OWNER TO migration_role;
ALTER TABLE fba_shipment_items        OWNER TO migration_role;
ALTER TABLE fbm_orders                OWNER TO migration_role;
ALTER TABLE fbm_orders_items          OWNER TO migration_role;
ALTER TABLE account_health_snapshots  OWNER TO migration_role;
ALTER TABLE account_violations        OWNER TO migration_role;
ALTER TABLE client_portal_users       OWNER TO migration_role;
ALTER TABLE client_messages           OWNER TO migration_role;
ALTER TABLE alembic_version           OWNER TO migration_role;
```

(`alembic_version` is included so future Alembic runs can write to it without elevated grants.)

### Verify

```sql
SELECT tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'organizations','users','clients','products','weekly_reports',
      'suppliers','scout_results','activity_logs',
      'buybox_trackers','buybox_history','buybox_alerts',
      'ppc_campaigns','ppc_keywords','ppc_ad_groups',
      'profit_analyses',
      'brand_approvals','brand_documents','brand_timeline',
      'fba_shipments','fba_shipment_items',
      'fbm_orders','fbm_orders_items',
      'account_health_snapshots','account_violations',
      'client_portal_users','client_messages',
      'alembic_version'
  )
ORDER BY tablename;
```

Expected: 27 rows, all `tableowner = 'migration_role'`.

## Step 4 — Grant DML on canonical tables to `app_role`

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON
    organizations, users, clients, products, weekly_reports,
    suppliers, scout_results, activity_logs,
    buybox_trackers, buybox_history, buybox_alerts,
    ppc_campaigns, ppc_keywords, ppc_ad_groups,
    profit_analyses,
    brand_approvals, brand_documents, brand_timeline,
    fba_shipments, fba_shipment_items,
    fbm_orders, fbm_orders_items,
    account_health_snapshots, account_violations,
    client_portal_users, client_messages
TO app_role;
```

(`alembic_version` is **not** granted to `app_role` — only `migration_role` writes to it.)

## Step 5 — Sequence access for `app_role`

Every table with `id SERIAL` / `IDENTITY` has a paired sequence that `app_role` needs `USAGE` on for `INSERT` to work.

```sql
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;

-- Future-proof for tables added later by Alembic — sequences:
ALTER DEFAULT PRIVILEGES FOR ROLE migration_role IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_role;

-- Future-proof for tables added later by Alembic — tables:
-- so any new table created by future migrations as migration_role
-- automatically grants DML to app_role without re-running this doc.
ALTER DEFAULT PRIVILEGES FOR ROLE migration_role IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;
```

### Verify

```sql
-- A spot-check: app_role should be able to nextval on the users seq.
SET ROLE app_role;
SELECT nextval('users_id_seq');   -- returns next int; harmless
RESET ROLE;
```

## Step 6 — Update Railway `DATABASE_URL`

In the Railway dashboard, change the backend service's `DATABASE_URL` to use `migration_role` credentials:

```
postgresql://migration_role:<MIGRATION_ROLE_PASSWORD>@<host>:<port>/<db>
```

(Don't change `DATABASE_PUBLIC_URL` — that's the superuser path used for psql access from outside the cluster.)

The pool reconnects on next deploy. Until PR C-2 deploys, the new URL is functionally identical to the old (still BYPASSRLS, still owns tables).

## Step 7 — Final verification

```sql
-- 1. Both roles present
SELECT rolname, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname IN ('migration_role', 'app_role');

-- 2. All 27 canonical tables owned by migration_role
SELECT COUNT(*)
FROM pg_tables
WHERE schemaname='public'
  AND tableowner='migration_role'
  AND tablename IN (
      'organizations','users','clients','products','weekly_reports',
      'suppliers','scout_results','activity_logs',
      'buybox_trackers','buybox_history','buybox_alerts',
      'ppc_campaigns','ppc_keywords','ppc_ad_groups',
      'profit_analyses',
      'brand_approvals','brand_documents','brand_timeline',
      'fba_shipments','fba_shipment_items',
      'fbm_orders','fbm_orders_items',
      'account_health_snapshots','account_violations',
      'client_portal_users','client_messages',
      'alembic_version'
  );
-- Expected: 27.

-- 3. app_role has DML on a sample canonical table
SET ROLE app_role;
SELECT COUNT(*) FROM users;
RESET ROLE;
-- Expected: a number (works), no permission denied.
```

## Rollback

If anything goes wrong and prod is broken:

```sql
-- Revert table ownership to the original superuser
ALTER TABLE <each table> OWNER TO <original_superuser_name>;

-- Revoke app_role grants
REVOKE ALL ON SCHEMA public FROM app_role;
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM app_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM app_role;

-- Drop the new roles
DROP ROLE app_role;
DROP ROLE migration_role;

-- Revert DATABASE_URL in Railway dashboard.
```

## Run log

| Date | Operator | Step reached | Result | Notes |
|------|----------|--------------|--------|-------|
| _(empty until run)_ |  |  |  |  |
