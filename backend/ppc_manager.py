"""\nAmazon PPC & Ads Manager Module\nHandles Sponsored Products (SP), Sponsored Brands (SB), and Sponsored Display (SD) campaigns\nfor the Ecom Era FBA Wholesale SaaS platform.\n\nThis module provides endpoints for:\n- Campaign CRUD operations with org-level isolation\n- Keyword and ad group management\n- Performance metrics aggregation and analysis\n- AI-powered bid optimization suggestions\n- Keyword harvesting recommendations based on search term reports\n"""\n\nimport logging\nfrom datetime import datetime, timedelta\nfrom typing import List, Optional\n\nfrom fastapi import APIRouter, Depends, HTTPException, Query, status\nfrom pydantic import BaseModel, Field\nfrom sqlalchemy import func, text\nfrom sqlalchemy.orm import Session\n\nfrom auth import get_current_user, require_role\nfrom database import get_db\nfrom models import User, Organization, PPCCampaign, PPCKeyword, PPCAdGroup\n\n# Configure logging\nlogger = logging.getLogger(__name__)\n\n# Router configuration\nrouter = APIRouter(prefix=\"/ppc\", tags=[\"ppc\"])\n\n\n# ============================================================================\n# Pydantic Models (Request/Response Schemas)\n# ============================================================================\n\nclass KeywordSchema(BaseModel):\n    \"\"\"Schema for PPC keyword data.\"\"\"\n\n    id: int\n    campaign_id: int\n    keyword_text: str\n    match_type: str  # exact, phrase, broad\n    bid: float\n    impressions: int\n    clicks: int\n    spend: float\n    sales: float\n    acos: float\n    status: str  # active, paused, archived\n    created_at: datetime\n\n    class Config:\n        from_attributes = True\n\n\nclass AdGroupSchema(BaseModel):\n    \"\"\"Schema for PPC ad group data.\"\"\"\n\n    id: int\n    campaign_id: int\n    ad_group_name: str\n    default_bid: float\n    status: str  # active, paused, archived\n    created_at: datetime\n\n    class Config:\n        from_attributes = True\n\n\nclass CampaignDetailSchema(BaseModel):\n    \"\"\"Detailed campaign response including keywords and ad groups.\"\"\"\n\n    id: int\n    org_id: int\n    account_id: Optional[int] = None\n    campaign_name: str\n    campaign_type: str  # SP, SB, SD\n    status: str  # active, paused, archived\n    daily_budget: float\n    total_spend: float\n    total_sales: float\n    acos: float\n    impressions: int\n    clicks: int\n    orders: int\n    start_date: datetime\n    end_date: Optional[datetime] = None\n    created_at: datetime\n    keywords: List[KeywordSchema] = []\n    ad_groups: List[AdGroupSchema] = []\n\n    class Config:\n        from_attributes = True\n\n\nclass CampaignListSchema(BaseModel):\n    \"\"\"Campaign response for list endpoints.\"\"\"\n\n    id: int\n    org_id: int\n    campaign_name: str\n    campaign_type: str\n    status: str\n    daily_budget: float\n    total_spend: float\n    total_sales: float\n    acos: float\n    impressions: int\n    clicks: int\n    orders: int\n    created_at: datetime\n\n    class Config:\n        from_attributes = True\n\n\nclass CampaignCreateSchema(BaseModel):\n    \"\"\"Schema for creating a new campaign.\"\"\"\n\n    campaign_name: str = Field(..., min_length=1, max_length=255)\n    campaign_type: str = Field(..., regex=\"^(SP|SB|SD)$\")\n    account_id: Optional[int] = None\n    daily_budget: float = Field(..., gt=0)\n    start_date: datetime\n    end_date: Optional[datetime] = None\n\n    class Config:\n        json_schema_extra = {\n            \"example\": {\n                \"campaign_name\": \"Summer Sale Campaign\",\n                \"campaign_type\": \"SP\",\n                \"account_id\": 1,\n                \"daily_budget\": 50.0,\n                \"start_date\": \"2026-03-28T00:00:00\",\n                \"end_date\": \"2026-06-30T00:00:00\",\n            }\n        }\n\n\nclass CampaignUpdateSchema(BaseModel):\n    \"\"\"Schema for updating a campaign.\"\"\"\n\n    campaign_name: Optional[str] = Field(None, min_length=1, max_length=255)\n    status: Optional[str] = Field(None, regex=\"^(active|paused|archived)$\")\n    daily_budget: Optional[float] = Field(None, gt=0)\n    end_date: Optional[datetime] = None\n\n    class Config:\n        json_schema_extra = {\n            \"example\": {\n                \"status\": \"paused\",\n                \"daily_budget\": 75.0,\n            }\n        }\n\n\nclass KeywordCreateSchema(BaseModel):\n    \"\"\"Schema for adding keywords to a campaign.\"\"\"\n\n    keyword_text: str = Field(..., min_length=1, max_length=255)\n    match_type: str = Field(..., regex=\"^(exact|phrase|broad)$\")\n    bid: float = Field(..., gt=0)\n\n    class Config:\n        json_schema_extra = {\n            \"example\": {\n                \"keyword_text\": \"wireless headphones\",\n                \"match_type\": \"phrase\",\n                \"bid\": 0.85,\n            }\n        }\n\n\nclass MetricsSchema(BaseModel):\n    \"\"\"Schema for PPC performance metrics.\"\"\"\n\n    total_spend: float\n    total_sales: float\n    total_impressions: int\n    total_clicks: int\n    total_orders: int\n    acos: float  # Advertising Cost of Sales\n    tacos: float  # Total Advertising Cost of Sales\n    roas: float  # Return on Ad Spend\n    ctr: float  # Click-through rate\n    cpc: float  # Cost per click\n    ctr_percentage: float\n\n    class Config:\n        json_schema_extra = {\n            \"example\": {\n                \"total_spend\": 5000.0,\n                \"total_sales\": 25000.0,\n                \"total_impressions\": 150000,\n                \"total_clicks\": 3000,\n                \"total_orders\": 150,\n                \"acos\": 0.20,\n                \"tacos\": 0.25,\n                \"roas\": 5.0,\n                \"ctr\": 0.02,\n                \"cpc\": 1.67,\n                \"ctr_percentage\": 2.0,\n            }\n        }\n\n\nclass TimeSeriesMetricSchema(BaseModel):\n    \"\"\"Schema for time-series campaign metrics.\"\"\"\n\n    date: str\n    spend: float\n    sales: float\n    impressions: int\n    clicks: int\n    orders: int\n    acos: float\n\n    class Config:\n        json_schema_extra = {\n            \"example\": {\n                \"date\": \"2026-03-28\",\n                \"spend\": 100.0,\n                \"sales\": 500.0,\n                \"impressions\": 5000,\n                \"clicks\": 150,\n                \"orders\": 5,\n                \"acos\": 0.20,\n            }\n        }\n\n\nclass BidOptimizationSchema(BaseModel):\n    \"\"\"Schema for AI-powered bid optimization suggestions.\"\"\"\n\n    keyword_id: int\n    keyword_text: str\n    current_bid: float\n    suggested_bid: float\n    bid_change_percentage: float\n    reason: str\n    expected_impact: str\n    confidence_level: str  # high, medium, low\n\n    class Config:\n        json_schema_extra = {\n            \"example\": {\n                \"keyword_id\": 1,\n                \"keyword_text\": \"wireless headphones\",\n                \"current_bid\": 0.85,\n                \"suggested_bid\": 0.95,\n                \"bid_change_percentage\": 11.76,\n                \"reason\": \"ACoS above target (28% vs 25% target)\",\n                \"expected_impact\": \"Increase in impressions and clicks\",\n                \"confidence_level\": \"high\",\n            }\n        }\n\n\nclass KeywordHarvestSchema(BaseModel):\n    \"\"\"Schema for keyword harvesting suggestions.\"\"\"\n\n    keyword_text: str\n    match_type: str\n    estimated_monthly_volume: int\n    estimated_cpc: float\n    relevance_score: float  # 0-1\n    reason: str\n    recommendation: str  # add, monitor, skip\n\n    class Config:\n        json_schema_extra = {\n            \"example\": {\n                \"keyword_text\": \"best wireless headphones\",\n                \"match_type\": \"phrase\",\n                \"estimated_monthly_volume\": 1500,\n                \"estimated_cpc\": 0.92,\n                \"relevance_score\": 0.87,\n                \"reason\": \"High volume, strong conversion history\",\n                \"recommendation\": \"add\",\n            }\n        }\n\n\n# ============================================================================\n# Helper Functions\n# ============================================================================\n\ndef calculate_metrics(\n    total_spend: float,\n    total_sales: float,\n    total_impressions: int,\n    total_clicks: int,\n    total_orders: int,\n) -> tuple:\n    \"\"\"\n    Calculate key PPC metrics.\n\n    Args:\n        total_spend: Total advertising spend\n        total_sales: Total sales attributed to ads\n        total_impressions: Total ad impressions\n        total_clicks: Total ad clicks\n        total_orders: Total orders from ads\n\n    Returns:\n        Tuple of (acos, tacos, roas, ctr, cpc, ctr_percentage)\n    \"\"\"\n    acos = (total_spend / total_sales * 100) if total_sales > 0 else 0.0\n    tacos = acos  # Simplified: in production, would include organic sales\n    roas = (total_sales / total_spend) if total_spend > 0 else 0.0\n    ctr = (total_clicks / total_impressions) if total_impressions > 0 else 0.0\n    cpc = (total_spend / total_clicks) if total_clicks > 0 else 0.0\n    ctr_percentage = ctr * 100\n\n    return acos, tacos, roas, ctr, cpc, ctr_percentage\n\n\ndef get_mock_ai_optimizations(\n    campaign: PPCCampaign, keywords: List[PPCKeyword], acos_target: float = 0.25\n) -> List[BidOptimizationSchema]:\n    \"\"\"\n    Generate mock AI-powered bid optimization suggestions.\n\n    In production, this would integrate with machine learning models or\n    vendor APIs (e.g., Amazon Advertising API for automated bid optimization).\n\n    Args:\n        campaign: The PPC campaign object\n        keywords: List of keywords in the campaign\n        acos_target: Target ACoS (default 25%)\n\n    Returns:\n        List of BidOptimizationSchema objects with suggested bid adjustments\n    \"\"\"\n    suggestions = []\n\n    for keyword in keywords:\n        if keyword.status == \"archived\" or keyword.impressions == 0:\n            continue\n\n        current_bid = keyword.bid\n        keyword_acos = keyword.acos\n\n        # Generate suggestion based on ACoS comparison\n        if keyword_acos > acos_target:\n            # ACoS too high, reduce bid\n            reduction_factor = (keyword_acos - acos_target) / keyword_acos\n            suggested_bid = max(current_bid * (1 - reduction_factor * 0.5), 0.10)\n            reason = f\"ACoS above target ({keyword_acos:.1%} vs {acos_target:.1%} target)\"\n            expected_impact = \"Reduction in spend with acceptable click reduction\"\n            confidence = \"high\" if keyword.clicks > 50 else \"medium\"\n        elif keyword_acos < acos_target * 0.7:\n            # ACoS well below target, increase bid for volume\n            increase_factor = (acos_target - keyword_acos) / acos_target\n            suggested_bid = current_bid * (1 + increase_factor * 0.3)\n            reason = f\"ACoS well below target ({keyword_acos:.1%}), opportunity for volume growth\"\n            expected_impact = \"Increase in impressions and clicks\"\n            confidence = \"high\"\n        else:\n            # ACoS is close to target\n            suggested_bid = current_bid\n            reason = \"ACoS within acceptable range\"\n            expected_impact = \"Maintain current performance\"\n            confidence = \"medium\"\n\n        bid_change_pct = ((suggested_bid - current_bid) / current_bid * 100) if current_bid > 0 else 0\n        suggestions.append(\n            BidOptimizationSchema(\n                keyword_id=keyword.id,\n                keyword_text=keyword.keyword_text,\n                current_bid=round(current_bid, 2),\n                suggested_bid=round(suggested_bid, 2),\n                bid_change_percentage=round(bid_change_pct, 2),\n                reason=reason,\n                expected_impact=expected_impact,\n                confidence_level=confidence,\n            )\n        )\n\n    return suggestions\n\n\ndef get_mock_keyword_harvesting() -> List[KeywordHarvestSchema]:\n    \"\"\"\n    Generate mock keyword harvesting suggestions based on search term reports.\n\n    In production, this would analyze actual search term report data from\n    Amazon Advertising API to identify high-performing keywords not yet targeted.\n\n    Returns:\n        List of KeywordHarvestSchema objects with suggested keywords to add\n    \"\"\"\n    suggestions = [\n        KeywordHarvestSchema(\n            keyword_text=\"premium wireless earbuds\",\n            match_type=\"phrase\",\n            estimated_monthly_volume=2500,\n            estimated_cpc=1.15,\n            relevance_score=0.92,\n            reason=\"Strong historical conversion, high search volume\",\n            recommendation=\"add\",\n        ),\n        KeywordHarvestSchema(\n            keyword_text=\"noise cancelling headphones\",\n            match_type=\"phrase\",\n            estimated_monthly_volume=1800,\n            estimated_cpc=0.95,\n            relevance_score=0.85,\n            reason=\"Related to top-performing keywords, good ACoS potential\",\n            recommendation=\"add\",\n        ),\n        KeywordHarvestSchema(\n            keyword_text=\"budget headphones\",\n            match_type=\"broad\",\n            estimated_monthly_volume=800,\n            estimated_cpc=0.45,\n            relevance_score=0.72,\n            reason=\"High volume, lower cost per click\",\n            recommendation=\"monitor\",\n        ),\n        KeywordHarvestSchema(\n            keyword_text=\"knockoff beats\",\n            match_type=\"phrase\",\n            estimated_monthly_volume=150,\n            estimated_cpc=0.32,\n            relevance_score=0.15,\n            reason=\"Brand conflict concerns, low conversion likelihood\",\n            recommendation=\"skip\",\n        ),\n    ]\n\n    return suggestions\n\n\n# ============================================================================\n# Endpoints\n# ============================================================================\n\n\n@router.get(\"/campaigns\", response_model=List[CampaignListSchema])\ndef list_campaigns(\n    db: Session = Depends(get_db),\n    current_user: User = Depends(get_current_user),\n    status: Optional[str] = Query(None, regex=\"^(active|paused|archived)$\"),\n    campaign_type: Optional[str] = Query(None, regex=\"^(SP|SB|SD)$\"),\n    skip: int = Query(0, ge=0),\n    limit: int = Query(50, ge=1, le=500),\n) -> List[CampaignListSchema]:\n    \"\"\"\n    List all PPC campaigns for the organization with optional filters.\n\n    Query Parameters:\n    - status: Filter by campaign status (active, paused, archived)\n    - campaign_type: Filter by campaign type (SP, SB, SD)\n    - skip: Number of records to skip (pagination)\n    - limit: Maximum records to return (default 50, max 500)\n\n    Returns:\n        List of campaigns for the organization\n    \"\"\"\n    logger.info(f\"Fetching campaigns for org {current_user.org_id}\")\n\n    query = db.query(PPCCampaign).filter(PPCCampaign.org_id == current_user.org_id)\n\n    if status:\n        query = query.filter(PPCCampaign.status == status)\n\n    if campaign_type:\n        query = query.filter(PPCCampaign.campaign_type == campaign_type)\n\n    campaigns = query.offset(skip).limit(limit).all()\n\n    logger.info(f\"Retrieved {len(campaigns)} campaigns for org {current_user.org_id}\")\n    return campaigns\n\n\n@router.post(\"/campaigns\", response_model=CampaignDetailSchema, status_code=status.HTTP_201_CREATED)\ndef create_campaign(\n    payload: CampaignCreateSchema,\n    db: Session = Depends(get_db),\n    current_user: User = Depends(get_current_user),\n) -> CampaignDetailSchema:\n    \"\"\"\n    Create a new PPC campaign.\n\n    Request Body:\n    - campaign_name: Name of the campaign\n    - campaign_type: Type of campaign (SP/SB/SD)\n    - account_id: Optional Amazon account ID\n    - daily_budget: Daily budget in USD\n    - start_date: Campaign start date\n    - end_date: Optional campaign end date\n\n    Returns:\n        The created campaign with details\n    \"\"\"\n    logger.info(f\"Creating campaign '{payload.campaign_name}' for org {current_user.org_id}\")\n\n    # Validate end_date is after start_date\n    if payload.end_date and payload.end_date <= payload.start_date:\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail=\"end_date must be after start_date\",\n        )\n\n    new_campaign = PPCCampaign(\n        org_id=current_user.org_id,\n        account_id=payload.account_id,\n        campaign_name=payload.campaign_name,\n        campaign_type=payload.campaign_type,\n        status=\"active\",\n        daily_budget=payload.daily_budget,\n        total_spend=0.0,\n        total_sales=0.0,\n        acos=0.0,\n        impressions=0,\n        clicks=0,\n        orders=0,\n        start_date=payload.start_date,\n        end_date=payload.end_date,\n        created_at=datetime.utcnow(),\n    )\n\n    db.add(new_campaign)\n    db.commit()\n    db.refresh(new_campaign)\n\n    logger.info(f\"Campaign {new_campaign.id} created successfully\")\n    return new_campaign\n\n\n@router.get(\"/campaigns/{campaign_id}\", response_model=CampaignDetailSchema)\ndef get_campaign(\n    campaign_id: int,\n    db: Session = Depends(get_db),\n    current_user: User = Depends(get_current_user),\n) -> CampaignDetailSchema:\n    \"\"\"\n    Get detailed information about a specific campaign including keywords and ad groups.\n\n    Path Parameters:\n    - campaign_id: The ID of the campaign\n\n    Returns:\n        Campaign details with associated keywords and ad groups\n    \"\"\"\n    logger.info(f\"Fetching campaign {campaign_id} for org {current_user.org_id}\")\n\n    campaign = (\n        db.query(PPCCampaign)\n        .filter(\n            PPCCampaign.id == campaign_id,\n            PPCCampaign.org_id == current_user.org_id,\n        )\n        .first()\n    )\n\n    if not campaign:\n        logger.warning(f\"Campaign {campaign_id} not found for org {current_user.org_id}\")\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=\"Campaign not found\",\n        )\n\n    return campaign\n

@router.put("/campaigns/{campaign_id}", response_model=CampaignDetailSchema)
def update_campaign(
    campaign_id: int,
    payload: CampaignUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
