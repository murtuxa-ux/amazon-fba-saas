"""
Wholesale Profit Calculator Module for Amazon FBA/FBM

Handles profit analysis, fee estimation, and deal scanning for wholesale products.
Supports multiple marketplaces (US, CA, UK, DE) with realistic Amazon fee calculations.

Author: Ecom Era Platform
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from auth import get_current_user, tenant_session
from models import User, Organization, Product, ProfitAnalysis
from database import get_db

logger = logging.getLogger(__name__)

# ============================================================================
# Enums and Constants
# ============================================================================

class MarketplaceEnum(str, Enum):
    """Supported Amazon marketplaces"""
    US = "US"
    CA = "CA"
    UK = "UK"
    DE = "DE"


class FulfillmentTypeEnum(str, Enum):
    """Fulfillment methods"""
    FBA = "FBA"
    FBM = "FBM"


class DealRatingEnum(str, Enum):
    """Deal quality ratings"""
    WINNER = "winner"  # ROI > 30%
    MAYBE = "maybe"    # 15-30% ROI
    SKIP = "skip"      # < 15% ROI


# Amazon referral fees by category (default 15%)
REFERRAL_FEES = {
    "default": 0.15,
    "electronics": 0.08,
    "books": 0.15,
    "toys": 0.15,
    "apparel": 0.17,
}

# FBA fees by size tier (small standard, large standard, oversize)
FBA_FEES = {
    "small_standard": 3.22,      # < 1 lbs, up to 18x14x8
    "large_standard_0_1": 4.75,  # 1-2 lbs
    "large_standard_1_2": 5.00,  # 2-4 lbs
    "large_standard_2_4": 5.25,  # 4-8 lbs
    "large_standard_4_8": 6.50,  # 8-20 lbs
    "large_standard_20_plus": 8.26,  # > 20 lbs
    "oversize_tier1": 14.00,     # < 70 lbs
    "oversize_tier2": 16.00,     # < 100 lbs
}

# Storage fees per cubic foot
STORAGE_FEES = {
    "standard_month": 0.87,      # Jan-Sep
    "peak_month": 2.40,          # Oct-Dec
}


# ============================================================================
# Pydantic Schemas
# ============================================================================

class ProfitAnalysisRequest(BaseModel):
    """Request model for single ASIN profit analysis"""
    asin: str = Field(..., min_length=10, max_length=10)
    cost_price: float = Field(..., gt=0)
    selling_price: float = Field(..., gt=0)
    fba_fee: Optional[float] = Field(default=None, ge=0)
    fbm_shipping_cost: Optional[float] = Field(default=None, ge=0)
    units_per_case: int = Field(default=1, gt=0)
    cases_per_order: int = Field(default=1, gt=0)
    marketplace: MarketplaceEnum = Field(default=MarketplaceEnum.US)


class BulkProfitRequest(BaseModel):
    """Request model for bulk ASIN analysis"""
    products: List[Dict[str, Any]] = Field(..., min_items=1)
    marketplace: MarketplaceEnum = Field(default=MarketplaceEnum.US)

    class Config:
        schema_extra = {
            "example": {
                "products": [
                    {"asin": "B0ABCD1234", "cost_price": 25.00, "selling_price": 49.99},
                    {"asin": "B0ABCD5678", "cost_price": 15.00, "selling_price": 39.99},
                ]
            }
        }


class LandedCostRequest(BaseModel):
    """Request model for landed cost calculation"""
    unit_cost: float = Field(..., gt=0)
    shipping_per_unit: float = Field(..., ge=0)
    customs_duty_pct: float = Field(default=0, ge=0, le=100)
    prep_cost_per_unit: float = Field(default=0, ge=0)
    inspection_cost: float = Field(default=0, ge=0)
    units_per_case: int = Field(default=1, gt=0)
    cases_per_order: int = Field(default=1, gt=0)


class DealScannerRequest(BaseModel):
    """Request model for supplier price list analysis"""
    deals: List[Dict[str, Any]] = Field(..., min_items=1)
    marketplace: MarketplaceEnum = Field(default=MarketplaceEnum.US)
    min_moq: int = Field(default=0, ge=0)

    class Config:
        schema_extra = {
            "example": {
                "deals": [
                    {"asin": "B0ABCD1234", "supplier_price": 15.00, "moq": 100},
                    {"asin": "B0ABCD5678", "supplier_price": 8.00, "moq": 500},
                ]
            }
        }


class FeeEstimateResponse(BaseModel):
    """Response model for fee estimation"""
    asin: str
    referral_fee_pct: float
    referral_fee_amount: float
    fba_fee: float
    storage_fee_monthly: float
    long_term_storage_fee: float
    category: str = "Unknown"

    class Config:
        schema_extra = {
            "example": {
                "asin": "B0ABCD1234",
                "referral_fee_pct": 15.0,
                "referral_fee_amount": 7.50,
                "fba_fee": 3.22,
                "storage_fee_monthly": 2.61,
                "long_term_storage_fee": 7.20,
                "category": "Electronics",
            }
        }


class ProfitBreakdown(BaseModel):
    """Profit breakdown for a single fulfillment method"""
    revenue: float
    amazon_fees: float
    fulfillment_fee: float
    referral_fee: float
    net_profit: float
    roi_percent: float
    margin_percent: float

    class Config:
        schema_extra = {
            "example": {
                "revenue": 49.99,
                "amazon_fees": 1.50,
                "fulfillment_fee": 3.22,
                "referral_fee": 7.50,
                "net_profit": 13.37,
                "roi_percent": 53.48,
                "margin_percent": 26.74,
            }
        }


class SingleAnalysisResponse(BaseModel):
    """Response model for single ASIN analysis"""
    asin: str
    cost_price: float
    selling_price: float
    marketplace: str
    timestamp: datetime
    fba_analysis: ProfitBreakdown
    fbm_analysis: ProfitBreakdown
    recommendation: str
    break_even_units: int


class BulkAnalysisItem(BaseModel):
    """Item in bulk analysis response"""
    asin: str
    cost_price: float
    selling_price: float
    fba_roi: float
    fbm_roi: float
    better_method: str
    net_profit_fba: float
    net_profit_fbm: float


class BulkAnalysisResponse(BaseModel):
    """Response for bulk analysis"""
    total_analyzed: int
    results: List[BulkAnalysisItem]


class LandedCostResponse(BaseModel):
    """Response model for landed cost calculation"""
    unit_cost: float
    shipping_per_unit: float
    customs_duty_per_unit: float
    prep_cost_per_unit: float
    inspection_cost_per_unit: float
    total_landed_cost_per_unit: float
    total_per_case: float
    total_per_order: float


class HistoryFilters(BaseModel):
    """Filter model for history retrieval"""
    min_roi: Optional[float] = None
    max_roi: Optional[float] = None
    fulfillment_type: Optional[FulfillmentTypeEnum] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=50, le=500)


class DealItem(BaseModel):
    """Item in deal scanner results"""
    asin: str
    supplier_price: float
    moq: int
    estimated_selling_price: float
    estimated_fba_roi: float
    estimated_fbm_roi: float
    deal_rating: str
    estimated_net_profit: float


class DealScannerResponse(BaseModel):
    """Response for deal scanner"""
    total_deals_analyzed: int
    winners: List[DealItem]
    maybe: List[DealItem]
    skip: List[DealItem]


class DashboardMetrics(BaseModel):
    """Dashboard summary metrics"""
    total_products_analyzed: int
    avg_roi_fba: float
    avg_roi_fbm: float
    best_deal_asin: Optional[str]
    best_deal_roi: float
    total_potential_profit: float
    fba_percentage: float
    fbm_percentage: float
    last_30_days_analyses: int


# ============================================================================
# Router Setup
# ============================================================================

router = APIRouter(prefix="/profit-calc", tags=["profit-calculator"])


# ============================================================================
# Helper Functions
# ============================================================================

def get_referral_fee_pct(category: str = None) -> float:
    """Get referral fee percentage by category"""
    if category and category.lower() in REFERRAL_FEES:
        return REFERRAL_FEES[category.lower()]
    return REFERRAL_FEES["default"]


def estimate_fba_fee(weight_lbs: float = 1.0, dimensions: tuple = None) -> float:
    """
    Estimate FBA fulfillment fee based on weight and dimensions.
    Defaults to small standard tier if not specified.
    """
    # Simplified: use weight-based tiers
    if weight_lbs < 1:
        return FBA_FEES["small_standard"]
    elif weight_lbs < 2:
        return FBA_FEES["large_standard_0_1"]
    elif weight_lbs < 4:
        return FBA_FEES["large_standard_1_2"]
    elif weight_lbs < 8:
        return FBA_FEES["large_standard_2_4"]
    elif weight_lbs < 20:
        return FBA_FEES["large_standard_4_8"]
    else:
        return FBA_FEES["large_standard_20_plus"]


def calculate_profit_breakdown(
    cost_price: float,
    selling_price: float,
    fba_fee: float,
    referral_fee_pct: float = 0.15,
    use_fbm: bool = False,
    fbm_shipping: float = 0,
) -> ProfitBreakdown:
    """
    Calculate detailed profit breakdown for a product.

    Args:
        cost_price: Product cost
        selling_price: Selling price on Amazon
        fba_fee: Fulfillment fee (FBA) or 0 if FBM
        referral_fee_pct: Referral fee percentage
        use_fbm: If True, treat fba_fee as FBM shipping cost
        fbm_shipping: FBM shipping cost (if applicable)

    Returns:
        ProfitBreakdown object
    """
    revenue = selling_price
    referral_fee = selling_price * referral_fee_pct

    if use_fbm:
        fulfillment_fee = fbm_shipping
        amazon_fees = 0
    else:
        fulfillment_fee = fba_fee
        amazon_fees = 0

    total_fees = referral_fee + fulfillment_fee + amazon_fees
    net_profit = revenue - cost_price - total_fees

    # Calculate ROI: (net_profit / cost_price) * 100
    roi_percent = (net_profit / cost_price * 100) if cost_price > 0 else 0

    # Calculate margin: (net_profit / revenue) * 100
    margin_percent = (net_profit / revenue * 100) if revenue > 0 else 0

    return ProfitBreakdown(
        revenue=round(revenue, 2),
        amazon_fees=round(amazon_fees, 2),
        fulfillment_fee=round(fulfillment_fee, 2),
        referral_fee=round(referral_fee, 2),
        net_profit=round(net_profit, 2),
        roi_percent=round(roi_percent, 2),
        margin_percent=round(margin_percent, 2),
    )


def calculate_break_even_units(
    cost_price: float,
    selling_price: float,
    total_fees_per_unit: float,
) -> int:
    """Calculate units needed to break even"""
    profit_per_unit = selling_price - cost_price - total_fees_per_unit
    if profit_per_unit <= 0:
        return -1  # Never breaks even

    # Break even when cumulative profit = initial costs (simplified)
    break_even = int((cost_price / profit_per_unit) + 1)
    return max(1, break_even)


def estimate_amazon_category(asin: str) -> str:
    """Mock function to estimate product category from ASIN (in production, query Amazon API)"""
    # Simplified: return default category
    return "General"


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/analyze", response_model=SingleAnalysisResponse)
async def analyze_single_profit(
    request: ProfitAnalysisRequest,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Calculate profit analysis for a single ASIN.

    Provides FBA and FBM profit breakdown with comparison and recommendations.
    """
    try:
        logger.info(
            f"User {current_user.id} analyzing ASIN {request.asin}",
            extra={"org_id": current_user.org_id},
        )

        # Estimate FBA fee if not provided
        fba_fee = request.fba_fee or estimate_fba_fee()

        # Get referral fee percentage
        referral_fee_pct = get_referral_fee_pct()

        # Calculate FBA analysis
        fba_analysis = calculate_profit_breakdown(
            cost_price=request.cost_price,
            selling_price=request.selling_price,
            fba_fee=fba_fee,
            referral_fee_pct=referral_fee_pct,
            use_fbm=False,
        )

        # Calculate FBM analysis
        fbm_shipping = request.fbm_shipping_cost or 3.50  # Default FBM shipping
        fbm_analysis = calculate_profit_breakdown(
            cost_price=request.cost_price,
            selling_price=request.selling_price,
            fba_fee=fbm_shipping,
            referral_fee_pct=referral_fee_pct,
            use_fbm=True,
        )

        # Determine recommendation
        if fba_analysis.net_profit > fbm_analysis.net_profit:
            recommendation = (
                f"FBA is more profitable by ${fba_analysis.net_profit - fbm_analysis.net_profit:.2f} per unit"
            )
            break_even = calculate_break_even_units(
                request.cost_price,
                request.selling_price,
                fba_fee + (request.selling_price * referral_fee_pct),
            )
        else:
            recommendation = (
                f"FBM is more profitable by ${fbm_analysis.net_profit - fba_analysis.net_profit:.2f} per unit"
            )
            break_even = calculate_break_even_units(
                request.cost_price,
                request.selling_price,
                fbm_shipping + (request.selling_price * referral_fee_pct),
            )

        # Store analysis in database
        analysis_record = ProfitAnalysis(
            org_id=current_user.org_id,
            user_id=current_user.id,
            asin=request.asin,
            cost_price=request.cost_price,
            selling_price=request.selling_price,
            fba_profit=fba_analysis.net_profit,
            fbm_profit=fbm_analysis.net_profit,
            fba_roi=fba_analysis.roi_percent,
            fbm_roi=fbm_analysis.roi_percent,
            recommended_method="FBA" if fba_analysis.net_profit > fbm_analysis.net_profit else "FBM",
            marketplace=request.marketplace.value,
            analysis_data={
                "fba_breakdown": fba_analysis.dict(),
                "fbm_breakdown": fbm_analysis.dict(),
            },
        )
        db.add(analysis_record)
        db.commit()

        return SingleAnalysisResponse(
            asin=request.asin,
            cost_price=request.cost_price,
            selling_price=request.selling_price,
            marketplace=request.marketplace.value,
            timestamp=datetime.utcnow(),
            fba_analysis=fba_analysis,
            fbm_analysis=fbm_analysis,
            recommendation=recommendation,
            break_even_units=break_even,
        )

    except Exception as e:
        logger.error(
            f"Error analyzing ASIN {request.asin}: {str(e)}",
            extra={"org_id": current_user.org_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error performing profit analysis",
        )


@router.post("/bulk-analyze", response_model=BulkAnalysisResponse)
async def bulk_analyze_profit(
    request: BulkProfitRequest,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Analyze multiple ASINs and rank by ROI.

    Returns sorted list of products with FBA/FBM comparison for each.
    """
    try:
        logger.info(
            f"User {current_user.id} bulk analyzing {len(request.products)} products",
            extra={"org_id": current_user.org_id},
        )

        referral_fee_pct = get_referral_fee_pct()
        fba_fee = estimate_fba_fee()

        results = []

        for product in request.products:
            asin = product.get("asin")
            cost_price = product.get("cost_price", 0)
            selling_price = product.get("selling_price", 0)

            if not asin or cost_price <= 0 or selling_price <= 0:
                continue

            # FBA analysis
            fba_breakdown = calculate_profit_breakdown(
                cost_price=cost_price,
                selling_price=selling_price,
                fba_fee=fba_fee,
                referral_fee_pct=referral_fee_pct,
                use_fbm=False,
            )

            # FBM analysis
            fbm_shipping = 3.50
            fbm_breakdown = calculate_profit_breakdown(
                cost_price=cost_price,
                selling_price=selling_price,
                fba_fee=fbm_shipping,
                referral_fee_pct=referral_fee_pct,
                use_fbm=True,
            )

            results.append(
                BulkAnalysisItem(
                    asin=asin,
                    cost_price=cost_price,
                    selling_price=selling_price,
                    fba_roi=fba_breakdown.roi_percent,
                    fbm_roi=fbm_breakdown.roi_percent,
                    better_method="FBA" if fba_breakdown.roi_percent > fbm_breakdown.roi_percent else "FBM",
                    net_profit_fba=fba_breakdown.net_profit,
                    net_profit_fbm=fbm_breakdown.net_profit,
                )
            )

        # Sort by FBA ROI (descending)
        results.sort(key=lambda x: x.fba_roi, reverse=True)

        return BulkAnalysisResponse(
            total_analyzed=len(results),
            results=results,
        )

    except Exception as e:
        logger.error(
            f"Error in bulk analysis: {str(e)}",
            extra={"org_id": current_user.org_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error performing bulk analysis",
        )


@router.post("/landed-cost", response_model=LandedCostResponse)
async def calculate_landed_cost(
    request: LandedCostRequest,
    current_user: User = Depends(tenant_session),
):
    """
    Calculate total landed cost per unit, case, and order.

    Includes shipping, customs duties, prep costs, and inspection.
    """
    try:
        logger.info(
            f"User {current_user.id} calculating landed cost",
            extra={"org_id": current_user.org_id},
        )

        customs_duty_per_unit = (request.unit_cost * request.customs_duty_pct) / 100

        total_landed_cost_per_unit = (
            request.unit_cost
            + request.shipping_per_unit
            + customs_duty_per_unit
            + request.prep_cost_per_unit
            + request.inspection_cost
        )

        total_per_case = total_landed_cost_per_unit * request.units_per_case
        total_per_order = total_per_case * request.cases_per_order

        return LandedCostResponse(
            unit_cost=round(request.unit_cost, 2),
            shipping_per_unit=round(request.shipping_per_unit, 2),
            customs_duty_per_unit=round(customs_duty_per_unit, 2),
            prep_cost_per_unit=round(request.prep_cost_per_unit, 2),
            inspection_cost_per_unit=round(request.inspection_cost, 2),
            total_landed_cost_per_unit=round(total_landed_cost_per_unit, 2),
            total_per_case=round(total_per_case, 2),
            total_per_order=round(total_per_order, 2),
        )

    except Exception as e:
        logger.error(
            f"Error calculating landed cost: {str(e)}",
            extra={"org_id": current_user.org_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error calculating landed cost",
        )


@router.get("/fee-estimate/{asin}", response_model=FeeEstimateResponse)
async def get_fee_estimate(
    asin: str,
    current_user: User = Depends(tenant_session),
):
    """
    Get estimated Amazon fees for an ASIN.

    Returns referral fee, FBA fee, and storage fees based on category.
    """
    try:
        logger.info(
            f"User {current_user.id} getting fee estimate for {asin}",
            extra={"org_id": current_user.org_id},
        )

        category = estimate_amazon_category(asin)
        referral_fee_pct = get_referral_fee_pct(category)

        # Mock selling price for fee calculation
        mock_selling_price = 50.00
        referral_fee_amount = mock_selling_price * referral_fee_pct
        fba_fee = estimate_fba_fee()

        # Storage fees (simplified)
        cubic_feet_per_unit = 0.1  # Mock value
        storage_fee_monthly = cubic_feet_per_unit * STORAGE_FEES["standard_month"]
        long_term_storage_fee = cubic_feet_per_unit * STORAGE_FEES["peak_month"]

        return FeeEstimateResponse(
            asin=asin,
            referral_fee_pct=round(referral_fee_pct * 100, 2),
            referral_fee_amount=round(referral_fee_amount, 2),
            fba_fee=round(fba_fee, 2),
            storage_fee_monthly=round(storage_fee_monthly, 2),
            long_term_storage_fee=round(long_term_storage_fee, 2),
            category=category,
        )

    except Exception as e:
        logger.error(
            f"Error estimating fees for {asin}: {str(e)}",
            extra={"org_id": current_user.org_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error estimating fees",
        )


@router.post("/deal-scanner", response_model=DealScannerResponse)
async def scan_deals(
    request: DealScannerRequest,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Analyze supplier price list and identify best deals.

    Flags products as "winners" (ROI > 30%), "maybe" (15-30%), or "skip" (< 15%).
    """
    try:
        logger.info(
            f"User {current_user.id} scanning {len(request.deals)} deals",
            extra={"org_id": current_user.org_id},
        )

        referral_fee_pct = get_referral_fee_pct()
        fba_fee = estimate_fba_fee()

        winners = []
        maybe = []
        skip = []

        for deal in request.deals:
            asin = deal.get("asin")
            supplier_price = deal.get("supplier_price", 0)
            moq = deal.get("moq", 0)

            if not asin or supplier_price <= 0:
                continue

            if moq < request.min_moq:
                continue

            # Estimate selling price (market research - simplified)
            # In production: use actual Amazon data
            estimated_selling_price = supplier_price * 2.5  # 150% markup assumption

            # FBA analysis
            fba_breakdown = calculate_profit_breakdown(
                cost_price=supplier_price,
                selling_price=estimated_selling_price,
                fba_fee=fba_fee,
                referral_fee_pct=referral_fee_pct,
                use_fbm=False,
            )

            # FBM analysis
            fbm_shipping = 3.50
            fbm_breakdown = calculate_profit_breakdown(
                cost_price=supplier_price,
                selling_price=estimated_selling_price,
                fba_fee=fbm_shipping,
                referral_fee_pct=referral_fee_pct,
                use_fbm=True,
            )

            # Determine deal rating
            fba_roi = fba_breakdown.roi_percent
            if fba_roi > 30:
                deal_rating = DealRatingEnum.WINNER.value
                target_list = winners
            elif fba_roi >= 15:
                deal_rating = DealRatingEnum.MAYBE.value
                target_list = maybe
            else:
                deal_rating = DealRatingEnum.SKIP.value
                target_list = skip

            deal_item = DealItem(
                asin=asin,
                supplier_price=round(supplier_price, 2),
                moq=moq,
                estimated_selling_price=round(estimated_selling_price, 2),
                estimated_fba_roi=round(fba_roi, 2),
                estimated_fbm_roi=round(fbm_breakdown.roi_percent, 2),
                deal_rating=deal_rating,
                estimated_net_profit=round(fba_breakdown.net_profit, 2),
            )
            target_list.append(deal_item)

        # Sort each category by profit descending
        winners.sort(key=lambda x: x.estimated_net_profit, reverse=True)
        maybe.sort(key=lambda x: x.estimated_net_profit, reverse=True)
        skip.sort(key=lambda x: x.estimated_net_profit, reverse=True)

        return DealScannerResponse(
            total_deals_analyzed=len(winners) + len(maybe) + len(skip),
            winners=winners,
            maybe=maybe,
            skip=skip,
        )

    except Exception as e:
        logger.error(
            f"Error scanning deals: {str(e)}",
            extra={"org_id": current_user.org_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error scanning deals",
        )


@router.get("/history", response_model=List[SingleAnalysisResponse])
async def get_analysis_history(
    filters: HistoryFilters = Depends(),
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Retrieve past profit analyses for the organization.

    Supports filtering by ROI range, fulfillment type, and date range.
    """
    try:
        logger.info(
            f"User {current_user.id} retrieving analysis history",
            extra={"org_id": current_user.org_id},
        )

        query = db.query(ProfitAnalysis).filter(
            ProfitAnalysis.org_id == current_user.org_id
        )

        # Apply filters
        if filters.min_roi is not None:
            query = query.filter(ProfitAnalysis.fba_roi >= filters.min_roi)
        if filters.max_roi is not None:
            query = query.filter(ProfitAnalysis.fba_roi <= filters.max_roi)
        if filters.start_date:
            query = query.filter(ProfitAnalysis.created_at >= filters.start_date)
        if filters.end_date:
            query = query.filter(ProfitAnalysis.created_at <= filters.end_date)

        # Limit results
        analyses = query.order_by(ProfitAnalysis.created_at.desc()).limit(filters.limit).all()

        results = []
        for analysis in analyses:
            fba_breakdown = ProfitBreakdown(**analysis.analysis_data["fba_breakdown"])
            fbm_breakdown = ProfitBreakdown(**analysis.analysis_data["fbm_breakdown"])

            break_even = calculate_break_even_units(
                analysis.cost_price,
                analysis.selling_price,
                fba_breakdown.fulfillment_fee + fba_breakdown.referral_fee,
            )

            results.append(
                SingleAnalysisResponse(
                    asin=analysis.asin,
                    cost_price=analysis.cost_price,
                    selling_price=analysis.selling_price,
                    marketplace=analysis.marketplace,
                    timestamp=analysis.created_at,
                    fba_analysis=fba_breakdown,
                    fbm_analysis=fbm_breakdown,
                    recommendation=f"Recommended: {analysis.recommended_method}",
                    break_even_units=break_even,
                )
            )

        return results

    except Exception as e:
        logger.error(
            f"Error retrieving analysis history: {str(e)}",
            extra={"org_id": current_user.org_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving analysis history",
        )


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Get dashboard summary metrics for the organization.

    Includes total analyses, average ROI, best deal, and FBA vs FBM split.
    """
    try:
        logger.info(
            f"User {current_user.id} retrieving dashboard metrics",
            extra={"org_id": current_user.org_id},
        )

        # Total analyses
        total_analyses = db.query(ProfitAnalysis).filter(
            ProfitAnalysis.org_id == current_user.org_id
        ).count()

        # Get all analyses
        all_analyses = db.query(ProfitAnalysis).filter(
            ProfitAnalysis.org_id == current_user.org_id
        ).all()

        if not all_analyses:
            return DashboardMetrics(
                total_products_analyzed=0,
                avg_roi_fba=0.0,
                avg_roi_fbm=0.0,
                best_deal_asin=None,
                best_deal_roi=0.0,
                total_potential_profit=0.0,
                fba_percentage=0.0,
                fbm_percentage=0.0,
                last_30_days_analyses=0,
            )

        # Calculate averages
        avg_fba_roi = sum(a.fba_roi for a in all_analyses) / len(all_analyses)
        avg_fbm_roi = sum(a.fbm_roi for a in all_analyses) / len(all_analyses)

        # Best deal
        best_deal = max(all_analyses, key=lambda x: max(x.fba_roi, x.fbm_roi))

        # Total potential profit
        total_potential_profit = sum(a.fba_profit for a in all_analyses)

        # FBA vs FBM split
        fba_wins = sum(1 for a in all_analyses if a.fba_roi > a.fbm_roi)
        fbm_wins = sum(1 for a in all_analyses if a.fbm_roi >= a.fba_roi)
        fba_pct = (fba_wins / len(all_analyses) * 100) if all_analyses else 0
        fbm_pct = (fbm_wins / len(all_analyses) * 100) if all_analyses else 0

        # Last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        last_30_days = db.query(ProfitAnalysis).filter(
            ProfitAnalysis.org_id == current_user.org_id,
            ProfitAnalysis.created_at >= thirty_days_ago,
        ).count()

        return DashboardMetrics(
            total_products_analyzed=total_analyses,
            avg_roi_fba=round(avg_fba_roi, 2),
            avg_roi_fbm=round(avg_fbm_roi, 2),
            best_deal_asin=best_deal.asin,
            best_deal_roi=round(best_deal.fba_roi, 2),
            total_potential_profit=round(total_potential_profit, 2),
            fba_percentage=round(fba_pct, 2),
            fbm_percentage=round(fbm_pct, 2),
            last_30_days_analyses=last_30_days,
        )

    except Exception as e:
        logger.error(
            f"Error retrieving dashboard metrics: {str(e)}",
            extra={"org_id": current_user.org_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving dashboard metrics",
        )


# ============================================================================
# Health Check
# ============================================================================


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "profit-calculator"}
