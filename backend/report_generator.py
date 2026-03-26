"""
Report Generator Module - Automated report generation for various stakeholders
Generates executive summaries, manager performance reports, and weekly digests.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pydantic import BaseModel

from config import settings
from database import get_db
from models import Product, WeeklyReport, ScoutResult, Client, User, ActivityLog
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/reports", tags=["reports"])

# Pydantic schemas
class ExecutiveReport(BaseModel):
    period: str
    total_revenue: float
    total_profit: float
    roi_percentage: float
    top_products: List[Dict[str, Any]]
    team_performance: Dict[str, Any]
    key_metrics: Dict[str, Any]

    class Config:
        from_attributes = True

class ManagerReport(BaseModel):
    manager_name: str
    products_analyzed: int
    successful_scouts: int
    approval_rate: float
    revenue_attributed: float
    key_findings: List[str]
    period: str

class WeeklyDigest(BaseModel):
    week_starting: datetime
    revenue_change_pct: float
    new_opportunities: int
    high_risk_alerts: int
    top_opportunity: Dict[str, Any]
    team_highlights: List[str]


@router.get("/executive", response_model=ExecutiveReport)
async def get_executive_report(
    days: int = 30,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate executive summary report for the last N days.
    Includes revenue, profit, ROI, top products, and team performance.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Get organization-scoped data
    weekly_reports = get_org_scoped_query(db, user, WeeklyReport).filter(
        WeeklyReport.date >= cutoff_date
    ).all()

    products = get_org_scoped_query(db, user, Product).all()

    # Aggregate financials
    total_revenue = sum(wr.revenue_tracked for wr in weekly_reports if wr.revenue_tracked)
    total_profit = sum(wr.profit_calculated for wr in weekly_reports if wr.profit_calculated)
    roi = (total_profit / total_revenue * 100) if total_revenue > 0 else 0

    # Top products by revenue
    product_revenue = {}
    for product in products:
        scout_results = db.query(ScoutResult).filter(
            and_(
                ScoutResult.product_id == product.id,
                ScoutResult.created_at >= cutoff_date
            )
        ).all()
        if scout_results:
            estimated_revenue = len(scout_results) * 100  # Simplified
            product_revenue[product.asin] = {
                "product_name": product.product_name,
                "revenue": estimated_revenue,
                "scout_count": len(scout_results)
            }

    top_products = sorted(
        product_revenue.values(),
        key=lambda x: x["revenue"],
        reverse=True
    )[:5]

    # Team performance
    activity_logs = get_org_scoped_query(db, user, ActivityLog).filter(
        ActivityLog.timestamp >= cutoff_date
    ).all()

    team_perf = {
        "total_activities": len(activity_logs),
        "active_users": len(set(al.user_id for al in activity_logs)),
        "activities_per_user": len(activity_logs) / max(len(set(al.user_id for al in activity_logs)), 1)
    }

    return ExecutiveReport(
        period=f"Last {days} days",
        total_revenue=round(total_revenue, 2),
        total_profit=round(total_profit, 2),
        roi_percentage=round(roi, 2),
        top_products=top_products,
        team_performance=team_perf,
        key_metrics={
            "products_tracked": len(products),
            "scout_results": sum(len(db.query(ScoutResult).filter(ScoutResult.product_id == p.id).all()) for p in products),
            "clients": get_org_scoped_query(db, user, Client).count()
        }
    )


@router.get("/manager/{manager_id}", response_model=ManagerReport)
async def get_manager_report(
    manager_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate performance report for a specific manager.
    """
    # Verify manager exists and belongs to same org
    manager = db.query(User).filter(
        and_(
            User.id == manager_id,
            User.org_id == user.org_id
        )
    ).first()

    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")

    # Get manager's activities
    manager_activities = db.query(ActivityLog).filter(
        ActivityLog.user_id == manager_id
    ).all()

    scout_activities = [a for a in manager_activities if "scout" in a.activity_type.lower()]
    approval_activities = [a for a in manager_activities if "approval" in a.activity_type.lower()]

    products_analyzed = len(set(a.product_id for a in scout_activities if a.product_id))
    successful_scouts = len([a for a in scout_activities if "success" in a.details.lower()])
    approval_rate = len(approval_activities) / max(len(scout_activities), 1) if scout_activities else 0

    # Estimate revenue attributed
    revenue_attributed = len(successful_scouts) * 150  # Simplified calculation

    return ManagerReport(
        manager_name=manager.username,
        products_analyzed=products_analyzed,
        successful_scouts=successful_scouts,
        approval_rate=round(approval_rate * 100, 2),
        revenue_attributed=revenue_attributed,
        key_findings=[
            f"Analyzed {products_analyzed} products",
            f"Approval rate: {round(approval_rate * 100, 2)}%",
            f"Generated ${revenue_attributed} in attributed revenue"
        ],
        period="Last 30 days"
    )


@router.get("/weekly-digest", response_model=WeeklyDigest)
async def get_weekly_digest(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate auto-compiled weekly digest of key metrics and changes.
    """
    week_ago = datetime.utcnow() - timedelta(days=7)
    two_weeks_ago = datetime.utcnow() - timedelta(days=14)

    # Revenue comparison
    this_week_revenue = sum(
        wr.revenue_tracked for wr in get_org_scoped_query(db, user, WeeklyReport).filter(
            WeeklyReport.date >= week_ago
        ).all() if wr.revenue_tracked
    )

    last_week_revenue = sum(
        wr.revenue_tracked for wr in get_org_scoped_query(db, user, WeeklyReport).filter(
            and_(
                WeeklyReport.date >= two_weeks_ago,
                WeeklyReport.date < week_ago
            )
        ).all() if wr.revenue_tracked
    )

    revenue_change = (
        ((this_week_revenue - last_week_revenue) / last_week_revenue * 100)
        if last_week_revenue > 0 else 0
    )

    # New opportunities (high-potential scouts)
    products = get_org_scoped_query(db, user, Product).all()
    new_opps = 0
    for product in products:
        latest_scout = db.query(ScoutResult).filter(
            and_(
                ScoutResult.product_id == product.id,
                ScoutResult.created_at >= week_ago
            )
        ).first()
        if latest_scout and latest_scout.revenue_estimate > 500:
            new_opps += 1

    # High-risk alerts (simplified)
    high_risk_count = 0

    # Top opportunity
    top_opp = {"asin": "N/A", "product_name": "No data", "potential": 0}

    # Team highlights
    activities = get_org_scoped_query(db, user, ActivityLog).filter(
        ActivityLog.timestamp >= week_ago
    ).all()

    team_highlights = [
        f"{len(activities)} total activities logged",
        f"{len(set(a.user_id for a in activities))} team members active",
    ]

    return WeeklyDigest(
        week_starting=week_ago,
        revenue_change_pct=round(revenue_change, 2),
        new_opportunities=new_opps,
        high_risk_alerts=high_risk_count,
        top_opportunity=top_opp,
        team_highlights=team_highlights
    )
