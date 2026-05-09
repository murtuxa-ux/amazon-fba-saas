"""audit_logs + canceled_org_purge_queue

Revision ID: 0009_audit_logs
Revises: 0008_onboarding
Create Date: 2026-05-09

Sprint Day 6 (§3.4 + §2.2 30-day data purge). Stream B owns this.

Schema:
  - audit_logs: customer-dispute trail. record_audit() in
    backend/audit_logs.py writes one row per state-changing endpoint.
    Indexed on (org_id, action, resource_type, request_id, created_at)
    for the GET /api/audit-logs filtered list. user_id is SET NULL on
    user delete so a deleted account doesn't cascade-delete its history.
  - canceled_org_purge_queue: 30-day grace period for canceled orgs.
    Stripe customer.subscription.deleted enqueues; daily cron purges
    after purge_after. No FK on org_id — the deletion target IS the
    org, so CASCADE would re-orphan the queue entry mid-purge.

RLS:
  - audit_logs is Tier A (direct integer org_id, NOT NULL). Tenant
    isolation policy mirrors usage_counters / ai_coach_actions:
    `org_id = NULLIF(current_setting('app.current_org_id', true), '')::int`.
    The retention cron (cron/audit_retention.py) runs as migration_role
    with BYPASSRLS so it can iterate every org.
  - canceled_org_purge_queue is system-wide (no org_id FK, no RLS).
    Only the Stripe webhook handler (already-primed tenant context for
    the org table mutation, but writes the queue row in the same txn
    so it lands as the system role) and the daily cron touch it.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0009_audit_logs"
down_revision = "0008_onboarding"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── audit_logs ───────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "org_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=False),
        sa.Column("resource_id", sa.String(length=100), nullable=True),
        sa.Column("before_json", sa.Text(), nullable=True),
        sa.Column("after_json", sa.Text(), nullable=True),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("request_id", sa.String(length=40), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_audit_logs_org_id", "audit_logs", ["org_id"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"])
    op.create_index("ix_audit_logs_request_id", "audit_logs", ["request_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    # Tier A RLS — same pattern as usage_counters / ai_coach_actions.
    op.execute("ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON public.audit_logs
            FOR ALL TO PUBLIC
            USING  (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int)
            WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int);
        """
    )

    # ── canceled_org_purge_queue (system-wide, no RLS) ───────────────────
    op.create_table(
        "canceled_org_purge_queue",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("canceled_at", sa.DateTime(), nullable=False),
        sa.Column("purge_after", sa.DateTime(), nullable=False),
        sa.Column("purged_at", sa.DateTime(), nullable=True),
        sa.Column(
            "purge_status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.UniqueConstraint("org_id", name="uq_canceled_org_purge_queue_org_id"),
    )
    op.create_index(
        "ix_canceled_org_purge_queue_org_id",
        "canceled_org_purge_queue",
        ["org_id"],
    )
    op.create_index(
        "ix_canceled_org_purge_queue_purge_after",
        "canceled_org_purge_queue",
        ["purge_after"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_canceled_org_purge_queue_purge_after",
        table_name="canceled_org_purge_queue",
    )
    op.drop_index(
        "ix_canceled_org_purge_queue_org_id",
        table_name="canceled_org_purge_queue",
    )
    op.drop_table("canceled_org_purge_queue")

    op.execute("DROP POLICY IF EXISTS tenant_isolation ON public.audit_logs;")
    op.execute("ALTER TABLE public.audit_logs NO FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;")
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_request_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_resource_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_org_id", table_name="audit_logs")
    op.drop_table("audit_logs")
