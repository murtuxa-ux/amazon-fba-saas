"""
AI BuyBox tracker — Ecom Era FBA SaaS.

Tracks buy box ownership, win rate, competitor pricing, and surfaces alerts
(lost buy box, suppression, new competitor) for ASINs being actively monitored.

Endpoint contract is shaped to match frontend/pages/buybox.js exactly.
Field names on the wire are snake_case; a frontend response transformer in
frontend/lib/api.js converts them to camelCase before they hit the page state.

Schemas use Python field names that align with the wire format (e.g. `bb_price`
rather than `buy_box_price`) to avoid alias gymnastics — the SQLAlchemy column
remains `buy_box_price` and the route handler maps explicitly.
"""

import logging
import random
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user, require_role, tenant_session
from database import get_db
from models import BuyBoxAlert, BuyBoxHistory, BuyBoxTracker, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/buybox", tags=["AI BuyBox"])


# ── Pydantic schemas ───────────────────────────────────────────────────────
class CompetitorItem(BaseModel):
    seller_name: str
    seller_id: str
    price: float
    fulfillment_type: str  # FBA / FBM
    rating: float
    feedback_count: int
    is_buy_box_winner: bool


class HistoryEntry(BaseModel):
    date: datetime
    our_price: float
    bb_price: float
    bb_winner: str
    win_rate: float
    competitor_count: int


class TrackedItem(BaseModel):
    """Row shape for GET /buybox/tracked.

    Field names are intentionally snake_case-but-frontend-shaped (bb_price,
    bb_winner, win_rate). The transformer flips them to camelCase on the wire.
    """
    asin: str
    product_title: str
    our_price: float
    bb_price: float
    bb_winner: str
    win_rate: float
    is_suppressed: bool
    competitor_count: int
    last_checked: Optional[datetime] = None
    status: str  # derived: winning / losing / suppressed


class AnalyticsResponse(BaseModel):
    win_rate: float            # overall win rate across all tracked ASINs
    total_tracked: int
    currently_winning: int
    currently_losing: int
    suppressed: int
    avg_competitor_count: float
    top_competitors: List[dict]  # [{seller_name, appearances}]


class AlertItem(BaseModel):
    id: int
    asin: str
    product_title: str
    alert_type: str           # lost_buybox / price_drop / new_competitor / suppressed
    severity: str             # critical / warning / info
    message: str
    timestamp: datetime       # the BuyBoxAlert.created_at column, renamed for frontend
    is_read: bool


class DetailedStatus(BaseModel):
    asin: str
    product_title: str
    current_winner: str
    current_winner_price: float
    our_price: float
    history: List[HistoryEntry]
    competitors: List[CompetitorItem]
    win_rate_over_time: List[dict]  # [{date, win_rate}]
    total_tracked_days: int


class CompetitorAnalysis(BaseModel):
    asin: str
    product_title: str
    our_price: float
    competitors: List[CompetitorItem]
    price_range_min: float
    price_range_max: float
    avg_competitor_price: float
    lowest_competitor_price: float
    fba_count: int
    fbm_count: int


class TrackInput(BaseModel):
    """Accepts either {"asin": "..."} (frontend's POST shape) or
    {"asins": [...]} (bulk shape). Handler normalizes."""
    asin: Optional[str] = None
    asins: Optional[List[str]] = None


class RepriceInput(BaseModel):
    target_margin_pct: float = Field(ge=5, le=100)


class RepriceOutput(BaseModel):
    asin: str
    product_title: str
    current_price: float
    suggested_price: float
    price_change_pct: float
    estimated_margin_pct: float
    action: str               # increase / decrease / hold
    bb_competitor_price: float
    reasoning: str


class HistoryResponse(BaseModel):
    asin: str
    product_title: str
    history: List[HistoryEntry]
    date_range: dict          # {start, end}


# ── Helpers ────────────────────────────────────────────────────────────────
def _derive_status(tracker: BuyBoxTracker) -> str:
    if tracker.is_suppressed:
        return "suppressed"
    if (tracker.buy_box_winner or "") == "Our Listing":
        return "winning"
    return "losing"


