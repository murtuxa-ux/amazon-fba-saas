"""
Market Intelligence analyzer endpoint for FBA SaaS platform.
Routes for market overview, trends analysis, and category insights.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from config import settings
from database import get_db
from models import ScoutResult
from auth import get_current_user, get_org_scoped_query, tenant_session

router = APIRouter(prefix="/market", tags=["Market Intelligence"])


@router.get("/overview")
async def get_market_overview(
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
):
    """
    Get overall market analysis overview.
    Returns aggregate statistics across all scanned products.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        total_products = query.count()
        if total_products == 0:
            return {
                "total_products": 0,
                "average_fba_score": 0,
                "average_monthly_sales": 0,
                "average_price": 0,
                "high_opportunity_count": 0,
                "category_count": 0
            }

        avg_score = db.query(func.avg(ScoutResult.fba_score)).filter(
            ScoutResult.org_id == user.org_id
        ).scalar() or 0

        avg_sales = db.query(func.avg(ScoutResult.monthly_sales)).filter(
            ScoutResult.org_id == user.org_id
        ).scalar() or 0

        avg_price = db.query(func.avg(ScoutResult.current_price)).filter(
            ScoutResult.org_id == user.org_id
        ).scalar() or 0

        high_opportunity = query.filter(
            ScoutResult.fba_score >= 70
        ).count()

        categories = query.with_entities(ScoutResult.category).distinct().count()

        return {
            "total_products": total_products,
            "average_fba_score": round(float(avg_score), 2),
            "average_monthly_sales": round(float(avg_sales), 0),
            "average_price": round(float(avg_price), 2) if avg_price else 0,
            "high_opportunity_count": high_opportunity,
            "category_count": categories
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve market overview",
            "detail": str(e)
        }


@router.get("/trends")
async def get_market_trends(
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Get market trends based on FBA scores and sales volume.
    Returns top performing products and categories.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        # Top products by FBA score
        top_by_score = query.order_by(
            desc(ScoutResult.fba_score)
        ).limit(limit).all()

        # Top products by sales
        top_by_sales = query.order_by(
            desc(ScoutResult.monthly_sales)
        ).limit(limit).all()

        result_by_score = []
        for product in top_by_score:
            result_by_score.append({
                "asin": product.asin,
                "title": product.title,
                "fba_score": float(product.fba_score) if product.fba_score else None,
                "verdict": product.verdict
            })

        result_by_sales = []
        for product in top_by_sales:
            result_by_sales.append({
                "asin": product.asin,
                "title": product.title,
                "monthly_sales": product.monthly_sales,
                "category": product.category
            })

        return {
            "top_by_score": result_by_score,
            "top_by_sales": result_by_sales
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve market trends",
            "detail": str(e)
        }


@router.get("/category/{category}")
async def get_category_analysis(
    category: str,
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
):
    """
    Get detailed analysis for a specific category.
    Returns statistics and products in that category.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        category_query = query.filter(ScoutResult.category == category)
        total_in_category = category_query.count()

        if total_in_category == 0:
            return {
                "category": category,
                "total_products": 0,
                "statistics": None,
                "products": []
            }

        avg_score = db.query(func.avg(ScoutResult.fba_score)).filter(
            and_(
                ScoutResult.org_id == user.org_id,
                ScoutResult.category == category
            )
        ).scalar() or 0

        avg_sales = db.query(func.avg(ScoutResult.monthly_sales)).filter(
            and_(
                ScoutResult.org_id == user.org_id,
                ScoutResult.category == category
            )
        ).scalar() or 0

        avg_price = db.query(func.avg(ScoutResult.current_price)).filter(
            and_(
                ScoutResult.org_id == user.org_id,
                ScoutResult.category == category
            )
        ).scalar() or 0

        buy_count = category_query.filter(ScoutResult.verdict == "Buy").count()
        test_count = category_query.filter(ScoutResult.verdict == "Test").count()
        skip_count = category_query.filter(ScoutResult.verdict == "Skip").count()

        # Top products in category
        top_products = category_query.order_by(
            desc(ScoutResult.fba_score)
        ).limit(10).all()

        products_data = []
        for product in top_products:
            products_data.append({
                "asin": product.asin,
                "title": product.title,
                "brand": product.brand,
                "current_price": float(product.current_price) if product.current_price else None,
                "monthly_sales": product.monthly_sales,
                "fba_score": float(product.fba_score) if product.fba_score else None,
                "verdict": product.verdict
            })

        return {
            "category": category,
            "total_products": total_in_category,
            "statistics": {
                "average_fba_score": round(float(avg_score), 2),
                "average_monthly_sales": round(float(avg_sales), 0),
                "average_price": round(float(avg_price), 2) if avg_price else 0,
                "verdict_breakdown": {
                    "buy": buy_count,
                    "test": test_count,
                    "skip": skip_count
                }
            },
            "top_products": products_data
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve category analysis",
            "detail": str(e),
            "category": category
        }
