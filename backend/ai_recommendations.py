"""
AI Recommendations endpoint for FBA SaaS platform.
Routes for product recommendations, similar products, and trending items.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from config import settings
from database import get_db
from models import ScoutResult, Product
from auth import get_current_user, get_org_scoped_query, tenant_session

router = APIRouter(prefix="/recommendations", tags=["AI Recommendations"])


@router.get("/")
async def get_recommendations(
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
    limit: int = Query(20, ge=1, le=100),
    min_score: float = Query(50.0, ge=0, le=100),
):
    """
    Get AI recommendations for products to buy.
    Returns top scout results by fba_score that haven't been purchased yet.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        # Filter by minimum score and verdict (prefer Buy and Test)
        scouts = query.filter(
            and_(
                ScoutResult.fba_score >= min_score,
                ScoutResult.verdict.in_(["Buy", "Test"])
            )
        ).order_by(desc(ScoutResult.fba_score)).limit(limit).all()

        if not scouts:
            return {
                "data": [],
                "count": 0,
                "message": "No recommendations available"
            }

        result = []
        for scout in scouts:
            result.append({
                "asin": scout.asin,
                "title": scout.title,
                "brand": scout.brand,
                "category": scout.category,
                "current_price": float(scout.current_price) if scout.current_price else None,
                "monthly_sales": scout.monthly_sales,
                "bsr": scout.bsr,
                "fba_sellers": scout.fba_sellers,
                "fba_score": float(scout.fba_score) if scout.fba_score else None,
                "verdict": scout.verdict,
                "created_at": scout.created_at.isoformat() if scout.created_at else None
            })

        return {
            "data": result,
            "count": len(result)
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve recommendations",
            "detail": str(e)
        }


@router.get("/similar/{asin}")
async def get_similar_products(
    asin: str,
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
    limit: int = Query(10, ge=1, le=100),
):
    """
    Get products similar to a given ASIN.
    Returns products in the same category with similar price range and score.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        # Find reference product
        ref_product = query.filter(ScoutResult.asin == asin).first()
        if not ref_product:
            return {
                "error": "Product not found",
                "asin": asin
            }

        # Find similar products
        similar = query.filter(
            and_(
                ScoutResult.category == ref_product.category,
                ScoutResult.asin != asin,
                ScoutResult.fba_score >= (ref_product.fba_score * 0.8) if ref_product.fba_score else 50
            )
        ).order_by(desc(ScoutResult.fba_score)).limit(limit).all()

        result = []
        for product in similar:
            result.append({
                "asin": product.asin,
                "title": product.title,
                "brand": product.brand,
                "category": product.category,
                "current_price": float(product.current_price) if product.current_price else None,
                "monthly_sales": product.monthly_sales,
                "fba_score": float(product.fba_score) if product.fba_score else None,
                "verdict": product.verdict
            })

        return {
            "reference_asin": asin,
            "reference_category": ref_product.category,
            "similar_products": result,
            "count": len(result)
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve similar products",
            "detail": str(e)
        }


@router.get("/trending")
async def get_trending(
    db: Session = Depends(get_db),
    user=Depends(tenant_session),
    limit: int = Query(15, ge=1, le=100),
    min_sales: int = Query(100, ge=0),
):
    """
    Get trending products based on monthly sales and FBA score.
    """
    try:
        query = get_org_scoped_query(db, user, ScoutResult)

        # Get products with high sales and good FBA score
        trending = query.filter(
            and_(
                ScoutResult.monthly_sales >= min_sales,
                ScoutResult.fba_score >= 60
            )
        ).order_by(
            desc(ScoutResult.monthly_sales),
            desc(ScoutResult.fba_score)
        ).limit(limit).all()

        if not trending:
            return {
                "data": [],
                "count": 0,
                "message": "No trending products found"
            }

        result = []
        for product in trending:
            result.append({
                "asin": product.asin,
                "title": product.title,
                "brand": product.brand,
                "category": product.category,
                "current_price": float(product.current_price) if product.current_price else None,
                "monthly_sales": product.monthly_sales,
                "bsr": product.bsr,
                "fba_sellers": product.fba_sellers,
                "fba_score": float(product.fba_score) if product.fba_score else None,
                "price_volatility_pct": float(product.price_volatility_pct) if product.price_volatility_pct else None,
                "verdict": product.verdict
            })

        return {
            "data": result,
            "count": len(result)
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve trending products",
            "detail": str(e)
        }
