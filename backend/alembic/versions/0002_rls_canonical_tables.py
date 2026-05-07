"""rls_canonical_tables

Revision ID: 0002_rls_canonical_tables
Revises: 0001_baseline
Create Date: 2026-05-07

Enables Postgres Row-Level Security on all 87 customer tables, plus the
organizations table itself. Policies are inert until the application
sets `app.current_org_id` per request — see backend/auth.py:tenant_session.

Tables fall into four shapes:
  - Tier A: direct integer org_id NOT NULL (51 tables)
  - Tier B: direct varchar org_id NOT NULL (11 tables; cast on column side)
  - Tier C: nullable integer org_id (3 wholesale_* tables; backfilled then
    SET NOT NULL — irreversible. Snapshot restore is the rollback path.)
  - Tier D: child tables, no org_id column (22 tables; EXISTS subquery
    against parent FK)

The policy uses `NULLIF(current_setting('app.current_org_id', true), '')::int`.
Two reasons:
  1. The lenient `current_setting(name, true)` form returns NULL when
     the setting was never touched in this session — that's the easy
     case.
  2. Postgres custom GUCs that have been touched (via SET LOCAL in any
     prior transaction on the same pooled connection) become "registered"
     for the rest of the session; once registered, current_setting()
     returns the empty string `''` after SET LOCAL's transaction ends,
     NOT NULL. Without NULLIF, `''::int` raises `invalid input syntax
     for type integer: ""`, which surfaces as a 500 on the next request
     using a recycled connection that doesn't (yet) re-prime the GUC.
NULLIF turns both '' and NULL into NULL; NULL = anything is NULL; the
row is denied. Outside a primed transaction, the app_role sees no rows.

The migration_role retains BYPASSRLS, so this migration itself runs
unimpeded, and `alembic upgrade head` works during deploys.

Tier B pre-flight: every varchar-org_id table is checked for non-numeric
or NULL values BEFORE any policy is created. If any such row exists, the
migration aborts loudly. This prevents silent corruption: a row with
org_id='abc' would otherwise raise on every read post-RLS, and the cast
would also reject writes.
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_rls_canonical_tables"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


# ── Tier A: org_id integer NOT NULL (51) ───────────────────────────────────
TIER_A = [
    "account_health_snapshots", "account_violations", "activity_logs",
    "ai_insights", "amazon_credentials", "amazon_sync_logs",
    "automation_logs", "automation_rules", "brand_approvals",
    "buybox_alerts", "buybox_trackers", "cash_flow_projections",
    "client_messages", "client_notes", "client_pnl",
    "client_portal_users", "client_profiles", "clients",
    "competitor_watches", "dwm_approvals", "dwm_daily_logs",
    "expense_categories", "expense_entries", "fba_shipments",
    "fbm_orders", "inbound_shipments", "intelligence_alerts",
    "inventory_items", "invoices", "kpi_targets",
    "listing_optimizations", "pipeline_products", "pl_statements",
    "ppc_action_plans", "ppc_campaigns", "ppc_rules_config",
    "product_scores", "products", "profit_analyses",
    "purchase_orders", "restock_alerts", "scout_results",
    "sop_executions", "sop_templates", "storage_fee_projections",
    "suppliers", "tasks", "team_capacity", "time_entries",
    "users", "weekly_reports",
]

# ── Tier B: org_id character varying NOT NULL (11) ─────────────────────────
TIER_B = [
    "anomaly_detection", "benchmark_data", "campaign_structures",
    "generated_reports", "pl_brand_assets", "pl_products",
    "pl_review_tracker", "ppc_budget_pacing", "ppc_search_terms",
    "report_schedules", "report_templates",
]

# ── Tier C: org_id integer NULLABLE (3) ────────────────────────────────────
TIER_C = ["wholesale_products", "wholesale_purchase_orders", "wholesale_suppliers"]

# ── Tier D: child tables, no org_id column (22) ────────────────────────────
# (child, fk_column, parent_table, parent_org_id_is_varchar)
TIER_D = [
    ("brand_documents",         "approval_id",  "brand_approvals",          False),
    ("brand_timeline",          "approval_id",  "brand_approvals",          False),
    ("buybox_history",          "tracker_id",   "buybox_trackers",          False),
    ("dwm_daily_brands",        "daily_log_id", "dwm_daily_logs",           False),
    ("dwm_daily_products",      "daily_log_id", "dwm_daily_logs",           False),
    ("fba_shipment_items",      "shipment_id",  "fba_shipments",            False),
    ("fbm_orders_items",        "order_id",     "fbm_orders",               False),
    ("onboarding_checklist",    "client_id",    "client_profiles",          False),
    ("pl_launch_plans",         "product_id",   "pl_products",              True),
    ("pl_sourcing_leads",       "product_id",   "pl_products",              True),
    ("pnl_line_items",          "pnl_id",       "client_pnl",               False),
    ("po_line_items",           "po_id",        "purchase_orders",          False),
    ("po_status_logs",          "po_id",        "purchase_orders",          False),
    ("ppc_ad_groups",           "campaign_id",  "ppc_campaigns",            False),
    ("ppc_bid_changes",         "plan_id",      "ppc_action_plans",         False),
    ("ppc_daypart_schedules",   "campaign_id",  "ppc_campaigns",            False),
    ("ppc_keyword_harvests",    "plan_id",      "ppc_action_plans",         False),
    ("ppc_keywords",            "campaign_id",  "ppc_campaigns",            False),
    ("ppc_negative_keywords",   "plan_id",      "ppc_action_plans",         False),
    ("product_status_logs",     "product_id",   "pipeline_products",        False),
    ("wholesale_deal_scores",   "product_id",   "wholesale_products",       False),
    ("wholesale_po_line_items", "po_id",        "wholesale_purchase_orders", False),
]


def _enable_and_force(table: str) -> None:
    op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;")
    op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY;")


def _drop_and_disable(table: str) -> None:
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON public.{table};")
    op.execute(f"ALTER TABLE public.{table} NO FORCE ROW LEVEL SECURITY;")
    op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY;")


def _tier_b_preflight() -> None:
    """
    Refuse to proceed if any Tier B table has rows whose org_id is not a
    well-formed numeric string. Such rows would raise on every read once
    the cast-based policy is in place, and would be silently rejected on
    write. Aborting now is far better than corrupting prod.
    """
    bind = op.get_bind()
    bad: list[tuple[str, int]] = []
    for t in TIER_B:
        count = bind.execute(
            sa.text(
                f"SELECT COUNT(*) FROM public.{t} "
                f"WHERE org_id !~ '^[0-9]+$' OR org_id IS NULL"
            )
        ).scalar()
        if count and count > 0:
            bad.append((t, count))
    if bad:
        details = "; ".join(f"{t}: {c} rows" for t, c in bad)
        raise RuntimeError(
            "Tier B pre-flight failed — non-numeric or NULL org_id values found: "
            f"{details}. Refusing to apply RLS. Clean the data first."
        )


def upgrade() -> None:
    # Pre-flight before any DDL — varchar org_id columns must be clean.
    _tier_b_preflight()

    # ── organizations (special: keys on id) ─────────────────────────────────
    _enable_and_force("organizations")
    op.execute("""
        CREATE POLICY tenant_isolation ON public.organizations
            FOR ALL TO PUBLIC
            USING  (id = NULLIF(current_setting('app.current_org_id', true), '')::int)
            WITH CHECK (id = NULLIF(current_setting('app.current_org_id', true), '')::int);
    """)

    # ── Tier A ──────────────────────────────────────────────────────────────
    for t in TIER_A:
        _enable_and_force(t)
        op.execute(f"""
            CREATE POLICY tenant_isolation ON public.{t}
                FOR ALL TO PUBLIC
                USING  (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int)
                WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int);
        """)

    # ── Tier B (varchar org_id) ─────────────────────────────────────────────
    for t in TIER_B:
        _enable_and_force(t)
        op.execute(f"""
            CREATE POLICY tenant_isolation ON public.{t}
                FOR ALL TO PUBLIC
                USING  (org_id::int = NULLIF(current_setting('app.current_org_id', true), '')::int)
                WITH CHECK (org_id::int = NULLIF(current_setting('app.current_org_id', true), '')::int);
        """)

    # ── Tier C (nullable → backfill + SET NOT NULL, then Tier A policy) ─────
    # Backfill targets org 20 (the only remaining org after C-1 cleanup).
    # SET NOT NULL is irreversible in downgrade (see module docstring).
    for t in TIER_C:
        op.execute(f"UPDATE public.{t} SET org_id = 20 WHERE org_id IS NULL;")
        op.execute(f"ALTER TABLE public.{t} ALTER COLUMN org_id SET NOT NULL;")
        _enable_and_force(t)
        op.execute(f"""
            CREATE POLICY tenant_isolation ON public.{t}
                FOR ALL TO PUBLIC
                USING  (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int)
                WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::int);
        """)

    # ── Tier D (child tables via EXISTS subquery on parent FK) ──────────────
    for child, fk, parent, parent_varchar in TIER_D:
        _enable_and_force(child)
        parent_org_expr = "p.org_id::int" if parent_varchar else "p.org_id"
        op.execute(f"""
            CREATE POLICY tenant_isolation ON public.{child}
                FOR ALL TO PUBLIC
                USING (EXISTS (
                    SELECT 1 FROM public.{parent} p
                    WHERE p.id = public.{child}.{fk}
                      AND {parent_org_expr} = NULLIF(current_setting('app.current_org_id', true), '')::int
                ))
                WITH CHECK (EXISTS (
                    SELECT 1 FROM public.{parent} p
                    WHERE p.id = public.{child}.{fk}
                      AND {parent_org_expr} = NULLIF(current_setting('app.current_org_id', true), '')::int
                ));
        """)


def downgrade() -> None:
    # Reverse order: D, C, B, A, organizations.
    for child, _, _, _ in TIER_D:
        _drop_and_disable(child)

    # Tier C: drop policies and disable RLS, but do NOT revert SET NOT NULL.
    # The org_id column stays NOT NULL after a downgrade — the backfill is
    # one-way. Snapshot restore is the rollback path if a fully-nullable
    # state is required.
    for t in TIER_C:
        _drop_and_disable(t)

    for t in TIER_B:
        _drop_and_disable(t)

    for t in TIER_A:
        _drop_and_disable(t)

    _drop_and_disable("organizations")
