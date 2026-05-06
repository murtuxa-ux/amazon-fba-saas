# Alembic migrations — Ecom Era FBA SaaS

Alembic owns every schema change to the production Postgres database.
The runtime `Base.metadata.create_all()` call is gone — fresh deploys go
through `alembic upgrade head` so prod, staging, and local always reach
the same schema by the same path.

---

## TL;DR

| Goal | Command |
|---|---|
| See current revision in this DB | `alembic current` |
| Generate a new migration from model changes | `alembic revision --autogenerate -m "add foo column"` |
| Apply pending migrations | `alembic upgrade head` |
| Roll back the last migration | `alembic downgrade -1` |
| Roll back to a specific revision | `alembic downgrade <revision>` |
| Stamp an existing DB as already-migrated (no-op apply) | `alembic stamp head` |
| Show full migration history | `alembic history --verbose` |

All commands run from `backend/`, with `DATABASE_URL` set in the env.

---

## How `DATABASE_URL` is resolved

`alembic/env.py` reads `DATABASE_URL` from `os.environ`. **It is never read
from `alembic.ini`** so we don't commit secrets and the same code path
runs locally, in CI, and on Railway.

If the URL begins with `postgres://` (Railway sometimes hands those out),
env.py rewrites it to `postgresql://` for the psycopg2 driver.

If `DATABASE_URL` is unset alembic raises immediately — no silent
default-to-localhost.

---

## Workflow: changing the schema

1. Edit `models.py` — add/modify the SQLAlchemy column or table.
2. From `backend/`, run:

   ```bash
   alembic revision --autogenerate -m "short imperative summary"
   ```

   Alembic compares `Base.metadata` against the live DB and writes a new
   file under `alembic/versions/`. Open it.

3. **Always read the generated migration before committing.** Autogenerate
   has known false negatives (constraint name changes, server defaults,
   index re-creation). Add anything it missed by hand.

4. Apply it locally against your dev DB:

   ```bash
   alembic upgrade head
   ```

5. Test the downgrade path too — the `downgrade()` function must be
   reversible:

   ```bash
   alembic downgrade -1 && alembic upgrade head
   ```

6. Commit `models.py` change + the new `alembic/versions/<rev>_*.py` file
   in the same commit.

7. Deploy. The Procfile `release` command runs `alembic upgrade head`
   before the web server starts, so prod migrates atomically.

---

## Workflow: fresh local DB

```bash
createdb ecomera_fba_dev
export DATABASE_URL=postgresql://localhost/ecomera_fba_dev
alembic upgrade head        # creates every table from baseline + later
```

No need to run `Base.metadata.create_all()` anywhere. Alembic is the
single source of truth.

---

## The baseline migration

`alembic/versions/0001_baseline.py` reproduces the full production schema
as it stood at the time multi-tenancy work began. It was generated from
`docs/baseline_schema.sql`, which was itself produced by:

```bash
pg_dump --schema-only --no-owner --no-acl "$DATABASE_URL" > docs/baseline_schema.sql
```

against the live Railway production database (read-only, no data
exfiltrated).

If you're spinning up a fresh DB from scratch, `alembic upgrade head`
runs the baseline first, then every subsequent migration in order. If
you're attaching alembic to an existing DB that already matches the
baseline (e.g., the Railway prod DB itself), run `alembic stamp head`
once to mark it as already-migrated — do **not** run `alembic upgrade
head`, it would fail trying to recreate existing tables.

### Production deploys: `alembic_bootstrap.py`

The Procfile `release` command runs `python alembic_bootstrap.py`, not
`alembic upgrade head` directly. The bootstrap script:

- Detects three DB states (fresh / legacy-pre-alembic / already-managed).
- Issues a one-time `stamp head` on the legacy state only.
- Always runs `alembic upgrade head` afterward.

Why the indirection: a blind unconditional `stamp head` before every
upgrade would silently skip every future migration (stamp sets the
version row to head without running DDL). The script gates the stamp
on a probe of the `organizations` table, so it fires once at most.

---

## Don't

- Don't edit a migration after it's been applied to any environment. Add
  a new migration that fixes the previous one.
- Don't autogenerate against a stale dev DB. Run `alembic upgrade head`
  on your dev DB before generating, or autogenerate will produce a
  migration that "downgrades" your dev to match prod.
- Don't `Base.metadata.create_all()` anywhere in production code paths.
  That call has been removed from `database.init_db()`.
- Don't delete `alembic_version` rows in production to "reset" alembic.
  Use `alembic stamp <rev>` instead.

---

## Debugging

- **"Target database is not up to date"**: the DB is at an older
  revision than the codebase expects. Run `alembic upgrade head`.
- **"Can't locate revision identified by 'X'"**: the DB's
  `alembic_version` table points at a revision that no longer exists in
  `alembic/versions/`. Either restore the missing file or `alembic stamp
  head` after confirming the schema matches.
- **Autogenerate produces empty diff but you changed a model**: env.py
  may not be importing your model. Confirm the new class is reachable
  from `import models`.
- **Autogenerate wants to drop columns you didn't touch**: the dev DB is
  ahead of the models. Pull main, run `alembic upgrade head` to catch up.
