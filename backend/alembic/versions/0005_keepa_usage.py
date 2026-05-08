"""org_keepa_usage table for per-org per-day Keepa token + request tracking

Revision ID: 0005_keepa_usage
Revises: 0004_usage_counters
Create Date: 2026-05-08

Sprint Day 2 (§2.5). Stream B's central Keepa guard records every
tier-gated lookup into this table; the admin /api/system/keepa-budget
endpoint sums tokens_consumed for the current month to surface burn
against the configured KEEPA_MONTHLY_TOKEN_BUDGET.

Schema:
  - (org_id, date) is unique. keepa_service._record_org_keepa_usage
    UPSERTs by this key so concurrent same-day calls coalesce into one
    row per org-day.
  - dollar_cost is populated by a daily cron from Keepa's billing
    endpoint — left at 0 by the live recording path because Keepa's
    per-call cost isn't deterministic from the response.

RLS:
  - Tier A pattern from 0002_rls_canonical_tables — tenant isolation
    on org_id with NULLIF wrapping for the empty-string case after a
    SET LOCAL transaction recycles a pooled connection.
  - With FORCE ROW LEVEL SECURITY enabled the table-owner sees no rows
    unless app.current_org_id is primed by tenant_session(); the
    admin monthly-burn aggregation explicitly runs under
    migration_role (BYPASSRLS) via a system context.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0005_keepa_usage"
down_revision = "0004_usage_counters"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "org_keepa_usage",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "org_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("tokens_consumed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "dollar_cost",
            sa.Numeric(precision=10, scale=4),
            nullable=False,
            server_default=sa.text("0"),
        ),
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
            "org_id", "date",
            name="uq_keepa_usage_org_date",
        ),
    )
    op.create_index(
        "ix_org_keepa_usage_org_id", "org_keepa_usage", ["org_id"],
    )
    op.create_index(
        "ix_org_keepa_usage_date", "org_keepa_usage", ["date"],
    )

    # ── RLS (Tier A pattern from 0002_rls_canonical_tables) ──────────────
    op.execute("ALTER TABLE public.org_keepa_usage ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.org_keepa_usage FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON public.org_keepa_usage
            FOR ALL TO PUBLIC
            USING  (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int)
            WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int);
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON public.org_keepa_usage;")
    op.execute("ALTER TABLE public.org_keepa_usage NO FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.org_keepa_usage DISABLE ROW LEVEL SECURITY;")
    op.drop_index("ix_org_keepa_usage_date", table_name="org_keepa_usage")
    op.drop_index("ix_org_keepa_usage_org_id", table_name="org_keepa_usage")
    op.drop_table("org_keepa_usage")
