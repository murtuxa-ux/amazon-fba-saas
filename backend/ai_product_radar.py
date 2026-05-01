"""
AI Product Radar — opportunity scanner for Ecom Era FBA SaaS.

Routes:
  GET  /product-radar/scan        rank already-scouted ASINs by composite score (no Keepa)
  GET  /product-radar/categories  distinct categories with counts and avg fba_score
  POST /product-radar/live-scan   Keepa-powered scan over a caller-supplied ASIN list (admin)

Composite score = 0.4 * velocity + 0.3 * competition + 0.3 * margin
  - velocity:    monthly_sales saturated at 1000/mo (10 sales -> 1 point)
  - competition: inverse of fba_sellers (0 sellers -> 100, 20+ -> 0)
  - margin:      real margin if COGS provided, else volatility-inverse proxy
                 (rows flagged margin_estimated=true so the UI can label them)

Tiers: composite >=80 Hot, 60-79 Warm, 40-59 Cool, <40 Skip.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from auth import get_current_user, get_org_scoped_query, require_role
from config import settings
from database import get_db
from keepa_service import get_keepa_data
from models import ActivityLog, Organization, Product, ScoutResult, User

router = APIRouter(prefix="/product-radar", tags=["AI Product Radar"])


# Estimated Keepa tokens per single-ASIN call (stats=90 + offers=20).
# Used for the pre-flight budget guard and for ActivityLog cost tracking —
# `keepa_service.get_keepa_data` does not currently surface real `tokensConsumed`.
KEEPA_TOKENS_PER_ASIN_ESTIMATE = 6
LIVE_SCAN_MAX_ASINS = 50


# ── Pydantic models ────────────────────────────────────────────────────────
class RadarFilters(BaseModel):
    category: Optional[str] = None
    bsr_max: Optional[int] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    fba_sellers_max: Optional[int] = None
    min_composite: Optional[float] = None


class LiveScanRequest(BaseModel):
    asins: List[str]
    filters: Optional[RadarFilters] = None
    cost_per_unit: Optional[float] = None
    domain: Optional[int] = 1


# ── Scoring ────────────────────────────────────────────────────────────────
def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _fba_fee_rate(price: float) -> float:
    if price < 15:
        return 0.45
    if price < 25:
        return 0.40
    return 0.35


def _score_opportunity(
    monthly_sales: int,
    fba_sellers: int,
    current_price: float,
    price_volatility_pct: float,
    cost: Optional[float],
) -> Dict:
    velocity_score = _clamp((monthly_sales or 0) / 10.0)
    competition_score = _clamp(100.0 - (fba_sellers or 0) * 5)

    margin_estimated = True
    if cost is not None and cost > 0 and current_price > 0:
        fee_rate = _fba_fee_rate(current_price)
        profit = current_price * (1 - fee_rate) - cost
        margin_pct = profit / current_price * 100
        # 50%+ margin saturates to 100, 0% -> 0, negative clamps to 0
        margin_score = _clamp(margin_pct * 2)
        margin_estimated = False
    else:
        margin_score = _clamp(100.0 - (price_volatility_pct or 0) * 2)

    composite = round(
        0.4 * velocity_score + 0.3 * competition_score + 0.3 * margin_score, 2
    )

    if composite >= 80:
        tier = "Hot"
    elif composite >= 60:
        tier = "Warm"
    elif composite >= 40:
        tier = "Cool"
    else:
        tier = "Skip"

    return {
        "velocity_score": round(velocity_score, 1),
        "competition_score": round(competition_score, 1),
        "margin_score": round(margin_score, 1),
        "composite": composite,
        "tier": tier,
        "margin_estimated": margin_estimated,
    }


def _scout_to_radar_row(scout: ScoutResult, scoring: Dict) -> Dict:
    return {
        "asin": scout.asin,
        "title": scout.title,
        "brand": scout.brand,
        "category": scout.category,
        "bsr": scout.bsr or 0,
        "monthly_sales": scout.monthly_sales or 0,
        "current_price": float(scout.current_price) if scout.current_price else 0.0,
        "fba_sellers": scout.fba_sellers or 0,
        "price_volatility_pct": float(scout.price_volatility_pct) if scout.price_volatility_pct else 0.0,
        "verdict": scout.verdict,
        "amazon_url": f"https://www.amazon.com/dp/{scout.asin}",
        **scoring,
    }


def _tier_counts(rows: List[Dict]) -> Dict[str, int]:
    counts = {"Hot": 0, "Warm": 0, "Cool": 0, "Skip": 0}
    for r in rows:
        counts[r["tier"]] = counts.get(r["tier"], 0) + 1
    return counts


# ── /scan ──────────────────────────────────────────────────────────────────
@router.get("/scan")
async def scan_existing(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    category: Optional[str] = Query(None),
    bsr_max: Optional[int] = Query(None, ge=0),
    price_min: Optional[float] = Query(None, ge=0),
    price_max: Optional[float] = Query(None, ge=0),
    fba_sellers_max: Optional[int] = Query(None, ge=0),
    min_composite: float = Query(0, ge=0, le=100),
    default_cost: Optional[float] = Query(None, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Rank already-scouted ASINs by composite opportunity score.

    For each row, COGS is resolved in this order: matching Product.cost ->
    `default_cost` query param -> none (margin falls back to volatility-inverse
    proxy and the row is flagged margin_estimated=true).
    """
    try:
        q = get_org_scoped_query(db, user, ScoutResult)
        if category:
            q = q.filter(ScoutResult.category == category)
        if bsr_max is not None:
            q = q.filter(ScoutResult.bsr <= bsr_max)
        if price_min is not None:
            q = q.filter(ScoutResult.current_price >= price_min)
        if price_max is not None:
            q = q.filter(ScoutResult.current_price <= price_max)
        if fba_sellers_max is not None:
            q = q.filter(ScoutResult.fba_sellers <= fba_sellers_max)

        scouts = q.all()
        if not scouts:
            return {
                "data": [],
                "count": 0,
                "source": "scout_db",
                "tier_counts": {"Hot": 0, "Warm": 0, "Cool": 0, "Skip": 0},
                "message": "No scout data matches filters",
            }

        asin_set = {s.asin for s in scouts}
        product_costs: Dict[str, float] = {}
        if asin_set:
            for p in (
                get_org_scoped_query(db, user, Product)
                .filter(Product.asin.in_(asin_set))
                .all()
            ):
                if p.cost and p.cost > 0:
                    product_costs[p.asin] = float(p.cost)

        ranked: List[Dict] = []
        for s in scouts:
            cost = product_costs.get(s.asin, default_cost)
            scoring = _score_opportunity(
                monthly_sales=s.monthly_sales or 0,
                fba_sellers=s.fba_sellers or 0,
                current_price=float(s.current_price or 0),
                price_volatility_pct=float(s.price_volatility_pct or 0),
                cost=cost,
            )
            if scoring["composite"] < min_composite:
                continue
            ranked.append(_scout_to_radar_row(s, scoring))

        ranked.sort(key=lambda r: r["composite"], reverse=True)
        ranked = ranked[:limit]

        return {
            "data": ranked,
            "count": len(ranked),
            "source": "scout_db",
            "tier_counts": _tier_counts(ranked),
            "filters": {
                "category": category,
                "bsr_max": bsr_max,
                "price_min": price_min,
                "price_max": price_max,
                "fba_sellers_max": fba_sellers_max,
                "min_composite": min_composite,
                "default_cost": default_cost,
            },
        }
    except Exception as e:
        return {"error": "Failed to scan scout data", "detail": str(e)}


