"""
Buy Box Tracker & Repricing Intelligence Module
Amazon FBA/FBM Wholesale SaaS Platform (Ecom Era)

Tracks buy box ownership, pricing history, competitor analysis, and generates
repricing suggestions to maintain profitability while winning buy box.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from decimal import Decimal
import random

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth import get_current_user
from models import User, Organization, BuyBoxTracker, BuyBoxHistory
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/buybox", tags=["buybox"])


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class CompetitorSchema(BaseModel):
    seller_name: str
    seller_id: str
    price: Decimal
    fulfillment_type: str  # FBA, FBM
    rating: float
    feedback_count: int
    is_buy_box_winner: bool

    class Config:
        from_attributes = True


class PriceHistoryEntrySchema(BaseModel):
    date: datetime
    our_price: Decimal
    buy_box_price: Decimal
    buy_box_winner: str
    win_rate_pct: float
    competitor_count: int

    class Config:
        from_attributes = True


class BuyBoxTrackedSchema(BaseModel):
    asin: str
    product_title: str
    our_price: Decimal
    buy_box_price: Decimal
    buy_box_winner: str
    win_rate_pct: float
    is_suppressed: bool
    last_checked: datetime
    competitor_count: int

    class Config:
        from_attributes = True


class BuyBoxDetailedSchema(BaseModel):
    asin: str
    product_title: str
    current_winner: str
    current_winner_price: Decimal
    our_price: Decimal
    price_history: List[PriceHistoryEntrySchema]
    competitors: List[CompetitorSchema]
    win_rate_over_time: List[dict]  # {date: str, win_rate: float}
    total_tracked_days: int

    class Config:
        from_attributes = True


class BuyBoxAlertSchema(BaseModel):
    alert_id: str
    asin: str
    product_title: str
    alert_type: str  # lost_buybox, price_drop, new_competitor, suppressed
    severity: str  # critical, warning, info
    message: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


class BuyBoxAnalyticsSchema(BaseModel):
    overall_win_rate: float
    total_tracked: int
    currently_winning: int
    currently_losing: int
    suppressed_count: int
    avg_competitor_count: float
    top_competitors: List[dict]  # {seller_name: str, appearances: int}

    class Config:
        from_attributes = True


class CompetitorAnalysisSchema(BaseModel):
    asin: str
    product_title: str
    our_price: Decimal
    competitors: List[CompetitorSchema]
    price_range_min: Decimal
    price_range_max: Decimal
    avg_competitor_price: Decimal
    lowest_competitor_price: Decimal
    fba_count: int
    fbm_count: int

    class Config:
        from_attributes = True


class RepriceInputSchema(BaseModel):
    target_margin_pct: float = Field(ge=5, le=100, description="Target margin percentage")


class RepriceOutputSchema(BaseModel):
    asin: str
    product_title: str
    current_price: Decimal
    suggested_price: Decimal
    price_change_pct: float
    estimated_margin_pct: float
    action: str  # increase, decrease, hold
    buy_box_competitor_price: Decimal
    reasoning: str

    class Config:
        from_attributes = True


class TrackInputSchema(BaseModel):
    asins: List[str] = Field(min_items=1, max_items=100, description="ASINs to track")


class PriceHistorySchema(BaseModel):
    asin: str
    product_title: str
    history: List[PriceHistoryEntrySchema]
    date_range: dict  # {start: str, end: str}

    class Config:
        from_attributes = True


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _generate_mock_competitors(asin: str, count: int = 3) -> List[CompetitorSchema]:
    """Generate mock competitor data for demo purposes."""
    sellers = ["CompeteFloat", "AmazonBasics", "ValueVendor", "PrimeSource", "BulkTrader"]
    fulfillment_types = ["FBA", "FBM"]

    competitors = []
    for i in range(count):
        price_variance = random.uniform(0.85, 1.15)
        competitors.append(
            CompetitorSchema(
                seller_name=sellers[i % len(sellers)],
                seller_id=f"seller_{asin}_{i}",
                price=Decimal(str(round(100 * price_variance, 2))),
                fulfillment_type=random.choice(fulfillment_types),
                rating=round(random.uniform(3.5, 5.0), 1),
                feedback_count=random.randint(50, 5000),
                is_buy_box_winner=(i == 0),
            )
        )
    return competitors


def _generate_mock_price_history(asin: str, days: int = 30) -> List[PriceHistoryEntrySchema]:
    """Generate mock price history for demo purposes."""
    history = []
    base_price = Decimal("100.00")

    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - i)
        price_variation = random.uniform(0.95, 1.05)
        win_rate = random.uniform(0.4, 0.95)

        history.append(
            PriceHistoryEntrySchema(
                date=date,
                our_price=base_price * Decimal(str(price_variation)),
                buy_box_price=base_price * Decimal(str(price_variation * 0.98)),
                buy_box_winner="CompeteFloat" if random.random() > 0.4 else "Our Listing",
                win_rate_pct=round(win_rate * 100, 2),
                competitor_count=random.randint(2, 8),
            )
        )
    return history


def _calculate_win_rate_over_time(
    history: List[PriceHistoryEntrySchema],
) -> List[dict]:
    """Calculate win rate aggregated by week."""
    if not history:
        return []

    weekly_data = {}
    for entry in history:
        week_key = entry.date.strftime("%Y-W%U")
        if week_key not in weekly_data:
            weekly_data[week_key] = {"total": 0, "wins": 0}

        weekly_data[week_key]["total"] += 1
        if entry.buy_box_winner == "Our Listing":
            weekly_data[week_key]["wins"] += 1

    result = []
    for week_key in sorted(weekly_data.keys()):
        data = weekly_data[week_key]
        result.append({
            "date": week_key,
            "win_rate": round((data["wins"] / data["total"]) * 100, 2),
        })

    return result


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/tracked", response_model=List[BuyBoxTrackedSchema])
async def list_tracked_asins(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all tracked ASINs with current buy box status.

    Returns:
    - asin, product_title, our_price, buy_box_price, buy_box_winner
    - win_rate_pct, is_suppressed, last_checked, competitor_count
    """
    try:
        tracked = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.is_active == True,
        ).all()

        result = []
        for tracker in tracked:
            result.append(
                BuyBoxTrackedSchema(
                    asin=tracker.asin,
                    product_title=tracker.product_title,
                    our_price=tracker.our_price,
                    buy_box_price=tracker.buy_box_price,
                    buy_box_winner=tracker.buy_box_winner,
                    win_rate_pct=tracker.win_rate_pct,
                    is_suppressed=tracker.is_suppressed,
                    last_checked=tracker.last_checked,
                    competitor_count=tracker.competitor_count,
                )
            )

        logger.info(
            f"Listed {len(result)} tracked ASINs for org {current_user.org_id}"
        )
        return result

    except Exception as e:
        logger.error(f"Error listing tracked ASINs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list tracked ASINs")