def _tracker_to_item(t: BuyBoxTracker) -> TrackedItem:
    return TrackedItem(
        asin=t.asin,
        product_title=t.product_title or "",
        our_price=float(t.our_price or 0),
        bb_price=float(t.buy_box_price or 0),
        bb_winner=t.buy_box_winner or "",
        win_rate=float(t.win_rate_pct or 0),
        is_suppressed=bool(t.is_suppressed),
        competitor_count=t.competitor_count or 0,
        last_checked=t.last_checked,
        status=_derive_status(t),
    )


def _generate_mock_competitors(asin: str, count: int = 3) -> List[CompetitorItem]:
    """Mock competitor data — replaced in Phase 2 with live Keepa offers."""
    sellers = ["CompeteFloat", "AmazonBasics", "ValueVendor", "PrimeSource", "BulkTrader"]
    fulfillment_types = ["FBA", "FBM"]
    competitors = []
    for i in range(count):
        price_variance = random.uniform(0.85, 1.15)
        competitors.append(CompetitorItem(
            seller_name=sellers[i % len(sellers)],
            seller_id=f"seller_{asin}_{i}",
            price=round(100 * price_variance, 2),
            fulfillment_type=random.choice(fulfillment_types),
            rating=round(random.uniform(3.5, 5.0), 1),
            feedback_count=random.randint(50, 5000),
            is_buy_box_winner=(i == 0),
        ))
    return competitors


def _generate_mock_price_history(asin: str, days: int = 30) -> List[HistoryEntry]:
    """Mock price history — replaced in Phase 2 by reading real BuyBoxHistory rows."""
    history = []
    base_price = 100.00
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - i)
        price_variation = random.uniform(0.95, 1.05)
        win_rate = random.uniform(0.4, 0.95)
        history.append(HistoryEntry(
            date=date,
            our_price=round(base_price * price_variation, 2),
            bb_price=round(base_price * price_variation * 0.98, 2),
            bb_winner="CompeteFloat" if random.random() > 0.4 else "Our Listing",
            win_rate=round(win_rate * 100, 2),
            competitor_count=random.randint(2, 8),
        ))
    return history


def _calculate_win_rate_over_time(history: List[HistoryEntry]) -> List[dict]:
    if not history:
        return []
    weekly_data = {}
    for entry in history:
        week_key = entry.date.strftime("%Y-W%U")
        bucket = weekly_data.setdefault(week_key, {"total": 0, "wins": 0})
        bucket["total"] += 1
        if entry.bb_winner == "Our Listing":
            bucket["wins"] += 1
    return [
        {"date": k, "win_rate": round((d["wins"] / d["total"]) * 100, 2)}
        for k, d in sorted(weekly_data.items())
    ]


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/tracked", response_model=List[TrackedItem])
async def list_tracked_asins(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """All actively-tracked ASINs for the user's org."""
    try:
        trackers = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.is_active == True,
        ).all()
        return [_tracker_to_item(t) for t in trackers]
    except Exception as e:
        logger.error(f"list_tracked_asins failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to list tracked ASINs")


