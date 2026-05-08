"""email_verification_tokens + users.email_verified for self-service signup

Revision ID: 0006_email_verification
Revises: 0005_keepa_usage
Create Date: 2026-05-08

Sprint Day 3 (§2.3). Stream A's /api/auth/signup creates an unverified
Owner row + a one-shot SHA-256-hashed token here; /api/auth/verify checks
the hash, validates expires_at/used_at, marks the user verified, and
issues a JWT for auto-login. /api/auth/resend-verification invalidates
prior unused tokens (used_at = now()) before issuing a fresh one so a
leaked email link from an old send is dead the moment a new one is asked
for.

Schema:
  - users gains email_verified (BOOLEAN NOT NULL DEFAULT TRUE) and
    email_verified_at (DateTime NULLABLE). Default TRUE backfills every
    pre-existing /auth/signup row as already-verified — the legacy flow
    never went through email verification, so flipping those rows to
    FALSE retroactively would lock real users out of their accounts.
    The application-level default for new rows is FALSE; only the
    server-side backfill default is TRUE for legacy compatibility.
  - email_verification_tokens stores token_hash (UNIQUE, indexed),
    expires_at, used_at, created_at. user_id FK ON DELETE CASCADE so a
    deleted user takes their pending tokens with them.

RLS:
  - email_verification_tokens has no org_id column. Tenancy chains via
    user_id → users.org_id. Policy uses an EXISTS subquery against
    users (Tier D pattern from 0002_rls_canonical_tables's child-table
    handling) so an authed admin querying the table only sees rows for
    users in their own org once RLS_ENFORCED=true is flipped.
  - Pre-auth signup/verify routes use Depends(get_db) without
    tenant_session priming. They run as the connection's default role
    (migration_role in dev/test, app DB user in prod) which has
    BYPASSRLS, so the policy is dormant for those callers — same
    pattern as /auth/signup, /auth/login, /auth/forgot-password.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0006_email_verification"
down_revision = "0005_keepa_usage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users: email_verified columns ────────────────────────────────────
    # server_default TRUE so legacy rows pass-through; ORM-level default
    # for new rows is False (set in models.User).
    op.add_column(
        "users",
        sa.Column(
            "email_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("TRUE"),
        ),
    )
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(), nullable=True),
    )

    # ── email_verification_tokens ────────────────────────────────────────
    op.create_table(
        "email_verification_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("token_hash", name="uq_email_verif_token_hash"),
    )
    op.create_index(
        "ix_email_verif_tokens_user_id",
        "email_verification_tokens",
        ["user_id"],
    )
    op.create_index(
        "ix_email_verif_tokens_token_hash",
        "email_verification_tokens",
        ["token_hash"],
    )

    # ── RLS (Tier D pattern — child of users) ────────────────────────────
    op.execute(
        "ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;"
    )
    op.execute(
        "ALTER TABLE public.email_verification_tokens FORCE ROW LEVEL SECURITY;"
    )
    op.execute(
        """
        CREATE POLICY tenant_isolation ON public.email_verification_tokens
            FOR ALL TO PUBLIC
            USING (
                EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = email_verification_tokens.user_id
                      AND u.org_id = NULLIF(current_setting('app.current_org_id', true), '')::int
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = email_verification_tokens.user_id
                      AND u.org_id = NULLIF(current_setting('app.current_org_id', true), '')::int
                )
            );
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS tenant_isolation ON public.email_verification_tokens;"
    )
    op.execute(
        "ALTER TABLE public.email_verification_tokens NO FORCE ROW LEVEL SECURITY;"
    )
    op.execute(
        "ALTER TABLE public.email_verification_tokens DISABLE ROW LEVEL SECURITY;"
    )
    op.drop_index(
        "ix_email_verif_tokens_token_hash",
        table_name="email_verification_tokens",
    )
    op.drop_index(
        "ix_email_verif_tokens_user_id",
        table_name="email_verification_tokens",
    )
    op.drop_table("email_verification_tokens")

    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "email_verified")