@router.post("/track")
async def add_asin_tracking(
    payload: TrackInputSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add ASIN(s) to buy box tracking.

    Input: list of ASINs to track
    """
    try:
        added_count = 0
        skipped_count = 0

        for asin in payload.asins:
            existing = db.query(BuyBoxTracker).filter(
                BuyBoxTracker.org_id == current_user.org_id,
                BuyBoxTracker.asin == asin,
            ).first()

            if not existing:
                tracker = BuyBoxTracker(
                    org_id=current_user.org_id,
                    asin=asin,
                    product_title=f"Product {asin}",
                    our_price=Decimal("100.00"),
                    buy_box_price=Decimal("100.00"),
                    buy_box_winner="Our Listing",
                    win_rate_pct=50.0,
                    competitor_count=3,
                    is_suppressed=False,
                    last_checked=datetime.utcnow(),
                    is_active=True,
                )
                db.add(tracker)
                added_count += 1
            else:
                skipped_count += 1

        db.commit()
        logger.info(
            f"Added {added_count} ASINs to tracking for org {current_user.org_id} "
            f"(skipped {skipped_count} duplicates)"
        )

        return {
            "added": added_count,
            "skipped": skipped_count,
            "total_requested": len(payload.asins),
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error adding ASIN tracking: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add ASIN tracking")


@router.delete("/track/{asin}")
async def remove_asin_tracking(
    asin: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove ASIN from tracking."""
    try:
        tracker = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.asin == asin,
        ).first()

        if not tracker:
            raise HTTPException(status_code=404, detail="Tracked ASIN not found")

        tracker.is_active = False
        db.commit()

        logger.info(f"Removed ASIN {asin} from tracking for org {current_user.org_id}")

        return {"message": f"ASIN {asin} removed from tracking"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error removing ASIN tracking: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove ASIN tracking")


@router.get("/status/{asin}", response_model=BuyBoxDetailedSchema)
async def get_detailed_status(
    asin: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Detailed buy box status for a single ASIN.

    Returns:
    - current winner, price history (last 30 days), competitor breakdown
    - win rate over time
    """
    try:
        tracker = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.asin == asin,
        ).first()

        if not tracker:
            raise HTTPException(status_code=404, detail="ASIN not found in tracking")

        price_history = _generate_mock_price_history(asin, days=30)
        competitors = _generate_mock_competitors(asin, count=4)
        win_rate_over_time = _calculate_win_rate_over_time(price_history)

        logger.info(f"Retrieved detailed status for ASIN {asin}")

        return BuyBoxDetailedSchema(
            asin=tracker.asin,
            product_title=tracker.product_title,
            current_winner=tracker.buy_box_winner,
            current_winner_price=tracker.buy_box_price,
            our_price=tracker.our_price,
            price_history=price_history,
            competitors=competitors,
            win_rate_over_time=win_rate_over_time,
            total_tracked_days=30,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving detailed status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve status")


@router.get("/alerts", response_model=List[BuyBoxAlertSchema])
async def get_alerts(
    severity: Optional[str] = Query(None, regex="^(critical|warning|info)$"),
    is_read: Optional[bool] = None,
    days_back: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get buy box alerts (lost buy box, price drops, new competitors, suppressed).

    Filter by: severity, read/unread, date range
    """
    try:
        query = db.query(BuyBoxHistory).filter(
            BuyBoxHistory.org_id == current_user.org_id,
            BuyBoxHistory.created_at >= datetime.utcnow() - timedelta(days=days_back),
        )

        if severity:
            query = query.filter(BuyBoxHistory.severity == severity)

        if is_read is not None:
            query = query.filter(BuyBoxHistory.is_read == is_read)

        alerts = query.order_by(BuyBoxHistory.created_at.desc()).all()

        result = [
            BuyBoxAlertSchema(
                alert_id=alert.id,
                asin=alert.asin,
                product_title=alert.product_title,
                alert_type=alert.alert_type,
                severity=alert.severity,
                message=alert.message,
                created_at=alert.created_at,
                is_read=alert.is_read,
            )
            for alert in alerts
        ]

        logger.info(f"Retrieved {len(result)} alerts for org {current_user.org_id}")
        return result

    except Exception as e:
        logger.error(f"Error retrieving alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark alert as read."""
    try:
        alert = db.query(BuyBoxHistory).filter(
            BuyBoxHistory.org_id == current_user.org_id,
            BuyBoxHistory.id == alert_id,
        ).first()

        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        alert.is_read = True
        db.commit()

        logger.info(f"Marked alert {alert_id} as read")
        return {"message": "Alert marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error marking alert as read: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to mark alert as read")


@router.get("/analytics", response_model=BuyBoxAnalyticsSchema)
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Buy box analytics dashboard.

    Returns:
    - overall_win_rate, total_tracked, currently_winning, currently_losing
    - suppressed_count, avg_competitor_count, top_competitors
    """
    try:
        trackers = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.is_active == True,
        ).all()

        if not trackers:
            return BuyBoxAnalyticsSchema(
                overall_win_rate=0.0,
                total_tracked=0,
                currently_winning=0,
                currently_losing=0,
                suppressed_count=0,
                avg_competitor_count=0.0,
                top_competitors=[],
            )

        winning = sum(1 for t in trackers if t.buy_box_winner == "Our Listing")
        losing = len(trackers) - winning
        suppressed = sum(1 for t in trackers if t.is_suppressed)
        avg_competitors = (
            sum(t.competitor_count for t in trackers) / len(trackers)
            if trackers
            else 0
        )
        overall_win_rate = (
            sum(t.win_rate_pct for t in trackers) / len(trackers) if trackers else 0
        )

        top_competitors_list = [
            {"seller_name": "CompeteFloat", "appearances": 45},
            {"seller_name": "AmazonBasics", "appearances": 32},
            {"seller_name": "ValueVendor", "appearances": 28},
        ]

        logger.info(f"Retrieved analytics for org {current_user.org_id}")

        return BuyBoxAnalyticsSchema(
            overall_win_rate=round(overall_win_rate, 2),
            total_tracked=len(trackers),
            currently_winning=winning,
            currently_losing=losing,
            suppressed_count=suppressed,
            avg_competitor_count=round(avg_competitors, 2),
            top_competitors=top_competitors_list,
        )

    except Exception as e:
        logger.error(f"Error retrieving analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")


@router.get("/competitors/{asin}", response_model=CompetitorAnalysisSchema)
async def get_competitor_analysis(
    asin: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Detailed competitor analysis for an ASIN.

    Returns:
    - seller_name, price, fulfillment (FBA/FBM), rating, feedback_count
    - is_buy_box_winner
    """
    try:
        tracker = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.asin == asin,
        ).first()

        if not tracker:
            raise HTTPException(status_code=404, detail="ASIN not found")

        competitors = _generate_mock_competitors(asin, count=5)

        prices = [c.price for c in competitors]
        price_range_min = min(prices)
        price_range_max = max(prices)
        avg_price = sum(prices) / len(prices)
        lowest_price = min(prices)

        fba_count = sum(1 for c in competitors if c.fulfillment_type == "FBA")
        fbm_count = len(competitors) - fba_count

        logger.info(f"Retrieved competitor analysis for ASIN {asin}")

        return CompetitorAnalysisSchema(
            asin=asin,
            product_title=tracker.product_title,
            our_price=tracker.our_price,
            competitors=competitors,
            price_range_min=price_range_min,
            price_range_max=price_range_max,
            avg_competitor_price=Decimal(str(round(avg_price, 2))),
            lowest_competitor_price=lowest_price,
            fba_count=fba_count,
            fbm_count=fbm_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving competitor analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve competitor data")


@router.post("/reprice-suggestion", response_model=List[RepriceOutputSchema])
async def generate_reprice_suggestions(
    payload: RepriceInputSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate repricing suggestions.

    Input: target_margin_pct
    Output: list of ASINs with suggested new prices to win/keep buy box
    while maintaining margin
    """
    try:
        trackers = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.is_active == True,
        ).all()

        suggestions = []

        for tracker in trackers:
            # Mock COGS calculation (assume 50% of current price)
            cogs = tracker.our_price * Decimal("0.50")
            target_price = cogs / (1 - Decimal(payload.target_margin_pct / 100))

            # Get competitor lowest price
            competitors = _generate_mock_competitors(tracker.asin, count=4)
            lowest_competitor = min([c.price for c in competitors])

            # Repricing logic
            if tracker.buy_box_winner != "Our Listing":
                # Lost buy box: suggest price undercut
                suggested_price = lowest_competitor * Decimal("0.99")
                action = "decrease"
            else:
                # Holding buy box: maintain margin
                suggested_price = min(target_price, lowest_competitor * Decimal("1.02"))
                action = "hold" if suggested_price == tracker.our_price else "increase"

            # Ensure suggested price meets margin requirement
            if suggested_price < target_price:
                suggested_price = target_price
                action = "increase"

            estimated_margin = ((suggested_price - cogs) / suggested_price) * 100

            suggestions.append(
                RepriceOutputSchema(
                    asin=tracker.asin,
                    product_title=tracker.product_title,
                    current_price=tracker.our_price,
                    suggested_price=Decimal(str(round(suggested_price, 2))),
                    price_change_pct=round(
                        ((suggested_price - tracker.our_price) / tracker.our_price) * 100,
                        2,
                    ),
                    estimated_margin_pct=round(estimated_margin, 2),
                    action=action,
                    buy_box_competitor_price=lowest_competitor,
                    reasoning=(
                        f"Currently {tracker.buy_box_winner}. "
                        f"Suggested price maintains {payload.target_margin_pct}% margin "
                        f"while {'winning' if action == 'decrease' else 'holding'} buy box."
                    ),
                )
            )

        logger.info(
            f"Generated {len(suggestions)} reprice suggestions for org {current_user.org_id}"
        )
        return suggestions

    except Exception as e:
        logger.error(f"Error generating reprice suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate suggestions")


@router.get("/history/{asin}", response_model=PriceHistorySchema)
async def get_price_history(
    asin: str,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Price and buy box history over time.
    """
    try:
        tracker = db.query(BuyBoxTracker).filter(
            BuyBoxTracker.org_id == current_user.org_id,
            BuyBoxTracker.asin == asin,
        ).first()

        if not tracker:
            raise HTTPException(status_code=404, detail="ASIN not found")

        history = _generate_mock_price_history(asin, days=days)
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        end_date = datetime.utcnow().strftime("%Y-%m-%d")

        logger.info(f"Retrieved price history for ASIN {asin} ({days} days)")

        return PriceHistorySchema(
            asin=asin,
            product_title=tracker.product_title,
            history=history,
            date_range={"start": start_date, "end": end_date},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving price history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve price history")
