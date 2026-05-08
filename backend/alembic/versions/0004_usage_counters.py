"""usage_counters table for tier-gated daily resource quotas

Revision ID: 0004_usage_counters
Revises: 0003_billing_idempotency
Create Date: 2026-05-08

Sprint Day 2 (§2.2). Adds the daily-usage tracking table consumed by
backend/tier_limits.enforce_limit() for ai_scans and keepa_lookups.

Cumulative resources (users, clients, asins) are NOT tracked here — they
read live from the canonical row count.

Schema:
  - (org_id, resource, period_start_date) is unique. Same-day re-entries
    increment `count` rather than insert; the unique constraint is the
    correctness backstop for any concurrent-write race.
  - org_id is NOT NULL with ON DELETE CASCADE so a deleted org takes its
    counter rows with it.

RLS:
  - Tenant-isolation policy mirrors Tier A from 0002_rls_canonical_tables:
    `org_id = NULLIF(current_setting('app.current_org_id', true), '')::int`.
  - With FORCE ROW LEVEL SECURITY enabled, even table-owner queries are
    filtered. migration_role retains BYPASSRLS so this migration runs
    unimpeded.
  - Policy is inert (`SET LOCAL app.current_org_id` not set) until
    `RLS_ENFORCED=true` and tenant_session() primes the GUC. This matches
    the rest of the schema.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0004_usage_counters"
down_revision = "0003_billing_idempotency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usage_counters",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "org_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("resource", sa.String(length=50), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("period_start_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint(
            "org_id", "resource", "period_start_date",
            name="uq_usage_counter_org_resource_date",
        ),
    )
    op.create_index(
        "ix_usage_counters_org_id", "usage_counters", ["org_id"],
    )
    op.create_index(
        "ix_usage_counters_period_start_date", "usage_counters", ["period_start_date"],
    )

    # ── RLS (Tier A pattern from 0002_rls_canonical_tables) ──────────────
    op.execute("ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.usage_counters FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON public.usage_counters
            FOR ALL TO PUBLIC
            USING  (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int)
            WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int);
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON public.usage_counters;")
    op.execute("ALTER TABLE public.usage_counters NO FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.usage_counters DISABLE ROW LEVEL SECURITY;")
    op.drop_index("ix_usage_counters_period_start_date", table_name="usage_counters")
    op.drop_index("ix_usage_counters_org_id", table_name="usage_counters")
    op.drop_table("usage_counters")
