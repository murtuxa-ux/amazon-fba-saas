"""password_policy: add users.password_changed_at, backfill NOW()

Revision ID: 0010_password_policy
Revises: 0009_audit_logs
Create Date: 2026-05-13

Phase A of password / MFA hardening (SP-API attestation).

Backfill semantics: existing user rows get password_changed_at = NOW(),
NOT created_at. This grandfathers every existing account past the
365-day expiry check at /auth/login until 2027-05-13. Without this
backfill, accounts whose created_at is older than 365 days would be
locked out the moment this ships.

Going forward, every password set / change writes password_changed_at
in the same transaction (see auth.py / signup.py / main.py /
multi_user_access.py).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0010_password_policy"
down_revision = "0009_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("password_changed_at", sa.DateTime(), nullable=True),
    )
    # Backfill every existing row so the next login doesn't trip the
    # 365-day expiry. Done before NOT NULL so the constraint applies
    # cleanly afterward.
    op.execute("UPDATE users SET password_changed_at = NOW() WHERE password_changed_at IS NULL;")
    op.alter_column("users", "password_changed_at", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "password_changed_at")
