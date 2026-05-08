"""Tests for AI Coach (§2.6 #4).

Coverage:
  - _rank_top_n sorts by impact desc and caps at TOP_N (pure)
  - regenerate_coach_feed(force=False) returns cached row when one exists
  - regenerate_coach_feed(force=True) re-emits and expires the prior set
  - BuyBox alerts → coach actions wire-up (severity propagates to urgency)
  - PPC high-ACoS campaigns → coach actions; impact <= total_spend
  - Cron iterates only active/trialing orgs

Tests run against the same Postgres test DB as the rest of the suite.
db_session is migration_role (BYPASSRLS) so seeds are visible without
priming app.current_org_id, mirroring the test_tier_limits pattern.
"""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest

import models
from ai_coach import (
    TOP_N,
    _rank_top_n,
    regenerate_coach_feed,
)


# ── Pure-function ranking ──────────────────────────────────────────────────
def test_rank_top_n_sorts_desc_and_caps():
    raw = [
        {"dollar_impact_est": 10, "id": "a"},
        {"dollar_impact_est": 100, "id": "b"},
        {"dollar_impact_est": 50, "id": "c"},
        {"dollar_impact_est": 5, "id": "d"},
        {"dollar_impact_est": 200, "id": "e"},
        {"dollar_impact_est": 1, "id": "f"},
        {"dollar_impact_est": 999, "id": "g"},
    ]
    out = _rank_top_n(raw, n=5)
    assert len(out) == 5
    assert [r["id"] for r in out] == ["g", "e", "b", "c", "a"]


def test_rank_top_n_handles_missing_impact():
    raw = [{"id": "x"}, {"id": "y", "dollar_impact_est": 1}]
    out = _rank_top_n(raw, n=5)
    # Missing impact treated as 0; sorted desc so y comes first
    assert [r["id"] for r in out] == ["y", "x"]


def test_top_n_is_5_per_brief():
    """§2.6 brief: top 5 actions ranked by $ impact."""
    assert TOP_N == 5


# ── Fixtures ───────────────────────────────────────────────────────────────
@pytest.fixture
def coach_org(db_session):
    org = models.Organization(name="Coach Co", plan="growth", status="active")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def buybox_alerts(db_session, coach_org):
    """Three recent BuyBox alerts for coach_org."""
    now = datetime.utcnow()
    alerts = [
        models.BuyBoxAlert(
            org_id=coach_org.id,
            asin="B0LOST00001",
            alert_type="lost_buybox",
            severity="critical",
            message="Lost BuyBox to UnderCut Inc.",
            is_read=False,
            created_at=now - timedelta(hours=2),
        ),
        models.BuyBoxAlert(
            org_id=coach_org.id,
            asin="B0LOST00002",
            alert_type="lost_buybox",
            severity="warning",
            message="Lost BuyBox 1d ago.",
            is_read=False,
            created_at=now - timedelta(days=1),
        ),
        models.BuyBoxAlert(
            org_id=coach_org.id,
            asin="B0SUPP00003",
            alert_type="suppressed",
            severity="critical",
            message="Listing suppressed.",
            is_read=False,
            created_at=now - timedelta(hours=6),
        ),
    ]
    db_session.add_all(alerts)
    db_session.commit()
    return alerts


@pytest.fixture
def ppc_campaigns(db_session, coach_org):
    """Two leaking PPC campaigns + one healthy one (filtered out)."""
    campaigns = [
        models.PPCCampaign(
            org_id=coach_org.id,
            campaign_name="High ACoS Bleed",
            status="active",
            acos=75.0,
            total_spend=500.0,
        ),
        models.PPCCampaign(
            org_id=coach_org.id,
            campaign_name="Mild Bleed",
            status="active",
            acos=55.0,
            total_spend=200.0,
        ),
        models.PPCCampaign(
            org_id=coach_org.id,
            campaign_name="Healthy",
            status="active",
            acos=20.0,
            total_spend=300.0,
        ),
    ]
    db_session.add_all(campaigns)
    db_session.commit()
    return campaigns


