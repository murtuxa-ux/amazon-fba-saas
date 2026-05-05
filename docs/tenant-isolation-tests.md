# Tenant Isolation — Test Runbook

**Owner:** Engineering
**Status:** Living document. Update with every PR that touches tenant boundaries.
**Acceptance criteria for:** PR C (multi-tenancy / RLS) per Engineering Audit Brief §2.1.

This document defines exactly what "tenant isolation works" means for the Ecom Era FBA SaaS.
Two organizations sharing one Postgres database must never see, modify, or infer each other's data.

---

## 1. Scope and threat model

### What we're protecting against

- **Authenticated tenant A reads tenant B's data** — the dominant risk. Most likely vector: a missed `org_id` filter in a router module, a fragile join, or a route that uses an integer `id` lookup without org scoping. RLS exists to catch what the application code misses.
- **Forged identifiers in request bodies** — client sends `org_id=B` in JSON while authenticated as A. Trust the JWT, never trust the body.
- **JWT manipulation** — token tampering, replay across orgs, expired-token reuse, signature stripping (`alg=none`).
- **Cross-tenant indirect inference** — counts, aggregate analytics, error messages that leak existence of another tenant's resources (e.g., 403 "this client belongs to another org" instead of 404 "not found").
- **Webhook spoofing** — Stripe/external webhooks crafted to mutate state on the wrong org.
- **Support-mode escalation** — Murtaza viewing any tenant for debugging must be explicit, logged, and time-bounded.

### Out of scope (for now)

- Side-channel timing attacks across orgs.
- Postgres logical-replication leaks (Railway-managed; we trust the platform).
- Backup-tape exfiltration (operational risk, not application risk).

---

## 2. Acceptance criteria for PR C (multi-tenancy)

PR C does not merge unless **every** item below passes.

### 2.1 Schema invariants

- [ ] Every customer-data table has a non-nullable `org_id INTEGER NOT NULL` column with `FOREIGN KEY (org_id) REFERENCES organizations(id)`.
- [ ] No `ON DELETE CASCADE` from `organizations` to customer tables in PR C — keep cascade for explicit teardown only (defer to a later "delete account" feature).
- [ ] Every customer-data table has `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` set.
- [ ] A `tenant_isolation` policy exists on every customer-data table:
  ```sql
  USING (org_id = current_setting('app.current_org_id', true)::int)
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::int)
  ```
  (`true` second arg makes `current_setting` return NULL when unset rather than raising — safer for migration scripts that run with no session var.)
- [ ] The Postgres role that the FastAPI app connects with does **not** have `BYPASSRLS` and is **not** the table owner.
- [ ] A separate `migration_role` (used by Alembic) **does** have `BYPASSRLS` and is used **only** for migrations, not for app traffic.

### 2.2 Application-level invariants

- [ ] Every authenticated route uses a dependency that runs `SET LOCAL app.current_org_id = <user.org_id>` at the start of the request transaction.
- [ ] Public routes (`/`, `/health`, `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/webhooks/stripe`) do **not** set `app.current_org_id` and do **not** query customer-data tables (except via explicitly scoped lookups inside the webhook handler).
- [ ] No application code calls `db.query(<CustomerTable>)` without an `org_id` filter. CI lint rule (item 6.1 below) enforces this.
- [ ] No response payload includes `org_id` for the caller's own data (it's redundant — the JWT carries it) and never includes another org's `org_id`.

### 2.3 Test invariants

- [ ] All tests in §3 (automated CI) pass on a fresh database.
- [ ] All scenarios in §4 (manual probing) have been executed and documented as passing within the PR description.
- [ ] CI gate is wired: a PR that breaks any §3 test cannot be merged.

---

## 3. Automated CI tests

These live in `backend/tests/test_tenant_isolation.py` and run on every PR via GitHub Actions.

### 3.1 Fixture: two tenants, fully populated

```python
@pytest.fixture
def two_tenants(db_session):
    """
    Org A: Ecom Era (the existing tenant).
    Org B: Acme Wholesale (synthetic).

    Each has 1 owner user + populated rows in every customer-data table.
    Returns (org_a, user_a, org_b, user_b, token_a, token_b).
    """
```

