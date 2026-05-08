"""ai_coach_actions + ai_coach_feedback for AI Coach module

Revision ID: 0007_ai_coach
Revises: 0006_email_verification
Create Date: 2026-05-08

Sprint Day 4 (§2.6 #4). Backs the AI Coach daily top-5 action feed.

Schema:
  - ai_coach_actions stores generated actions per org per day. status
    tracks lifecycle (pending -> dismissed/completed/expired). created_at
    is indexed because /coach/feed reads "today's actions" hot-path.
    valid_until is set when an action is generated (typically +24h);
    yesterday's pending rows are flipped to 'expired' on the next regen.
    metadata_json is plain Text for portability — extra structured
    context (alert_id, campaign_id) is JSON-serialized by the caller.
  - ai_coach_feedback captures user ratings (1-5) on actions. user_id
    has no ON DELETE behavior so a user delete doesn't cascade through
    historical feedback (the action keeps the audit trail).

RLS:
  - Both tables are Tier A (direct integer org_id, NOT NULL). Tenant
    isolation policy mirrors usage_counters / org_keepa_usage from
    0004 / 0005: `org_id = NULLIF(current_setting('app.current_org_id',
    true), '')::int`. The cron entrypoint (backend/cron/coach_daily.py)
    runs as migration_role with BYPASSRLS so it can iterate every org.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0007_ai_coach"
down_revision = "0006_email_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── ai_coach_actions ─────────────────────────────────────────────────
    op.create_table(
        "ai_coach_actions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "org_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("action_type", sa.String(length=50), nullable=False),
        sa.Column("asin", sa.String(length=20), nullable=True),
        sa.Column(
            "dollar_impact_est",
            sa.Numeric(10, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "urgency",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'medium'"),
        ),
        sa.Column("suggested_action", sa.Text(), nullable=False),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("dismissed_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("valid_until", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_ai_coach_actions_org_id", "ai_coach_actions", ["org_id"],
    )
    op.create_index(
        "ix_ai_coach_actions_asin", "ai_coach_actions", ["asin"],
    )
    op.create_index(
        "ix_ai_coach_actions_created_at", "ai_coach_actions", ["created_at"],
    )

    # ── ai_coach_feedback ────────────────────────────────────────────────
    op.create_table(
        "ai_coach_feedback",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "org_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "action_id",
            sa.Integer(),
            sa.ForeignKey("ai_coach_actions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_ai_coach_feedback_org_id", "ai_coach_feedback", ["org_id"],
    )
    op.create_index(
        "ix_ai_coach_feedback_action_id", "ai_coach_feedback", ["action_id"],
    )

    # ── RLS (Tier A pattern from 0002 / 0004) ────────────────────────────
    for table in ("ai_coach_actions", "ai_coach_feedback"):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY;")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON public.{table}
                FOR ALL TO PUBLIC
                USING  (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int)
                WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int);
            """
        )


def downgrade() -> None:
    for table in ("ai_coach_feedback", "ai_coach_actions"):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON public.{table};")
        op.execute(f"ALTER TABLE public.{table} NO FORCE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY;")

    op.drop_index("ix_ai_coach_feedback_action_id", table_name="ai_coach_feedback")
    op.drop_index("ix_ai_coach_feedback_org_id", table_name="ai_coach_feedback")
    op.drop_table("ai_coach_feedback")

    op.drop_index("ix_ai_coach_actions_created_at", table_name="ai_coach_actions")
    op.drop_index("ix_ai_coach_actions_asin", table_name="ai_coach_actions")
    op.drop_index("ix_ai_coach_actions_org_id", table_name="ai_coach_actions")
    op.drop_table("ai_coach_actions")
