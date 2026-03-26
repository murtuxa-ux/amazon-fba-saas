"""
Market trend analysis module for Ecom Era FBA platform.
Routes for analyzing market trends, category performance, and competitor landscape.
"""
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from config import settings
from database import get_db
from models import User, ScoutResult
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/market", tags=["Market Analysis"])


@router.get("/overview")
async def get_market_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive market overview across all scouted products.
    Returns category distribution, BSR statistics, price ranges, and sales metrics.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    total_scouted = query.count()

    if total_scouted == 0:
        return {"overview": {}, "message": "No scout data available"}

    # Aggregate statistics
    stats = query.with_entities(
        func.count(func.distinct(ScoutResult.category)).label("unique_categories"),
        func.avg(ScoutResult.bsr).label("avg_bsr"),
        func.min(ScoutResult.bsr).label("min_bsr"),
        func.max(ScoutResult.bsr).label("max_bsr"),
        func.avg(ScoutResult.price).label("avg_price"),
        func.min(ScoutResult.price).label("min_price"),
        func.max(ScoutResult.price).label("max_price"),
        func.avg(ScoutResult.monthly_sales).label("avg_monthly_sales"),
    ).first()

    # Top 5 categories by product count
    top_categories = db.query(
        ScoutResult.category,
        func.count(ScoutResult.id).label("count")
    ).filter(ScoutResult.org_id == user.org_id).group_by(
        ScoutResult.category
    ).order_by(func.count(ScoutResult.id).desc()).limit(5).all()

    return {
        "overview": {
            "total_products_scouted": total_scouted,
            "unique_categories": stats.unique_categories or 0,
            "bsr_stats": {
                "average": round(stats.avg_bsr, 0) if stats.avg_bsr else None,
                "min": stats.min_bsr,
                "max": stats.max_bsr
            },
            "price_stats": {
                "average": round(stats.avg_price, 2) if stats.avg_price else 0,
                "min": round(stats.min_price, 2) if stats.min_price else 0,
                "max": round(stats.max_price, 2) if stats.max_price else 0
            },
            "monthly_sales_stats": {
                "average": round(stats.avg_monthly_sales, 1) if stats.avg_monthly_sales else 0,
            }
        },
        "top_categories": [
            {"category": cat, "product_count": count} for cat, count in top_categories
        ]
    }


@router.get("/category/{category}")
async def analyze_category(
    category: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deep dive analysis of a specific category.
    Returns detailed statistics, competitive density, price positioning, and sales metrics.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    category_products = query.filter(ScoutResult.category == category).all()

    if not category_products:
        raise HTTPException(
            status_code=404,
            detail=f"No scout data found for category: {category}"
        )

    # Calculate statistics
    product_count = len(category_products)
    bsrs = [p.bsr for p in category_products if p.bsr]
    prices = [p.price for p in category_products if p.price]
    sales = [p.monthly_sales for p in category_products if p.monthly_sales]

    avg_bsr = sum(bsrs) / len(bsrs) if bsrs else None
    avg_price = sum(prices) / len(prices) if prices else 0
    avg_sales = sum(sales) / len(sales) if sales else 0

    # Competitive density assessment
    bsr_ranges = {
        "top_1k": sum(1 for p in category_products if p.bsr and p.bsr <= 1000),
        "1k_to_10k": sum(1 for p in category_products if p.bsr and 1000 < p.bsr <= 10000),
        "10k_to_50k": sum(1 for p in category_products if p.bsr and 10000 < p.bsr <= 50000),
        "50k_plus": sum(1 for p in category_products if p.bsr and p.bsr > 50000),
    }

    # Price tier distribution
    price_tiers = {
        "under_25": sum(1 for p in category_products if p.price and p.price < 25),
        "25_to_50": sum(1 for p in category_products if p.price and 25 <= p.price < 50),
        "50_to_100": sum(1 for p in category_products if p.price and 50 <= p.price < 100),
        "100_plus": sum(1 for p in category_products if p.price and p.price >= 100),
    }

    return {
        "category": category,
        "product_count": product_count,
        "statistics": {
            "avg_bsr": round(avg_bsr, 0) if avg_bsr else None,
            "avg_price": round(avg_price, 2),
            "avg_monthly_sales": round(avg_sales, 1),
            "price_range": {
                "min": min(prices) if prices else 0,
                "max": max(prices) if prices else 0
            },
            "bsr_range": {
                "min": min(bsrs) if bsrs else None,
                "max": max(bsrs) if bsrs else None
            }
        },
        "competitive_density": bsr_ranges,
        "price_tier_distribution": price_tiers,
        "market_health": "Highly competitive" if bsr_ranges["top_1k"] > 10 else "Moderately competitive" if bsr_ranges["10k_to_50k"] > 5 else "Less saturated"
    }


@router.get("/trends")
async def identify_market_trends(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    period_days: int = Query(90, ge=7, le=365)
):
    """
    Identify improving and declining categories based on scout trends.
    Analyzes recent scout data to spot momentum shifts in the market.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    all_scouts = query.all()

    if not all_scouts:
        return {"trends": [], "message": "Insufficient data for trend analysis"}

    # Group scouts by category and analyze patterns
    category_trends = {}

    for scout in all_scouts:
        if scout.category not in category_trends:
            category_trends[scout.category] = {
                "products": [],
                "total_sales": 0,
                "avg_bsr": None
            }

        category_trends[scout.category]["products"].append(scout)
        if scout.monthly_sales:
            category_trends[scout.category]["total_sales"] += scout.monthly_sales

    # Calculate trend scores
    trends = []
    for category, data in category_trends.items():
        product_count = len(data["products"])
        bsrs = [p.bsr for p in data["products"] if p.bsr]
        avg_bsr = sum(bsrs) / len(bsrs) if bsrs else None

        # Trend indicators:
        # 1. High product count = growing popularity
        # 2. Improving (lower) average BSR = momentum
        # 3. Strong average sales = viability
        trend_score = (
            min(product_count, 20) / 20 * 0.3 +  # Product popularity
            (max(0, 100000 - (avg_bsr or 100000)) / 100000) * 0.4 +  # BSR momentum
            min(data["total_sales"] / 1000, 1.0) * 0.3  # Sales volume
        )

        trends.append({
            "category": category,
            "trend_score": round(trend_score, 3),
            "product_count": product_count,
            "total_monthly_sales": data["total_sales"],
            "avg_bsr": round(avg_bsr, 0) if avg_bsr else None,
            "status": "Rising" if trend_score > 0.6 else "Stable" if trend_score > 0.4 else "Declining"
        })

    trends.sort(key=lambda x: x["trend_score"], reverse=True)

    # Separate rising vs declining
    rising = [t for t in trends if t["status"] == "Rising"]
    declining = [t for t in trends if t["status"] == "Declining"]

    return {
        "analysis_period_days": period_days,
        "rising_categories": rising[:5],
        "declining_categories": declining[:5],
        "stable_categories": [t for t in trends if t["status"] == "Stable"][:5],
        "total_categories_analyzed": len(trends)
    }
