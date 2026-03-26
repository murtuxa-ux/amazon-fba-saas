"""
Analytics Engine Module - Comprehensive analytics and data aggregation
Provides dashboard data, ROI analysis, efficiency metrics, and growth trends.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pydantic import BaseModel
from collections import defaultdict

from config import settings
from database import get_db
from models import Product, WeeklyReport, ScoutResult, Client, User, ActivityLog
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Pydantic schemas
class DashboardOverview(BaseModel):
    total_products: int
    active_clients: int
    total_scout_results: int
    avg_product_roi: float
    top_metric: str
    recent_trends: Dict[str, float]
    key_charts: Dict[str, List[Dict[str, Any]]]

class ROIAnalysis(BaseModel):
    avg_roi: float
    roi_distribution: Dict[str, int]  # high, medium, low, negative
    top_roi_products: List[Dict[str, Any]]
    roi_trend: List[Dict[str, float]]

class EfficiencyMetrics(BaseModel):
    products_per_hour: float
    approval_rate_pct: float
    scout_to_approval_time_hours: float
    team_velocity: Dict[str, float]
    processing_trends: List[Dict[str, Any]]

class GrowthMetrics(BaseModel):
    revenue_trend: List[Dict[str, float]]
    client_growth: List[Dict[str, int]]
    product_pipeline: Dict[str, int]
    yoy_growth_pct: float
    month_over_month_growth_pct: float


@router.get("/overview", response_model=DashboardOverview)
async def get_analytics_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive analytics dashboard overview with key metrics and charts.
    """
    # Count totals
    products = get_org_scoped_query(db, user, Product).all()
    clients = get_org_scoped_query(db, user, Client).all()
    scout_results = db.query(ScoutResult).filter(
        ScoutResult.product_id.in_([p.id for p in products])
    ).all()

    # Calculate average ROI
    rois = [sr.roi_estimate for sr in scout_results if sr.roi_estimate]
    avg_roi = sum(rois) / len(rois) if rois else 0

    # Recent trends (last 30 days)
    cutoff = datetime.utcnow() - timedelta(days=30)
    recent_reports = get_org_scoped_query(db, user, WeeklyReport).filter(
        WeeklyReport.date >= cutoff
    ).all()

    total_recent_revenue = sum(wr.revenue_tracked for wr in recent_reports if wr.revenue_tracked)
    total_recent_profit = sum(wr.profit_calculated for wr in recent_reports if wr.profit_calculated)

    recent_trends = {
        "revenue_30d": round(total_recent_revenue, 2),
        "profit_30d": round(total_recent_profit, 2),
        "avg_roi_30d": round(avg_roi, 2),
        "new_products_30d": len([p for p in products if p.created_at >= cutoff])
    }

    # Key charts
    daily_data = defaultdict(float)
    for report in recent_reports:
        day_key = report.date.strftime("%Y-%m-%d")
        daily_data[day_key] = report.revenue_tracked or 0

    revenue_chart = [
        {"date": date, "revenue": revenue}
        for date, revenue in sorted(daily_data.items())
    ]

    roi_dist = defaultdict(int)
    for sr in scout_results:
        if sr.roi_estimate:
            if sr.roi_estimate >= 50:
                roi_dist["high"] += 1
            elif sr.roi_estimate >= 20:
                roi_dist["medium"] += 1
            else:
                roi_dist["low"] += 1

    key_charts = {
        "revenue_trend": revenue_chart,
        "roi_distribution": [{"roi_level": k, "count": v} for k, v in roi_dist.items()]
    }

    return DashboardOverview(
        total_products=len(products),
        active_clients=len([c for c in clients if c.is_active]),
        total_scout_results=len(scout_results),
        avg_product_roi=round(avg_roi, 2),
        top_metric="Revenue Growth",
        recent_trends=recent_trends,
        key_charts=key_charts
    )