Populated tables per org: `users`, `clients` (3 rows), `products` (5 rows), `weekly_reports` (4 rows), `suppliers` (2 rows), `scout_results` (10 rows), `activity_logs` (5 rows), `buybox_trackers` (3 rows), `buybox_history` (10 rows), `buybox_alerts` (3 rows), and every `models_phase12` table after consolidation (PPC*, ProfitAnalysis, Brand*, FBA*, FBM*, AccountHealth*, ClientPortal*, ClientMessage).

Row IDs across the two orgs **must overlap** (e.g., both orgs have a `clients.id = 1`). This is critical: if the test only worked because IDs were disjoint, it wouldn't catch real-world ID collisions.

### 3.2 Test categories

#### Read isolation (every list/get endpoint)

For every `GET` endpoint that returns customer data:

- [ ] **`test_list_returns_only_own_org`** — login as A, hit endpoint, assert every returned row's `org_id` is A's. Loop over a table of all list endpoints.
- [ ] **`test_get_by_id_other_org_returns_404`** — login as A, hit `GET /<resource>/<orgB_resource_id>`. Must return **404**, not 403 (per brief §2.1 acceptance: don't leak existence).
- [ ] **`test_count_endpoints_dont_leak`** — login as A, hit `/dashboard`, `/reports/summary`, `/leaderboard`. Aggregates must reflect only org A's rows.

#### Write isolation (every mutating endpoint)

- [ ] **`test_put_other_org_returns_404`** — login as A, `PUT /clients/<orgB_client_id>`. Must return 404 and **must not** update org B's row.
- [ ] **`test_delete_other_org_returns_404`** — same, for DELETE.
- [ ] **`test_post_with_forged_org_id_in_body_ignored`** — login as A, `POST /clients` with body `{"name": "...", "org_id": <B_id>}`. The created row must have `org_id = A`, not B. (The Pydantic schemas don't accept `org_id` in input, so this should be a no-op, but verify.)
- [ ] **`test_post_with_foreign_client_id_rejected`** — login as A, `POST /weekly` referencing a `client_id` that belongs to org B. Must return 404 (or 422) and **must not** create the row.

#### RLS as second layer

This is the test that proves RLS isn't a paper tiger:

- [ ] **`test_rls_blocks_unset_session_var`** — open a raw connection (using the app role, not migration role), do **not** set `app.current_org_id`, run `SELECT * FROM clients`. Must return **0 rows** (RLS USING clause filters all rows when the setting is NULL).
- [ ] **`test_rls_blocks_wrong_session_var`** — open a raw connection as the app role, `SET LOCAL app.current_org_id = <A>`, then `SELECT * FROM clients WHERE org_id = <B>`. Must return 0 rows. The query asks for B's rows; RLS overrides and returns A's filter.
- [ ] **`test_rls_blocks_insert_with_wrong_org_id`** — `SET LOCAL app.current_org_id = <A>`, `INSERT INTO clients (org_id, name) VALUES (<B>, 'leak')`. Must raise (RLS WITH CHECK clause rejects).
- [ ] **`test_rls_blocks_update_to_other_org`** — `SET LOCAL app.current_org_id = <A>`, `UPDATE clients SET org_id = <B> WHERE id = <a_client_id>`. Must raise or affect 0 rows.
- [ ] **`test_app_role_is_not_bypassrls`** — `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`. Must return `false`. If `true`, fail the build immediately — RLS is meaningless.
- [ ] **`test_app_role_is_not_table_owner`** — for each customer table, `SELECT tableowner FROM pg_tables WHERE tablename = '<table>'`. Must not equal `current_user` (table owners bypass RLS by default).

#### Auth boundary

- [ ] **`test_unauthenticated_request_returns_401`** — every authenticated route, no `Authorization` header → 401.
- [ ] **`test_invalid_jwt_returns_401`** — bogus token → 401.
- [ ] **`test_expired_jwt_returns_401`** — fabricate an expired JWT (signed correctly, `exp` in past) → 401.
- [ ] **`test_alg_none_jwt_rejected`** — token with `alg: none` and no signature → 401. (Library should already reject; verify.)
- [ ] **`test_jwt_with_modified_org_id_does_not_change_access`** — sign a token with `user_id=<A_user>` but `org_id=<B>`. The middleware should set `app.current_org_id` from the JWT's `org_id` claim **only if** that matches the database's `users.org_id` for `user_id`. Mismatch → 401 or treat the DB row as authoritative. **Decision needed:** which? See §6.2.
- [ ] **`test_jwt_replay_across_orgs_blocked`** — A's token cannot be presented as B's. (Implicit: tokens are scoped by `user_id`, not `org_id`, so replay is moot. But document.)

#### Webhook isolation

- [ ] **`test_stripe_webhook_signature_required`** — POST to `/webhooks/stripe` without valid Stripe signature → 400.
- [ ] **`test_stripe_webhook_lookup_by_customer_id`** — webhook payload referencing a Stripe `customer.id` that maps to org B → state mutation lands on B only. Same payload sent twice → idempotent.
- [ ] **`test_stripe_webhook_unknown_customer_ignored`** — payload with an unknown `customer.id` → handler does nothing, returns 200, logs a warning.

#### Support mode (Murtaza-only escalation)

This is a Phase-3 feature per brief §2.1 step 5. The test stubs are written now, marked `@pytest.mark.skip(reason="not yet implemented")`, and unskipped when support mode lands.

- [ ] **`test_support_mode_requires_owner_role_in_ecomera_org`** — only users with role=owner AND org_id=1 (Ecom Era) can enter support mode.
- [ ] **`test_support_mode_writes_audit_log`** — every support-mode session creates a row in `cross_tenant_access` with `support_user_id`, `target_org_id`, `entered_at`, `exited_at`, `reason`.
- [ ] **`test_support_mode_session_var_swap`** — entering support mode for org B sets `app.current_org_id` to B's id for the duration; exit reverts.

### 3.3 Negative-test sanity check

A meta-test: temporarily monkey-patch the application to disable RLS (e.g., set `BYPASSRLS=true` on the test role), re-run the read-isolation block, and assert that **at least one** test fails. If none fail, the tests aren't actually exercising RLS — they're passing for the wrong reason. This runs locally only, not in CI.

---

## 4. Manual probing runbook (pre-launch checklist)

Run this against staging within the week before soft launch (brief §9 Week 4). Document each outcome inline in this file under §7.

### 4.1 Setup

1. Provision two test orgs in staging: `staging-a@ecomera.us` and `staging-b@ecomera.us`. Populate each with 5–10 clients, products, scout results.
2. Note both org IDs and both JWT tokens. Save in `docs/tenant-isolation-pentest-staging.md` (gitignored).
3. Have a Postgres console open with the migration role, ready to inspect `pg_roles`, `pg_policies`, and `app.current_org_id`.

### 4.2 Probing scenarios

For each scenario, record **expected** vs **observed** in §7.

#### Scenario 1: Forged `org_id` in request body
1. Login as A. Get token.
2. `POST /clients` with body `{"name": "Probe", "org_id": <B_id>, ...}`.
3. Verify the created row has `org_id = A` (Pydantic ignores the field).
4. Repeat for `/products`, `/weekly`, `/suppliers`, `/scout`, `/buybox/track`, `/api/ai/*` POSTs.
5. **Expected:** all created rows belong to A. None to B.

#### Scenario 2: Direct ID enumeration on GET
1. Login as A. Token in hand.
2. Enumerate `GET /clients/1` through `GET /clients/100`. (Both orgs share IDs in this range.)
3. **Expected:** for any `id` whose row is in B, response is 404. No leak of `name`, `email`, or any other field. Compare 404 latency to a guaranteed-nonexistent ID (e.g., id=99999) — the timing should be within noise (Postgres returns NULL the same way for both).
4. Repeat for `/products/{id}`, `/weekly/{id}` (if exists), `/suppliers/{id}`, `/scout/{asin}` (note: ASIN is org-shared, so test extra carefully — same ASIN may exist in both orgs; A must only see A's row).

#### Scenario 3: PUT/DELETE on B's resource
1. Login as A.
2. `PUT /clients/<a_known_B_id>` with body `{"name": "PWNED"}`.
3. **Expected:** 404. Verify in DB that B's client name is unchanged.
4. `DELETE /clients/<a_known_B_id>`.
5. **Expected:** 404. Verify B's client still exists.

#### Scenario 4: JWT manipulation
1. Take A's valid JWT. Decode at jwt.io.
2. Modify the `org_id` claim to B's id. Re-sign with the wrong key (or strip signature).
3. Send to `GET /clients`. **Expected:** 401. (Wrong signature → reject.)
4. If you somehow have the JWT secret (e.g., it leaked once): re-sign with `user_id=<A>`, `org_id=<B>`, valid signature.
5. **Expected behavior depends on §6.2 decision.** Either: 401 (mismatch caught) or 200 returning A's data only (DB row authoritative for org_id, JWT claim ignored). Both are acceptable; document which we chose. **Never** acceptable: returning B's data.
6. Try `alg: none` JWT. **Expected:** 401.

#### Scenario 5: Direct Postgres connection as the app role
1. Get the `DATABASE_URL` from Railway (the one the FastAPI app uses).
2. `psql` in. Run `SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;`
3. **Expected:** `rolbypassrls = false`.
4. Run `SELECT * FROM clients;` without setting `app.current_org_id`.
5. **Expected:** **0 rows**. The RLS policy filters everything when the session var is NULL.
6. `SET LOCAL app.current_org_id = '<A>'; SELECT * FROM clients;` → only A's clients.
7. `SET LOCAL app.current_org_id = '<A>'; SELECT * FROM clients WHERE org_id = <B>;` → 0 rows (RLS overrides the WHERE).
8. `SET LOCAL app.current_org_id = '<A>'; INSERT INTO clients (org_id, name) VALUES (<B>, 'leak');` → must raise `new row violates row-level security policy`.
9. `SET LOCAL app.current_org_id = '<A>'; UPDATE clients SET org_id = <B> WHERE id = <a_client_id>;` → 0 rows affected or raises.

#### Scenario 6: Aggregate / count leakage
1. Login as A. Hit `/dashboard`, `/reports/summary`, `/reports/kpi`, `/leaderboard`.
2. Compare each numeric field to a hand-counted SQL `WHERE org_id = A` aggregate.
3. **Expected:** numbers match exactly. No off-by-one suggesting B's data is being summed in.

#### Scenario 7: Error-message inference
1. Login as A. `GET /clients/<known_B_id>`.
2. **Expected response body:** `{"detail": "Client not found."}` — generic, no hint.
3. **Forbidden response bodies:** anything containing "this client belongs to another org," "permission denied for org X," or revealing the existence of B.
4. Repeat for every resource with an integer ID.

#### Scenario 8: Webhook spoofing (Stripe)
1. Capture a real `invoice.paid` webhook payload for org A (from Stripe dashboard test mode).
2. Modify the `customer` field to org B's Stripe customer ID. Re-sign with A's webhook secret (the one our code expects).
3. Send to `/webhooks/stripe`. **Expected:** 400 (signature mismatch — the secret was for A's payload, not B's). If 200: investigate whether the handler is double-checking signature against the modified payload.
4. Try sending the original A payload twice (replay). **Expected:** idempotent — second call is a no-op (we track `stripe_event_id` in a table for dedup).

#### Scenario 9: Concurrent session contamination
1. Open two terminals. Terminal 1 logs in as A, Terminal 2 as B.
2. Both make rapid concurrent requests to `/clients`.
3. **Expected:** A always sees A's clients, B always sees B's, even at high concurrency. (`SET LOCAL` is per-transaction, so concurrent requests on different connections must not bleed. Worth testing because connection pool reuse can surprise.)
4. Inspect with: `pg_stat_activity` while the requests run — verify each connection has its own `app.current_org_id`.

#### Scenario 10: Support-mode happy path (after feature lands)
1. Login as Murtaza (owner, Ecom Era org).
2. Enter support mode for org B with reason "customer reported missing dashboard."
3. Verify `cross_tenant_access` row created.
4. Hit `/clients` — see B's clients.
5. Exit support mode.
6. Hit `/clients` — see A's (Ecom Era's) clients again.
7. Confirm exit timestamp recorded.
8. **Expected:** all four state transitions logged, only owner-of-Ecom-Era can do this, no other role can enter support mode.

---

## 5. CI integration

### 5.1 GitHub Actions workflow

Add `.github/workflows/tenant-isolation.yml`:

- Trigger: every PR, every push to `main`.
- Job: spin up Postgres container, run Alembic migrations, run `pytest backend/tests/test_tenant_isolation.py -v`.
- Required check on `main` branch protection rules — PRs cannot merge while red.

### 5.2 Lint rule: `require_org_filter`

`backend/tests/test_query_lint.py` — a static AST-based test that:

1. Walks every `*.py` in `backend/` (excluding `tests/`, `migrations/`, `__pycache__`).
2. For each `db.query(<CustomerTable>)` call, walks forward to the next terminator (`.all()`, `.first()`, `.one()`, `.count()`, `.delete()`, `.update()`, `.scalar()`).
3. Asserts that at least one `.filter(...)` between query and terminator references `<CustomerTable>.org_id`.
4. Allowlist file: `backend/tests/org_filter_allowlist.txt` for legitimate exceptions (e.g., the `Organization` table itself, support-mode escalation paths). Allowlist requires a `# reason:` comment per entry.

**The list of customer tables** is generated from `models.py` at test time: every `class X(Base)` that has an `org_id` column.

This catches regressions: a developer who writes `db.query(Client).filter(Client.id == ...).first()` without org scoping → CI fails.

### 5.3 Migration safety check

A pre-merge check runs `alembic upgrade head` against a clean DB and `alembic downgrade base` to confirm reversibility. Catches "I forgot to write a downgrade" before merge.

---

## 6. Decisions and open questions

### 6.1 ID type for `organizations`

Brief §2.1 sample uses `UUID`. Current `models.py` uses `Integer` autoincrement. **Decision: keep `Integer` for now** (consistent with the rest of the schema, simpler debugging, no migration cost). Revisit if we ever need globally-unique IDs across multiple deployments.

### 6.2 JWT `org_id` claim authority

When the JWT's `org_id` claim disagrees with the DB's `users.org_id` for that `user_id`:

- **Option A:** Reject with 401 — defense in depth, but fails legitimate cases where a user's org changed (rare; users belong to one org for life under current model).
- **Option B:** Trust the DB row — JWT claim is informational only; the middleware re-reads `users.org_id` from the database.

**Decision: Option B.** Trust the DB. The JWT claim is convenience data for clients. The session var is set from `user.org_id` (DB-loaded), not from the JWT claim. The mismatch test in §3.2 verifies this.

### 6.3 RLS policy: `current_setting(..., true)` vs strict

`current_setting('app.current_org_id', true)` returns NULL if unset (vs raising). The `USING` clause `org_id = NULL::int` evaluates to NULL → row excluded. This is the safer behavior: an unset session var means **see nothing**, not **error**. Migrations and admin scripts that need to bypass should run as the migration role (which has `BYPASSRLS`).

**Decision: use the `true` (lenient) form. Document this explicitly.**

### 6.4 Postgres role split on Railway

Railway's default Postgres add-on creates one superuser role. We need:

- `app_role` — `LOGIN`, `NOBYPASSRLS`, granted `SELECT/INSERT/UPDATE/DELETE` on customer tables but **not the owner**.
- `migration_role` — `LOGIN`, `BYPASSRLS`, owner of the schema (or member of a role that owns).
- `read_role` (optional, P1) — `LOGIN`, `NOBYPASSRLS`, granted `SELECT` only. For analytics/read replicas.

**Decision: create both `app_role` and `migration_role` as part of PR C.** The Railway-supplied superuser becomes the bootstrap role only; the FastAPI `DATABASE_URL` is updated to use `app_role`. Document the bootstrap SQL in `docs/postgres-roles-setup.md` (created with PR C).

### 6.5 Existing data backfill

Every row in production today has `org_id = 1` (Ecom Era). No backfill needed for current tables; new columns added in PR C inherit `org_id = 1` via a `DEFAULT 1 NOT NULL` clause that's dropped in a follow-up migration once writes have been audited.

---

## 7. Probing log

Runbook §4 results recorded here, by date and runner.

> _Empty until first staging probe._

| Date | Runner | Scenarios passed | Scenarios failed | Notes |
|---|---|---|---|---|
| _(none yet)_ | | | | |

---

## 8. References

- Engineering Audit Brief — `Engineering_Audit_Brief.md` §0, §1, §2.1, §10.
- Postgres RLS docs — https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- OWASP Multi-tenant guide — application-level isolation patterns.
- This file is the acceptance spec for PR C. If a scenario here is not covered by automated test or manual sign-off, PR C is not done.
