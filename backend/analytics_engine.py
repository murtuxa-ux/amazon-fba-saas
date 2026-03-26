"""
Analytics Engine endpoint for FBA SaaS platform.
Routes for ROI analysis, efficiency metrics, and growth tracking.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from config import settings
from database import get_db
from models import Product, ScoutResult
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def get_analytics_overview(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get overview of product portfolio analytics.
    Returns key metrics on purchased products.
    """
    try:
        query = get_org_scoped_query(db, user, Product)

        total_products = query.count()
        if total_products == 0:
            return {
                "total_products": 0,
                "average_roi_pct": 0,
                "average_net_profit": 0,
                "total_net_profit": 0,
                "average_ai_score": 0,
                "decision_breakdown": {
                    "buy": 0,
                    "test": 0,
                    "reject": 0
                }
            }

        avg_roi = db.query(func.avg(Product.roi_pct)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        avg_profit = db.query(func.avg(Product.net_profit)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        total_profit = db.query(func.sum(Product.net_profit)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        avg_score = db.query(func.avg(Product.ai_score)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        buy_count = query.filter(Product.decision == "BUY").count()
        test_count = query.filter(Product.decision == "TEST").count()
        reject_count = query.filter(Product.decision == "REJECT").count()

        return {
            "total_products": total_products,
            "average_roi_pct": round(float(avg_roi), 2),
            "average_net_profit": round(float(avg_profit), 2),
            "total_net_profit": round(float(total_profit), 2),
            "average_ai_score": round(float(avg_score), 2),
            "decision_breakdown": {
                "buy": buy_count,
                "test": test_count,
                "reject": reject_count
            }
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve analytics overview",
            "detail": str(e)
        }


@router.get("/roi-analysis")
async def get_roi_analysis(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get detailed ROI analysis for purchased products.
    Returns products sorted by ROI percentage.
    """
    try:
        query = get_org_scoped_query(db, user, Product)

        # Get products with valid ROI data
        products = query.order_by(
            desc(Product.roi_pct)
        ).limit(limit).all()

        if not products:
            return {
                "data": [],
                "count": 0,
                "summary": None
            }

        result = []
        total_roi = 0
        roi_count = 0

        for product in products:
            roi_val = float(product.roi_pct) if product.roi_pct else 0
            result.append({
                "asin": product.asin,
                "cost": float(product.cost) if product.cost else None,
                "price": float(product.price) if product.price else None,
                "fba_fee": float(product.fba_fee) if product.fba_fee else None,
                "net_profit": float(product.net_profit) if product.net_profit else None,
                "roi_pct": roi_val,
                "ai_score": float(product.ai_score) if product.ai_score else None,
                "decision": product.decision,
                "risk_level": product.risk_level
            })
            total_roi += roi_val
            roi_count += 1

        average_roi = total_roi / roi_count if roi_count > 0 else 0

        return {
            "data": result,
            "count": len(result),
            "summary": {
                "average_roi_pct": round(average_roi, 2),
                "products_analyzed": roi_count
            }
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve ROI analysis",
            "detail": str(e)
        }


@router.get("/efficiency")
async def get_efficiency_metrics(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get efficiency metrics for product portfolio.
    Returns analysis on cost efficiency and fee impact.
    """
    try:
        query = get_org_scoped_query(db, user, Product)

        total_products = query.count()
        if total_products == 0:
            return {
                "total_products": 0,
                "metrics": {}
            }

        # Calculate average cost vs price
        avg_cost = db.query(func.avg(Product.cost)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        avg_price = db.query(func.avg(Product.price)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        avg_fba_fee = db.query(func.avg(Product.fba_fee)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        avg_profit = db.query(func.avg(Product.net_profit)).filter(
            Product.org_id == user.org_id
        ).scalar() or 0

        # Fee as percentage of price
        fee_percentage = (float(avg_fba_fee) / float(avg_price)) * 100 if avg_price and avg_fba_fee else 0

        # Margin calculation
        markup_pct = ((float(avg_price) - float(avg_cost)) / float(avg_cost)) * 100 if avg_cost else 0

        # Risk distribution
        high_risk = query.filter(Product.risk_level == "HIGH RISK").count()
        low_risk = query.filter(Product.risk_level == "LOW RISK").count()

        return {
            "total_products": total_products,
            "metrics": {
                "average_cost": round(float(avg_cost), 2),
                "average_price": round(float(avg_price), 2),
                "average_fba_fee": round(float(avg_fba_fee), 2),
                "average_net_profit": round(float(avg_profit), 2),
                "fee_percentage_of_price": round(fee_percentage, 2),
                "markup_percentage": round(markup_pct, 2),
                "profit_margin": round(((float(avg_profit) / float(avg_price)) * 100) if avg_price else 0, 2)
            },
            "risk_distribution": {
                "high_risk": high_risk,
                "low_risk": low_risk
            }
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve efficiency metrics",
            "detail": str(e)
        }


@router.get("/growth")
async def get_growth_metrics(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get growth metrics and trend analysis.
    Returns product acquisition trends and portfolio growth.
    """
    try:
        query = get_org_scoped_query(db, user, Product)

        total_products = query.count()
        if total_products == 0:
            return {
                "total_products": 0,
                "growth_metrics": {},
                "decision_trends": {}
            }

        # Decision breakdown
        buy_products = query.filter(Product.decision == "BUY").count()
        test_products = query.filter(Product.decision == "TEST").count()
        reject_products = query.filter(Product.decision == "REJECT").count()

        # Risk distribution across decisions
        buy_risk_high = query.filter(
            and_(
                Product.decision == "BUY",
                Product.risk_level == "HIGH RISK"
            )
        ).count()

        test_risk_high = query.filter(
            and_(
                Product.decision == "TEST",
                Product.risk_level == "HIGH RISK"
            )
        ).count()

        # AI score trends
        avg_buy_score = db.query(func.avg(Product.ai_score)).filter(
            and_(
                Product.org_id == user.org_id,
                Product.decision == "BUY"
            )
        ).scalar() or 0

        avg_test_score = db.query(func.avg(Product.ai_score)).filter(
            and_(
                Product.org_id == user.org_id,
                Product.decision == "TEST"
            )
        ).scalar() or 0

        # Profitability
        profitable = query.filter(Product.net_profit > 0).count()
        unprofitable = query.filter(Product.net_profit <= 0).count()

        return {
            "total_products": total_products,
            "growth_metrics": {
                "profitable_products": profitable,
                "unprofitable_products": unprofitable,
                "profitability_rate_pct": round((profitable / total_products) * 100, 2) if total_products > 0 else 0
            },
            "decision_trends": {
                "buy_count": buy_products,
                "test_count": test_products,
                "reject_count": reject_products,
                "buy_percentage": round((buy_products / total_products) * 100, 2) if total_products > 0 else 0,
                "test_percentage": round((test_products / total_products) * 100, 2) if total_products > 0 else 0,
                "reject_percentage": round((reject_products / total_products) * 100, 2) if total_products > 0 else 0
            },
            "risk_analysis": {
                "buy_high_risk": buy_risk_high,
                "test_high_risk": test_risk_high
            },
            "ai_score_by_decision": {
                "buy_average_score": round(float(avg_buy_score), 2),
                "test_average_score": round(float(avg_test_score), 2)
            }
        }
    except Exception as e:
        return {
            "error": "Failed to retrieve growth metrics",
            "detail": str(e)
        }
