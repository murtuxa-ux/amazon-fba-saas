"""
Inventory demand forecasting module for Ecom Era FBA platform.
Routes for demand forecasting, reorder recommendations, and seasonal analysis.
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import settings
from database import get_db
from models import User, ScoutResult
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/inventory", tags=["Inventory Forecasting"])


def calculate_sales_velocity(monthly_sales: float, days: int = 30) -> float:
    """Convert monthly sales to daily sales velocity."""
    return monthly_sales / days if monthly_sales else 0


def forecast_demand(
    monthly_sales: float,
    forecast_days: int = 90,
    growth_rate: float = 0.05
) -> Dict:
    """
    Forecast demand based on current monthly sales and assumed growth rate.
    Uses simple linear growth model with seasonal adjustment opportunities.
    """
    if monthly_sales <= 0:
        return {
            "daily_rate": 0,
            "forecast_30_days": 0,
            "forecast_90_days": 0,
            "forecast_annual": 0
        }

    daily_rate = monthly_sales / 30
    months_to_forecast = forecast_days / 30

    # Simple growth model: Future Sales = Current * (1 + growth_rate)^months
    forecast_value = monthly_sales * ((1 + growth_rate) ** months_to_forecast)

    return {
        "daily_rate": round(daily_rate, 2),
        "forecast_30_days": round(monthly_sales, 0),
        "forecast_90_days": round(forecast_value, 0),
        "forecast_annual": round(monthly_sales * 12 * (1 + growth_rate), 0)
    }


@router.get("/forecast")
async def forecast_inventory_demand(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None),
    growth_assumption: float = Query(0.05, ge=0, le=0.5)
):
    """
    Forecast demand for 30/90 days and annual based on monthly_sales data.
    Optionally filter by category. Includes growth rate assumptions.
    """
    query = get_org_scoped_query(db, user, ScoutResult)

    if category:
        query = query.filter(ScoutResult.category == category)

    scouts = query.filter(ScoutResult.monthly_sales.isnot(None)).all()

    if not scouts:
        return {
            "forecasts": [],
            "message": f"No sales data found for {category or 'products'}"
        }

    forecasts = []
    total_30_day = 0
    total_90_day = 0

    for scout in scouts:
        if scout.monthly_sales:
            forecast = forecast_demand(
                scout.monthly_sales,
                forecast_days=90,
                growth_rate=growth_assumption
            )

            total_30_day += forecast["forecast_30_days"]
            total_90_day += forecast["forecast_90_days"]

            forecasts.append({
                "asin": scout.asin,
                "title": scout.title[:50] if scout.title else "Unknown",
                "category": scout.category,
                "current_monthly_sales": scout.monthly_sales,
                "forecast": forecast,
                "reorder_urgency": "High" if scout.monthly_sales > 100 else "Medium" if scout.monthly_sales > 25 else "Low"
            })

    # Sort by sales volume
    forecasts.sort(key=lambda x: x["current_monthly_sales"], reverse=True)

    return {
        "category": category,
        "analysis_period_days": 90,
        "growth_assumption_percent": growth_assumption * 100,
        "products_analyzed": len(forecasts),
        "aggregate_forecast": {
            "next_30_days": round(total_30_day, 0),
            "next_90_days": round(total_90_day, 0),
            "projected_annual": round(total_30_day * 12, 0)
        },
        "top_volume_products": forecasts[:10]
    }


@router.get("/reorder")
async def suggest_reorder_quantities(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    lead_time_days: int = Query(30, ge=7, le=90),
    safety_stock_weeks: int = Query(2, ge=1, le=8)
):
    """
    Suggest reorder quantities based on sales velocity and lead time.
    Accounts for supplier lead time and safety stock buffer.
    """
    query = get_org_scoped_query(db, user, ScoutResult)
    scouts = query.filter(ScoutResult.monthly_sales.isnot(None)).all()

    if not scouts:
        return {"reorder_suggestions": [], "message": "No sales data available"}

    reorder_suggestions = []

    for scout in scouts:
        if not scout.monthly_sales or scout.monthly_sales <= 0:
            continue

        # Daily sales rate
        daily_sales = scout.monthly_sales / 30

        # Units needed during lead time
        units_during_lead_time = daily_sales * lead_time_days

        # Safety stock (buffer for demand variability)
        safety_stock = daily_sales * (safety_stock_weeks * 7)

        # Reorder point and quantity
        reorder_point = units_during_lead_time + safety_stock
        # Economic order quantity heuristic: order for 60 days of sales
        reorder_quantity = daily_sales * 60

        reorder_suggestions.append({
            "asin": scout.asin,
            "title": scout.title[:50] if scout.title else "Unknown",
            "current_monthly_sales": scout.monthly_sales,
            "daily_sales_rate": round(daily_sales, 2),
            "reorder_point": round(reorder_point, 0),
            "suggested_order_quantity": round(reorder_quantity, 0),
            "reorder_frequency_days": round(reorder_quantity / daily_sales, 0),
            "safety_stock": round(safety_stock, 0),
            "lead_time_days": lead_time_days,
            "urgency": "Critical" if daily_sales > 5 else "High" if daily_sales > 2 else "Medium"
        })

    # Sort by daily sales (highest first)
    reorder_suggestions.sort(
        key=lambda x: x["daily_sales_rate"],
        reverse=True
    )

    return {
        "reorder_recommendations": reorder_suggestions[:20],
        "parameters": {
            "supplier_lead_time_days": lead_time_days,
            "safety_stock_weeks": safety_stock_weeks
        },
        "products_requiring_reorder": len(reorder_suggestions),
        "note": "Reorder point = units needed during lead time + safety stock"
    }


@router.get("/seasonal")
async def identify_seasonal_patterns(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None),
    min_samples: int = Query(5, ge=2, le=20)
):
    """
    Identify seasonal patterns in scout data.
    Analyzes products to find seasonality trends (holiday spikes, summer peaks, etc).
    Note: Since we only have monthly_sales snapshots, seasonality is inferred from patterns.
    """
    query = get_org_scoped_query(db, user, ScoutResult)

    if category:
        query = query.filter(ScoutResult.category == category)

    scouts = query.filter(ScoutResult.monthly_sales.isnot(None)).all()

    if not scouts:
        return {"seasonal_insights": [], "message": "Insufficient data for seasonal analysis"}

    # Group by category to find seasonal patterns
    category_sales = {}
    for scout in scouts:
        cat = scout.category or "Unknown"
        if cat not in category_sales:
            category_sales[cat] = []
        category_sales[cat].append(scout.monthly_sales)

    seasonal_patterns = []

    for cat, sales_data in category_sales.items():
        if len(sales_data) < min_samples:
            continue

        avg_sales = sum(sales_data) / len(sales_data)
        max_sales = max(sales_data)
        min_sales = min(sales_data)
        variance = sum((x - avg_sales) ** 2 for x in sales_data) / len(sales_data)
        std_dev = variance ** 0.5

        # Coefficient of variation: higher = more seasonal
        cv = (std_dev / avg_sales) if avg_sales > 0 else 0

        # Seasonality classification
        if cv > 0.5:
            seasonality = "Highly Seasonal"
            insight = "Strong seasonal patterns detected - plan inventory with peaks/troughs"
        elif cv > 0.3:
            seasonality = "Moderately Seasonal"
            insight = "Moderate seasonal variation - adjust stock levels by season"
        else:
            seasonality = "Stable Year-Round"
            insight = "Consistent demand - steady reorder schedule recommended"

        seasonal_patterns.append({
            "category": cat,
            "average_monthly_sales": round(avg_sales, 1),
            "sales_range": {
                "min": round(min_sales, 1),
                "max": round(max_sales, 1),
                "variance": round(std_dev, 1)
            },
            "seasonality_score": round(cv, 3),
            "seasonality_type": seasonality,
            "product_samples": len(sales_data),
            "seasonal_insight": insight
        })

    # Sort by seasonality score
    seasonal_patterns.sort(key=lambda x: x["seasonality_score"], reverse=True)

    # Identify high-seasonality categories
    high_seasonal = [p for p in seasonal_patterns if p["seasonality_type"] == "Highly Seasonal"]
    stable = [p for p in seasonal_patterns if p["seasonality_type"] == "Stable Year-Round"]

    return {
        "seasonal_analysis": seasonal_patterns,
        "high_seasonality_categories": high_seasonal[:5],
        "stable_categories": stable[:5],
        "total_categories_analyzed": len(seasonal_patterns),
        "interpretation_note": "Seasonality score (CV) > 0.5 = Highly Seasonal, 0.3-0.5 = Moderate, < 0.3 = Stable"
    }
