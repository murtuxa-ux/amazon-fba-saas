"""
Intelligence Hub Backend Module
Unified AI-driven intelligence dashboard for Amazon FBA Wholesale SaaS
Aggregates data from inventory forecasting, risk analysis, pricing optimization, market analysis, and competitor tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, func, desc
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json
from database import Base, get_db
from auth import get_current_user, tenant_session


# ========================
# DATABASE MODELS
# ========================

class IntelligenceAlert(Base):
    """Alert model for actionable insights from intelligence modules"""
    __tablename__ = "intelligence_alerts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    alert_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="opportunity, risk, reorder, price_change, competitor, trend"
    )
    severity = Column(
        String(20),
        nullable=False,
        index=True,
        comment="low, medium, high, critical"
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    related_asin = Column(String(20), nullable=True, index=True)
    related_client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    is_read = Column(Boolean, default=False, index=True)
    is_dismissed = Column(Boolean, default=False, index=True)
    data = Column(Text, nullable=False, comment="JSON payload with alert details")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary with parsed JSON data"""
        return {
            "id": self.id,
            "org_id": self.org_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "related_asin": self.related_asin,
            "related_client_id": self.related_client_id,
            "is_read": self.is_read,
            "is_dismissed": self.is_dismissed,
            "data": json.loads(self.data) if self.data else {},
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ProductScore(Base):
    """Product intelligence scoring model"""
    __tablename__ = "product_scores"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    asin = Column(String(20), nullable=False, index=True)
    opportunity_score = Column(Float, nullable=False, default=0.0)
    risk_score = Column(Float, nullable=False, default=0.0)
    demand_score = Column(Float, nullable=False, default=0.0)
    competition_score = Column(Float, nullable=False, default=0.0)
    overall_score = Column(Float, nullable=False, default=0.0)
    scoring_factors = Column(Text, nullable=False, comment="JSON breakdown of scoring factors")
    scored_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        """Convert score to dictionary with parsed JSON"""
        return {
            "id": self.id,
            "org_id": self.org_id,
            "asin": self.asin,
            "opportunity_score": self.opportunity_score,
            "risk_score": self.risk_score,
            "demand_score": self.demand_score,
            "competition_score": self.competition_score,
            "overall_score": self.overall_score,
            "scoring_factors": json.loads(self.scoring_factors) if self.scoring_factors else {},
            "scored_at": self.scored_at.isoformat() if self.scored_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ========================
# PYDANTIC SCHEMAS
# ========================

class IntelligenceAlertCreate(BaseModel):
    """Schema for creating intelligence alerts"""
    alert_type: str
    severity: str
    title: str
    description: str
    related_asin: Optional[str] = None
    related_client_id: Optional[int] = None
    data: Dict[str, Any]


class IntelligenceAlertUpdate(BaseModel):
    """Schema for updating alert status"""
    is_read: Optional[bool] = None
    is_dismissed: Optional[bool] = None


class IntelligenceAlertResponse(BaseModel):
    """Schema for alert responses"""
    id: int
    org_id: int
    alert_type: str
    severity: str
    title: str
    description: str
    related_asin: Optional[str]
    related_client_id: Optional[int]
    is_read: bool
    is_dismissed: bool
    data: Dict[str, Any]
    created_at: str

    class Config:
        from_attributes = True


class ProductScoreCreate(BaseModel):
    """Schema for creating/updating product scores"""
    asin: str
    opportunity_score: float
    risk_score: float
    demand_score: float
    competition_score: float
    scoring_factors: Dict[str, Any]


class ProductScoreResponse(BaseModel):
    """Schema for product score responses"""
    id: int
    org_id: int
    asin: str
    opportunity_score: float
    risk_score: float
    demand_score: float
    competition_score: float
    overall_score: float
    scoring_factors: Dict[str, Any]
    scored_at: str
    created_at: str

    class Config:
        from_attributes = True


class RiskSummaryItem(BaseModel):
    """Item in risk summary"""
    asin: str
    title: str
    risk_level: str
    risk_score: float


class DashboardStats(BaseModel):
    """Dashboard statistics"""
    total_alerts: int = Field(default=0)
    active_alerts: int = Field(default=0)
    opportunities_found: int = Field(default=0)
    risks_flagged: int = Field(default=0)
    avg_opportunity_score: float = Field(default=0)
    avg_risk_score: float = Field(default=0)


class DashboardResponse(BaseModel):
    """Unified intelligence dashboard response"""
    top_opportunities: List[ProductScoreResponse] = Field(default_factory=list)
    active_alerts: Dict[str, List[IntelligenceAlertResponse]] = Field(default_factory=dict)
    risk_summary: List[RiskSummaryItem] = Field(default_factory=list)
    market_trends: List[Dict[str, Any]] = Field(default_factory=list)
    stats: DashboardStats = Field(default_factory=DashboardStats)


# ========================
# ROUTER INITIALIZATION
# ========================

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


# ========================
# UTILITY FUNCTIONS
# ========================

def calculate_overall_score(
    opportunity_score: float,
    demand_score: float,
    competition_score: float,
    risk_score: float
) -> float:
    """
    Calculate weighted overall score.
    Formula: opportunity 35%, demand 30%, competition 20%, inverse risk 15%
    """
    inverse_risk = 100 - risk_score
    overall = (
        (opportunity_score * 0.35) +
        (demand_score * 0.30) +
        (competition_score * 0.20) +
        (inverse_risk * 0.15)
    )
    return round(min(100, max(0, overall)), 2)


def get_risk_level(risk_score: float) -> str:
    """Determine risk level from score"""
    if risk_score >= 75:
        return "critical"
    elif risk_score >= 50:
        return "high"
    elif risk_score >= 25:
        return "medium"
    else:
        return "low"


# ========================
# ENDPOINTS
# ========================

@router.get("/dashboard")
def get_intelligence_dashboard(
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> DashboardResponse:
    """
    Get unified intelligence overview dashboard.
    Returns top opportunities, active alerts, risk summary, market trends, and stats.
    """
    org_id = current_user.org_id

    # Get top 5 opportunities (highest overall scores, not dismissed)
    top_opportunities = db.query(ProductScore).filter(
        ProductScore.org_id == org_id
    ).order_by(desc(ProductScore.overall_score)).limit(5).all()

    opportunities_response = [
        ProductScoreResponse(
            id=score.id,
            org_id=score.org_id,
            asin=score.asin,
            opportunity_score=score.opportunity_score,
            risk_score=score.risk_score,
            demand_score=score.demand_score,
            competition_score=score.competition_score,
            overall_score=score.overall_score,
            scoring_factors=json.loads(score.scoring_factors) if score.scoring_factors else {},
            scored_at=score.scored_at.isoformat() if score.scored_at else "",
            created_at=score.created_at.isoformat() if score.created_at else ""
        )
        for score in top_opportunities
    ]

    # Get active alerts (unread, not dismissed, grouped by type)
    active_alerts_query = db.query(IntelligenceAlert).filter(
        IntelligenceAlert.org_id == org_id,
        IntelligenceAlert.is_dismissed == False
    ).order_by(desc(IntelligenceAlert.created_at)).all()

    active_alerts_dict = {}
    for alert in active_alerts_query:
        alert_type = alert.alert_type
        if alert_type not in active_alerts_dict:
            active_alerts_dict[alert_type] = []
        active_alerts_dict[alert_type].append(IntelligenceAlertResponse(
            id=alert.id,
            org_id=alert.org_id,
            alert_type=alert.alert_type,
            severity=alert.severity,
            title=alert.title,
            description=alert.description,
            related_asin=alert.related_asin,
            related_client_id=alert.related_client_id,
            is_read=alert.is_read,
            is_dismissed=alert.is_dismissed,
            data=json.loads(alert.data) if alert.data else {},
            created_at=alert.created_at.isoformat() if alert.created_at else ""
        ))

    # Get risk summary (products by risk level)
    all_scores = db.query(ProductScore).filter(
        ProductScore.org_id == org_id
    ).all()

    risk_summary = []
    for score in all_scores:
        risk_level = get_risk_level(score.risk_score)
        risk_summary.append(RiskSummaryItem(
            asin=score.asin,
            title=f"ASIN {score.asin}",
            risk_level=risk_level,
            risk_score=score.risk_score
        ))

    # Get market trends (simulated from alerts with trend type)
    trend_alerts = db.query(IntelligenceAlert).filter(
        IntelligenceAlert.org_id == org_id,
        IntelligenceAlert.alert_type == "trend"
    ).order_by(desc(IntelligenceAlert.created_at)).limit(5).all()

    market_trends = []
    for alert in trend_alerts:
        try:
            data = json.loads(alert.data) if alert.data else {}
            market_trends.append({
                "category": data.get("category", "Unknown"),
                "growth_percent": data.get("growth_percent", 0),
                "trend_direction": data.get("trend_direction", "stable"),
                "title": alert.title,
                "created_at": alert.created_at.isoformat() if alert.created_at else None
            })
        except (json.JSONDecodeError, AttributeError):
            pass

    # Calculate statistics
    total_alerts = db.query(func.count(IntelligenceAlert.id)).filter(
        IntelligenceAlert.org_id == org_id
    ).scalar() or 0

    active_alerts_count = db.query(func.count(IntelligenceAlert.id)).filter(
        IntelligenceAlert.org_id == org_id,
        IntelligenceAlert.is_dismissed == False
    ).scalar() or 0

    opportunities_count = db.query(func.count(ProductScore.id)).filter(
        ProductScore.org_id == org_id,
        ProductScore.opportunity_score >= 60
    ).scalar() or 0

    risks_count = db.query(func.count(ProductScore.id)).filter(
        ProductScore.org_id == org_id,
        ProductScore.risk_score >= 50
    ).scalar() or 0

    avg_opportunity = db.query(func.avg(ProductScore.opportunity_score)).filter(
        ProductScore.org_id == org_id
    ).scalar() or 0.0

    avg_risk = db.query(func.avg(ProductScore.risk_score)).filter(
        ProductScore.org_id == org_id
    ).scalar() or 0.0

    stats = DashboardStats(
        total_alerts=total_alerts,
        active_alerts=active_alerts_count,
        opportunities_found=opportunities_count,
        risks_flagged=risks_count,
        avg_opportunity_score=round(float(avg_opportunity), 2),
        avg_risk_score=round(float(avg_risk), 2)
    )

    return DashboardResponse(
        top_opportunities=opportunities_response,
        active_alerts=active_alerts_dict,
        risk_summary=risk_summary,
        market_trends=market_trends,
        stats=stats
    )


@router.get("/alerts")
def list_alerts(
    alert_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    List alerts with filtering options.
    Supports filtering by type, severity, read status, and date range.
    """
    org_id = current_user.org_id

    query = db.query(IntelligenceAlert).filter(IntelligenceAlert.org_id == org_id)

    if alert_type:
        query = query.filter(IntelligenceAlert.alert_type == alert_type)

    if severity:
        query = query.filter(IntelligenceAlert.severity == severity)

    if is_read is not None:
        query = query.filter(IntelligenceAlert.is_read == is_read)

    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from)
            query = query.filter(IntelligenceAlert.created_at >= date_from_obj)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format")

    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to)
            query = query.filter(IntelligenceAlert.created_at <= date_to_obj)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format")

    total = query.count()
    alerts = query.order_by(desc(IntelligenceAlert.created_at)).offset(skip).limit(limit).all()

    alert_responses = [
        IntelligenceAlertResponse(
            id=alert.id,
            org_id=alert.org_id,
            alert_type=alert.alert_type,
            severity=alert.severity,
            title=alert.title,
            description=alert.description,
            related_asin=alert.related_asin,
            related_client_id=alert.related_client_id,
            is_read=alert.is_read,
            is_dismissed=alert.is_dismissed,
            data=json.loads(alert.data) if alert.data else {},
            created_at=alert.created_at.isoformat() if alert.created_at else ""
        )
        for alert in alerts
    ]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "alerts": alert_responses
    }


@router.put("/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> IntelligenceAlertResponse:
    """Mark a specific alert as read"""
    org_id = current_user.org_id

    alert = db.query(IntelligenceAlert).filter(
        IntelligenceAlert.id == alert_id,
        IntelligenceAlert.org_id == org_id
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()
    db.refresh(alert)

    return IntelligenceAlertResponse(
        id=alert.id,
        org_id=alert.org_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        title=alert.title,
        description=alert.description,
        related_asin=alert.related_asin,
        related_client_id=alert.related_client_id,
        is_read=alert.is_read,
        is_dismissed=alert.is_dismissed,
        data=json.loads(alert.data) if alert.data else {},
        created_at=alert.created_at.isoformat() if alert.created_at else ""
    )


@router.put("/alerts/{alert_id}/dismiss")
def dismiss_alert(
    alert_id: int,
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> IntelligenceAlertResponse:
    """Dismiss a specific alert"""
    org_id = current_user.org_id

    alert = db.query(IntelligenceAlert).filter(
        IntelligenceAlert.id == alert_id,
        IntelligenceAlert.org_id == org_id
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_dismissed = True
    db.commit()
    db.refresh(alert)

    return IntelligenceAlertResponse(
        id=alert.id,
        org_id=alert.org_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        title=alert.title,
        description=alert.description,
        related_asin=alert.related_asin,
        related_client_id=alert.related_client_id,
        is_read=alert.is_read,
        is_dismissed=alert.is_dismissed,
        data=json.loads(alert.data) if alert.data else {},
        created_at=alert.created_at.isoformat() if alert.created_at else ""
    )


@router.put("/alerts/read-all")
def mark_all_alerts_read(
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Mark all alerts as read for the organization"""
    org_id = current_user.org_id

    updated_count = db.query(IntelligenceAlert).filter(
        IntelligenceAlert.org_id == org_id,
        IntelligenceAlert.is_read == False
    ).update({"is_read": True})

    db.commit()

    return {
        "message": "All alerts marked as read",
        "updated_count": updated_count
    }


@router.post("/score/{asin}")
def score_product(
    asin: str,
    score_data: ProductScoreCreate,
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> ProductScoreResponse:
    """
    Score a product on opportunity, risk, demand, and competition.
    Creates or updates the score for the given ASIN.
    """
    org_id = current_user.org_id

    if score_data.asin != asin:
        raise HTTPException(status_code=400, detail="ASIN in path and body do not match")

    # Validate scores are between 0-100
    for score_name in ["opportunity_score", "risk_score", "demand_score", "competition_score"]:
        score_value = getattr(score_data, score_name)
        if not (0 <= score_value <= 100):
            raise HTTPException(status_code=400, detail=f"{score_name} must be between 0-100")

    # Calculate overall score
    overall_score = calculate_overall_score(
        score_data.opportunity_score,
        score_data.demand_score,
        score_data.competition_score,
        score_data.risk_score
    )

    # Check if score exists
    existing_score = db.query(ProductScore).filter(
        ProductScore.org_id == org_id,
        ProductScore.asin == asin
    ).first()

    if existing_score:
        existing_score.opportunity_score = score_data.opportunity_score
        existing_score.risk_score = score_data.risk_score
        existing_score.demand_score = score_data.demand_score
        existing_score.competition_score = score_data.competition_score
        existing_score.overall_score = overall_score
        existing_score.scoring_factors = json.dumps(score_data.scoring_factors)
        existing_score.scored_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_score)
        product_score = existing_score
    else:
        product_score = ProductScore(
            org_id=org_id,
            asin=asin,
            opportunity_score=score_data.opportunity_score,
            risk_score=score_data.risk_score,
            demand_score=score_data.demand_score,
            competition_score=score_data.competition_score,
            overall_score=overall_score,
            scoring_factors=json.dumps(score_data.scoring_factors)
        )
        db.add(product_score)
        db.commit()
        db.refresh(product_score)

    return ProductScoreResponse(
        id=product_score.id,
        org_id=product_score.org_id,
        asin=product_score.asin,
        opportunity_score=product_score.opportunity_score,
        risk_score=product_score.risk_score,
        demand_score=product_score.demand_score,
        competition_score=product_score.competition_score,
        overall_score=product_score.overall_score,
        scoring_factors=json.loads(product_score.scoring_factors) if product_score.scoring_factors else {},
        scored_at=product_score.scored_at.isoformat() if product_score.scored_at else "",
        created_at=product_score.created_at.isoformat() if product_score.created_at else ""
    )


@router.get("/scores")
def list_product_scores(
    sort_by: str = Query("overall_score", regex="^(overall_score|opportunity_score|risk_score|demand_score|competition_score)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    List scored products, sorted by specified metric.
    Default sort is by overall_score (descending).
    """
    org_id = current_user.org_id

    # Map sort_by to column
    sort_columns = {
        "overall_score": ProductScore.overall_score,
        "opportunity_score": ProductScore.opportunity_score,
        "risk_score": ProductScore.risk_score,
        "demand_score": ProductScore.demand_score,
        "competition_score": ProductScore.competition_score
    }

    query = db.query(ProductScore).filter(ProductScore.org_id == org_id)
    total = query.count()

    scores = query.order_by(desc(sort_columns[sort_by])).offset(skip).limit(limit).all()

    score_responses = [
        ProductScoreResponse(
            id=score.id,
            org_id=score.org_id,
            asin=score.asin,
            opportunity_score=score.opportunity_score,
            risk_score=score.risk_score,
            demand_score=score.demand_score,
            competition_score=score.competition_score,
            overall_score=score.overall_score,
            scoring_factors=json.loads(score.scoring_factors) if score.scoring_factors else {},
            scored_at=score.scored_at.isoformat() if score.scored_at else "",
            created_at=score.created_at.isoformat() if score.created_at else ""
        )
        for score in scores
    ]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "sort_by": sort_by,
        "scores": score_responses
    }


@router.get("/scores/{asin}")
def get_product_score_detail(
    asin: str,
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> ProductScoreResponse:
    """Get detailed score breakdown for a specific product"""
    org_id = current_user.org_id

    score = db.query(ProductScore).filter(
        ProductScore.org_id == org_id,
        ProductScore.asin == asin
    ).first()

    if not score:
        raise HTTPException(status_code=404, detail="Product score not found")

    return ProductScoreResponse(
        id=score.id,
        org_id=score.org_id,
        asin=score.asin,
        opportunity_score=score.opportunity_score,
        risk_score=score.risk_score,
        demand_score=score.demand_score,
        competition_score=score.competition_score,
        overall_score=score.overall_score,
        scoring_factors=json.loads(score.scoring_factors) if score.scoring_factors else {},
        scored_at=score.scored_at.isoformat() if score.scored_at else "",
        created_at=score.created_at.isoformat() if score.created_at else ""
    )


@router.get("/opportunities")
def get_top_opportunities(
    min_score: float = Query(60.0, ge=0, le=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get top product opportunities based on opportunity score.
    Filters products with opportunity_score >= min_score.
    """
    org_id = current_user.org_id

    query = db.query(ProductScore).filter(
        ProductScore.org_id == org_id,
        ProductScore.opportunity_score >= min_score
    )

    total = query.count()
    scores = query.order_by(desc(ProductScore.opportunity_score)).offset(skip).limit(limit).all()

    opportunities = [
        ProductScoreResponse(
            id=score.id,
            org_id=score.org_id,
            asin=score.asin,
            opportunity_score=score.opportunity_score,
            risk_score=score.risk_score,
            demand_score=score.demand_score,
            competition_score=score.competition_score,
            overall_score=score.overall_score,
            scoring_factors=json.loads(score.scoring_factors) if score.scoring_factors else {},
            scored_at=score.scored_at.isoformat() if score.scored_at else "",
            created_at=score.created_at.isoformat() if score.created_at else ""
        )
        for score in scores
    ]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "min_score": min_score,
        "opportunities": opportunities
    }


@router.get("/risks")
def get_flagged_risks(
    min_risk_score: float = Query(50.0, ge=0, le=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get products flagged as risky based on risk score.
    Filters products with risk_score >= min_risk_score.
    """
    org_id = current_user.org_id

    query = db.query(ProductScore).filter(
        ProductScore.org_id == org_id,
        ProductScore.risk_score >= min_risk_score
    )

    total = query.count()
    scores = query.order_by(desc(ProductScore.risk_score)).offset(skip).limit(limit).all()

    risks = [
        ProductScoreResponse(
            id=score.id,
            org_id=score.org_id,
            asin=score.asin,
            opportunity_score=score.opportunity_score,
            risk_score=score.risk_score,
            demand_score=score.demand_score,
            competition_score=score.competition_score,
            overall_score=score.overall_score,
            scoring_factors=json.loads(score.scoring_factors) if score.scoring_factors else {},
            scored_at=score.scored_at.isoformat() if score.scored_at else "",
            created_at=score.created_at.isoformat() if score.created_at else ""
        )
        for score in scores
    ]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "min_risk_score": min_risk_score,
        "risks": risks
    }


@router.get("/trends")
def get_market_trends(
    days: int = Query(30, ge=1, le=365),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get category and market trend data from trend alerts.
    Returns trends from the last N days (default 30).
    """
    org_id = current_user.org_id

    date_from = datetime.utcnow() - timedelta(days=days)

    query = db.query(IntelligenceAlert).filter(
        IntelligenceAlert.org_id == org_id,
        IntelligenceAlert.alert_type == "trend",
        IntelligenceAlert.created_at >= date_from
    )

    total = query.count()
    alerts = query.order_by(desc(IntelligenceAlert.created_at)).offset(skip).limit(limit).all()

    trends = []
    for alert in alerts:
        try:
            data = json.loads(alert.data) if alert.data else {}
            trends.append({
                "id": alert.id,
                "category": data.get("category", "Unknown"),
                "growth_percent": data.get("growth_percent", 0),
                "trend_direction": data.get("trend_direction", "stable"),
                "title": alert.title,
                "description": alert.description,
                "severity": alert.severity,
                "created_at": alert.created_at.isoformat() if alert.created_at else None
            })
        except (json.JSONDecodeError, AttributeError):
            pass

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "days": days,
        "trends": trends
    }


@router.get("/competitor-watch")
def get_competitor_watch(
    days: int = Query(7, ge=1, le=90),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get competitor activity summary from competitor alerts.
    Returns competitor activity from the last N days (default 7).
    """
    org_id = current_user.org_id

    date_from = datetime.utcnow() - timedelta(days=days)

    query = db.query(IntelligenceAlert).filter(
        IntelligenceAlert.org_id == org_id,
        IntelligenceAlert.alert_type == "competitor",
        IntelligenceAlert.created_at >= date_from
    )

    total = query.count()
    alerts = query.order_by(desc(IntelligenceAlert.created_at)).offset(skip).limit(limit).all()

    competitor_activities = []
    for alert in alerts:
        try:
            data = json.loads(alert.data) if alert.data else {}
            competitor_activities.append({
                "id": alert.id,
                "asin": alert.related_asin,
                "competitor_action": data.get("action", "Unknown"),
                "competitor_count": data.get("competitor_count", 0),
                "price_change": data.get("price_change", 0),
                "title": alert.title,
                "severity": alert.severity,
                "created_at": alert.created_at.isoformat() if alert.created_at else None
            })
        except (json.JSONDecodeError, AttributeError):
            pass

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "days": days,
        "activities": competitor_activities
    }
