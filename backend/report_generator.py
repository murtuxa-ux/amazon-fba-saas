"""
Report Generator endpoint for FBA SaaS platform.
Routes for executive summaries, manager reports, and weekly summaries.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from config import settings
from database import get_db
from models import WeeklyReport, Product, ScoutResult
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/reports", tags=["Report Generator"])


@router.get("/executive")
async def get_executive_summary(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get executive summary report.
    High-level overview of business metrics and performance.
    """
    try:
        # Get product metrics
        product_query = get_org_scoped_query(db, user, Product)
        total_products = product_query.count()

        avg_roi = db.query(func.avg(Product.roi_pct)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        total_profit = db.query(func.sum(Product.net_profit)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        avg_score = db.query(func.avg(Product.ai_score)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        buy_count = product_query.filter(Product.decision == "BUY").count()

        # Get scout metrics
        scout_query = get_org_scoped_query(db, user, ScoutResult)
        total_scouted = scout_query.count()

        avg_fba_score = db.query(func.avg(ScoutResult.fba_score)).filter(
            ScoutResult.org_id == user.org_id
        ).scalar() or 0

        # Get weekly report metrics (most recent)
        weekly_query = get_org_scoped_query(db, user, WeeklyReport)
        latest_weekly = weekly_query.order_by(desc(WeeklyReport.created_at)).first()

        weekly_data = None
        if latest_weekly:
            weekly_data = {
                "week": latest_weekly.week,
                "hunted": latest_weekly.hunted or 0,
                "analyzed": latest_weekly.analyzed or 0,
                "contacted": latest_weekly.contacted or 0,
                "approved": latest_weekly.approved or 0,
                "purchased": latest_weekly.purchased or 0,
                "revenue": float(latest_weekly.revenue) if latest_weekly.revenue else 0,
                "profit": float(latest_weekly.profit) if latest_weekly.profit else 0,
                "roi_pct": float(latest_weekly.roi_pct) if latest_weekly.roi_pct else 0
            }

        return {
            "generated_at": "2026-03-26",
            "product_portfolio": {
                "total_products": total_products,
                "buy_decisions": buy_count,
                "average_roi_pct": round(float(avg_roi), 2),
                "total_net_profit": round(float(total_profit), 2),
                "average_ai_score": round(float(avg_score), 2)
            },
            "market_research": {
                "total_products_scouted": total_scouted,
                "average_fba_score": round(float(avg_fba_score), 2)
            },
            "latest_weekly_report": weekly_data
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve executive summary",
            "detail": str(e)
        }


@router.get("/manager/{manager_id}")
async def get_manager_report(
    manager_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    limit: int = Query(12, ge=1, le=52),
):
    """
    Get performance report for a specific manager.
    Returns weekly reports filtered by manager.
    """
    try:
        query = get_org_scoped_query(db, user, WeeklyReport)

        manager_reports = query.filter(
            WeeklyReport.manager == manager_id
        ).order_by(
            desc(WeeklyReport.created_at)
        ).limit(limit).all()

        if not manager_reports:
            return {
                "manager_id": manager_id,
                "reports": [],
                "count": 0,
                "summary": None
            }

        reports_data = []
        total_revenue = 0
        total_profit = 0
        total_hunted = 0
        total_purchased = 0

        for report in manager_reports:
            reports_data.append({
                "week": report.week,
                "hunted": report.hunted or 0,
                "analyzed": report.analyzed or 0,
                "contacted": report.contacted or 0,
                "approved": report.approved or 0,
                "purchased": report.purchased or 0,
                "revenue": float(report.revenue) if report.revenue else 0,
                "profit": float(report.profit) if report.profit else 0,
                "roi_pct": float(report.roi_pct) if report.roi_pct else 0,
                "created_at": report.created_at.isoformat() if report.created_at else None
            })
            total_revenue += float(report.revenue) if report.revenue else 0
            total_profit += float(report.profit) if report.profit else 0
            total_hunted += report.hunted or 0
            total_purchased += report.purchased or 0

        summary = {
            "total_weeks": len(reports_data),
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_profit, 2),
            "total_hunted": total_hunted,
            "total_purchased": total_purchased,
            "average_revenue": round(total_revenue / len(reports_data), 2) if reports_data else 0,
            "average_profit": round(total_profit / len(reports_data), 2) if reports_data else 0
        }

        return {
            "manager_id": manager_id,
            "reports": reports_data,
            "count": len(reports_data),
            "summary": summary
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve manager report",
            "detail": str(e),
            "manager_id": manager_id
        }


@router.get("/weekly-summary")
async def get_weekly_summary(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    weeks: int = Query(4, ge=1, le=52),
):
    """
    Get aggregated weekly summary report.
    Returns consolidated metrics across all managers for specified weeks.
    """
    try:
        query = get_org_scoped_query(db, user, WeeklyReport)

        # Get recent weekly reports
        weekly_reports = query.order_by(
            desc(WeeklyReport.created_at)
        ).limit(weeks).all()

        if not weekly_reports:
            return {
                "weeks_analyzed": 0,
                "summary": None,
                "weekly_data": []
            }

        weekly_data = []
        total_revenue = 0
        total_profit = 0
        total_hunted = 0
        total_analyzed = 0
        total_contacted = 0
        total_approved = 0
        total_purchased = 0
        manager_set = set()

        for report in weekly_reports:
            weekly_data.append({
                "week": report.week,
                "manager": report.manager,
                "hunted": report.hunted or 0,
                "analyzed": report.analyzed or 0,
                "contacted": report.contacted or 0,
                "approved": report.approved or 0,
                "purchased": report.purchased or 0,
                "revenue": float(report.revenue) if report.revenue else 0,
                "profit": float(report.profit) if report.profit else 0,
                "roi_pct": float(report.roi_pct) if report.roi_pct else 0,
                "created_at": report.created_at.isoformat() if report.created_at else None
            })
            total_revenue += float(report.revenue) if report.revenue else 0
            total_profit += float(report.profit) if report.profit else 0
            total_hunted += report.hunted or 0
            total_analyzed += report.analyzed or 0
            total_contacted += report.contacted or 0
            total_approved += report.approved or 0
            total_purchased += report.purchased or 0
            if report.manager:
                manager_set.add(report.manager)

        # Calculate conversion rates
        conversion_hunted_to_analyzed = (total_analyzed / total_hunted * 100) if total_hunted > 0 else 0
        conversion_analyzed_to_purchased = (total_purchased / total_analyzed * 100) if total_analyzed > 0 else 0

        summary = {
            "weeks_analyzed": len(weekly_data),
            "managers_involved": len(manager_set),
            "total_metrics": {
                "hunted": total_hunted,
                "analyzed": total_analyzed,
                "contacted": total_contacted,
                "approved": total_approved,
                "purchased": total_purchased,
                "revenue": round(total_revenue, 2),
                "profit": round(total_profit, 2)
            },
            "averages": {
                "avg_revenue_per_week": round(total_revenue / len(weekly_data), 2) if weekly_data else 0,
                "avg_profit_per_week": round(total_profit / len(weekly_data), 2) if weekly_data else 0,
                "avg_hunted_per_week": round(total_hunted / len(weekly_data), 2) if weekly_data else 0,
                "avg_purchased_per_week": round(total_purchased / len(weekly_data), 2) if weekly_data else 0
            },
            "conversion_rates": {
                "hunted_to_analyzed_pct": round(conversion_hunted_to_analyzed, 2),
                "analyzed_to_purchased_pct": round(conversion_analyzed_to_purchased, 2)
            }
        }

        return {
            "summary": summary,
            "weekly_data": weekly_data
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve weekly summary",
            "detail": str(e)
        }
