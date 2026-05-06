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

import os
import sys

from sqlalchemy import create_engine, inspect
from alembic import command
from alembic.config import Config

# A canonical table from models.py used as a defensive guard against
# stamping a truly-empty DB. The legacy SIGNAL is `alembic_version`
# missing; this table's presence just confirms the DB has real schema
# and isn't a fresh empty database that needs upgrade-from-scratch.
#
# Why `users` specifically: it's foundational to auth and has existed
# in every deployed version since seed.py was first run. It will not
# be renamed or removed in any forseeable refactor (PR C, RLS, etc.).
_LEGACY_PROBE_TABLE = "users"


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
    print("release-bootstrap: done.", flush=True)


if __name__ == "__main__":
    main()
