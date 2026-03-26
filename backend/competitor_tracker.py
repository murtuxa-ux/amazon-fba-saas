"""
Competitor monitoring module for Ecom Era FBA platform.
Routes for analyzing competitive landscape, brand performance, and market saturation.
"""
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from config import settings
from database import get_db
from models import User, ScoutResult
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/competitors", tags=["Competitor Tracking"])


@router.get("/overview")
async def get_competitor_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Competitor landscape overview across scouted products.
    Returns top brands, seller distribution, and market concentration metrics.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    total_products = query.count()

    if total_products == 0:
        return {"overview": {}, "message": "No scout data available"}

    # Top brands by frequency
    brand_data = db.query(
        ScoutResult.brand,
        func.count(ScoutResult.id).label("product_count"),
        func.avg(ScoutResult.monthly_sales).label("avg_sales"),
        func.avg(ScoutResult.price).label("avg_price")
    ).filter(ScoutResult.org_id == user.org_id, ScoutResult.brand.isnot(None)).group_by(
        ScoutResult.brand
    ).order_by(func.count(ScoutResult.id).desc()).limit(10).all()

    top_brands = [{
        "brand": brand,
        "product_count": count,
        "avg_monthly_sales": round(avg_sales, 1) if avg_sales else 0,
        "avg_price": round(avg_price, 2) if avg_price else 0,
        "market_presence": "Strong" if count > 5 else "Moderate" if count > 2 else "Emerging"
    } for brand, count, avg_sales, avg_price in brand_data]

    # FBA seller concentration
    fba_sellers = query.filter(ScoutResult.fba_seller_count.isnot(None)).with_entities(
        func.avg(ScoutResult.fba_seller_count).label("avg_fba_count"),
        func.min(ScoutResult.fba_seller_count).label("min_fba_count"),
        func.max(ScoutResult.fba_seller_count).label("max_fba_count"),
    ).first()

    return {
        "overview": {
            "total_products_analyzed": total_products,
            "unique_brands": len(brand_data),
            "fba_seller_stats": {
                "average_sellers": round(fba_sellers.avg_fba_count, 1) if fba_sellers.avg_fba_count else 0,
                "min_sellers": fba_sellers.min_fba_count or 0,
                "max_sellers": fba_sellers.max_fba_count or 0
            }
        },
        "top_brands": top_brands,
        "market_concentration": "Highly concentrated" if len(brand_data) < 5 else "Moderately concentrated" if len(brand_data) < 10 else "Well distributed"
    }


@router.get("/brand/{brand}")
async def analyze_brand(
    brand: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detailed analysis of a specific brand's products and market position.
    Returns product count, price strategy, sales performance, and competitive position.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    brand_products = query.filter(ScoutResult.brand == brand).all()

    if not brand_products:
        raise HTTPException(
            status_code=404,
            detail=f"No products found for brand: {brand}"
        )

    product_count = len(brand_products)
    categories = list(set(p.category for p in brand_products if p.category))
    prices = [p.price for p in brand_products if p.price]
    sales = [p.monthly_sales for p in brand_products if p.monthly_sales]
    bsrs = [p.bsr for p in brand_products if p.bsr]
    fba_counts = [p.fba_seller_count for p in brand_products if p.fba_seller_count]

    avg_price = sum(prices) / len(prices) if prices else 0
    avg_sales = sum(sales) / len(sales) if sales else 0
    avg_bsr = sum(bsrs) / len(bsrs) if bsrs else None
    avg_fba = sum(fba_counts) / len(fba_counts) if fba_counts else 0

    # Price strategy analysis
    price_range = {
        "min": min(prices) if prices else 0,
        "max": max(prices) if prices else 0,
        "average": round(avg_price, 2)
    }

    # Category diversification
    category_distribution = {}
    for product in brand_products:
        cat = product.category or "Unknown"
        category_distribution[cat] = category_distribution.get(cat, 0) + 1

    # Performance ranking
    performance_score = (
        (min(avg_sales, 500) / 500) * 0.4 +  # Sales volume
        (max(0, 100000 - (avg_bsr or 100000)) / 100000) * 0.3 +  # BSR quality
        (min(avg_price, 200) / 200) * 0.3  # Price point strength
    )

    return {
        "brand": brand,
        "product_count": product_count,
        "categories_present": len(categories),
        "category_breakdown": category_distribution,
        "pricing_strategy": price_range,
        "sales_performance": {
            "avg_monthly_sales": round(avg_sales, 1),
            "avg_bsr": round(avg_bsr, 0) if avg_bsr else None,
            "avg_fba_sellers": round(avg_fba, 1)
        },
        "performance_score": round(performance_score, 3),
        "competitive_assessment": "High performer" if performance_score > 0.7 else "Solid competitor" if performance_score > 0.5 else "Emerging competitor"
    }


@router.get("/crowded")
async def find_crowded_niches(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=20)
):
    """
    Identify most and least crowded niches based on FBA seller count and category saturation.
    Returns categories ranked by competition level.
    """
    query = get_org_scoped_query(db, user, ScoutResult)

    # Aggregate by category
    category_competition = db.query(
        ScoutResult.category,
        func.count(ScoutResult.id).label("product_count"),
        func.avg(ScoutResult.fba_seller_count).label("avg_fba_sellers"),
        func.avg(ScoutResult.bsr).label("avg_bsr"),
        func.avg(ScoutResult.price).label("avg_price")
    ).filter(ScoutResult.org_id == user.org_id, ScoutResult.fba_seller_count.isnot(None)).group_by(
        ScoutResult.category
    ).all()

    if not category_competition:
        return {"most_crowded": [], "least_crowded": []}

    # Calculate crowding score
    crowding_data = []
    for cat, prod_count, avg_fba, avg_bsr, avg_price in category_competition:
        # Crowding score: high FBA count + high product count + low BSR (popular)
        crowding_score = (
            (min(avg_fba or 0, 100) / 100) * 0.5 +  # FBA seller density
            (min(prod_count, 50) / 50) * 0.3 +  # Product saturation
            (max(0, 100000 - (avg_bsr or 100000)) / 100000) * 0.2  # Popularity
        )

        opportunity_score = 1.0 - crowding_score  # Inverse = opportunity

        crowding_data.append({
            "category": cat,
            "product_count": prod_count,
            "avg_fba_sellers": round(avg_fba, 1) if avg_fba else 0,
            "avg_bsr": round(avg_bsr, 0) if avg_bsr else None,
            "avg_price": round(avg_price, 2) if avg_price else 0,
            "crowding_score": round(crowding_score, 3),
            "opportunity_score": round(opportunity_score, 3),
            "saturation_level": "Highly saturated" if crowding_score > 0.75 else "Moderately saturated" if crowding_score > 0.5 else "Opportunity niche"
        })

    # Sort by crowding
    crowding_data.sort(key=lambda x: x["crowding_score"], reverse=True)
    most_crowded = crowding_data[:limit]

    crowding_data.sort(key=lambda x: x["crowding_score"])
    least_crowded = crowding_data[:limit]

    return {
        "most_crowded_niches": most_crowded,
        "least_crowded_niches": least_crowded,
        "total_categories_analyzed": len(crowding_data),
        "insight": "Least crowded niches represent high-opportunity markets with lower FBA seller density"
    }
