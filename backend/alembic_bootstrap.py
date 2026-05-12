"""
Idempotent Alembic bootstrap for the Railway release command.

The Railway release phase runs this script on every deploy. It handles
three database states correctly:

  1. Fresh DB (no tables) — `alembic upgrade head` creates the full
     schema from the 0001_baseline migration (and any later migrations
     in order).

  2. Legacy production DB (`users` table exists, no alembic_version
     table) — the DB was created by the old
     `Base.metadata.create_all()` startup hook, not by Alembic. We
     `stamp head` first to mark the existing schema as already at the
     baseline revision; then `upgrade head` is a no-op until new
     migrations are added. This is the path the production database
     takes on the first deploy that includes Alembic.

  3. Already-managed DB (alembic_version present) — skip the stamp,
     just `upgrade head`. New migrations apply normally; if no new
     migrations exist, this is a no-op.

The conditional stamp is the critical bit. A blind unconditional
`alembic stamp head` before every upgrade would silently skip every
future migration, because `stamp` sets the version row to head without
running any DDL. Future deploys that introduce migration N would set
the version to N immediately, and the subsequent upgrade would see
"already at head, nothing to do" — N's CREATE TABLE / ALTER / RLS
policy SQL would never run, and prod would silently diverge from the
codebase. This script stamps only when the DB looks like the legacy
pre-alembic state.
"""
from __future__ import annotations

import logging
import os
import sys

from sqlalchemy import create_engine, inspect, text
from alembic import command
from alembic.config import Config

log = logging.getLogger(__name__)

# A canonical table from models.py used as a defensive guard against
# stamping a truly-empty DB. The legacy SIGNAL is `alembic_version`
# missing; this table's presence just confirms the DB has real schema
# and isn't a fresh empty database that needs upgrade-from-scratch.
#
# Why `users` specifically: it's foundational to auth and has existed
# in every deployed version since seed.py was first run. It will not
# be renamed or removed in any forseeable refactor (PR C, RLS, etc.).
_LEGACY_PROBE_TABLE = "users"


def ensure_role_membership(engine) -> None:
    """Defensive: app_role membership must be granted to the runtime
    connection role for `SET LOCAL ROLE app_role` to succeed at request
    time.

    Without this membership, every authed request that runs through
    `tenant_session()` raises:
        permission denied to set role "app_role"

    The grant is created once in `docs/postgres-roles-setup.md` for fresh
    deploys, but production has had at least one incident where the role
    membership was dropped (manual psql cleanup). This bootstrap-time
    re-grant turns that single-point-of-failure into a self-healing
    boot step.

    The check uses `pg_has_role` which is cheap (catalog lookup, no
    cluster lock). When the membership is already present, this is a
    no-op. When missing, we re-grant.

    Two role names are looked up: the configured DATABASE_URL user and
    the canonical "migration_role" used in prod / CI. Either may be the
    runtime credential depending on environment; granting from both
    sides costs nothing.
    """
    # The runtime connection role is whatever DATABASE_URL is using.
    # Pull it from the engine's effective URL.
    try:
        runtime_role = engine.url.username
    except Exception:
        runtime_role = None

    candidates = []
    if runtime_role:
        candidates.append(runtime_role)
    if runtime_role != "migration_role":
        candidates.append("migration_role")

    with engine.connect() as conn:
        for role_name in candidates:
            try:
                result = conn.execute(
                    text(
                        "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :r) AS exists"
                    ),
                    {"r": role_name},
                ).first()
                if not result or not result.exists:
                    continue
                has_role_result = conn.execute(
                    text("SELECT pg_has_role(:r, 'app_role', 'MEMBER') AS has_role"),
                    {"r": role_name},
                ).first()
                if has_role_result and not has_role_result.has_role:
                    print(
                        f"release-bootstrap: {role_name!r} is NOT a member of "
                        "'app_role' — granting now (RLS self-heal).",
                        flush=True,
                    )
                    conn.execute(text(f"GRANT app_role TO {role_name}"))
                    conn.commit()
            except Exception as e:
                # Self-heal is best-effort. Don't crash the deploy if the
                # role doesn't exist yet, or the connection role lacks
                # GRANT privileges. Log and move on; the existing roles-
                # setup doc still works for the manual path.
                log.warning(
                    "release-bootstrap: ensure_role_membership failed for "
                    "%r: %s — bootstrap will continue.",
                    role_name, e,
                )


def main() -> None:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        print(
            "FATAL: DATABASE_URL is not set; cannot run release migrations.",
            file=sys.stderr,
        )
        sys.exit(1)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(url)
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    has_canonical_data = _LEGACY_PROBE_TABLE in tables
    has_alembic_version = "alembic_version" in tables

    cfg = Config("alembic.ini")

    if has_canonical_data and not has_alembic_version:
        print(
            "release-bootstrap: branch=LEGACY — "
            f"{_LEGACY_PROBE_TABLE!r} table present but alembic_version "
            "missing. Stamping head, then upgrade head (no-op).",
            flush=True,
        )
        command.stamp(cfg, "head")
    elif not has_canonical_data and not has_alembic_version:
        print(
            "release-bootstrap: branch=FRESH — neither "
            f"{_LEGACY_PROBE_TABLE!r} nor alembic_version present. "
            "Running upgrade head to create schema from scratch.",
            flush=True,
        )
    else:
        print(
            "release-bootstrap: branch=MANAGED — alembic_version present. "
            "Running upgrade head (applies any new migrations; no-op if "
            "none).",
            flush=True,
        )

    command.upgrade(cfg, "head")

    # RLS self-heal — ensure the runtime role can `SET LOCAL ROLE app_role`.
    # Runs AFTER `upgrade head` so the migrations that create app_role and
    # the membership grants have applied. Idempotent — no-op when the
    # membership is already in place.
    ensure_role_membership(engine)

    print("release-bootstrap: done.", flush=True)


if __name__ == "__main__":
    main()
