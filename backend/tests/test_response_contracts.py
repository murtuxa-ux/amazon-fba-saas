"""§2.9 / §5: response-contract regression tests.

Pydantic-level contract assertions: every list field on a response
model defaults to `[]` (never null) and every numeric field defaults to
`0` (never null). Regression coverage for the §5 audit finding that the
frontend was carrying defensive `Array.isArray()` and `(value || 0)`
guards because the backend leaked nulls.

These run as plain Python — no DB, no FastAPI test client. The
schemas are the contract; if a future PR drops a default_factory or
removes a Field(default=0), the failure surfaces here, not at runtime
in the frontend.

Optional[T] fields that are intentionally nullable (e.g.
CashFlowProjection.actual_revenue when no actuals exist yet) live in
test_optional_response_fields_kept_intentional below.
"""
from __future__ import annotations

import json


def _to_dict(model) -> dict:
    """Pydantic v2: model_dump() is the canonical serializer."""
    return json.loads(model.model_dump_json())


# ── ai_buybox ──────────────────────────────────────────────────────────────
def test_buybox_analytics_defaults():
    from ai_buybox import AnalyticsResponse

    out = _to_dict(AnalyticsResponse())
    assert out["win_rate"] == 0
    assert out["total_tracked"] == 0
    assert out["currently_winning"] == 0
    assert out["currently_losing"] == 0
    assert out["suppressed"] == 0
    assert out["avg_competitor_count"] == 0
    assert out["top_competitors"] == []


def test_buybox_history_response_defaults():
    from ai_buybox import HistoryResponse

    out = _to_dict(HistoryResponse(asin="B0TEST"))
    assert out["history"] == []
    assert out["date_range"] == {}
    assert out["product_title"] == ""


def test_buybox_competitor_analysis_defaults():
    from ai_buybox import CompetitorAnalysis

    out = _to_dict(CompetitorAnalysis(asin="B0TEST"))
    assert out["competitors"] == []
    assert out["price_range_min"] == 0
    assert out["price_range_max"] == 0
    assert out["fba_count"] == 0
    assert out["fbm_count"] == 0


def test_buybox_detailed_status_defaults():
    from ai_buybox import DetailedStatus

    out = _to_dict(DetailedStatus(asin="B0TEST"))
    assert out["history"] == []
    assert out["competitors"] == []
    assert out["win_rate_over_time"] == []
    assert out["total_tracked_days"] == 0


# ── client_pnl ─────────────────────────────────────────────────────────────
def test_client_pnl_summary_defaults():
    from client_pnl import ClientPnLSummary

    out = _to_dict(ClientPnLSummary(client_id=42))
    assert out["rows"] == []
    assert out["total_revenue"] == 0
    assert out["total_net_profit"] == 0
    assert out["avg_profit_margin_pct"] == 0


def test_client_pnl_monthly_overview_defaults():
    from client_pnl import MonthlyOverview

    out = _to_dict(MonthlyOverview(month="2026-05"))
    assert out["rows"] == []
    assert out["total_revenue"] == 0
    assert out["total_net_profit"] == 0
    assert out["avg_profit_margin_pct"] == 0


def test_client_pnl_trend_response_defaults():
    from client_pnl import TrendResponse

    out = _to_dict(TrendResponse())
    assert out["trends"] == []


# ── finance_pl ─────────────────────────────────────────────────────────────
def test_finance_pl_dashboard_defaults():
    from finance_pl import DashboardResponse

    out = _to_dict(DashboardResponse())
    assert out["total_revenue"] == 0
    assert out["total_profit"] == 0
    assert out["outstanding_invoices_amount"] == 0
    assert out["avg_margin_pct"] == 0
    assert out["monthly_trends"] == []
    assert out["top_clients"] == []
    assert out["overdue_invoices"] == []