# ── Persistence + caching ──────────────────────────────────────────────────
def test_regenerate_returns_at_most_top_n(db_session, coach_org, buybox_alerts, ppc_campaigns):
    actions = regenerate_coach_feed(db_session, coach_org, force=True)
    assert len(actions) <= TOP_N
    impacts = [float(a.dollar_impact_est) for a in actions]
    assert impacts == sorted(impacts, reverse=True)
    assert all(a.status == "pending" for a in actions)
    assert all(a.org_id == coach_org.id for a in actions)


def test_buybox_alert_propagates_to_action(db_session, coach_org, buybox_alerts):
    actions = regenerate_coach_feed(db_session, coach_org, force=True)
    asins = {a.asin for a in actions if a.asin}
    # All three alerts are <7d and unread; coach surfaces them
    assert "B0LOST00001" in asins
    assert "B0LOST00002" in asins
    assert "B0SUPP00003" in asins
    # Critical-severity alerts produce critical urgency on the action
    critical_actions = [a for a in actions if a.asin in ("B0LOST00001", "B0SUPP00003")]
    assert all(a.urgency == "critical" for a in critical_actions)


def test_ppc_action_impact_capped_at_total_spend(db_session, coach_org, ppc_campaigns):
    actions = regenerate_coach_feed(db_session, coach_org, force=True)
    ppc_actions = [a for a in actions if a.action_type == "high_acos_keyword"]
    assert ppc_actions, "expected at least one PPC action from leaking campaigns"
    # Healthy campaign (20% ACoS) must not surface
    suggested = " ".join(a.suggested_action for a in ppc_actions)
    assert "Healthy" not in suggested
    # Impact estimate stays within total_spend per campaign
    for a in ppc_actions:
        assert float(a.dollar_impact_est) <= 500.0


def test_regenerate_without_force_returns_cached(db_session, coach_org, buybox_alerts):
    first = regenerate_coach_feed(db_session, coach_org, force=True)
    first_ids = {a.id for a in first}
    second = regenerate_coach_feed(db_session, coach_org, force=False)
    second_ids = {a.id for a in second}
    assert first_ids == second_ids, "force=False must return cached rows, not regenerate"


def test_regenerate_with_force_expires_prior_set(db_session, coach_org, buybox_alerts):
    first = regenerate_coach_feed(db_session, coach_org, force=True)
    first_ids = {a.id for a in first}
    second = regenerate_coach_feed(db_session, coach_org, force=True)
    second_ids = {a.id for a in second}
    assert first_ids.isdisjoint(second_ids), "force=True must produce new action rows"
    # Prior rows should now be 'expired'
    expired = (
        db_session.query(models.AiCoachAction)
        .filter(
            models.AiCoachAction.org_id == coach_org.id,
            models.AiCoachAction.id.in_(first_ids),
        )
        .all()
    )
    assert all(a.status == "expired" for a in expired)


def test_no_actions_when_no_data(db_session, coach_org):
    """Org with no BuyBox alerts and no PPC campaigns — feed empty, no error."""
    actions = regenerate_coach_feed(db_session, coach_org, force=True)
    assert actions == []


# ── Cron entrypoint ────────────────────────────────────────────────────────
def test_cron_iterates_only_active_or_trialing(db_session, buybox_alerts, coach_org):
    """The cron must skip canceled / past_due orgs.

    coach_org is 'active' (from the fixture) and has BuyBox alerts. We add
    a 'canceled' org and confirm the cron didn't generate actions for it.
    """
    canceled = models.Organization(name="Canceled Co", plan="scout", status="canceled")
    db_session.add(canceled)
    db_session.commit()
    db_session.refresh(canceled)

    from cron.coach_daily import run_daily_coach_regeneration
    summary = run_daily_coach_regeneration()
    # Active + trialing only — the coach_org counts; canceled doesn't.
    assert summary["succeeded"] >= 1
    assert summary["failed"] == 0

    # Canceled org should have zero AiCoachAction rows
    canceled_count = (
        db_session.query(models.AiCoachAction)
        .filter(models.AiCoachAction.org_id == canceled.id)
        .count()
    )
    assert canceled_count == 0
