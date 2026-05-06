"""
Alembic migration environment for Ecom Era FBA SaaS.

DATABASE_URL is read from the environment, never from alembic.ini, so the
same env.py works locally, in CI, and on Railway with no config swap.

`Base.metadata` is the source of truth for autogenerate. Importing models
ensures every table is registered against Base before alembic compares it
to the live DB.
"""
from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make the backend/ package importable when alembic is run from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import Base  # noqa: E402
import models  # noqa: F401, E402  — registers all tables on Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Tables created by orphan modules (ai_automation.py, reporting_engine.py,
# team_workflow.py and others) call `Base.metadata.create_all()` at import
# time. Those tables exist in production and are captured in the baseline
# migration, but their model classes are not yet hoisted into models.py
# and therefore are not on `Base.metadata` when env.py runs.
#
# Without this filter `alembic revision --autogenerate` would propose
# dropping every orphan table on every run. The allowlist restricts diff
# to canonical tables managed by models.py.
#
# This filter is removed once issue #6 lands (orphan models migrated into
# models.py and brought under alembic). Until then, schema changes to the
# orphan tables go unmanaged — that's the technical debt issue #6 tracks.
_CANONICAL_TABLES = frozenset(target_metadata.tables.keys())


def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table":
        return name in _CANONICAL_TABLES
    if type_ in {"index", "unique_constraint", "foreign_key_constraint"}:
        # Constraints/indexes inherit their parent table's decision.
        parent_table = getattr(obj, "table", None)
        if parent_table is not None:
            return parent_table.name in _CANONICAL_TABLES
    return True


def _get_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Set it in your shell, .env, or "
            "Railway service env before running alembic."
        )
    # Railway sometimes hands out postgres:// URLs; SQLAlchemy 2.x wants
    # postgresql:// for the psycopg2 driver.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (emits SQL only)."""
    context.configure(
        url=_get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    cfg = config.get_section(config.config_ini_section) or {}
    cfg["sqlalchemy.url"] = _get_database_url()

    connectable = engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