def test_finance_pl_cash_flow_actuals_remain_nullable():
    """Documented exception: actual_* and variance_pct are intentionally
    nullable. null means "the period hasn't been actualized yet".
    Regression-guards the inline comment in CashFlowProjectionResponse.
    """
    from finance_pl import CashFlowProjectionResponse
    from datetime import datetime

    out = _to_dict(CashFlowProjectionResponse(
        id=1, org_id=1, client_id=1,
        period_start=datetime.utcnow(),
        period_end=datetime.utcnow(),
    ))
    assert out["projected_revenue"] == 0
    assert out["actual_revenue"] is None
    assert out["actual_profit"] is None
    assert out["variance_pct"] is None


# ── intelligence_hub ───────────────────────────────────────────────────────
def test_intelligence_dashboard_defaults():
    from intelligence_hub import DashboardResponse, DashboardStats

    out = _to_dict(DashboardResponse())
    assert out["top_opportunities"] == []
    assert out["active_alerts"] == {}
    assert out["risk_summary"] == []
    assert out["market_trends"] == []
    # nested DashboardStats also tightened
    assert out["stats"]["total_alerts"] == 0
    assert out["stats"]["avg_opportunity_score"] == 0


def test_intelligence_dashboard_stats_defaults():
    from intelligence_hub import DashboardStats

    out = _to_dict(DashboardStats())
    assert out["total_alerts"] == 0
    assert out["active_alerts"] == 0
    assert out["opportunities_found"] == 0
    assert out["risks_flagged"] == 0
    assert out["avg_opportunity_score"] == 0
    assert out["avg_risk_score"] == 0


# ── account_health_monitor ─────────────────────────────────────────────────
def test_account_health_violation_list_defaults():
    from account_health_monitor import ViolationListResponse

    out = _to_dict(ViolationListResponse())
    assert out["violations"] == []
    assert out["total_count"] == 0
    assert out["critical_count"] == 0
    assert out["open_count"] == 0


def test_account_health_alert_response_defaults():
    from account_health_monitor import AlertResponse

    out = _to_dict(AlertResponse())
    assert out["alerts"] == []
    assert out["total_count"] == 0
    assert out["unacknowledged_count"] == 0


# ── inventory_restock ──────────────────────────────────────────────────────
def test_inventory_restock_dashboard_defaults():
    from inventory_restock import DashboardResponse

    out = _to_dict(DashboardResponse())
    assert out["total_skus"] == 0
    assert out["healthy_count"] == 0
    assert out["low_stock_count"] == 0
    assert out["critical_count"] == 0
    assert out["out_of_stock_count"] == 0
    assert out["total_alerts"] == 0
    assert out["unread_alerts"] == 0
    assert out["inbound_shipments_count"] == 0
    assert out["total_storage_fee_monthly"] == 0


# ── purchase_orders ────────────────────────────────────────────────────────
def test_po_stats_response_defaults():
    from purchase_orders import POStatsResponse

    out = _to_dict(POStatsResponse())
    assert out["total_pos"] == 0
    assert out["by_status"] == {}
    assert out["total_spend"] == 0
    assert out["pending_deliveries"] == 0
    # avg_delivery_days: documented Optional — null means "no deliveries yet"
    assert out["avg_delivery_days"] is None


# ── ai_forecasting / ai_coach: already tight from Days 3-4 ─────────────────
# Regression guard so a future edit doesn't loosen them.
def test_ai_forecasting_dashboard_defaults():
    from ai_forecasting import DashboardResponse as ForecastDashboard

    out = _to_dict(ForecastDashboard())
    assert out["items"] == []
    assert out["total_skus_analyzed"] == 0
    assert out["total_skus_failed"] == 0


def test_ai_coach_feed_response_defaults():
    from ai_coach import FeedResponse

    out = _to_dict(FeedResponse())
    assert out["actions"] == []
    assert out["total_pending"] == 0
    assert out["total_dismissed_today"] == 0
    assert out["total_completed_today"] == 0
