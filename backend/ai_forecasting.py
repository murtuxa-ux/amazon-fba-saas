"""AI Forecasting (§2.6 #3) — demand forecast + reorder recommendations.

Strategy by available BSR history (driven by keepa_service.get_keepa_history_for_org):
  - 90+ days  : Holt-Winters exponential smoothing with weekly seasonality
  - 30-89 days: 7-day moving average baseline
  - <30 days  : median trajectory of org's same-category cohort (ScoutResult)

Q4 boost: when current month is Oct-Dec AND we have 365+ days, scale forecast
by ratio of last year's Nov-Dec average to that year's Sep-Oct average,
capped at 2x.

Routes:
  GET /forecasting/asin/{asin}     single ASIN forecast (tier-gated keepa_lookups + ai_scans)
  GET /forecasting/dashboard       top-20 reorder priorities for org (tier-gated ai_scans)

Reorder formula:
  reorder_qty = forecast_during_lead_time * safety_stock_factor - on_hand - inbound
  reorder_date = today + days until cumulative forecast >= on_hand + inbound

Product model has no on_hand / inbound columns yet — both treated as 0,
which conservatively over-recommends rather than under-recommends.
TODO once an inventory module ships: thread real on_hand / inbound here.
"""

import logging
from datetime import date, timedelta
from statistics import median
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import tenant_session
from database import get_db
from keepa_service import get_keepa_history_for_org
from models import Organization, Product, ScoutResult, User
from tier_limits import enforce_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forecasting", tags=["AI Forecasting"])


# ── Schemas ────────────────────────────────────────────────────────────────
class ForecastResponse(BaseModel):
    asin: str
    forecast_30d: int = 0
    forecast_60d: int = 0
    forecast_90d: int = 0
    reorder_qty: int = 0
    reorder_date: Optional[str] = None
    days_until_reorder: Optional[int] = None
    confidence: Literal["high", "medium", "low"]
    method: Literal["holt_winters", "moving_average", "cohort_fallback"]
    days_of_history: int = 0
    q4_boost_applied: bool = False
    label: Literal["forecast", "trend estimate"] = "forecast"


class ReorderListItem(BaseModel):
    asin: str
    title: Optional[str] = None
    days_until_reorder: int = 999
    reorder_qty: int = 0
    confidence: str = "low"
    method: str = "cohort_fallback"


class DashboardResponse(BaseModel):
    items: List[ReorderListItem] = Field(default_factory=list)
    total_skus_analyzed: int = 0
    total_skus_failed: int = 0


# ── Forecast methods ───────────────────────────────────────────────────────
def _holt_winters_forecast(history: List[int], periods: int = 90) -> List[int]:
    """Holt-Winters with weekly seasonality. Requires 90+ data points."""
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    if len(history) < 90:
        raise ValueError("Holt-Winters requires 90+ data points")
    try:
        model = ExponentialSmoothing(
            history,
            trend="add",
            seasonal="add",
            seasonal_periods=7,
            initialization_method="estimated",
        ).fit()
        forecast = model.forecast(periods)
        return [max(0, int(round(x))) for x in forecast]
    except Exception as e:
        # statsmodels raises on degenerate data (constant series, NaNs).
        # Fall back rather than 500 — forecast is best-effort.
        logger.warning("Holt-Winters fit failed (%s), falling back to MA", e)
        return _moving_average_forecast(history, periods)


def _moving_average_forecast(history: List[int], periods: int = 90) -> List[int]:
    """7-day moving average extended forward."""
    if not history:
        return [0] * periods
    if len(history) < 7:
        avg = sum(history) / len(history)
    else:
        avg = sum(history[-7:]) / 7
    return [max(0, int(round(avg)))] * periods


