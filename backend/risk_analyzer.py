"""
Risk Analyzer Module - Advanced risk assessment for scouted products
Analyzes price volatility, competition, and BSR stability to compute composite risk scores.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pydantic import BaseModel

from config import settings
from database import get_db
from models import Product, ScoutResult, User, Organization
from auth import get_current_user, get_org_scoped_query

router = APIRouter(prefix="/risk", tags=["risk-analysis"])

# Pydantic schemas for responses
class RiskBreakdown(BaseModel):
    risk_level: str  # high, medium, low
    score: float  # 0-100
    price_volatility: float
    competition_score: float
    bsr_stability: float
    factors: List[str]

    class Config:
        from_attributes = True

class PortfolioRisk(BaseModel):
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    average_risk_score: float
    total_products: int

class RiskAlert(BaseModel):
    asin: str
    product_name: str
    previous_risk_level: str
    current_risk_level: str
    alert_reason: str
    timestamp: datetime


def compute_risk_score(product: Product, scout_results: List[ScoutResult]) -> Dict[str, Any]:
    """
    Compute composite risk score from 0-100.
    Higher score = higher risk.
    """
    if not scout_results:
        return {
            "score": 50.0,
            "price_volatility": 0.0,
            "competition_score": 0.0,
            "bsr_stability": 0.0,
            "factors": ["insufficient_data"]
        }

    # Price volatility: calculate standard deviation of prices over last 90 days
    recent_results = [sr for sr in scout_results if sr.created_at > datetime.utcnow() - timedelta(days=90)]
    if recent_results:
        prices = [sr.current_price for sr in recent_results if sr.current_price]
        if prices and len(prices) > 1:
            avg_price = sum(prices) / len(prices)
            variance = sum((p - avg_price) ** 2 for p in prices) / len(prices)
            price_volatility = min(100, (variance ** 0.5) / avg_price * 100) if avg_price > 0 else 0
        else:
            price_volatility = 0.0
    else:
        price_volatility = 0.0

    # Competition score: based on FBA sellers count (0-100)
    latest_result = scout_results[-1] if scout_results else None
    fba_sellers = latest_result.fba_sellers_count if latest_result else 0
    # Normalize: 0 sellers = 0 risk, 50+ sellers = 100 risk
    competition_score = min(100, (fba_sellers / 50) * 100) if fba_sellers else 0.0

    # BSR stability: measure variance in BSR rank over time
    if recent_results:
        bsr_values = [sr.bsr_rank for sr in recent_results if sr.bsr_rank]
        if bsr_values and len(bsr_values) > 1:
            bsr_avg = sum(bsr_values) / len(bsr_values)
            bsr_var = sum((b - bsr_avg) ** 2 for b in bsr_values) / len(bsr_values)
            # Normalize: high variance = high instability
            bsr_stability = min(100, (bsr_var ** 0.5) / 10000 * 100) if bsr_avg > 0 else 0
        else:
            bsr_stability = 0.0
    else:
        bsr_stability = 0.0

    # Weighted composite score (40% volatility, 35% competition, 25% BSR)
    composite = (price_volatility * 0.40) + (competition_score * 0.35) + (bsr_stability * 0.25)

    # Identify risk factors
    factors = []
    if price_volatility > 40:
        factors.append("high_price_volatility")
    if competition_score > 60:
        factors.append("heavy_competition")
    if bsr_stability > 50:
        factors.append("unstable_bsr")
    if not factors:
        factors.append("low_risk_profile")

    return {
        "score": round(composite, 2),
        "price_volatility": round(price_volatility, 2),
        "competition_score": round(competition_score, 2),
        "bsr_stability": round(bsr_stability, 2),
        "factors": factors
    }


def determine_risk_level(score: float) -> str:
    """Map risk score to categorical level."""
    if score < 33:
        return "low"
    elif score < 67:
        return "medium"
    else:
        return "high"


@router.get("/portfolio", response_model=PortfolioRisk)
async def get_portfolio_risk(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze risk distribution across all products in the organization's portfolio.
    """
    products = get_org_scoped_query(db, user, Product).all()

    high_count = 0
    medium_count = 0
    low_count = 0
    total_scores = []

    for product in products:
        # Phantom-schema reference (ScoutResult.product_id doesn't exist) left
        # untouched — leak fix only; full repair tracked as PR A follow-up.
        scout_results = db.query(ScoutResult).filter(
            ScoutResult.org_id == user.org_id,
            ScoutResult.product_id == product.id,
        ).order_by(ScoutResult.created_at.desc()).all()

        risk_data = compute_risk_score(product, scout_results)
        level = determine_risk_level(risk_data["score"])
        total_scores.append(risk_data["score"])

        if level == "high":
            high_count += 1
        elif level == "medium":
            medium_count += 1
        else:
            low_count += 1

    avg_score = sum(total_scores) / len(total_scores) if total_scores else 0

    return PortfolioRisk(
        high_risk_count=high_count,
        medium_risk_count=medium_count,
        low_risk_count=low_count,
        average_risk_score=round(avg_score, 2),
        total_products=len(products)
    )


@router.get("/asin/{asin}", response_model=RiskBreakdown)
async def get_asin_risk(
    asin: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed risk breakdown for a specific ASIN.
    """
    product = get_org_scoped_query(db, user, Product).filter(
        Product.asin == asin
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Phantom-schema reference (ScoutResult.product_id doesn't exist) left
    # untouched — leak fix only; full repair tracked as PR A follow-up.
    scout_results = db.query(ScoutResult).filter(
        ScoutResult.org_id == user.org_id,
        ScoutResult.product_id == product.id,
    ).order_by(ScoutResult.created_at.desc()).all()

    risk_data = compute_risk_score(product, scout_results)
    risk_level = determine_risk_level(risk_data["score"])

    return RiskBreakdown(
        risk_level=risk_level,
        score=risk_data["score"],
        price_volatility=risk_data["price_volatility"],
        competition_score=risk_data["competition_score"],
        bsr_stability=risk_data["bsr_stability"],
        factors=risk_data["factors"]
    )


@router.get("/alerts", response_model=List[RiskAlert])
async def get_risk_alerts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get products that have recently moved to high-risk status.
    """
    products = get_org_scoped_query(db, user, Product).all()
    alerts = []

    for product in products:
        # Phantom-schema reference (ScoutResult.product_id doesn't exist) left
        # untouched — leak fix only; full repair tracked as PR A follow-up.
        scout_results = db.query(ScoutResult).filter(
            ScoutResult.org_id == user.org_id,
            ScoutResult.product_id == product.id,
        ).order_by(ScoutResult.created_at.desc()).limit(2).all()

        if len(scout_results) >= 2:
            current_risk = determine_risk_level(compute_risk_score(product, [scout_results[0]])["score"])
            previous_risk = determine_risk_level(compute_risk_score(product, [scout_results[1]])["score"])

            # Alert if risk increased
            if (previous_risk != "high") and (current_risk == "high"):
                alerts.append(RiskAlert(
                    asin=product.asin,
                    product_name=product.product_name,
                    previous_risk_level=previous_risk,
                    current_risk_level=current_risk,
                    alert_reason="Risk elevated to high",
                    timestamp=datetime.utcnow()
                ))

    return alerts
