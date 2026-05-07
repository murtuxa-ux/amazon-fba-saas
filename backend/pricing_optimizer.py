"""
Dynamic pricing optimization module for Ecom Era FBA platform.
Routes for calculating optimal pricing, margin analysis, and breakeven points.
"""
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import settings
from database import get_db
from models import User, ScoutResult, Product
from auth import get_current_user, get_org_scoped_query, tenant_session

router = APIRouter(prefix="/pricing", tags=["Pricing Optimization"])


class PricingOptimizationRequest(BaseModel):
    """Request model for pricing optimization."""
    asin: str
    cost: float  # Unit cost to acquire
    target_roi_percent: float = 30.0  # Target return on investment %
    competitor_price: Optional[float] = None


class PricingResponse(BaseModel):
    """Response model for pricing recommendations."""
    asin: str
    cost: float
    recommended_price: float
    estimated_profit_per_unit: float
    estimated_roi_percent: float
    price_range: Dict[str, float]
    reasoning: str


def calculate_optimal_price(
    cost: float,
    target_roi: float,
    category_avg_price: Optional[float] = None,
    category_avg_margin: Optional[float] = None
) -> Dict:
    """
    Calculate optimal price for target ROI considering market data.
    Factors: cost, target ROI, category pricing trends, FBA fees.

    Typical FBA fees:
    - Low price products (<$15): ~45% of revenue
    - Medium price ($15-$25): ~40% of revenue
    - High price products (>$25): ~35% of revenue
    """
    if cost <= 0:
        raise ValueError("Cost must be positive")

    # Determine FBA fee rate based on typical pricing
    estimated_price = cost * (1 + target_roi / 100)
    if estimated_price < 15:
        fba_fee_rate = 0.45
    elif estimated_price < 25:
        fba_fee_rate = 0.40
    else:
        fba_fee_rate = 0.35

    # Calculate price needed for target ROI after FBA fees
    # Profit = Price * (1 - fba_fee_rate) - Cost
    # Target Profit = Cost * (target_roi / 100)
    # Price * (1 - fba_fee_rate) - Cost = Cost * (target_roi / 100)
    # Price * (1 - fba_fee_rate) = Cost * (1 + target_roi / 100)
    # Price = Cost * (1 + target_roi / 100) / (1 - fba_fee_rate)

    recommended_price = cost * (1 + target_roi / 100) / (1 - fba_fee_rate)

    # Adjust for market positioning if category data available
    if category_avg_price:
        price_ratio = recommended_price / category_avg_price
        if price_ratio > 1.2:  # If >20% above market, adjust down
            recommended_price = category_avg_price * 1.15
        elif price_ratio < 0.8:  # If <20% below market, adjust up
            recommended_price = category_avg_price * 0.85

    # Calculate actual profit with recommended price
    fba_fees = recommended_price * fba_fee_rate
    actual_profit = recommended_price - fba_fees - cost
    actual_roi = (actual_profit / cost * 100) if cost > 0 else 0

    # Price range: -15% to +25% from recommended
    price_range = {
        "conservative_low": round(recommended_price * 0.85, 2),
        "recommended": round(recommended_price, 2),
        "aggressive_high": round(recommended_price * 1.25, 2)
    }

    return {
        "recommended_price": round(recommended_price, 2),
        "estimated_profit": round(actual_profit, 2),
        "estimated_roi_percent": round(actual_roi, 2),
        "fba_fee_rate": fba_fee_rate,
        "fba_fees_amount": round(fba_fees, 2),
        "price_range": price_range
    }


@router.post("/optimize")
async def optimize_pricing(
    request: PricingOptimizationRequest,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Recommend optimal price point for a product given cost and ROI target.
    Uses category benchmark data to ensure competitive positioning.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    product = query.filter(ScoutResult.asin == request.asin).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Product {request.asin} not found in scout data"
        )

    # Get category averages for market positioning
    category_stats = db.query(
        func.avg(ScoutResult.price).label("avg_price"),
        func.avg(ScoutResult.monthly_sales).label("avg_sales")
    ).filter(
        ScoutResult.org_id == user.org_id,
        ScoutResult.category == product.category
    ).first()

    category_avg_price = category_stats.avg_price if category_stats else None

    # Calculate optimal pricing
    pricing = calculate_optimal_price(
        cost=request.cost,
        target_roi=request.target_roi_percent,
        category_avg_price=category_avg_price
    )

    reasoning_parts = [
        f"Based on cost of ${request.cost:.2f} and {request.target_roi_percent}% ROI target.",
        f"Adjusted for {product.category} category avg price: ${category_avg_price:.2f}." if category_avg_price else "",
        f"Accounts for FBA fees (~{pricing['fba_fee_rate']*100:.0f}% of revenue)."
    ]

    return PricingResponse(
        asin=request.asin,
        cost=request.cost,
        recommended_price=pricing["recommended_price"],
        estimated_profit_per_unit=pricing["estimated_profit"],
        estimated_roi_percent=pricing["estimated_roi_percent"],
        price_range=pricing["price_range"],
        reasoning=" ".join([r for r in reasoning_parts if r])
    )