@router.post("/track")
async def add_asin_tracking(
    payload: TrackInput,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Add ASIN(s) to tracking. Accepts {"asin": "ABC"} or {"asins": ["ABC", ...]}."""
    raw_asins = payload.asins or ([payload.asin] if payload.asin else [])
    asins = [a.strip().upper() for a in raw_asins if a and a.strip()]
    if not asins:
        raise HTTPException(status_code=400, detail="Provide 'asin' or 'asins'.")
    if len(asins) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 ASINs per call.")

    try:
        added = 0
        skipped = 0
        for asin in asins:
            existing = db.query(BuyBoxTracker).filter(
                BuyBoxTracker.org_id == current_user.org_id,
                BuyBoxTracker.asin == asin,
            ).first()
            if existing:
                if not existing.is_active:
                    existing.is_active = True
                    added += 1
                else:
                    skipped += 1
                continue
            db.add(BuyBoxTracker(
                org_id=current_user.org_id,
                asin=asin,
                product_title=f"Product {asin}",
                our_price=100.0,
                buy_box_price=100.0,
                buy_box_winner="Our Listing",
                win_rate_pct=50.0,
                competitor_count=3,
                is_suppressed=False,
                last_checked=datetime.utcnow(),
                is_active=True,
            ))
            added += 1
        db.commit()
        return {"added": added, "skipped": skipped, "total_requested": len(asins)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"add_asin_tracking failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to add ASIN tracking")


@router.delete("/tracked/{asin}")
async def remove_asin_tracking(
    asin: str,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Soft-remove an ASIN from tracking (sets is_active=False)."""
    try:
        tracker = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.asin == asin.upper(),
        ).first()
        if not tracker:
            raise HTTPException(status_code=404, detail="Tracked ASIN not found")
        tracker.is_active = False
        db.commit()
        return {"message": f"ASIN {asin} removed from tracking"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"remove_asin_tracking failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove ASIN tracking")


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Org-wide buy box dashboard metrics."""
    try:
        trackers = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.is_active == True,
        ).all()
        if not trackers:
            return AnalyticsResponse(
                win_rate=0.0,
                total_tracked=0,
                currently_winning=0,
                currently_losing=0,
                suppressed=0,
                avg_competitor_count=0.0,
                top_competitors=[],
            )

        winning = sum(1 for t in trackers if (t.buy_box_winner or "") == "Our Listing" and not t.is_suppressed)
        suppressed = sum(1 for t in trackers if t.is_suppressed)
        losing = len(trackers) - winning - suppressed
        avg_competitors = sum(t.competitor_count or 0 for t in trackers) / len(trackers)
        overall_win_rate = sum(t.win_rate_pct or 0 for t in trackers) / len(trackers)

        # Top competitors derived from buy_box_winner string across trackers
        competitor_counts: dict = {}
        for t in trackers:
            name = (t.buy_box_winner or "").strip()
            if name and name != "Our Listing":
                competitor_counts[name] = competitor_counts.get(name, 0) + 1
        top_competitors = sorted(
            ({"seller_name": k, "appearances": v} for k, v in competitor_counts.items()),
            key=lambda x: x["appearances"],
            reverse=True,
        )[:5]

        return AnalyticsResponse(
            win_rate=round(overall_win_rate, 2),
            total_tracked=len(trackers),
            currently_winning=winning,
            currently_losing=losing,
            suppressed=suppressed,
            avg_competitor_count=round(avg_competitors, 2),
            top_competitors=top_competitors,
        )
    except Exception as e:
        logger.error(f"get_analytics failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")


@router.get("/alerts", response_model=List[AlertItem])
async def get_alerts(
    severity: Optional[str] = Query(None, pattern="^(critical|warning|info)$"),
    is_read: Optional[bool] = None,
    days_back: int = Query(7, ge=1, le=90),
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Buy box alerts (lost buy box, price drops, new competitors, suppressions)."""
    try:
        q = db.query(BuyBoxAlert).filter(
            BuyBoxAlert.org_id == current_user.org_id,
            BuyBoxAlert.created_at >= datetime.utcnow() - timedelta(days=days_back),
        )
        if severity:
            q = q.filter(BuyBoxAlert.severity == severity)
        if is_read is not None:
            q = q.filter(BuyBoxAlert.is_read == is_read)
        alerts = q.order_by(BuyBoxAlert.created_at.desc()).all()
        return [
            AlertItem(
                id=a.id,
                asin=a.asin,
                product_title=a.product_title or "",
                alert_type=a.alert_type,
                severity=a.severity,
                message=a.message or "",
                timestamp=a.created_at,
                is_read=bool(a.is_read),
            )
            for a in alerts
        ]
    except Exception as e:
        logger.error(f"get_alerts failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    try:
        alert = db.query(BuyBoxAlert).filter(
            BuyBoxAlert.org_id == current_user.org_id,
            BuyBoxAlert.id == alert_id,
        ).first()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        alert.is_read = True
        db.commit()
        return {"message": "Alert marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"mark_alert_read failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark alert as read")


@router.get("/status/{asin}", response_model=DetailedStatus)
async def get_detailed_status(
    asin: str,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Detailed buy-box status for a single ASIN — current winner, history, competitors."""
    try:
        tracker = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.asin == asin.upper(),
        ).first()
        if not tracker:
            raise HTTPException(status_code=404, detail="ASIN not found in tracking")

        history = _generate_mock_price_history(asin, days=30)
        competitors = _generate_mock_competitors(asin, count=4)

        return DetailedStatus(
            asin=tracker.asin,
            product_title=tracker.product_title or "",
            current_winner=tracker.buy_box_winner or "",
            current_winner_price=float(tracker.buy_box_price or 0),
            our_price=float(tracker.our_price or 0),
            history=history,
            competitors=competitors,
            win_rate_over_time=_calculate_win_rate_over_time(history),
            total_tracked_days=30,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_detailed_status failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve status")


@router.get("/competitors/{asin}", response_model=CompetitorAnalysis)
async def get_competitor_analysis(
    asin: str,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Competitor breakdown for an ASIN. Mock until Phase 2 wires live Keepa offers."""
    try:
        tracker = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.asin == asin.upper(),
        ).first()
        if not tracker:
            raise HTTPException(status_code=404, detail="ASIN not found")

        competitors = _generate_mock_competitors(asin, count=5)
        prices = [c.price for c in competitors]
        fba_count = sum(1 for c in competitors if c.fulfillment_type == "FBA")
        return CompetitorAnalysis(
            asin=asin,
            product_title=tracker.product_title or "",
            our_price=float(tracker.our_price or 0),
            competitors=competitors,
            price_range_min=min(prices),
            price_range_max=max(prices),
            avg_competitor_price=round(sum(prices) / len(prices), 2),
            lowest_competitor_price=min(prices),
            fba_count=fba_count,
            fbm_count=len(competitors) - fba_count,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_competitor_analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve competitor data")


@router.post("/reprice-suggestion", response_model=List[RepriceOutput])
async def generate_reprice_suggestions(
    payload: RepriceInput,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Repricing suggestions to win/keep buy box at a target margin.

    Admin-only — output is a recommendation that informs price changes.
    Live competitor data is mocked until Phase 2.
    """
    try:
        trackers = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.is_active == True,
        ).all()
        suggestions = []
        target_margin = payload.target_margin_pct / 100.0
        for tracker in trackers:
            cogs = float(tracker.our_price or 0) * 0.50  # placeholder until Product.cost is wired
            target_price = cogs / (1 - target_margin) if target_margin < 1 else cogs
            competitors = _generate_mock_competitors(tracker.asin, count=4)
            lowest_competitor = min(c.price for c in competitors)

            if (tracker.buy_box_winner or "") != "Our Listing":
                suggested_price = lowest_competitor * 0.99
                action = "decrease"
            else:
                suggested_price = min(target_price, lowest_competitor * 1.02)
                action = "hold" if suggested_price == float(tracker.our_price or 0) else "increase"

            if suggested_price < target_price:
                suggested_price = target_price
                action = "increase"

            estimated_margin = ((suggested_price - cogs) / suggested_price) * 100 if suggested_price > 0 else 0
            current_price = float(tracker.our_price or 0)
            price_change_pct = ((suggested_price - current_price) / current_price * 100) if current_price > 0 else 0

            suggestions.append(RepriceOutput(
                asin=tracker.asin,
                product_title=tracker.product_title or "",
                current_price=round(current_price, 2),
                suggested_price=round(suggested_price, 2),
                price_change_pct=round(price_change_pct, 2),
                estimated_margin_pct=round(estimated_margin, 2),
                action=action,
                bb_competitor_price=round(lowest_competitor, 2),
                reasoning=(
                    f"Currently {tracker.buy_box_winner or 'unknown'}. "
                    f"Suggested price targets {payload.target_margin_pct}% margin "
                    f"while {'winning' if action == 'decrease' else 'holding'} the buy box."
                ),
            ))
        return suggestions
    except Exception as e:
        logger.error(f"generate_reprice_suggestions failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate suggestions")


@router.get("/history/{asin}", response_model=HistoryResponse)
async def get_price_history(
    asin: str,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Price + buy-box history. Mocked until Phase 2 reads real BuyBoxHistory rows."""
    try:
        tracker = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.asin == asin.upper(),
        ).first()
        if not tracker:
            raise HTTPException(status_code=404, detail="ASIN not found")
        history = _generate_mock_price_history(asin, days=days)
        return HistoryResponse(
            asin=asin,
            product_title=tracker.product_title or "",
            history=history,
            date_range={
                "start": (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d"),
                "end": datetime.utcnow().strftime("%Y-%m-%d"),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_price_history failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve price history")
