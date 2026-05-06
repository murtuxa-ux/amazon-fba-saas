# Tenant Bypass Audit (PR C-1)

**Purpose:** inventory every place backend code can issue SQL outside the standard `get_db()` request lifecycle. With RLS enabled in PR C-2, these are the call sites that could bypass tenancy. Each gets an explicit, recorded decision: "use app_role manually" (apply session var locally before querying) or "use migration_role to deliberately bypass" (DDL, admin tasks, out-of-tenant work) — never an unannounced default.

**Status:** snapshot at PR C-1 (2026-05-07). Re-run audit before PR C-2 merges and update this file if anything has shifted.

## Audit method

Re-runnable grep commands. Results below come directly from these:

```
grep -rnE "engine\.(connect|execute|begin|dispose)\(" backend/*.py
grep -rnE "Base\.metadata\.create_all" backend/*.py
grep -rnE "^from database import" backend/*.py | grep "engine"
```

## Results

### A. Raw `engine.connect/execute/begin/dispose` calls

```
(no matches)
```

**Decisions per site:** N/A — there are zero call sites. The codebase has no out-of-transaction raw engine usage. Every customer-data query goes through `get_db()` → `SessionLocal` → request-bound transaction.

### B. Import-time `Base.metadata.create_all(bind=engine)`

```
backend/ai_automation.py:117
backend/reporting_engine.py:101
backend/team_workflow.py:113
```

**Decisions per site:**

| File:Line | What runs | Decision | Rationale |
|---|---|---|---|
| `backend/ai_automation.py:117` | `Base.metadata.create_all(bind=engine)` at module-import time. Defines its own SQLAlchemy models locally and creates their tables on first import. | **Use migration_role to deliberately bypass.** | DDL only (`CREATE TABLE IF NOT EXISTS`). No data queries, no per-row tenancy decision. Connection pool runs as migration_role under PR C-2 → DDL succeeds, RLS doesn't apply (DDL is unaffected by RLS). Tracked for cleanup in issue #6 (bring orphan models under Alembic). |
| `backend/reporting_engine.py:101` | Same pattern. | **Use migration_role to deliberately bypass.** | Same rationale. |
| `backend/team_workflow.py:113` | Same pattern. | **Use migration_role to deliberately bypass.** | Same rationale. |

### C. Modules importing `engine` (presence-only check, may be unused)

```
backend/ai_automation.py:15:        from database import get_db, Base, engine
backend/amazon_integration.py:20:   from database import get_db, Base, engine
backend/client_portal.py:15:        from database import get_db, Base, engine
backend/finance_pl.py:11:           from database import get_db, Base, engine
backend/inventory_restock.py:8:     from database import get_db, Base, engine
backend/ppc_action_plan.py:17:      from database import get_db, Base, engine
backend/ppc_advanced.py:16:         from database import get_db, Base, engine
backend/reporting_engine.py:11:     from database import get_db, Base, engine
backend/team_workflow.py:10:        from database import get_db, Base, engine
backend/wholesale_hub.py:11:        from database import get_db, Base, engine
```

**Decisions per site:**

| File:Line | Engine actually used? | Decision | Rationale |
|---|---|---|---|
| `ai_automation.py:15` | **Yes** — `Base.metadata.create_all(bind=engine)` at line 117 | See section B — bypass via migration_role | Same as section B |
| `amazon_integration.py:20` | **No** — dead import (no `engine.*` references in the file) | **No action.** | Inert. Cleanup target for an unrelated tidy PR; not a tenancy concern. |
| `client_portal.py:15` | **No** — dead import | **No action.** | Inert. |
| `finance_pl.py:11` | **No** — dead import | **No action.** | Inert. |
| `inventory_restock.py:8` | **No** — dead import | **No action.** | Inert. |
| `ppc_action_plan.py:17` | **No** — dead import | **No action.** | Inert. |
| `ppc_advanced.py:16` | **No** — dead import | **No action.** | Inert. |
| `reporting_engine.py:11` | **Yes** — `Base.metadata.create_all(bind=engine)` at line 101 | See section B — bypass via migration_role | Same as section B |
| `team_workflow.py:10` | **Yes** — `Base.metadata.create_all(bind=engine)` at line 113 | See section B — bypass via migration_role | Same as section B |
| `wholesale_hub.py:11` | **No** — dead import | **No action.** | Inert. |

## Conclusion

Tenant isolation has **no out-of-transaction query attack surface.** Every customer-data query in the codebase flows through `get_db()` → `SessionLocal` → request-bound transaction, which is exactly where PR C-2's `tenant_session` dependency runs `SET LOCAL ROLE app_role` + `SET LOCAL app.current_org_id`.

The only out-of-lifecycle SQL is the three `Base.metadata.create_all()` import-time calls, all of which are DDL only (no data queries, no per-row tenancy decision). They run as migration_role's BYPASSRLS by design — DDL is unaffected by RLS regardless. Acceptable as documented bypasses.

The seven dead `engine` imports are inert — no usage, no risk, no action needed in PR C-1.

## Re-audit checklist for PR C-2

Before merging C-2, re-run all three grep commands and diff the results against this file. Any new call site gets:

- A decision tagged in this file
- An explicit comment in the code it lives in
- Acknowledgement in the C-2 PR description

If a new call site escapes the audit and ships in C-2, RLS may have a tenancy gap. The lint rule (`backend/tests/test_query_lint.py`) catches unfiltered `db.query()` calls but does **not** catch raw engine connections — that's what this doc is for.
