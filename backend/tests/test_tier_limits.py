"""
Tests for backend/tier_limits.py — Sprint Day 2 (§2.2).

Scope:
  - Daily-resource limit blocks once exceeded (402, with detail message).
  - Daily-resource counter scopes to date — yesterday's row at the cap
    doesn't poison today's check.
  - Cumulative-resource limit reads from the canonical row count and blocks
    once cap reached.
  - Unlimited tier (enterprise.ai_scans) accepts arbitrarily many calls.
  - get_usage_summary returns current+limit per resource for the dashboard.

Tests run against the same Postgres test DB as the rest of the suite, with
RLS_ENFORCED=true at session scope. The db_session fixture connects as
migration_role (BYPASSRLS), so seeded rows are visible to enforce_limit's
internal queries without needing to prime app.current_org_id.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from tier_limits import enforce_limit, get_tier_limits, get_usage_summary
import models


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def scout_org(db_session):
    """Most-restrictive tier: 5 ai_scans/day, 10 clients, 1000 asins, 3 users."""
    org = models.Organization(name="Scout Co", plan="scout", status="active")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def enterprise_org(db_session):
    """Enterprise tier: ai_scans is unlimited (limit=None)."""
    org = models.Organization(name="Big Co", plan="enterprise", status="active")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


# ── Daily-resource enforcement ───────────────────────────────────────────────

def test_scout_blocked_after_5_ai_scans(db_session, scout_org):
    """Scout tier: 6th ai_scan in a day raises 402 with upgrade message."""
    for _ in range(5):
        enforce_limit(db_session, scout_org, "ai_scans")

    with pytest.raises(HTTPException) as exc:
        enforce_limit(db_session, scout_org, "ai_scans")
    assert exc.value.status_code == 402
    assert "Tier limit reached" in exc.value.detail
    assert "ai_scans" in exc.value.detail


def test_enterprise_unlimited_ai_scans(db_session, enterprise_org):
    """Enterprise.ai_scans=None: arbitrarily many calls don't raise.

    100 instead of 1000 keeps the test fast — the contract is unlimited,
    not 'high'. A True None-handling bug would surface within a handful of
    iterations.
    """
    for _ in range(100):
        enforce_limit(db_session, enterprise_org, "ai_scans")
    # Counter still gets recorded for analytics.
    counter = (
        db_session.query(models.UsageCounter)
        .filter(
            models.UsageCounter.org_id == enterprise_org.id,
            models.UsageCounter.resource == "ai_scans",
        )
        .first()
    )
    assert counter is not None
    assert counter.count == 100


def test_daily_counter_resets_across_days(db_session, scout_org):
    """A yesterday counter at the cap doesn't affect today's first call.

    enforce_limit keys on date.today(), so yesterday's row is irrelevant.
    Test by manually inserting a yesterday counter at the cap, then
    confirming today's first call succeeds.
    """
    yesterday = date.today() - timedelta(days=1)
    db_session.add(
        models.UsageCounter(
            org_id=scout_org.id,
            resource="ai_scans",
            count=5,
            period_start_date=yesterday,
        )
    )
    db_session.commit()

    # Today should still allow the full 5.
    for _ in range(5):
        enforce_limit(db_session, scout_org, "ai_scans")
    # 6th today raises.
    with pytest.raises(HTTPException) as exc:
        enforce_limit(db_session, scout_org, "ai_scans")
    assert exc.value.status_code == 402


def test_increment_greater_than_one_blocks_when_would_exceed(db_session, scout_org):
    """A bulk call asking for 6 ai_scans on a fresh scout org raises (cap is 5)."""
    with pytest.raises(HTTPException) as exc:
        enforce_limit(db_session, scout_org, "ai_scans", increment=6)
    assert exc.value.status_code == 402
    # Counter must NOT have been written — the cap check ran first.
    counter = (
        db_session.query(models.UsageCounter)
        .filter(
            models.UsageCounter.org_id == scout_org.id,
            models.UsageCounter.resource == "ai_scans",
        )
        .first()
    )
    assert counter is None


# ── Cumulative-resource enforcement ──────────────────────────────────────────

def test_cumulative_clients_blocked_at_cap(db_session, scout_org):
    """Scout cap is 10 clients; the 11th raises 402."""
    for i in range(10):
        db_session.add(models.Client(org_id=scout_org.id, name=f"Client {i}"))
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        enforce_limit(db_session, scout_org, "clients")
    assert exc.value.status_code == 402


def test_cumulative_asins_uses_product_count(db_session, scout_org):
    """The asins quota counts rows in `products` (canonical ASIN table)."""
    # 999 products — under the 1000 cap.
    for i in range(999):
        db_session.add(models.Product(org_id=scout_org.id, asin=f"B{i:09d}"))
    db_session.commit()

    # 1000th still allowed.
    enforce_limit(db_session, scout_org, "asins")
    db_session.add(models.Product(org_id=scout_org.id, asin="BFINAL00001"))
    db_session.commit()

    # 1001st raises.
    with pytest.raises(HTTPException):
        enforce_limit(db_session, scout_org, "asins")


# ── Plan resolution ──────────────────────────────────────────────────────────

def test_starter_alias_resolves_to_scout_limits():
    """Legacy 'starter' plans get scout limits via PLAN_ALIASES."""
    assert get_tier_limits("starter") == get_tier_limits("scout")


def test_unknown_plan_falls_back_to_scout():
    """A plan column that's never been touched falls back to scout."""
    assert get_tier_limits("definitely-not-a-plan") == get_tier_limits("scout")


# ── Usage summary ────────────────────────────────────────────────────────────

def test_usage_summary_reports_current_and_limit(db_session, scout_org):
    """get_usage_summary returns one entry per resource with current/limit/unlimited."""
    enforce_limit(db_session, scout_org, "ai_scans")
    db_session.add(models.Client(org_id=scout_org.id, name="C1"))
    db_session.commit()

    summary = get_usage_summary(db_session, scout_org)

    assert summary["ai_scans"] == {"current": 1, "limit": 5, "unlimited": False}
    assert summary["clients"] == {"current": 1, "limit": 10, "unlimited": False}
    assert summary["users"]["limit"] == 3
    # asins are counted via Product, none seeded -> 0.
    assert summary["asins"]["current"] == 0


def test_usage_summary_marks_unlimited_for_enterprise(db_session, enterprise_org):
    """Enterprise.ai_scans surfaces as unlimited=True in the summary."""
    summary = get_usage_summary(db_session, enterprise_org)
    assert summary["ai_scans"]["unlimited"] is True
    assert summary["ai_scans"]["limit"] is None
    assert summary["users"]["unlimited"] is True
