"""
Notification Service Module - Alert system for price changes, BSR fluctuations, and opportunities
Stores preferences in-memory and generates contextual alerts based on ScoutResult analysis.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pydantic import BaseModel
from uuid import uuid4

from config import settings
from database import get_db
from models import Product, ScoutResult, User, Organization
from auth import get_current_user, get_org_scoped_query, tenant_session

router = APIRouter(prefix="/notifications", tags=["notifications"])

# In-memory storage for notification preferences and alerts
notification_preferences: Dict[str, Dict[str, Any]] = {}
notification_history: Dict[str, List[Dict[str, Any]]] = {}

# Pydantic schemas
class NotificationPreferences(BaseModel):
    alert_price_drops: bool = True
    price_drop_threshold_pct: float = 10.0
    alert_bsr_changes: bool = True
    bsr_change_threshold: int = 100
    alert_new_opportunities: bool = True
    opportunity_roi_threshold: float = 30.0
    alert_high_risk: bool = True
    email_notifications: bool = True

class Notification(BaseModel):
    id: str
    org_id: str
    alert_type: str  # price_drop, bsr_change, opportunity, high_risk
    asin: str
    product_name: str
    message: str
    severity: str  # low, medium, high
    timestamp: datetime
    read: bool = False

    class Config:
        from_attributes = True

class AlertCheckResponse(BaseModel):
    new_alerts_count: int
    alerts: List[Notification]
    last_check: datetime


@router.post("/preferences", response_model=NotificationPreferences)
async def set_notification_preferences(
    prefs: NotificationPreferences,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Set notification preferences for the organization.
    Stored in-memory (key: org_id).
    """
    org_key = f"org_{user.org_id}"
    notification_preferences[org_key] = prefs.dict()
    return prefs


@router.get("/preferences", response_model=NotificationPreferences)
async def get_notification_preferences(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Retrieve current notification preferences for the organization.
    """
    org_key = f"org_{user.org_id}"
    if org_key not in notification_preferences:
        # Return defaults
        return NotificationPreferences()
    return NotificationPreferences(**notification_preferences[org_key])


@router.get("/", response_model=List[Notification])
async def list_notifications(
    limit: int = 50,
    unread_only: bool = False,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    List all notifications for the organization.
    """
    org_key = f"org_{user.org_id}"
    if org_key not in notification_history:
        notification_history[org_key] = []

    notifications = notification_history[org_key]
    if unread_only:
        notifications = [n for n in notifications if not n.get("read", False)]

    return notifications[-limit:]


@router.get("/check", response_model=AlertCheckResponse)
async def check_for_alerts(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Check for new alerts based on latest scout results and preferences.
    Analyzes price drops, BSR changes, new opportunities, and high-risk products.
    """
    org_key = f"org_{user.org_id}"
    if org_key not in notification_history:
        notification_history[org_key] = []

    # Load preferences
    prefs = NotificationPreferences()
    if org_key in notification_preferences:
        prefs = NotificationPreferences(**notification_preferences[org_key])

    new_alerts = []
    cutoff_time = datetime.utcnow() - timedelta(hours=1)

    # Get organization products
    products = get_org_scoped_query(db, user, Product).all()

    for product in products:
        # Get latest two scout results to compare.
        # Note: ScoutResult.product_id reference here is a phantom-schema bug
        # (no such column on ScoutResult); fixing the leak only — full repair
        # of this function tracked as PR A follow-up.
        scout_results = db.query(ScoutResult).filter(
            ScoutResult.org_id == user.org_id,
            ScoutResult.product_id == product.id,
        ).order_by(ScoutResult.created_at.desc()).limit(2).all()

        if len(scout_results) < 1:
            continue

        current = scout_results[0]
        previous = scout_results[1] if len(scout_results) > 1 else None

        # Price drop detection
        if prefs.alert_price_drops and previous and current.current_price and previous.current_price:
            price_drop_pct = (
                ((previous.current_price - current.current_price) / previous.current_price * 100)
                if previous.current_price > 0 else 0
            )
            if price_drop_pct >= prefs.price_drop_threshold_pct:
                new_alerts.append({
                    "id": str(uuid4()),
                    "org_id": user.org_id,
                    "alert_type": "price_drop",
                    "asin": product.asin,
                    "product_name": product.product_name,
                    "message": f"Price dropped {price_drop_pct:.1f}% to ${current.current_price:.2f}",
                    "severity": "high" if price_drop_pct > 20 else "medium",
                    "timestamp": datetime.utcnow(),
                    "read": False
                })

        # BSR change detection
        if prefs.alert_bsr_changes and previous and current.bsr_rank and previous.bsr_rank:
            bsr_change = abs(current.bsr_rank - previous.bsr_rank)
            if bsr_change >= prefs.bsr_change_threshold:
                severity = "high" if bsr_change > 500 else "medium"
                direction = "improved" if current.bsr_rank < previous.bsr_rank else "declined"
                new_alerts.append({
                    "id": str(uuid4()),
                    "org_id": user.org_id,
                    "alert_type": "bsr_change",
                    "asin": product.asin,
                    "product_name": product.product_name,
                    "message": f"BSR {direction} significantly (change: {bsr_change} ranks)",
                    "severity": severity,
                    "timestamp": datetime.utcnow(),
                    "read": False
                })

        # New opportunity detection (high ROI potential)
        if prefs.alert_new_opportunities and current.revenue_estimate and current.roi_estimate:
            if current.roi_estimate >= prefs.opportunity_roi_threshold and current.created_at >= cutoff_time:
                new_alerts.append({
                    "id": str(uuid4()),
                    "org_id": user.org_id,
                    "alert_type": "opportunity",
                    "asin": product.asin,
                    "product_name": product.product_name,
                    "message": f"High-potential opportunity: {current.roi_estimate:.1f}% ROI estimate, ${current.revenue_estimate:.2f} revenue potential",
                    "severity": "low",
                    "timestamp": datetime.utcnow(),
                    "read": False
                })

        # High-risk product detection
        if prefs.alert_high_risk:
            volatility = 0
            if len(scout_results) > 5:
                prices = [sr.current_price for sr in scout_results[:5] if sr.current_price]
                if prices and len(prices) > 1:
                    avg = sum(prices) / len(prices)
                    variance = sum((p - avg) ** 2 for p in prices) / len(prices)
                    volatility = (variance ** 0.5) / avg * 100 if avg > 0 else 0

            fba_sellers = current.fba_sellers_count or 0
            if volatility > 30 or fba_sellers > 50:
                new_alerts.append({
                    "id": str(uuid4()),
                    "org_id": user.org_id,
                    "alert_type": "high_risk",
                    "asin": product.asin,
                    "product_name": product.product_name,
                    "message": f"Product flagged as high-risk (volatility: {volatility:.1f}%, FBA sellers: {fba_sellers})",
                    "severity": "high",
                    "timestamp": datetime.utcnow(),
                    "read": False
                })

    # Add to history
    notification_history[org_key].extend(new_alerts)

    return AlertCheckResponse(
        new_alerts_count=len(new_alerts),
        alerts=[Notification(**alert) for alert in new_alerts],
        last_check=datetime.utcnow()
    )


@router.post("/acknowledge/{notification_id}")
async def acknowledge_notification(
    notification_id: str,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Mark a notification as read.
    """
    org_key = f"org_{user.org_id}"
    if org_key in notification_history:
        for notif in notification_history[org_key]:
            if notif["id"] == notification_id:
                notif["read"] = True
                return {"status": "acknowledged"}

    raise HTTPException(status_code=404, detail="Notification not found")