@router.get("/margins")
async def analyze_profit_margins(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None)
):
    """
    Analyze profit margins across products.
    If category provided, deep-dive into that category.
    Requires cost data from Product model.
    """
    product_query = get_org_scoped_query(db, user, Product)
    scout_query = get_org_scoped_query(db, user, ScoutResult)

    if category:
        scout_query = scout_query.filter(ScoutResult.category == category)

    scouts = scout_query.all()
    if not scouts:
        return {
            "margins": [],
            "message": f"No scout data found for {category or 'any'} category"
        }

    margins = []
    for scout in scouts:
        # Try to find product cost data
        product = product_query.filter(Product.asin == scout.asin).first()

        if product and product.unit_cost:
            cost = product.unit_cost
            # Estimate FBA fees
            fba_fee_rate = 0.45 if scout.price < 15 else 0.40 if scout.price < 25 else 0.35
            fba_fees = scout.price * fba_fee_rate

            profit = scout.price - fba_fees - cost
            roi = (profit / cost * 100) if cost > 0 else 0
            margin_percent = (profit / scout.price * 100) if scout.price > 0 else 0

            margins.append({
                "asin": scout.asin,
                "title": scout.title[:60],
                "category": scout.category,
                "unit_cost": cost,
                "selling_price": scout.price,
                "fba_fees": round(fba_fees, 2),
                "profit_per_unit": round(profit, 2),
                "roi_percent": round(roi, 2),
                "margin_percent": round(margin_percent, 2),
                "monthly_sales": scout.monthly_sales
            })

    margins.sort(key=lambda x: x["roi_percent"], reverse=True)

    # Summary statistics
    if margins:
        avg_roi = sum(m["roi_percent"] for m in margins) / len(margins)
        avg_margin = sum(m["margin_percent"] for m in margins) / len(margins)
        high_margin = [m for m in margins if m["margin_percent"] > 40]
        low_margin = [m for m in margins if m["margin_percent"] < 15]
    else:
        avg_roi = avg_margin = 0
        high_margin = low_margin = []

    return {
        "category": category,
        "products_analyzed": len(margins),
        "summary": {
            "avg_roi_percent": round(avg_roi, 2),
            "avg_margin_percent": round(avg_margin, 2),
            "high_margin_count": len(high_margin),
            "low_margin_count": len(low_margin)
        },
        "margins": margins[:20],
        "high_margin_opportunities": high_margin[:5],
        "low_margin_risks": low_margin[:5]
    }


@router.get("/breakeven")
async def calculate_breakeven(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None)
):
    """
    Calculate breakeven cost thresholds for different categories.
    Shows maximum cost per unit to achieve profitability at category average price.
    """
    query = get_org_scoped_query(db, user, ScoutResult)

    if category:
        scouts = query.filter(ScoutResult.category == category).all()
    else:
        scouts = query.all()

    if not scouts:
        return {"breakeven": [], "message": "No data available"}

    # Group by category if not filtered
    if not category:
        categories = list(set(s.category for s in scouts if s.category))
    else:
        categories = [category]

    breakeven_data = []

    for cat in categories:
        cat_scouts = [s for s in scouts if s.category == cat]
        if not cat_scouts:
            continue

        # Average market price for this category
        prices = [s.current_price for s in cat_scouts if s.current_price]
        avg_price = sum(prices) / len(prices) if prices else 0

        # FBA fee rate
        fba_fee_rate = 0.45 if avg_price < 15 else 0.40 if avg_price < 25 else 0.35
        fba_fees = avg_price * fba_fee_rate

        # Breakeven at different profit targets
        breakeven_points = {}
        for roi_target in [15, 25, 35, 50]:
            # Profit needed = Cost * (ROI% / 100)
            # Revenue after FBA = Price * (1 - FBA rate)
            # Revenue after FBA = Cost + Profit
            # Avg Price * (1 - FBA%) = Cost * (1 + ROI%)
            # Cost = [Avg Price * (1 - FBA%)] / (1 + ROI%)

            max_cost = (avg_price * (1 - fba_fee_rate)) / (1 + roi_target / 100)
            breakeven_points[f"roi_{roi_target}"] = round(max_cost, 2)

        breakeven_data.append({
            "category": cat,
            "avg_market_price": round(avg_price, 2),
            "fba_fee_rate": fba_fee_rate,
            "max_unit_cost_for": breakeven_points,
            "product_count": len(cat_scouts)
        })

    return {
        "breakeven_analysis": breakeven_data,
        "total_categories": len(breakeven_data),
        "note": "Shows maximum unit cost to achieve profitability at category average price"
    }
