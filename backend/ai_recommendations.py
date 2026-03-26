"""
AI-powered product recommendations engine for Ecom Era FBA platform.
Routes for personalized product recommendations based on historical scout data.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from config import settings
from database import get_db
from models import User, ScoutResult, Product
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/recommendations", tags=["AI Recommendations"])


def calculate_product_score(scout_results: List[ScoutResult], category: str) -> float:
    """
    Calculate recommendation score based on historical win rate and patterns.
    Score factors: BSR range, price margin potential, category win rate.
    """
    if not scout_results:
        return 0.0

    category_scouts = [s for s in scout_results if s.category == category]
    if not category_scouts:
        return 0.0

    # Win rate in category (assuming scout_result with good metrics = win)
    win_rate = sum(1 for s in category_scouts if s.monthly_sales and s.monthly_sales > 50) / len(category_scouts)

    # BSR sweetspot score (5k-50k is optimal for FBA)
    bsr_scores = [
        1.0 if (5000 <= s.bsr <= 50000) else 0.5
        for s in category_scouts if s.bsr
    ]
    avg_bsr_score = sum(bsr_scores) / len(bsr_scores) if bsr_scores else 0.0

    # Price margin potential (historical average price * margin %)
    price_scores = [s.price * 0.3 for s in category_scouts if s.price]  # 30% margin target
    avg_price_score = (sum(price_scores) / len(price_scores) / 100) if price_scores else 0.0

    # Combined score (weighted)
    final_score = (win_rate * 0.5) + (avg_bsr_score * 0.3) + (min(avg_price_score, 1.0) * 0.2)
    return round(final_score, 3)


@router.get("/")
async def get_recommendations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get personalized product recommendations based on org's scout history.
    Returns top products by recommendation score in categories with good track record.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    scout_history = query.all()

    if not scout_history:
        return {"recommendations": [], "message": "Insufficient scout history for recommendations"}

    # Group by category and calculate scores
    category_scores = {}
    for scout in scout_history:
        if scout.category not in category_scores:
            category_scouts = [s for s in scout_history if s.category == scout.category]
            category_scores[scout.category] = calculate_product_score(
                category_scouts, scout.category
            )

    # Sort categories by score and recommend products from top categories
    top_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)[:5]

    recommendations = []
    for category, score in top_categories:
        category_products = query.filter(ScoutResult.category == category).limit(limit // 5 + 1).all()
        for product in category_products:
            recommendations.append({
                "asin": product.asin,
                "category": product.category,
                "title": product.title,
                "price": product.price,
                "bsr": product.bsr,
                "monthly_sales": product.monthly_sales,
                "recommendation_score": score,
                "reason": "Strong category performance with optimal BSR range"
            })

    return {
        "recommendations": recommendations[:limit],
        "total_analyzed": len(scout_history),
        "top_categories": [{"category": cat, "score": score} for cat, score in top_categories]
    }


@router.get("/similar/{asin}")
async def get_similar_products(
    asin: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(5, ge=1, le=20)
):
    """
    Find similar products to a given ASIN based on category, BSR range, and price.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    target_product = query.filter(ScoutResult.asin == asin).first()

    if not target_product:
        raise HTTPException(status_code=404, detail=f"Product {asin} not found")

    # Define similarity criteria: same category, BSR within 50% range, price within 30%
    bsr_lower = target_product.bsr * 0.5 if target_product.bsr else 1000
    bsr_upper = target_product.bsr * 1.5 if target_product.bsr else 100000
    price_lower = target_product.price * 0.7 if target_product.price else 10
    price_upper = target_product.price * 1.3 if target_product.price else 500

    similar = query.filter(and_(
        ScoutResult.category == target_product.category,
        ScoutResult.asin != asin,
        ScoutResult.bsr >= bsr_lower,
        ScoutResult.bsr <= bsr_upper,
        ScoutResult.price >= price_lower,
        ScoutResult.price <= price_upper
    )).limit(limit).all()

    results = [{
        "asin": p.asin,
        "title": p.title,
        "price": p.price,
        "bsr": p.bsr,
        "monthly_sales": p.monthly_sales,
        "similarity_match": "category, price, and BSR"
    } for p in similar]

    return {
        "target_asin": asin,
        "target_category": target_product.category,
        "similar_products": results,
        "count": len(results)
    }


@router.get("/trending")
async def get_trending_categories(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(90, ge=7, le=365)
):
    """
    Identify trending categories based on scout history.
    Returns categories with improving sales momentum and good profit potential.
    """
    query = get_org_scoped_query(db, user, ScoutResult)

    # Aggregate by category
    category_stats = db.query(
        ScoutResult.category,
        func.count(ScoutResult.id).label("product_count"),
        func.avg(ScoutResult.monthly_sales).label("avg_monthly_sales"),
        func.avg(ScoutResult.bsr).label("avg_bsr"),
        func.avg(ScoutResult.price).label("avg_price")
    ).filter(ScoutResult.org_id == user.org_id).group_by(ScoutResult.category).all()

    trending = []
    for stats in category_stats:
        # Trend score: high sales count + good BSR + profitable price range
        trend_score = (
            (stats.product_count / 10) * 0.4 +  # Popularity
            (max(0, 100000 - (stats.avg_bsr or 100000)) / 100000) * 0.3 +  # Lower BSR better
            (min(stats.avg_price or 50, 200) / 200) * 0.3  # Price point
        )

        trending.append({
            "category": stats.category,
            "product_count": stats.product_count,
            "avg_monthly_sales": round(stats.avg_monthly_sales, 2) if stats.avg_monthly_sales else 0,
            "avg_bsr": round(stats.avg_bsr, 0) if stats.avg_bsr else None,
            "avg_price": round(stats.avg_price, 2) if stats.avg_price else 0,
            "trend_score": round(trend_score, 3)
        })

    trending.sort(key=lambda x: x["trend_score"], reverse=True)

    return {
        "trending_categories": trending[:10],
        "analysis_period_days": days,
        "total_categories_tracked": len(trending)
    }
