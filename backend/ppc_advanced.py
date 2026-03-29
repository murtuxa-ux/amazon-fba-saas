"""
Phase 4: Advanced PPC Automation Module
FastAPI backend for Ecom Era's Amazon FBA SaaS platform
Includes dayparting, search term isolation, budget pacing, and campaign structure builder
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, func
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import statistics

from auth import get_current_user
from database import get_db, Base, engine
from models import User

# ==================== DATABASE MODELS ====================

class PPCCampaign(Base):
    __tablename__ = "ppc_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    campaign_id_amazon = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    campaign_type = Column(String, nullable=False)  # SP, SB, SD
    targeting_type = Column(String, nullable=False)  # auto, manual
    status = Column(String, default="enabled")  # enabled, paused, archived
    daily_budget = Column(Float, default=0.0)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    total_spend = Column(Float, default=0.0)
    total_sales = Column(Float, default=0.0)
    total_impressions = Column(Integer, default=0)
    total_clicks = Column(Integer, default=0)
    acos = Column(Float, default=0.0)
    roas = Column(Float, default=0.0)
    tacos = Column(Float, default=0.0)
    last_synced = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    daypart_schedules = relationship("PPCDaypartSchedule", back_populates="campaign")
    search_terms = relationship("PPCSearchTermReport", back_populates="campaign")
    budget_pacing = relationship("PPCBudgetPacing", back_populates="campaign")


class PPCDaypartSchedule(Base):
    __tablename__ = "ppc_daypart_schedules"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("ppc_campaigns.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0-6, Monday-Sunday
    hour_start = Column(Integer, nullable=False)  # 0-23
    hour_end = Column(Integer, nullable=False)  # 0-23
    bid_multiplier = Column(Float, default=1.0)
    is_active = Column(Boolean, default=True)

    campaign = relationship("PPCCampaign", back_populates="daypart_schedules")


class PPCSearchTermReport(Base):
    __tablename__ = "ppc_search_terms"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    campaign_id = Column(Integer, ForeignKey("ppc_campaigns.id"), nullable=False)
    search_term = Column(String, nullable=False)
    query_type = Column(String, nullable=False)  # keyword, asin, auto
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    spend = Column(Float, default=0.0)
    sales = Column(Float, default=0.0)
    orders = Column(Integer, default=0)
    acos = Column(Float, default=0.0)
    conversion_rate = Column(Float, default=0.0)
    isolation_status = Column(String, default="not_reviewed")  # not_reviewed, harvested, negated, monitored
    created_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("PPCCampaign", back_populates="search_terms")


class PPCBudgetPacing(Base):
    __tablename__ = "ppc_budget_pacing"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    campaign_id = Column(Integer, ForeignKey("ppc_campaigns.id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    allocated_budget = Column(Float, nullable=False)
    spent_to_date = Column(Float, default=0.0)
    daily_target = Column(Float, default=0.0)
    daily_actual = Column(Float, default=0.0)
    pacing_pct = Column(Float, default=0.0)
    status = Column(String, default="on_track")  # on_track, underpacing, overpacing
    alert_threshold = Column(Float, default=0.15)  # 15% variance threshold

    campaign = relationship("PPCCampaign", back_populates="budget_pacing")


class CampaignStructure(Base):
    __tablename__ = "campaign_structures"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    parent_asin = Column(String, nullable=False)
    structure_name = Column(String, nullable=False)
    auto_campaign = Column(JSON, default={})
    exact_campaign = Column(JSON, default={})
    phrase_campaign = Column(JSON, default={})
    broad_campaign = Column(JSON, default={})
    negative_exact_list = Column(JSON, default=[])
    status = Column(String, default="draft")  # draft, created, active
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== PYDANTIC SCHEMAS ====================

class PPCCampaignSchema(BaseModel):
    id: Optional[int] = None
    campaign_id_amazon: str
    name: str
    campaign_type: str
    targeting_type: str
    status: str = "enabled"
    daily_budget: float = 0.0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_spend: float = 0.0
    total_sales: float = 0.0
    total_impressions: int = 0
    total_clicks: int = 0
    acos: float = 0.0
    roas: float = 0.0
    tacos: float = 0.0

    class Config:
        from_attributes = True


class PPCDaypartScheduleSchema(BaseModel):
    id: Optional[int] = None
    campaign_id: int
    day_of_week: int
    hour_start: int
    hour_end: int
    bid_multiplier: float = 1.0
    is_active: bool = True

    class Config:
        from_attributes = True


class PPCSearchTermSchema(BaseModel):
    id: Optional[int] = None
    search_term: str
    query_type: str
    impressions: int = 0
    clicks: int = 0
    spend: float = 0.0
    sales: float = 0.0
    orders: int = 0
    acos: float = 0.0
    conversion_rate: float = 0.0
    isolation_status: str = "not_reviewed"

    class Config:
        from_attributes = True


class PPCBudgetPacingSchema(BaseModel):
    id: Optional[int] = None
    campaign_id: int
    period_start: datetime
    period_end: datetime
    allocated_budget: float
    spent_to_date: float = 0.0
    daily_target: float = 0.0
    daily_actual: float = 0.0
    pacing_pct: float = 0.0
    status: str = "on_track"
    alert_threshold: float = 0.15

    class Config:
        from_attributes = True


class CampaignStructureSchema(BaseModel):
    id: Optional[int] = None
    parent_asin: str
    structure_name: str
    auto_campaign: Dict = {}
    exact_campaign: Dict = {}
    phrase_campaign: Dict = {}
    broad_campaign: Dict = {}
    negative_exact_list: List[str] = []
    status: str = "draft"

    class Config:
        from_attributes = True


class IsolationAnalysisRequest(BaseModel):
    campaign_id: int
    min_clicks: int = 5
    high_acos_threshold: float = 0.30
    low_acos_threshold: float = 0.15
    conversion_rate_threshold: float = 0.02


class CampaignBuilderRequest(BaseModel):
    parent_asin: str
    structure_name: str
    seed_keywords: List[str]
    include_exact: bool = True
    include_phrase: bool = True
    include_broad: bool = True


class BudgetPacingAlert(BaseModel):
    campaign_id: int
    campaign_name: str
    status: str
    pacing_pct: float
    alert_message: str


# ==================== BUSINESS LOGIC ====================

def calculate_daypart_bid_multipliers(db: Session, campaign_id: int, conversion_data: Dict[int, float]) -> Dict[int, Dict[int, float]]:
    if not conversion_data:
        return {}
    avg_conversion = statistics.mean(conversion_data.values())
    multipliers = {}
    for hour, conversion_rate in conversion_data.items():
        if avg_conversion > 0:
            multiplier = conversion_rate / avg_conversion
            multipliers[hour] = round(multiplier, 2)
    return multipliers


def process_search_term_isolation(db: Session, campaign_id: int, min_clicks: int = 5, high_acos_threshold: float = 0.30, low_acos_threshold: float = 0.15) -> Dict:
    search_terms = db.query(PPCSearchTermReport).filter(
        PPCSearchTermReport.campaign_id == campaign_id,
        PPCSearchTermReport.clicks >= min_clicks
    ).all()

    results = {"harvested": [], "negated": [], "monitored": []}

    for term in search_terms:
        if term.acos > 0 and term.conversion_rate > 0:
            if term.acos <= low_acos_threshold and term.orders >= 1:
                term.isolation_status = "harvested"
                results["harvested"].append(term.search_term)
            elif term.acos > high_acos_threshold:
                term.isolation_status = "negated"
                results["negated"].append(term.search_term)
            else:
                term.isolation_status = "monitored"
                results["monitored"].append(term.search_term)
        else:
            term.isolation_status = "monitored"
            results["monitored"].append(term.search_term)

    db.commit()
    return results


def calculate_budget_pacing(db: Session, campaign_id: int) -> PPCBudgetPacing:
    pacing = db.query(PPCBudgetPacing).filter(
        PPCBudgetPacing.campaign_id == campaign_id,
        PPCBudgetPacing.period_end >= datetime.utcnow()
    ).first()

    if not pacing:
        return None

    total_days = (pacing.period_end - pacing.period_start).days
    if total_days == 0:
        total_days = 1

    days_elapsed = (datetime.utcnow() - pacing.period_start).days
    if days_elapsed == 0:
        days_elapsed = 1

    pacing.daily_target = pacing.allocated_budget / total_days
    expected_spend = pacing.daily_target * days_elapsed
    pacing.pacing_pct = (pacing.spent_to_date / expected_spend * 100) if expected_spend > 0 else 100

    variance = abs(pacing.pacing_pct - 100) / 100
    if variance > pacing.alert_threshold:
        if pacing.pacing_pct > 100:
            pacing.status = "overpacing"
        else:
            pacing.status = "underpacing"
    else:
        pacing.status = "on_track"

    db.commit()
    return pacing


def generate_campaign_structure(parent_asin: str, seed_keywords: List[str], include_exact: bool = True, include_phrase: bool = True, include_broad: bool = True) -> Dict:
    structure = {
        "auto_campaign": {
            "name": f"{parent_asin} - Auto",
            "targeting": "auto",
            "match_type": "auto",
            "keywords": ["[ASIN: auto targeting]"],
            "bid_strategy": "dynamic_bids"
        },
        "exact_campaign": {
            "name": f"{parent_asin} - Exact",
            "targeting": "manual",
            "match_type": "exact",
            "keywords": seed_keywords,
            "negative_keywords": []
        } if include_exact else None,
        "phrase_campaign": {
            "name": f"{parent_asin} - Phrase",
            "targeting": "manual",
            "match_type": "phrase",
            "keywords": [f'"{kw}"' for kw in seed_keywords],
            "negative_keywords": []
        } if include_phrase else None,
        "broad_campaign": {
            "name": f"{parent_asin} - Broad",
            "targeting": "manual",
            "match_type": "broad",
            "keywords": seed_keywords,
            "negative_keywords": seed_keywords
        } if include_broad else None,
        "negative_exact_list": seed_keywords,
        "notes": "Structure includes broad negative keyword list for exact match isolation"
    }

    return {k: v for k, v in structure.items() if v is not None}


# ==================== API ROUTER ====================

router = APIRouter(prefix="/ppc-advanced", tags=["PPC Advanced"])


@router.get("/campaigns", response_model=List[PPCCampaignSchema])
async def list_campaigns(
    client_id: str = Query(...),
    campaign_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PPCCampaign).filter(
        PPCCampaign.org_id == current_user.org_id,
        PPCCampaign.client_id == client_id
    )
    if campaign_type:
        query = query.filter(PPCCampaign.campaign_type == campaign_type)
    if status:
        query = query.filter(PPCCampaign.status == status)
    return query.all()


@router.post("/campaigns", response_model=PPCCampaignSchema)
async def create_campaign(
    campaign: PPCCampaignSchema,
    client_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_campaign = PPCCampaign(
        org_id=current_user.org_id,
        client_id=client_id,
        **campaign.model_dump(exclude={"id"})
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    return new_campaign


@router.get("/campaigns/{campaign_id}", response_model=PPCCampaignSchema)
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(PPCCampaign).filter(
        PPCCampaign.id == campaign_id,
        PPCCampaign.org_id == current_user.org_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.put("/campaigns/{campaign_id}", response_model=PPCCampaignSchema)
async def update_campaign(
    campaign_id: int,
    campaign_update: PPCCampaignSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(PPCCampaign).filter(
        PPCCampaign.id == campaign_id,
        PPCCampaign.org_id == current_user.org_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for field, value in campaign_update.model_dump(exclude={"id"}).items():
        setattr(campaign, field, value)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/campaigns/{campaign_id}/daypart", response_model=List[PPCDaypartScheduleSchema])
async def get_daypart_schedule(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(PPCCampaign).filter(
        PPCCampaign.id == campaign_id,
        PPCCampaign.org_id == current_user.org_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    schedules = db.query(PPCDaypartSchedule).filter(
        PPCDaypartSchedule.campaign_id == campaign_id
    ).all()
    return schedules


@router.post("/campaigns/{campaign_id}/daypart", response_model=List[PPCDaypartScheduleSchema])
async def set_daypart_schedule(
    campaign_id: int,
    schedules: List[PPCDaypartScheduleSchema],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(PPCCampaign).filter(
        PPCCampaign.id == campaign_id,
        PPCCampaign.org_id == current_user.org_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.query(PPCDaypartSchedule).filter(
        PPCDaypartSchedule.campaign_id == campaign_id
    ).delete()
    new_schedules = []
    for schedule in schedules:
        new_schedule = PPCDaypartSchedule(
            campaign_id=campaign_id,
            **schedule.model_dump(exclude={"id", "campaign_id"})
        )
        db.add(new_schedule)
        new_schedules.append(new_schedule)
    db.commit()
    return new_schedules


@router.get("/search-terms", response_model=List[PPCSearchTermSchema])
async def list_search_terms(
    client_id: str = Query(...),
    campaign_id: Optional[int] = None,
    min_clicks: int = Query(0),
    min_spend: float = Query(0.0),
    isolation_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PPCSearchTermReport).filter(
        PPCSearchTermReport.org_id == current_user.org_id,
        PPCSearchTermReport.client_id == client_id,
        PPCSearchTermReport.clicks >= min_clicks,
        PPCSearchTermReport.spend >= min_spend
    )
    if campaign_id:
        query = query.filter(PPCSearchTermReport.campaign_id == campaign_id)
    if isolation_status:
        query = query.filter(PPCSearchTermReport.isolation_status == isolation_status)
    return query.all()


@router.post("/search-terms/isolate")
async def run_isolation_analysis(
    request: IsolationAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(PPCCampaign).filter(
        PPCCampaign.id == request.campaign_id,
        PPCCampaign.org_id == current_user.org_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    results = process_search_term_isolation(
        db, request.campaign_id,
        min_clicks=request.min_clicks,
        high_acos_threshold=request.high_acos_threshold,
        low_acos_threshold=request.low_acos_threshold
    )
    return {
        "campaign_id": request.campaign_id,
        "campaign_name": campaign.name,
        "analysis": results,
        "timestamp": datetime.utcnow()
    }


@router.put("/search-terms/{term_id}/status")
async def update_search_term_status(
    term_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    term = db.query(PPCSearchTermReport).filter(
        PPCSearchTermReport.id == term_id,
        PPCSearchTermReport.org_id == current_user.org_id
    ).first()
    if not term:
        raise HTTPException(status_code=404, detail="Search term not found")
    term.isolation_status = status
    db.commit()
    db.refresh(term)
    return {"id": term.id, "isolation_status": term.isolation_status}


@router.get("/budget-pacing", response_model=List[PPCBudgetPacingSchema])
async def list_budget_pacing(
    client_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(PPCBudgetPacing).filter(
        PPCBudgetPacing.org_id == current_user.org_id,
        PPCBudgetPacing.client_id == client_id,
        PPCBudgetPacing.period_end >= datetime.utcnow()
    ).all()


@router.post("/budget-pacing", response_model=PPCBudgetPacingSchema)
async def create_budget_pacing(
    pacing: PPCBudgetPacingSchema,
    client_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_pacing = PPCBudgetPacing(
        org_id=current_user.org_id,
        client_id=client_id,
        **pacing.model_dump(exclude={"id"})
    )
    db.add(new_pacing)
    db.commit()
    db.refresh(new_pacing)
    return new_pacing


@router.get("/budget-pacing/alerts", response_model=List[BudgetPacingAlert])
async def get_pacing_alerts(
    client_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alerts = []
    pacings = db.query(PPCBudgetPacing).filter(
        PPCBudgetPacing.org_id == current_user.org_id,
        PPCBudgetPacing.client_id == client_id,
        PPCBudgetPacing.period_end >= datetime.utcnow()
    ).all()
    for pacing in pacings:
        calculate_budget_pacing(db, pacing.campaign_id)
        pacing = db.query(PPCBudgetPacing).filter(
            PPCBudgetPacing.id == pacing.id
        ).first()
        if pacing.status != "on_track":
            campaign = db.query(PPCCampaign).filter(
                PPCCampaign.id == pacing.campaign_id
            ).first()
            message = f"Campaign is {pacing.status}: {pacing.pacing_pct:.1f}% of daily target"
            alerts.append(BudgetPacingAlert(
                campaign_id=pacing.campaign_id,
                campaign_name=campaign.name if campaign else "Unknown",
                status=pacing.status,
                pacing_pct=pacing.pacing_pct,
                alert_message=message
            ))
    return alerts


@router.post("/campaign-builder", response_model=CampaignStructureSchema)
async def build_campaign_structure(
    request: CampaignBuilderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    structure_data = generate_campaign_structure(
        request.parent_asin,
        request.seed_keywords,
        include_exact=request.include_exact,
        include_phrase=request.include_phrase,
        include_broad=request.include_broad
    )
    structure = CampaignStructure(
        org_id=current_user.org_id,
        client_id=request.structure_name.split("-")[0] if "-" in request.structure_name else "default",
        parent_asin=request.parent_asin,
        structure_name=request.structure_name,
        auto_campaign=structure_data.get("auto_campaign", {}),
        exact_campaign=structure_data.get("exact_campaign", {}),
        phrase_campaign=structure_data.get("phrase_campaign", {}),
        broad_campaign=structure_data.get("broad_campaign", {}),
        negative_exact_list=structure_data.get("negative_exact_list", []),
        status="draft"
    )
    db.add(structure)
    db.commit()
    db.refresh(structure)
    return structure


@router.get("/campaign-builder/{structure_id}", response_model=CampaignStructureSchema)
async def get_campaign_structure(
    structure_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    structure = db.query(CampaignStructure).filter(
        CampaignStructure.id == structure_id,
        CampaignStructure.org_id == current_user.org_id
    ).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")
    return structure


@router.get("/analytics")
async def get_analytics(
    client_id: str = Query(...),
    days: int = Query(30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    campaigns = db.query(PPCCampaign).filter(
        PPCCampaign.org_id == current_user.org_id,
        PPCCampaign.client_id == client_id,
        PPCCampaign.created_at >= cutoff_date
    ).all()
    total_spend = sum(c.total_spend for c in campaigns)
    total_sales = sum(c.total_sales for c in campaigns)
    total_impressions = sum(c.total_impressions for c in campaigns)
    total_clicks = sum(c.total_clicks for c in campaigns)
    avg_acos = statistics.mean([c.acos for c in campaigns if c.acos > 0]) if campaigns else 0
    avg_roas = statistics.mean([c.roas for c in campaigns if c.roas > 0]) if campaigns else 0
    top_performers = sorted(campaigns, key=lambda x: x.roas, reverse=True)[:5]
    bottom_performers = sorted(campaigns, key=lambda x: x.roas)[:5]
    return {
        "period_days": days,
        "total_campaigns": len(campaigns),
        "total_spend": round(total_spend, 2),
        "total_sales": round(total_sales, 2),
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "avg_acos": round(avg_acos, 4),
        "avg_roas": round(avg_roas, 4),
        "top_performers": [
            {
                "id": c.id,
                "name": c.name,
                "spend": c.total_spend,
                "sales": c.total_sales,
                "roas": c.roas
            } for c in top_performers
        ],
        "bottom_performers": [
            {
                "id": c.id,
                "name": c.name,
                "spend": c.total_spend,
                "sales": c.total_sales,
                "roas": c.roas
            } for c in bottom_performers
        ]
    }
