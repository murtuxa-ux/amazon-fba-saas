"""
Tier-based usage limits + enforcement helper.

Single source of truth for tier gating, called from both Stream A endpoints
(client/user/asin/AI scan creation) and Stream B's keepa_service central
guard. Signature is fixed by CONVENTIONS.md §"Tier limit enforcement":

    enforce_limit(db, org, resource, increment=1)

Resources fall into two shapes:
  - Daily (ai_scans, keepa_lookups): tracked in usage_counters with a
    per-day key. Reset is implicit — a new day key returns 0.
  - Cumulative (users, clients, asins): counted live from the canonical
    table. No write here; the calling endpoint creates the row, which
    becomes part of the next call's count.

Plan-name fallback: any unknown plan (including the legacy "starter"
default and the "trialing" status) falls back to scout (most restrictive).
This matches the alias chain in stripe_billing.PLAN_ALIASES.
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session

import models


# ── Plan/resource matrix ─────────────────────────────────────────────────────
# Tier names aligned with stripe_billing.PLANS (PR #22). "starter" is mapped
# to "scout" via PLAN_ALIASES — get_tier_limits() consults that alias before
# the fallback.
TIER_LIMITS: dict[str, dict[str, Optional[int]]] = {
    "scout": {
        "users": 3,
        "clients": 10,
        "asins": 1000,
        "ai_scans": 5,
        "keepa_lookups": 50,
    },
    "growth": {
        "users": 15,
        "clients": 50,
        "asins": 10000,
        "ai_scans": 50,
        "keepa_lookups": 500,
    },
    "professional": {
        "users": 50,
        "clients": 150,
        "asins": 25000,
        "ai_scans": 200,
        "keepa_lookups": 2000,
    },
    "enterprise": {
        "users": None,
        "clients": 500,
        "asins": 100000,
        "ai_scans": None,
        "keepa_lookups": 10000,
    },
}

# Plan aliases — kept in sync with stripe_billing.PLAN_ALIASES so a stale
# "starter" plan column resolves the same way in both modules.
PLAN_ALIASES = {"starter": "scout"}

DAILY_RESOURCES = {"ai_scans", "keepa_lookups"}
CUMULATIVE_RESOURCES = {"users", "clients", "asins"}


def get_tier_limits(plan: str) -> dict[str, Optional[int]]:
    """Resolve plan name (with alias) to its limit dict, falling back to scout."""
    resolved = PLAN_ALIASES.get(plan, plan)
    return TIER_LIMITS.get(resolved, TIER_LIMITS["scout"])


def enforce_limit(
    db: Session,
    org: models.Organization,
    resource: str,
    increment: int = 1,
) -> None:
    """
    Raise HTTPException(402) if `org` would exceed its tier limit for
    `resource`. Otherwise record the usage (for daily resources) and return.

    402 is the canonical HTTP code for "payment required" — surfaces
    cleanly in the frontend as an upgrade prompt without colliding with
    role-gated 403s.
    """
    plan = org.plan or "scout"
    limits = get_tier_limits(plan)
    limit = limits.get(resource)

    if resource in DAILY_RESOURCES:
        if limit is None:
            # Unlimited tier — still record so /billing/usage shows activity.
            _record_daily_usage(db, org.id, resource, increment)
            return
        current = _get_daily_usage(db, org.id, resource)
        if current + increment > limit:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Tier limit reached: {resource} ({current}/{limit}). "
                    "Upgrade your plan at /billing."
                ),
            )
        _record_daily_usage(db, org.id, resource, increment)
        return

    if resource in CUMULATIVE_RESOURCES:
        if limit is None:
            return
        current = _count_cumulative(db, org.id, resource)
        if current + increment > limit:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Tier limit reached: {resource} ({current}/{limit}). "
                    "Upgrade your plan at /billing."
                ),
            )
        return

    raise ValueError(f"Unknown resource: {resource!r}")


def get_usage_summary(db: Session, org: models.Organization) -> dict:
    """Returns the current vs. limit for every resource in the org's tier.

    Used by GET /billing/usage to power the dashboard widget. No writes.
    """
    plan = org.plan or "scout"
    limits = get_tier_limits(plan)
    summary: dict[str, dict] = {}
    for resource, limit in limits.items():
        if resource in DAILY_RESOURCES:
            current = _get_daily_usage(db, org.id, resource)
        elif resource in CUMULATIVE_RESOURCES:
            current = _count_cumulative(db, org.id, resource)
        else:
            continue
        summary[resource] = {
            "current": current,
            "limit": limit,
            "unlimited": limit is None,
        }
    return summary


# ── Internal helpers ─────────────────────────────────────────────────────────
def _get_daily_usage(db: Session, org_id: int, resource: str) -> int:
    today = date.today()
    counter = (
        db.query(models.UsageCounter)
        .filter(
            and_(
                models.UsageCounter.org_id == org_id,
                models.UsageCounter.resource == resource,
                models.UsageCounter.period_start_date == today,
            )
        )
        .first()
    )
    return counter.count if counter else 0


def _record_daily_usage(db: Session, org_id: int, resource: str, increment: int) -> None:
    today = date.today()
    counter = (
        db.query(models.UsageCounter)
        .filter(
            and_(
                models.UsageCounter.org_id == org_id,
                models.UsageCounter.resource == resource,
                models.UsageCounter.period_start_date == today,
            )
        )
        .first()
    )
    if counter:
        counter.count += increment
    else:
        counter = models.UsageCounter(
            org_id=org_id,
            resource=resource,
            count=increment,
            period_start_date=today,
        )
        db.add(counter)
    db.commit()


def _count_cumulative(db: Session, org_id: int, resource: str) -> int:
    if resource == "users":
        return (
            db.query(models.User)
            .filter(models.User.org_id == org_id)
            .count()
        )
    if resource == "clients":
        return (
            db.query(models.Client)
            .filter(models.Client.org_id == org_id)
            .count()
        )
    if resource == "asins":
        # Product is the canonical ASIN-bearing customer table (see
        # backend/models.py:Product). One row = one analyzed ASIN.
        return (
            db.query(models.Product)
            .filter(models.Product.org_id == org_id)
            .count()
        )
    raise ValueError(f"Unknown cumulative resource: {resource!r}")
