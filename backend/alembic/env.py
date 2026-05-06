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
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
