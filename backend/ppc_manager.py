"""
Amazon PPC & Ads Manager Module
Handles Sponsored Products (SP), Sponsored Brands (SB), and Sponsored Display (SD) campaigns
for the Ecom Era FBA Wholesale SaaS platform.

This module provides endpoints for:
- Campaign CRUD operations with org-level isolation
- Keyword and ad group management
- Performance metrics aggregation and analysis
- AI-powered bid optimization suggestions
- Keyword harvesting recommendations based on search term reports
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from auth import get_current_user, require_role, tenant_session
from database import get_db
from models import User, Organization, PPCCampaign, PPCKeyword, PPCAdGroup

# Configure logging
logger = logging.getLogger(__name__)

# Router configuration
router = APIRouter(prefix="/ppc", tags=["ppc"])


# ============================================================================
# Pydantic Models (Request/Response Schemas)
# ============================================================================

class KeywordSchema(BaseModel):
    """Schema for PPC keyword data."""

    id: int
    campaign_id: int
    keyword_text: str
    match_type: str  # exact, phrase, broad
    bid: float
    impressions: int
    clicks: int
    spend: float
    sales: float
    acos: float
    status: str  # active, paused, archived
    created_at: datetime

    class Config:
        from_attributes = True


class AdGroupSchema(BaseModel):
    """Schema for PPC ad group data."""

    id: int
    campaign_id: int
    ad_group_name: str
    default_bid: float
    status: str  # active, paused, archived
    created_at: datetime

    class Config:
        from_attributes = True


class CampaignDetailSchema(BaseModel):
    """Detailed campaign response including keywords and ad groups."""

    id: int
    org_id: int
    account_id: Optional[int] = None
    campaign_name: str
    campaign_type: str  # SP, SB, SD
    status: str  # active, paused, archived
    daily_budget: float
    total_spend: float
    total_sales: float
    acos: float
    impressions: int
    clicks: int
    orders: int
    start_date: datetime
    end_date: Optional[datetime] = None
    created_at: datetime
    keywords: List[KeywordSchema] = []
    ad_groups: List[AdGroupSchema] = []

    class Config:
        from_attributes = True


class CampaignListSchema(BaseModel):
    """Campaign response for list endpoints."""

    id: int
    org_id: int
    campaign_name: str
    campaign_type: str
    status: str
    daily_budget: float
    total_spend: float
    total_sales: float
    acos: float
    impressions: int
    clicks: int
    orders: int
    created_at: datetime

    class Config:
        from_attributes = True


class CampaignCreateSchema(BaseModel):
    """Schema for creating a new campaign."""

    campaign_name: str = Field(..., min_length=1, max_length=255)
    campaign_type: str = Field(..., pattern="^(SP|SB|SD)$")
    account_id: Optional[int] = None
    daily_budget: float = Field(..., gt=0)
    start_date: datetime
    end_date: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "campaign_name": "Summer Sale Campaign",
                "campaign_type": "SP",
                "account_id": 1,
                "daily_budget": 50.0,
                "start_date": "2026-03-28T00:00:00",
                "end_date": "2026-06-30T00:00:00",
            }
        }


class CampaignUpdateSchema(BaseModel):
    """Schema for updating a campaign."""

    campaign_name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[str] = Field(None, pattern="^(active|paused|archived)$")
    daily_budget: Optional[float] = Field(None, gt=0)
    end_date: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "status": "paused",
                "daily_budget": 75.0,
            }
        }


class KeywordCreateSchema(BaseModel):
    """Schema for adding keywords to a campaign."""

    keyword_text: str = Field(..., min_length=1, max_length=255)
    match_type: str = Field(..., pattern="^(exact|phrase|broad)$")
    bid: float = Field(..., gt=0)

    class Config:
        json_schema_extra = {
            "example": {
                "keyword_text": "wireless headphones",
                "match_type": "phrase",
                "bid": 0.85,
            }
        }


class MetricsSchema(BaseModel):
    """Schema for PPC performance metrics."""

    total_spend: float
    total_sales: float
    total_impressions: int
    total_clicks: int
    total_orders: int
    acos: float  # Advertising Cost of Sales
    tacos: float  # Total Advertising Cost of Sales
    roas: float  # Return on Ad Spend
    ctr: float  # Click-through rate
    cpc: float  # Cost per click
    ctr_percentage: float

    class Config:
        json_schema_extra = {
            "example": {
                "total_spend": 5000.0,
                "total_sales": 25000.0,
                "total_impressions": 150000,
                "total_clicks": 3000,
                "total_orders": 150,
                "acos": 0.20,
                "tacos": 0.25,
                "roas": 5.0,
                "ctr": 0.02,
                "cpc": 1.67,
                "ctr_percentage": 2.0,
            }
        }


class TimeSeriesMetricSchema(BaseModel):
    """Schema for time-series campaign metrics."""

    date: str
    spend: float
    sales: float
    impressions: int
    clicks: int
    orders: int
    acos: float

    class Config:
        json_schema_extra = {
            "example": {
                "date": "2026-03-28",
                "spend": 100.0,
                "sales": 500.0,
                "impressions": 5000,
                "clicks": 150,
                "orders": 5,
                "acos": 0.20,
            }
        }


class BidOptimizationSchema(BaseModel):
    """Schema for AI-powered bid optimization suggestions."""

    keyword_id: int
    keyword_text: str
    current_bid: float
    suggested_bid: float
    bid_change_percentage: float
    reason: str
    expected_impact: str
    confidence_level: str  # high, medium, low

    class Config:
        json_schema_extra = {
            "example": {
                "keyword_id": 1,
                "keyword_text": "wireless headphones",
                "current_bid": 0.85,
                "suggested_bid": 0.95,
                "bid_change_percentage": 11.76,
                "reason": "ACoS above target (28% vs 25% target)",
                "expected_impact": "Increase in impressions and clicks",
                "confidence_level": "high",
            }
        }


class KeywordHarvestSchema(BaseModel):
    """Schema for keyword harvesting suggestions."""

    keyword_text: str
    match_type: str
    estimated_monthly_volume: int
    estimated_cpc: float
    relevance_score: float  # 0-1
    reason: str
    recommendation: str  # add, monitor, skip

    class Config:
        json_schema_extra = {
            "example": {
                "keyword_text": "best wireless headphones",
                "match_type": "phrase",
                "estimated_monthly_volume": 1500,
                "estimated_cpc": 0.92,
                "relevance_score": 0.87,
                "reason": "High volume, strong conversion history",
                "recommendation": "add",
            }
        }


# ============================================================================
# Helper Functions
# ============================================================================

def calculate_metrics(
    total_spend: float,
    total_sales: float,
    total_impressions: int,
    total_clicks: int,
    total_orders: int,
) -> tuple:
    """
    Calculate key PPC metrics.

    Args:
        total_spend: Total advertising spend
        total_sales: Total sales attributed to ads
        total_impressions: Total ad impressions
        total_clicks: Total ad clicks
        total_orders: Total orders from ads

    Returns:
        Tuple of (acos, tacos, roas, ctr, cpc, ctr_percentage)
    """
    acos = (total_spend / total_sales * 100) if total_sales > 0 else 0.0
    tacos = acos  # Simplified: in production, would include organic sales
    roas = (total_sales / total_spend) if total_spend > 0 else 0.0
    ctr = (total_clicks / total_impressions) if total_impressions > 0 else 0.0
    cpc = (total_spend / total_clicks) if total_clicks > 0 else 0.0
    ctr_percentage = ctr * 100

    return acos, tacos, roas, ctr, cpc, ctr_percentage


def get_mock_ai_optimizations(
    campaign: PPCCampaign, keywords: List[PPCKeyword], acos_target: float = 0.25
) -> List[BidOptimizationSchema]:
    """
    Generate mock AI-powered bid optimization suggestions.

    In production, this would integrate with machine learning models or
    vendor APIs (e.g., Amazon Advertising API for automated bid optimization).

    Args:
        campaign: The PPC campaign object
        keywords: List of keywords in the campaign
        acos_target: Target ACoS (default 25%)

    Returns:
        List of BidOptimizationSchema objects with suggested bid adjustments
    """
    suggestions = []

    for keyword in keywords:
        if keyword.status == "archived" or keyword.impressions == 0:
            continue

        current_bid = keyword.bid
        keyword_acos = keyword.acos

        # Generate suggestion based on ACoS comparison
        if keyword_acos > acos_target:
            # ACoS too high, reduce bid
            reduction_factor = (keyword_acos - acos_target) / keyword_acos
            suggested_bid = max(current_bid * (1 - reduction_factor * 0.5), 0.10)
            reason = f"ACoS above target ({keyword_acos:.1%} vs {acos_target:.1%} target)"
            expected_impact = "Reduction in spend with acceptable click reduction"
            confidence = "high" if keyword.clicks > 50 else "medium"
        elif keyword_acos < acos_target * 0.7:
            # ACoS well below target, increase bid for volume
            increase_factor = (acos_target - keyword_acos) / acos_target
            suggested_bid = current_bid * (1 + increase_factor * 0.3)
            reason = f"ACoS well below target ({keyword_acos:.1%}), opportunity for volume growth"
            expected_impact = "Increase in impressions and clicks"
            confidence = "high"
        else:
            # ACoS is close to target
            suggested_bid = current_bid
            reason = "ACoS within acceptable range"
            expected_impact = "Maintain current performance"
            confidence = "medium"

        bid_change_pct = ((suggested_bid - current_bid) / current_bid * 100) if current_bid > 0 else 0

        suggestions.append(
            BidOptimizationSchema(
                keyword_id=keyword.id,
                keyword_text=keyword.keyword_text,
                current_bid=round(current_bid, 2),
                suggested_bid=round(suggested_bid, 2),
                bid_change_percentage=round(bid_change_pct, 2),
                reason=reason,
                expected_impact=expected_impact,
                confidence_level=confidence,
            )
        )

    return suggestions


def get_mock_keyword_harvesting() -> List[KeywordHarvestSchema]:
    """
    Generate mock keyword harvesting suggestions based on search term reports.

    In production, this would analyze actual search term report data from
    Amazon Advertising API to identify high-performing keywords not yet targeted.

    Returns:
        List of KeywordHarvestSchema objects with suggested keywords to add
    """
    suggestions = [
        KeywordHarvestSchema(
            keyword_text="premium wireless earbuds",
            match_type="phrase",
            estimated_monthly_volume=2500,
            estimated_cpc=1.15,
            relevance_score=0.92,
            reason="Strong historical conversion, high search volume",
            recommendation="add",
        ),
        KeywordHarvestSchema(
            keyword_text="noise cancelling headphones",
            match_type="phrase",
            estimated_monthly_volume=1800,
            estimated_cpc=0.95,
            relevance_score=0.85,
            reason="Related to top-performing keywords, good ACoS potential",
            recommendation="add",
        ),
        KeywordHarvestSchema(
            keyword_text="budget headphones",
            match_type="broad",
            estimated_monthly_volume=800,
            estimated_cpc=0.45,
            relevance_score=0.72,
            reason="High volume, lower cost per click",
            recommendation="monitor",
        ),
        KeywordHarvestSchema(
            keyword_text="knockoff beats",
            match_type="phrase",
            estimated_monthly_volume=150,
            estimated_cpc=0.32,
            relevance_score=0.15,
            reason="Brand conflict concerns, low conversion likelihood",
            recommendation="skip",
        ),
    ]

    return suggestions


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/campaigns", response_model=List[CampaignListSchema])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
    status: Optional[str] = Query(None, pattern="^(active|paused|archived)$"),
    campaign_type: Optional[str] = Query(None, pattern="^(SP|SB|SD)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> List[CampaignListSchema]:
    """
    List all PPC campaigns for the organization with optional filters.

    Query Parameters:
    - status: Filter by campaign status (active, paused, archived)
    - campaign_type: Filter by campaign type (SP, SB, SD)
    - skip: Number of records to skip (pagination)
    - limit: Maximum records to return (default 50, max 500)

    Returns:
        List of campaigns for the organization
    """
    logger.info(f"Fetching campaigns for org {current_user.org_id}")

    query = db.query(PPCCampaign).filter(PPCCampaign.org_id == current_user.org_id)

    if status:
        query = query.filter(PPCCampaign.status == status)

    if campaign_type:
        query = query.filter(PPCCampaign.campaign_type == campaign_type)

    campaigns = query.offset(skip).limit(limit).all()

    logger.info(f"Retrieved {len(campaigns)} campaigns for org {current_user.org_id}")
    return campaigns


@router.post("/campaigns", response_model=CampaignDetailSchema, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
) -> CampaignDetailSchema:
    """
    Create a new PPC campaign.

    Request Body:
    - campaign_name: Name of the campaign
    - campaign_type: Type of campaign (SP/SB/SD)
    - account_id: Optional Amazon account ID
    - daily_budget: Daily budget in USD
    - start_date: Campaign start date
    - end_date: Optional campaign end date

    Returns:
        The created campaign with details
    """
    logger.info(f"Creating campaign '{payload.campaign_name}' for org {current_user.org_id}")

    # Validate end_date is after start_date
    if payload.end_date and payload.end_date <= payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be after start_date",
        )

    new_campaign = PPCCampaign(
        org_id=current_user.org_id,
        account_id=payload.account_id,
        campaign_name=payload.campaign_name,
        campaign_type=payload.campaign_type,
        status="active",
        daily_budget=payload.daily_budget,
        total_spend=0.0,
        total_sales=0.0,
        acos=0.0,
        impressions=0,
        clicks=0,
        orders=0,
        start_date=payload.start_date,
        end_date=payload.end_date,
        created_at=datetime.utcnow(),
    )

    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    logger.info(f"Campaign {new_campaign.id} created successfully")
    return new_campaign


@router.get("/campaigns/{campaign_id}", response_model=CampaignDetailSchema)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
) -> CampaignDetailSchema:
    """
    Get detailed information about a specific campaign including keywords and ad groups.

    Path Parameters:
    - campaign_id: The ID of the campaign

    Returns:
        Campaign details with associated keywords and ad groups
    """
    logger.info(f"Fetching campaign {campaign_id} for org {current_user.org_id}")

    campaign = (
        db.query(PPCCampaign)
        .filter(
            PPCCampaign.id == campaign_id,
            PPCCampaign.org_id == current_user.org_id,
        )
        .first()
    )

    if not campaign:
        logger.warning(f"Campaign {campaign_id} not found for org {current_user.org_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    return campaign


@router.put("/campaigns/{campaign_id}", response_model=CampaignDetailSchema)
def update_campaign(
    campaign_id: int,
    payload: CampaignUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
) -> CampaignDetailSchema:
    """
    Update campaign settings (budget, status, name, end date).

    Path Parameters:
    - campaign_id: The ID of the campaign

    Request Body:
    - campaign_name: Optional new campaign name
    - status: Optional new status (active/paused/archived)
    - daily_budget: Optional new daily budget
    - end_date: Optional new end date

    Returns:
        Updated campaign details
    """
    logger.info(f"Updating campaign {campaign_id} for org {current_user.org_id}")

    campaign = (
        db.query(PPCCampaign)
        .filter(
            PPCCampaign.id == campaign_id,
            PPCCampaign.org_id == current_user.org_id,
        )
        .first()
    )

    if not campaign:
        logger.warning(f"Campaign {campaign_id} not found for org {current_user.org_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Update fields if provided
    if payload.campaign_name is not None:
        campaign.campaign_name = payload.campaign_name

    if payload.status is not None:
        campaign.status = payload.status

    if payload.daily_budget is not None:
        campaign.daily_budget = payload.daily_budget

    if payload.end_date is not None:
        if payload.end_date <= campaign.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be after start_date",
            )
        campaign.end_date = payload.end_date

    db.commit()
    db.refresh(campaign)

    logger.info(f"Campaign {campaign_id} updated successfully")
    return campaign


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
) -> None:
    """
    Soft delete a campaign by archiving it.

    Path Parameters:
    - campaign_id: The ID of the campaign

    Note:
        This is a soft delete that sets the campaign status to 'archived'.
        Campaign data is preserved for historical analysis.
    """
    logger.info(f"Deleting campaign {campaign_id} for org {current_user.org_id}")

    campaign = (
        db.query(PPCCampaign)
        .filter(
            PPCCampaign.id == campaign_id,
            PPCCampaign.org_id == current_user.org_id,
        )
        .first()
    )

    if not campaign:
        logger.warning(f"Campaign {campaign_id} not found for org {current_user.org_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    campaign.status = "archived"
    db.commit()

    logger.info(f"Campaign {campaign_id} archived successfully")


@router.post(
    "/campaigns/{campaign_id}/keywords",
    response_model=KeywordSchema,
    status_code=status.HTTP_201_CREATED,
)
def add_keyword(
    campaign_id: int,
    payload: KeywordCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
) -> KeywordSchema:
    """
    Add a keyword to a campaign.

    Path Parameters:
    - campaign_id: The ID of the campaign

    Request Body:
    - keyword_text: The keyword phrase
    - match_type: Match type (exact/phrase/broad)
    - bid: Bid amount in USD

    Returns:
        The created keyword
    """
    logger.info(f"Adding keyword to campaign {campaign_id} for org {current_user.org_id}")

    # Verify campaign exists and belongs to org
    campaign = (
        db.query(PPCCampaign)
        .filter(
            PPCCampaign.id == campaign_id,
            PPCCampaign.org_id == current_user.org_id,
        )
        .first()
    )

    if not campaign:
        logger.warning(f"Campaign {campaign_id} not found for org {current_user.org_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    new_keyword = PPCKeyword(
        campaign_id=campaign_id,
        keyword_text=payload.keyword_text,
        match_type=payload.match_type,
        bid=payload.bid,
        impressions=0,
        clicks=0,
        spend=0.0,
        sales=0.0,
        acos=0.0,
        status="active",
        created_at=datetime.utcnow(),
    )

    db.add(new_keyword)
    db.commit()
    db.refresh(new_keyword)

    logger.info(f"Keyword {new_keyword.id} created for campaign {campaign_id}")
    return new_keyword


@router.get("/metrics", response_model=MetricsSchema)
def get_overall_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
    days: int = Query(30, ge=1, le=365),
) -> MetricsSchema:
    """
    Get overall PPC performance metrics for the organization.

    Query Parameters:
    - days: Number of days to include in metrics (default 30, max 365)

    Returns:
        Aggregated metrics including spend, sales, ACoS, TACoS, ROAS, CTR, CPC
    """
    logger.info(f"Calculating overall metrics for org {current_user.org_id}")

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Aggregate metrics across all campaigns
    result = (
        db.query(
            func.sum(PPCCampaign.total_spend).label("total_spend"),
            func.sum(PPCCampaign.total_sales).label("total_sales"),
            func.sum(PPCCampaign.impressions).label("total_impressions"),
            func.sum(PPCCampaign.clicks).label("total_clicks"),
            func.sum(PPCCampaign.orders).label("total_orders"),
        )
        .filter(
            PPCCampaign.org_id == current_user.org_id,
            PPCCampaign.created_at >= cutoff_date,
            PPCCampaign.status != "archived",
        )
        .first()
    )

    total_spend = result.total_spend or 0.0
    total_sales = result.total_sales or 0.0
    total_impressions = result.total_impressions or 0
    total_clicks = result.total_clicks or 0
    total_orders = result.total_orders or 0

    acos, tacos, roas, ctr, cpc, ctr_percentage = calculate_metrics(
        total_spend, total_sales, total_impressions, total_clicks, total_orders
    )

    logger.info(f"Metrics calculated: ACoS={acos:.2%}, ROAS={roas:.2f}")

    return MetricsSchema(
        total_spend=round(total_spend, 2),
        total_sales=round(total_sales, 2),
        total_impressions=int(total_impressions),
        total_clicks=int(total_clicks),
        total_orders=int(total_orders),
        acos=round(acos, 4),
        tacos=round(tacos, 4),
        roas=round(roas, 2),
        ctr=round(ctr, 4),
        cpc=round(cpc, 2),
        ctr_percentage=round(ctr_percentage, 2),
    )


@router.get("/metrics/{campaign_id}", response_model=List[TimeSeriesMetricSchema])
def get_campaign_metrics(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
    days: int = Query(30, ge=1, le=365),
) -> List[TimeSeriesMetricSchema]:
    """
    Get time-series performance metrics for a specific campaign.

    Path Parameters:
    - campaign_id: The ID of the campaign

    Query Parameters:
    - days: Number of days of history to return (default 30, max 365)

    Returns:
        List of daily metrics for the campaign period
    """
    logger.info(
        f"Fetching time-series metrics for campaign {campaign_id}, org {current_user.org_id}"
    )

    # Verify campaign exists and belongs to org
    campaign = (
        db.query(PPCCampaign)
        .filter(
            PPCCampaign.id == campaign_id,
            PPCCampaign.org_id == current_user.org_id,
        )
        .first()
    )

    if not campaign:
        logger.warning(f"Campaign {campaign_id} not found for org {current_user.org_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # In a real implementation, this would query a metrics table with daily snapshots
    # For now, return mock time-series data
    mock_metrics = []
    base_spend = campaign.total_spend / max(days, 1)
    base_sales = campaign.total_sales / max(days, 1)

    for i in range(days):
        day = datetime.utcnow().date() - timedelta(days=i)
        daily_spend = base_spend * (0.8 + (i % 5) * 0.05)
        daily_sales = base_sales * (0.75 + (i % 7) * 0.06)
        daily_impressions = int(campaign.impressions / max(days, 1) * (0.9 + (i % 3) * 0.1))
        daily_clicks = int(campaign.clicks / max(days, 1) * (0.85 + (i % 4) * 0.08))
        daily_orders = int(campaign.orders / max(days, 1) * (0.7 + (i % 6) * 0.08))

        daily_acos = (
            (daily_spend / daily_sales) if daily_sales > 0 else 0.0
        )

        mock_metrics.append(
            TimeSeriesMetricSchema(
                date=day.isoformat(),
                spend=round(daily_spend, 2),
                sales=round(daily_sales, 2),
                impressions=daily_impressions,
                clicks=daily_clicks,
                orders=daily_orders,
                acos=round(daily_acos, 4),
            )
        )

    logger.info(f"Retrieved {len(mock_metrics)} days of metrics for campaign {campaign_id}")
    return mock_metrics


@router.post(
    "/campaigns/{campaign_id}/optimize",
    response_model=List[BidOptimizationSchema],
)
def optimize_campaign_bids(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
    acos_target: float = Query(0.25, ge=0.01, le=1.0),
) -> List[BidOptimizationSchema]:
    """
    Generate AI-powered bid optimization suggestions for a campaign.

    Path Parameters:
    - campaign_id: The ID of the campaign

    Query Parameters:
    - acos_target: Target ACoS as decimal (default 0.25 = 25%)

    Returns:
        List of bid optimization recommendations for keywords in the campaign

    Note:
        In production, this would integrate with:
        - Amazon Advertising API for automated bidding
        - ML models trained on historical performance data
        - Real-time market data and competitive analysis
    """
    logger.info(
        f"Generating bid optimizations for campaign {campaign_id}, org {current_user.org_id}"
    )

    # Verify campaign exists and belongs to org
    campaign = (
        db.query(PPCCampaign)
        .filter(
            PPCCampaign.id == campaign_id,
            PPCCampaign.org_id == current_user.org_id,
        )
        .first()
    )

    if not campaign:
        logger.warning(f"Campaign {campaign_id} not found for org {current_user.org_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Fetch all active keywords for the campaign
    keywords = (
        db.query(PPCKeyword)
        .filter(
            PPCKeyword.campaign_id == campaign_id,
            PPCKeyword.status != "archived",
        )
        .all()
    )

    if not keywords:
        logger.info(f"No active keywords found for campaign {campaign_id}")
        return []

    # Generate mock optimizations
    suggestions = get_mock_ai_optimizations(campaign, keywords, acos_target)

    logger.info(f"Generated {len(suggestions)} bid optimization suggestions")
    return suggestions


@router.get("/keywords/harvest", response_model=List[KeywordHarvestSchema])
def harvest_keywords(
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
) -> List[KeywordHarvestSchema]:
    """
    Get keyword harvesting suggestions based on search term reports and historical performance.

    This endpoint analyzes:
    - Search terms that converted but aren't currently targeted
    - Related keywords with similar conversion patterns
    - Competitor keywords with good ACoS performance
    - Seasonal and trend-based keyword opportunities

    Returns:
        List of recommended keywords to add to campaigns

    Note:
        In production, this would:
        - Analyze actual Amazon search term reports
        - Query competitor keyword data
        - Use NLP for semantic keyword clustering
        - Consider seasonality and trends
    """
    logger.info(f"Generating keyword harvesting suggestions for org {current_user.org_id}")

    # In production, this would analyze actual search term report data
    # For now, return mock suggestions
    suggestions = get_mock_keyword_harvesting()

    logger.info(f"Generated {len(suggestions)} keyword harvesting suggestions")
    return suggestions
