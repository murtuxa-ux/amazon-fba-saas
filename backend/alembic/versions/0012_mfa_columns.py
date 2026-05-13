"""mfa_columns: add TOTP MFA fields to users

Revision ID: 0012_mfa_columns
Revises: 0011_fix_client_pnl_year
Create Date: 2026-05-14

Phase B of SP-API compliance hardening. Adds the columns the backend
TOTP MFA system reads/writes:

- mfa_secret             — base32-encoded TOTP secret (32 chars). NULL
                            until enrollment is confirmed; cleared when
                            the user disables MFA. v1 stores plaintext;
                            v2 wraps in SecretsVault (Fernet) once that
                            module lands. Backend log calls must never
                            print this column (see backend/mfa.py).
- mfa_enrolled_at        — first successful TOTP confirmation timestamp.
                            Frontend uses this to flip the "MFA: on"
                            badge and to gate force-enrollment for
                            owner/admin roles.
- mfa_recovery_codes_json — JSON array of 10 bcrypt-hashed recovery
                            codes. Each gets popped from the array on
                            single-use consumption. Plaintext is shown
                            ONCE at enrollment.
- mfa_last_used_at       — most recent successful TOTP/recovery
                            verification. For the settings UI.

All nullable, additive. Backfill is NOT needed — accounts without MFA
keep working until the user enrolls or the owner-enforcement flag
flips. See backend/config.py:MFA_OWNER_ENFORCEMENT_ENABLED.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0012_mfa_columns"
down_revision = "0011_fix_client_pnl_year"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("mfa_secret", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("mfa_enrolled_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("mfa_recovery_codes_json", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("mfa_last_used_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "mfa_last_used_at")
    op.drop_column("users", "mfa_recovery_codes_json")
    op.drop_column("users", "mfa_enrolled_at")
    op.drop_column("users", "mfa_secret")