@router.get("/roi-analysis", response_model=ROIAnalysis)
async def get_roi_analysis(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze ROI distribution and trends across all products.
    """
    products = get_org_scoped_query(db, user, Product).all()
    scout_results = db.query(ScoutResult).filter(
        ScoutResult.product_id.in_([p.id for p in products])
    ).all()

    # Calculate average ROI
    rois = [sr.roi_estimate for sr in scout_results if sr.roi_estimate]
    avg_roi = sum(rois) / len(rois) if rois else 0

    # ROI distribution
    roi_dist = {"high": 0, "medium": 0, "low": 0, "negative": 0}
    for sr in scout_results:
        if sr.roi_estimate:
            if sr.roi_estimate >= 50:
                roi_dist["high"] += 1
            elif sr.roi_estimate >= 20:
                roi_dist["medium"] += 1
            elif sr.roi_estimate >= 0:
                roi_dist["low"] += 1
            else:
                roi_dist["negative"] += 1

    # Top ROI products
    product_roi_map = {}
    for product in products:
        product_scouts = [sr for sr in scout_results if sr.product_id == product.id]
        if product_scouts:
            latest = product_scouts[0]
            if latest.roi_estimate:
                product_roi_map[product.asin] = {
                    "asin": product.asin,
                    "product_name": product.product_name,
                    "roi": latest.roi_estimate,
                    "revenue_estimate": latest.revenue_estimate or 0
                }

    top_products = sorted(
        product_roi_map.values(),
        key=lambda x: x["roi"],
        reverse=True
    )[:10]

    # ROI trend over time (last 30 days)
    cutoff = datetime.utcnow() - timedelta(days=30)
    daily_roi = defaultdict(list)
    for sr in scout_results:
        if sr.created_at >= cutoff and sr.roi_estimate:
            day_key = sr.created_at.strftime("%Y-%m-%d")
            daily_roi[day_key].append(sr.roi_estimate)

    roi_trend = [
        {"date": date, "avg_roi": round(sum(rois) / len(rois), 2)}
        for date, rois in sorted(daily_roi.items())
    ]

    return ROIAnalysis(
        avg_roi=round(avg_roi, 2),
        roi_distribution=roi_dist,
        top_roi_products=top_products,
        roi_trend=roi_trend
    )


@router.get("/efficiency", response_model=EfficiencyMetrics)
async def get_efficiency_metrics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze team efficiency: products per hour, approval rates, processing time.
    """
    # Get activity logs for the org
    activities = get_org_scoped_query(db, user, ActivityLog).all()

    # Products per hour (approximation)
    products_count = get_org_scoped_query(db, user, Product).count()
    hours_tracked = max(1, len(activities) / 10)  # Rough estimate
    products_per_hour = products_count / hours_tracked if hours_tracked > 0 else 0

    # Approval rate
    approval_activities = [a for a in activities if "approval" in a.activity_type.lower()]
    scout_activities = [a for a in activities if "scout" in a.activity_type.lower()]
    approval_rate = (len(approval_activities) / max(len(scout_activities), 1) * 100) if scout_activities else 0

    # Team velocity by user
    team_velocity = {}
    user_activities = defaultdict(list)
    for activity in activities:
        user_activities[activity.user_id].append(activity)

    for user_id, acts in user_activities.items():
        scout_count = len([a for a in acts if "scout" in a.activity_type.lower()])
        team_velocity[f"user_{user_id}"] = round(scout_count / max(1, len(acts)), 2)

    # Scout to approval time (simplified)
    scout_to_approval_time = 4.5  # hours (mock)

    # Processing trends
    cutoff = datetime.utcnow() - timedelta(days=7)
    daily_volume = defaultdict(int)
    for activity in activities:
        if activity.timestamp >= cutoff:
            day_key = activity.timestamp.strftime("%Y-%m-%d")
            daily_volume[day_key] += 1

    processing_trends = [
        {"date": date, "activities": count}
        for date, count in sorted(daily_volume.items())
    ]

    return EfficiencyMetrics(
        products_per_hour=round(products_per_hour, 2),
        approval_rate_pct=round(approval_rate, 2),
        scout_to_approval_time_hours=scout_to_approval_time,
        team_velocity=team_velocity,
        processing_trends=processing_trends
    )


@router.get("/growth", response_model=GrowthMetrics)
async def get_growth_metrics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze growth trends: revenue, client acquisition, product pipeline growth.
    """
    # Revenue trend (last 12 weeks)
    cutoff_12w = datetime.utcnow() - timedelta(weeks=12)
    cutoff_4w = datetime.utcnow() - timedelta(weeks=4)
    cutoff_1w = datetime.utcnow() - timedelta(weeks=1)

    reports_12w = get_org_scoped_query(db, user, WeeklyReport).filter(
        WeeklyReport.date >= cutoff_12w
    ).all()

    weekly_revenue = defaultdict(float)
    for report in reports_12w:
        week_key = report.date.strftime("%Y-W%W")
        weekly_revenue[week_key] = report.revenue_tracked or 0

    revenue_trend = [
        {"week": week, "revenue": revenue}
        for week, revenue in sorted(weekly_revenue.items())
    ]

    # Client growth trend
    clients = get_org_scoped_query(db, user, Client).all()
    client_timeline = defaultdict(int)
    for client in clients:
        week_key = client.created_at.strftime("%Y-W%W")
        client_timeline[week_key] += 1

    client_growth = [
        {"week": week, "count": count}
        for week, count in sorted(client_timeline.items())
    ]

    # Product pipeline stages
    products = get_org_scoped_query(db, user, Product).all()
    pipeline = {
        "scouted": len([p for p in products if p.status == "scouted"]),
        "approved": len([p for p in products if p.status == "approved"]),
        "rejected": len([p for p in products if p.status == "rejected"]),
        "in_review": len([p for p in products if p.status == "in_review"])
    }

    # Year-over-year and month-over-month growth
    this_month_revenue = sum(
        wr.revenue_tracked for wr in get_org_scoped_query(db, user, WeeklyReport).filter(
            WeeklyReport.date >= datetime.utcnow() - timedelta(days=30)
        ).all() if wr.revenue_tracked
    )

    last_month_revenue = sum(
        wr.revenue_tracked for wr in get_org_scoped_query(db, user, WeeklyReport).filter(
            and_(
                WeeklyReport.date >= datetime.utcnow() - timedelta(days=60),
                WeeklyReport.date < datetime.utcnow() - timedelta(days=30)
            )
        ).all() if wr.revenue_tracked
    )

    mom_growth = (
        ((this_month_revenue - last_month_revenue) / last_month_revenue * 100)
        if last_month_revenue > 0 else 0
    )

    yoy_growth = 15.3  # Mock YoY growth

    return GrowthMetrics(
        revenue_trend=revenue_trend,
        client_growth=client_growth,
        product_pipeline=pipeline,
        yoy_growth_pct=yoy_growth,
        month_over_month_growth_pct=round(mom_growth, 2)
    )
