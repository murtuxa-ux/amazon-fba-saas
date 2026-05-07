"""
Competitor Tracking endpoint for FBA SaaS platform.
Routes for competitor analysis and market crowding detection.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from config import settings
from database import get_db
from models import ScoutResult
from auth import get_current_user, get_org_scoped_query, tenant_session

router = APIRouter(prefix="/competitors", tags=["Competitor Tracking"])


@router.get("/overview")
async def get_competitor_overview(
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
):
    """
    Get overview of competitive landscape.
    Returns statistics on FBA seller density and market saturation.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        total_products = query.count()
        if total_products == 0:
            return {
                "total_products_analyzed": 0,
                "average_fba_sellers": 0,
                "average_competition_level": 0,
                "highly_competitive_count": 0,
                "low_competition_count": 0
            }

        avg_fba_sellers = db.query(func.avg(ScoutResult.fba_sellers)).filter(
            ScoutResult.org_id == user.org_id
        ).scalar() or 0

        # Define competition levels
        highly_competitive = query.filter(ScoutResult.fba_sellers >= 20).count()
        low_competition = query.filter(ScoutResult.fba_sellers <= 5).count()

        # Average competition score based on FBA sellers and price volatility
        avg_volatility = db.query(func.avg(ScoutResult.price_volatility_pct)).filter(
            ScoutResult.org_id == user.org_id
        ).scalar() or 0

        competition_level = (float(avg_fba_sellers) / 100) * 100 if avg_fba_sellers else 0
        competition_level = min(100, competition_level)

        return {
            "total_products_analyzed": total_products,
            "average_fba_sellers": round(float(avg_fba_sellers), 1),
            "average_competition_level": round(competition_level, 1),
            "average_price_volatility_pct": round(float(avg_volatility), 2) if avg_volatility else 0,
            "highly_competitive_count": highly_competitive,
            "low_competition_count": low_competition
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve competitor overview",
            "detail": str(e)
        }


@router.get("/crowded")
async def get_crowded_niches(
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
    min_sellers: int = Query(10, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get products with high FBA seller count (crowded niches).
    Shows markets that may be difficult to enter.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        crowded = query.filter(
            ScoutResult.fba_sellers >= min_sellers
        ).order_by(
            desc(ScoutResult.fba_sellers)
        ).limit(limit).all()

        if not crowded:
            return {
                "min_sellers": min_sellers,
                "data": [],
                "count": 0
            }

        result = []
        for product in crowded:
            result.append({
                "asin": product.asin,
                "title": product.title,
                "brand": product.brand,
                "category": product.category,
                "fba_sellers": product.fba_sellers,
                "fba_score": float(product.fba_score) if product.fba_score else None,
                "current_price": float(product.current_price) if product.current_price else None,
                "price_volatility_pct": float(product.price_volatility_pct) if product.price_volatility_pct else None,
                "verdict": product.verdict
            })

        return {
            "min_sellers": min_sellers,
            "data": result,
            "count": len(result)
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve crowded niches",
            "detail": str(e)
        }


@router.get("/brand/{brand}")
async def get_brand_competition(
    brand: str,
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
):
    """
    Get competitive analysis for products from a specific brand.
    Returns market position and competitive metrics for brand products.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        brand_query = query.filter(ScoutResult.brand == brand)
        total_brand_products = brand_query.count()

        if total_brand_products == 0:
            return {
                "brand": brand,
                "total_products": 0,
                "statistics": None,
                "products": []
            }

        avg_sellers = db.query(func.avg(ScoutResult.fba_sellers)).filter(
            and_(
                ScoutResult.org_id == user.org_id,
                ScoutResult.brand == brand
            )
        ).scalar() or 0

        avg_score = db.query(func.avg(ScoutResult.fba_score)).filter(
            and_(
                ScoutResult.org_id == user.org_id,
                ScoutResult.brand == brand
            )
        ).scalar() or 0

        avg_price = db.query(func.avg(ScoutResult.current_price)).filter(
            and_(
                ScoutResult.org_id == user.org_id,
                ScoutResult.brand == brand
            )
        ).scalar() or 0

        buy_count = brand_query.filter(ScoutResult.verdict == "Buy").count()
        test_count = brand_query.filter(ScoutResult.verdict == "Test").count()
        skip_count = brand_query.filter(ScoutResult.verdict == "Skip").count()

        # Top products by FBA score
        top_products = brand_query.order_by(
            desc(ScoutResult.fba_score)
        ).limit(10).all()

        products_data = []
        for product in top_products:
            products_data.append({
                "asin": product.asin,
                "title": product.title,
                "category": product.category,
                "fba_sellers": product.fba_sellers,
                "fba_score": float(product.fba_score) if product.fba_score else None,
                "current_price": float(product.current_price) if product.current_price else None,
                "verdict": product.verdict
            })

        return {
            "brand": brand,
            "total_products": total_brand_products,
            "statistics": {
                "average_fba_sellers": round(float(avg_sellers), 1),
                "average_fba_score": round(float(avg_score), 2),
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
            "error": "Failed to retrieve brand competition analysis",
            "detail": str(e),
            "brand": brand
        }
