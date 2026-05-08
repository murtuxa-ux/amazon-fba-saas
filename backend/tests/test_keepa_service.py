"""Tests for backend/keepa_service.py — Sprint Day 2 (§2.5).

Scope:
  - get_keepa_data_for_org records token usage into org_keepa_usage on success.
  - get_keepa_data_for_org enforces the keepa_lookups tier cap (raises 402)
    BEFORE spending tokens — gating runs before the http call.
  - get_monthly_keepa_burn aggregates tokens_consumed across all orgs for the
    current month and reports percent_used vs. KEEPA_MONTHLY_TOKEN_BUDGET.

The httpx Keepa call is patched at the helper boundary
(`keepa_service._fetch_raw_keepa`) so tests run without a live Keepa key.
"""
from __future__ import annotations

from datetime import date
from unittest.mock import patch

import pytest
from fastapi import HTTPException


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def scout_org(db_session):
    """A scout-tier org with a fake Keepa key. scout caps keepa_lookups at 50/day."""
    from models import Organization
    org = Organization(
        name="Scout Test Org",
        plan="scout",
        keepa_api_key="dummy-key",
        status="active",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def fake_keepa_response():
    """Minimal Keepa /product JSON shape that _parse_keepa_product can read."""
    return {
        "tokensConsumed": 6,
        "products": [
            {
                "title": "Test Product",
                "brand": "TestBrand",
                "categoryTree": [{"name": "Toys"}],
                "stats": {
                    "current": [None, None, None, 1234, None, None, None, 5,
                                None, None, None, 45, None, None, None, None,
                                123, None, 1999],
                    "avg90": [], "min90": [], "max90": [],
                    "monthlySold": 200,
                },
                "offers": [],
            }
        ],
    }


# ── Recording: successful call writes one usage row ─────────────────────────

def test_keepa_lookup_records_real_token_usage(db_session, scout_org, fake_keepa_response):
    """A successful Keepa fetch writes tokens_consumed (real, not estimated)."""
    from models import OrgKeepaUsage
    import keepa_service

    with patch.object(
        keepa_service, "_fetch_raw_keepa",
        return_value=(fake_keepa_response, fake_keepa_response["tokensConsumed"]),
    ):
        result = keepa_service.get_keepa_data_for_org(
            db_session, scout_org, asin="B0TEST", api_key="dummy-key"
        )

    assert result["title"] == "Test Product"

    row = (
        db_session.query(OrgKeepaUsage)
        .filter(OrgKeepaUsage.org_id == scout_org.id, OrgKeepaUsage.date == date.today())
        .first()
    )
    assert row is not None
    assert row.tokens_consumed == fake_keepa_response["tokensConsumed"]
    assert row.request_count == 1


def test_keepa_lookup_upserts_same_day(db_session, scout_org, fake_keepa_response):
    """Two same-day calls coalesce into one row, summing tokens and counts."""
    from models import OrgKeepaUsage
    import keepa_service

    with patch.object(
        keepa_service, "_fetch_raw_keepa",
        return_value=(fake_keepa_response, 6),
    ):
        for _ in range(3):
            keepa_service.get_keepa_data_for_org(
                db_session, scout_org, asin="B0TEST", api_key="dummy-key"
            )

    rows = (
        db_session.query(OrgKeepaUsage)
        .filter(OrgKeepaUsage.org_id == scout_org.id)
        .all()
    )
    assert len(rows) == 1
    assert rows[0].tokens_consumed == 18
    assert rows[0].request_count == 3


# ── Tier gate: 402 is raised BEFORE tokens are spent ────────────────────────

def test_keepa_lookup_blocked_at_tier_limit(db_session, scout_org):
    """When usage is at the daily cap, the 51st call raises 402 without
    making the http request — the tier gate runs first."""
    from models import UsageCounter
    import keepa_service

    # Pre-populate usage_counters at the scout cap (50/day for keepa_lookups).
    counter = UsageCounter(
        org_id=scout_org.id,
        resource="keepa_lookups",
        count=50,
        period_start_date=date.today(),
    )
    db_session.add(counter)
    db_session.commit()

    fetch_calls = {"n": 0}

    def fail_if_called(*args, **kwargs):
        fetch_calls["n"] += 1
        raise AssertionError("Keepa http call should NOT happen past the cap.")

    with patch.object(keepa_service, "_fetch_raw_keepa", side_effect=fail_if_called):
        with pytest.raises(HTTPException) as exc:
            keepa_service.get_keepa_data_for_org(
                db_session, scout_org, asin="B0TEST", api_key="dummy-key"
            )

    assert exc.value.status_code == 402
    assert fetch_calls["n"] == 0


# ── Monthly burn: aggregates across orgs ────────────────────────────────────

def test_monthly_burn_aggregates_across_orgs(db_session):
    """get_monthly_keepa_burn sums tokens_consumed across every org for the month."""
    from models import Organization, OrgKeepaUsage
    from keepa_service import get_monthly_keepa_burn

    # Two orgs, each with a row today.
    org_a = Organization(name="A", plan="scout", status="active")
    org_b = Organization(name="B", plan="scout", status="active")
    db_session.add_all([org_a, org_b])
    db_session.commit()
    db_session.refresh(org_a)
    db_session.refresh(org_b)

    db_session.add_all([
        OrgKeepaUsage(org_id=org_a.id, date=date.today(), tokens_consumed=400, request_count=10),
        OrgKeepaUsage(org_id=org_b.id, date=date.today(), tokens_consumed=600, request_count=20),
    ])
    db_session.commit()

    summary = get_monthly_keepa_burn(db_session, monthly_budget=2000)
    assert summary["month_to_date_tokens"] == 1000
    assert summary["monthly_budget"] == 2000
    assert summary["percent_used"] == 50.0