def _cohort_fallback_forecast(
    db: Session,
    org: Organization,
    keepa_hint_category: Optional[str],
    periods: int = 90,
) -> List[int]:
    """For new ASINs with <30 days history, use median of org's similar ASINs.

    ScoutResult has `category` (string) and `monthly_sales` (no
    estimated_daily_sales column). Convert monthly → daily; fall back to
    1 unit/day if no cohort exists.
    """
    if not keepa_hint_category:
        return [1] * periods
    cohort = (
        db.query(ScoutResult)
        .filter(
            ScoutResult.org_id == org.id,
            ScoutResult.category == keepa_hint_category,
        )
        .limit(20)
        .all()
    )
    if not cohort:
        return [1] * periods
    daily_velocities = [max(1, int((r.monthly_sales or 0) / 30)) for r in cohort]
    median_velocity = max(1, int(median(daily_velocities)))
    return [median_velocity] * periods


def _detect_q4_boost(history: List[int], today: Optional[date] = None) -> float:
    """Multiplier for Q4 lift relative to Sep-Oct of the same prior year.

    Returns 1.0 outside Oct-Dec or when <365 days of history. Capped at 2.0.
    Accepts `today` for testability.
    """
    today = today or date.today()
    if len(history) < 365 or today.month not in (10, 11, 12):
        return 1.0
    last_year = history[-365:]
    nov_dec = last_year[304:365]
    sep_oct = last_year[244:304]
    if not nov_dec or not sep_oct:
        return 1.0
    nov_dec_avg = sum(nov_dec) / len(nov_dec)
    sep_oct_avg = sum(sep_oct) / len(sep_oct)
    if sep_oct_avg <= 0:
        return 1.0
    return min(max(nov_dec_avg / sep_oct_avg, 1.0), 2.0)


def _calculate_reorder(
    forecast: List[int],
    lead_time_days: int = 30,
    safety_stock_factor: float = 1.5,
    on_hand: int = 0,
    inbound: int = 0,
):
    """Compute (reorder_qty, reorder_date_iso, days_until_reorder)."""
    forecast_during_lead = sum(forecast[:lead_time_days])
    reorder_qty = max(
        0,
        int(round(forecast_during_lead * safety_stock_factor - on_hand - inbound)),
    )
    runway = on_hand + inbound
    cumulative = 0
    days_until_reorder: Optional[int] = None
    for i, daily in enumerate(forecast):
        cumulative += daily
        if cumulative >= runway:
            days_until_reorder = i
            break
    reorder_date = (
        (date.today() + timedelta(days=days_until_reorder)).isoformat()
        if days_until_reorder is not None
        else None
    )
    return reorder_qty, reorder_date, days_until_reorder


def _pick_method(history_len: int):
    """Returns (method_name, confidence) for the given history length."""
    if history_len >= 90:
        return "holt_winters", "high"
    if history_len >= 30:
        return "moving_average", "medium"
    return "cohort_fallback", "low"


