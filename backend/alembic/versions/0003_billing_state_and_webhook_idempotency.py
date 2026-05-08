"""billing state and webhook idempotency

Revision ID: 0003_billing_state_and_webhook_idempotency
Revises: 0002_rls_canonical_tables
Create Date: 2026-05-08

Sprint Day 1 (§2.2). Two changes:

1. Adds `status` and `trial_ends_at` columns to `organizations` so webhooks
   can record subscription lifecycle (active / past_due / canceled) and
   surface trial-end dates in-app without a Stripe round-trip.

2. Creates `stripe_webhook_events` — a system-wide idempotency log keyed on
   the Stripe event id. The unique index on stripe_event_id enforces that
   a redelivered event short-circuits in the handler. No org_id, no RLS:
   webhooks arrive pre-auth and are signature-verified, not tenant-scoped.

Notes:
  - `status` defaults to 'trialing' on existing rows so the backfill is
    consistent with new orgs whose Stripe trial begins on signup.
  - `trial_ends_at` is nullable; orgs that never started a Stripe-backed
    trial (created before this sprint) keep NULL.
  - Downgrade drops the table and the two columns. No data preserved on
    the column drops — but `status` is webhook-derived so it's recoverable
    from Stripe; `trial_ends_at` is purely a display optimization.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "0003_billing_state_and_webhook_idempotency"
down_revision = "0002_rls_canonical_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── organizations.status / trial_ends_at ─────────────────────────────
    op.add_column(
        "organizations",
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'trialing'"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column("trial_ends_at", sa.DateTime(), nullable=True),
    )

    # ── stripe_webhook_events ────────────────────────────────────────────
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("stripe_event_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column(
            "processed_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_stripe_webhook_events_stripe_event_id",
        "stripe_webhook_events",
        ["stripe_event_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_stripe_webhook_events_stripe_event_id",
        table_name="stripe_webhook_events",
    )
    op.drop_table("stripe_webhook_events")
    op.drop_column("organizations", "trial_ends_at")
    op.drop_column("organizations", "status")
