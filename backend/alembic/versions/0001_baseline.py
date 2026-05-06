"""baseline: snapshot of production schema as of multi-tenancy work

Revision ID: 0001_baseline
Revises:
Create Date: 2026-05-06

This migration reproduces the full production schema as it stood on
2026-05-06, captured by `pg_dump --schema-only --no-owner --no-acl
--no-comments` against the live Railway prod database. The dump itself
is committed at `docs/baseline_schema.sql` for reference.

The upgrade path replays that dump verbatim so a fresh DB reaches the
exact prod shape (88 tables, 7 ENUM types, 88 sequences, 219 indexes,
102 foreign keys). The downgrade path nukes the `public` schema and
recreates it empty — destructive, but appropriate for a baseline
revision (there is no earlier alembic state to return to).

For an existing database that already matches this baseline (e.g.,
production itself), do not run `alembic upgrade head` — run
`alembic stamp head` once to mark the DB as already at this revision.
See alembic/README.md for the full bring-up workflow.

The dump contains two pg_dump 18 psql metacommands (\\restrict and
\\unrestrict) that are not valid SQL; they are stripped at runtime
before execution.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence, Union

from alembic import op


revision: str = "0001_baseline"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Resolve docs/baseline_schema.sql relative to repo root. env.py runs alembic
# from backend/, so .../alembic/versions/0001_baseline.py -> ../../../docs.
_REPO_ROOT = Path(__file__).resolve().parents[3]
_BASELINE_SQL = _REPO_ROOT / "docs" / "baseline_schema.sql"


def _load_baseline_sql() -> str:
    if not _BASELINE_SQL.is_file():
        raise FileNotFoundError(
            f"baseline schema not found at {_BASELINE_SQL}. "
            "It must ship in the repo for this migration to work."
        )
    sql = _BASELINE_SQL.read_text(encoding="utf-8")

    # pg_dump 18 emits \restrict / \unrestrict psql metacommands that are
    # not valid SQL. Strip them so op.execute() can run the rest cleanly.
    sql = re.sub(r"^\\(?:restrict|unrestrict)\s+\S+\s*$", "", sql, flags=re.MULTILINE)

    # Strip pg_dump's search_path reset. With is_local=false it would
    # persist across alembic's transaction boundary and break alembic's
    # own writes to public.alembic_version after the migration commits.
    # All CREATE statements in the dump are already schema-qualified
    # (public.foo), so removing this is safe.
    sql = re.sub(
        r"^SELECT pg_catalog\.set_config\('search_path',.*\);\s*$",
        "",
        sql,
        flags=re.MULTILINE,
    )

    return sql


def upgrade() -> None:
    sql = _load_baseline_sql()
    op.execute(sql)


def downgrade() -> None:
    # Baseline has no predecessor; downgrade returns to an empty database.
    # DROP SCHEMA CASCADE is destructive — never run against prod. Useful
    # only for fresh-DB roundtrip verification (upgrade -> downgrade ->
    # upgrade) during local development.
    op.execute("DROP SCHEMA IF EXISTS public CASCADE;")
    op.execute("CREATE SCHEMA public;")
    op.execute("GRANT ALL ON SCHEMA public TO public;")