def _run_forecast(
    db: Session,
    org: Organization,
    history: List[int],
    cohort_category: Optional[str],
    periods: int = 90,
):
    """Dispatch to the right forecaster. Returns (forecast_series, method, confidence)."""
    method, confidence = _pick_method(len(history))
    if method == "holt_winters":
        series = _holt_winters_forecast(history, periods=periods)
    elif method == "moving_average":
        series = _moving_average_forecast(history, periods=periods)
    else:
        series = _cohort_fallback_forecast(db, org, cohort_category, periods=periods)
    return series, method, confidence


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/asin/{asin}", response_model=ForecastResponse)
def forecast_asin(
    asin: str,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Generate 30/60/90-day forecast + reorder recommendation for one ASIN.

    Each call counts against ai_scans. The Keepa history fetch additionally
    counts against keepa_lookups via get_keepa_history_for_org's internal
    enforce_limit.
    """
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # ai_scans gate FIRST so a tier-blocked user never spends Keepa tokens.
    enforce_limit(db, org, "ai_scans")

    try:
        history = get_keepa_history_for_org(db, org, asin)
    except HTTPException:
        # tier 402, missing key 400 — surface as-is
        raise
    except Exception as e:
        logger.error("Keepa history fetch failed for %s: %s", asin, e)
        raise HTTPException(status_code=502, detail=f"Keepa unavailable: {e}")

    # Cohort fallback needs a category hint. Pull from org's existing
    # scout data for this ASIN if we've scouted it before.
    cohort_category = None
    scout = (
        db.query(ScoutResult)
        .filter(
            ScoutResult.org_id == org.id,
            ScoutResult.asin == asin.upper(),
        )
        .first()
    )
    if scout and scout.category:
        cohort_category = scout.category

    series, method, confidence = _run_forecast(
        db, org, history, cohort_category, periods=90
    )

    q4_multiplier = _detect_q4_boost(history)
    if q4_multiplier > 1.0:
        series = [int(round(x * q4_multiplier)) for x in series]

    reorder_qty, reorder_date, days_until = _calculate_reorder(series)

    # §2.6 acceptance criteria: when MAPE > 35% UI relabels to "trend estimate".
    # We can't compute live MAPE without a holdout, so use confidence as a proxy:
    # cohort fallback is the only tier where we know the projection is weak.
    label = "trend estimate" if confidence == "low" else "forecast"

    return ForecastResponse(
        asin=asin.upper(),
        forecast_30d=sum(series[:30]),
        forecast_60d=sum(series[:60]),
        forecast_90d=sum(series[:90]),
        reorder_qty=reorder_qty,
        reorder_date=reorder_date,
        days_until_reorder=days_until,
        confidence=confidence,
        method=method,
        days_of_history=len(history),
        q4_boost_applied=q4_multiplier > 1.0,
        label=label,
    )


@router.get("/dashboard", response_model=DashboardResponse)
def forecast_dashboard(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Top 20 ASINs ranked by reorder urgency.

    Each ASIN is one Keepa lookup AND one ai_scan, so the org-level tier
    quota is exercised once per product. We cap at 20 to bound cost; the
    org-wide /api/system/keepa-budget endpoint still flags overspend.
    """
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    products = (
        db.query(Product)
        .filter(Product.org_id == org.id)
        .order_by(Product.created_at.desc())
        .limit(20)
        .all()
    )
    if not products:
        return DashboardResponse(items=[], total_skus_analyzed=0, total_skus_failed=0)

    enforce_limit(db, org, "ai_scans", increment=len(products))

    # Pre-load category hints from scout results so cohort fallback can
    # work without a per-product DB hit inside the loop.
    asin_set = {p.asin.upper() for p in products if p.asin}
    scouts = (
        db.query(ScoutResult)
        .filter(
            ScoutResult.org_id == org.id,
            ScoutResult.asin.in_(asin_set),
        )
        .all()
    )
    scout_titles = {s.asin: s.title for s in scouts if s.title}
    scout_categories = {s.asin: s.category for s in scouts if s.category}

    items: List[ReorderListItem] = []
    failed = 0
    for p in products:
        asin_u = (p.asin or "").upper()
        if not asin_u:
            failed += 1
            continue
        try:
            history = get_keepa_history_for_org(db, org, asin_u)
        except HTTPException as he:
            # 402 keepa_lookups — stop the dashboard cleanly so the user
            # sees an upgrade banner rather than a half-rendered list.
            if he.status_code == 402:
                raise
            failed += 1
            continue
        except Exception as e:
            logger.warning("Forecast skipped ASIN %s: %s", asin_u, e)
            failed += 1
            continue

        try:
            series, method, confidence = _run_forecast(
                db, org, history, scout_categories.get(asin_u), periods=90
            )
            q4 = _detect_q4_boost(history)
            if q4 > 1.0:
                series = [int(round(x * q4)) for x in series]
            qty, _date, days_until = _calculate_reorder(series)
            items.append(
                ReorderListItem(
                    asin=asin_u,
                    title=scout_titles.get(asin_u),
                    days_until_reorder=days_until if days_until is not None else 999,
                    reorder_qty=qty,
                    confidence=confidence,
                    method=method,
                )
            )
        except Exception as e:
            logger.warning("Forecast computation failed for %s: %s", asin_u, e)
            failed += 1
            continue

    items.sort(key=lambda x: x.days_until_reorder)
    return DashboardResponse(
        items=items,
        total_skus_analyzed=len(items),
        total_skus_failed=failed,
    )
