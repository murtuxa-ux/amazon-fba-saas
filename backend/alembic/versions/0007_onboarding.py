"""onboarding progress on users + team_invites table

Revision ID: 0007_onboarding
Revises: 0006_email_verification
Create Date: 2026-05-08

Sprint Day 4 (§2.3). Stream A's post-signup wizard tracks 4-step progress
on the user row, and team invites land in their own tier-gated table.

Schema:
  - users gains onboarding_completed (BOOLEAN NOT NULL, server_default TRUE
    so legacy rows skip the wizard) + onboarding_step (INTEGER NOT NULL
    DEFAULT 1) + onboarding_completed_at (DateTime NULLABLE). The
    application-level default for new rows is False / 1 / NULL — the
    server-side TRUE backfill only applies to rows existing pre-migration.
  - team_invites stores token_hash (UNIQUE, indexed), email (indexed),
    role, expires_at, used_at, inviter_user_id (FK SET NULL so a deleted
    inviter doesn't cascade-delete pending invites), org_id (FK CASCADE).

RLS:
  - team_invites uses Tier A pattern (direct integer org_id), same as
    clients/products/etc. /api/onboarding/invite runs through
    Depends(tenant_session) so the policy gates per-org once
    RLS_ENFORCED=true.
  - /api/onboarding/accept-invite/{token} is pre-auth and uses
    Depends(get_db) without tenant_session priming; the connection runs
    as migration_role (BYPASSRLS) and the lookup is on token_hash UNIQUE.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0007_onboarding"
down_revision = "0006_email_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users: onboarding columns ────────────────────────────────────────
    op.add_column(
        "users",
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("TRUE"),
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "onboarding_step",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )
    op.add_column(
        "users",
        sa.Column("onboarding_completed_at", sa.DateTime(), nullable=True),
    )

    # ── team_invites ─────────────────────────────────────────────────────
    op.create_table(
        "team_invites",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "org_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "inviter_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'manager'"),
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
        sa.UniqueConstraint("token_hash", name="uq_team_invites_token_hash"),
    )
    op.create_index("ix_team_invites_org_id", "team_invites", ["org_id"])
    op.create_index("ix_team_invites_email", "team_invites", ["email"])
    op.create_index("ix_team_invites_token_hash", "team_invites", ["token_hash"])

    # ── RLS (Tier A pattern from 0002_rls_canonical_tables) ──────────────
    op.execute("ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.team_invites FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON public.team_invites
            FOR ALL TO PUBLIC
            USING  (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int)
            WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int);
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON public.team_invites;")
    op.execute("ALTER TABLE public.team_invites NO FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.team_invites DISABLE ROW LEVEL SECURITY;")
    op.drop_index("ix_team_invites_token_hash", table_name="team_invites")
    op.drop_index("ix_team_invites_email", table_name="team_invites")
    op.drop_index("ix_team_invites_org_id", table_name="team_invites")
    op.drop_table("team_invites")

    op.drop_column("users", "onboarding_completed_at")
    op.drop_column("users", "onboarding_step")
    op.drop_column("users", "onboarding_completed")