# ── /categories ────────────────────────────────────────────────────────────
@router.get("/categories")
async def list_categories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Distinct categories present in the org's scout data, with row counts and avg fba_score."""
    try:
        rows = (
            db.query(
                ScoutResult.category,
                func.count(ScoutResult.id).label("count"),
                func.avg(ScoutResult.fba_score).label("avg_score"),
            )
            .filter(ScoutResult.org_id == user.org_id)
            .filter(ScoutResult.category.isnot(None))
            .filter(ScoutResult.category != "")
            .group_by(ScoutResult.category)
            .order_by(desc("count"))
            .all()
        )
        return {
            "categories": [
                {
                    "name": r.category,
                    "count": r.count,
                    "avg_fba_score": round(float(r.avg_score or 0), 2),
                }
                for r in rows
            ],
            "count": len(rows),
        }
    except Exception as e:
        return {"error": "Failed to load categories", "detail": str(e)}


# ── /live-scan ─────────────────────────────────────────────────────────────
@router.post("/live-scan")
async def live_scan(
    payload: LiveScanRequest,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Fetch fresh Keepa data for each ASIN, score, persist to ScoutResult, log cost.

    Admin-only because each ASIN call spends Keepa tokens. A pre-flight budget
    guard rejects requests that would exceed RADAR_LIVE_SCAN_TOKEN_BUDGET
    (default 500, configurable via env var).
    """
    raw_asins = [a.strip().upper() for a in (payload.asins or []) if a.strip()]
    unique_asins = list(dict.fromkeys(raw_asins))
    if not unique_asins:
        raise HTTPException(status_code=400, detail="No valid ASINs provided.")
    if len(unique_asins) > LIVE_SCAN_MAX_ASINS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {LIVE_SCAN_MAX_ASINS} ASINs per live-scan.",
        )

    budget = int(getattr(settings, "RADAR_LIVE_SCAN_TOKEN_BUDGET", 500))
    estimated_cost = len(unique_asins) * KEEPA_TOKENS_PER_ASIN_ESTIMATE
    if estimated_cost > budget:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Live scan would consume ~{estimated_cost} Keepa tokens "
                f"(budget {budget}). Reduce ASIN count to "
                f"{budget // KEEPA_TOKENS_PER_ASIN_ESTIMATE} or fewer."
            ),
        )

    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    api_key = getattr(org, "keepa_api_key", None) if org else None
    if not api_key:
        raise HTTPException(status_code=400, detail="Keepa API key not configured.")

    filters = payload.filters or RadarFilters()
    cost = payload.cost_per_unit
    domain = payload.domain or 1

    results: List[Dict] = []
    errors: List[Dict] = []

    for asin in unique_asins:
        try:
            keepa = get_keepa_data(asin, api_key, domain=domain)
            current_price = float(keepa.get("current_price", 0) or 0)
            scoring = _score_opportunity(
                monthly_sales=keepa.get("monthly_sales", 0),
                fba_sellers=keepa.get("fba_sellers", 0),
                current_price=current_price,
                price_volatility_pct=float(keepa.get("price_volatility_pct", 0) or 0),
                cost=cost,
            )

            # Post-fetch filter pass — keep the request body simple, apply filters here
            if filters.category and (keepa.get("category") or "") != filters.category:
                continue
            if filters.bsr_max is not None and keepa.get("bsr", 0) > filters.bsr_max:
                continue
            if filters.price_min is not None and current_price < filters.price_min:
                continue
            if filters.price_max is not None and current_price > filters.price_max:
                continue
            if filters.fba_sellers_max is not None and keepa.get("fba_sellers", 0) > filters.fba_sellers_max:
                continue
            if filters.min_composite is not None and scoring["composite"] < filters.min_composite:
                continue

            db.add(ScoutResult(
                org_id=user.org_id,
                asin=asin,
                title=keepa.get("title") or "",
                brand=keepa.get("brand") or "",
                category=keepa.get("category") or "",
                bsr=keepa.get("bsr", 0),
                monthly_sales=keepa.get("monthly_sales", 0),
                current_price=current_price,
                price_volatility_pct=float(keepa.get("price_volatility_pct", 0) or 0),
                fba_sellers=keepa.get("fba_sellers", 0),
                fba_score=scoring["composite"],
                verdict=scoring["tier"],
                created_at=datetime.utcnow(),
            ))

            results.append({
                "asin": asin,
                "title": keepa.get("title"),
                "brand": keepa.get("brand"),
                "category": keepa.get("category"),
                "bsr": keepa.get("bsr", 0),
                "monthly_sales": keepa.get("monthly_sales", 0),
                "current_price": current_price,
                "fba_sellers": keepa.get("fba_sellers", 0),
                "price_volatility_pct": float(keepa.get("price_volatility_pct", 0) or 0),
                "verdict": scoring["tier"],
                "amazon_url": f"https://www.amazon.com/dp/{asin}",
                **scoring,
            })
        except Exception as e:
            errors.append({"asin": asin, "error": str(e)})

    db.commit()
    results.sort(key=lambda r: r["composite"], reverse=True)

    tokens_consumed_estimate = (len(results) + len(errors)) * KEEPA_TOKENS_PER_ASIN_ESTIMATE
    log_detail = {
        "category": filters.category,
        "filters": filters.dict(exclude_none=True),
        "asins_requested": len(unique_asins),
        "asins_returned": len(results),
        "errors_count": len(errors),
        "tokens_consumed_estimate": tokens_consumed_estimate,
        "budget": budget,
        "returned_asins": [r["asin"] for r in results],
    }
    db.add(ActivityLog(
        org_id=user.org_id,
        user_id=user.id,
        action="radar_live_scan",
        detail=json.dumps(log_detail, default=str),
        created_at=datetime.utcnow(),
    ))
    db.commit()

    return {
        "data": results,
        "count": len(results),
        "errors": errors,
        "errors_count": len(errors),
        "tier_counts": _tier_counts(results),
        "tokens_consumed_estimate": tokens_consumed_estimate,
        "budget": budget,
        "source": "keepa_live",
    }
