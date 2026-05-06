"""
Idempotent Alembic bootstrap for the Railway release command.

The Railway release phase runs this script on every deploy. It handles
three database states correctly:

  1. Fresh DB (no tables) — `alembic upgrade head` creates the full
     schema from the 0001_baseline migration (and any later migrations
     in order).

  2. Legacy production DB (canonical tables exist, no alembic_version
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

# A canonical table from models.py. Its presence (without
# alembic_version) is the signal that the DB existed before alembic
# was introduced and needs a one-time stamp.
_LEGACY_PROBE_TABLE = "organizations"


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
            "release-bootstrap: legacy DB detected "
            f"({_LEGACY_PROBE_TABLE!r} present, alembic_version missing). "
            "Stamping head before upgrade so the existing schema is "
            "treated as baseline.",
            flush=True,
        )
        command.stamp(cfg, "head")
    elif not has_canonical_data and not has_alembic_version:
        print(
            "release-bootstrap: fresh DB detected (no canonical tables, "
            "no alembic_version). Running upgrade head from scratch.",
            flush=True,
        )
    else:
        print(
            "release-bootstrap: DB already under alembic management. "
            "Running upgrade head (no-op if no pending migrations).",
            flush=True,
        )

    command.upgrade(cfg, "head")
    print("release-bootstrap: done.", flush=True)


if __name__ == "__main__":
    main()
