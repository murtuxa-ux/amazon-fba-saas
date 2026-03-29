from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, Session
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional
from database import Base, get_db
from auth import get_current_user
from models import User

# =====================================================================
# SQLAlchemy Models
# =====================================================================

class PLProduct(Base):
    __tablename__ = "pl_products"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    product_name = Column(String, nullable=False)
    brand_name = Column(String, nullable=False)
    asin = Column(String, nullable=True, unique=True)
    category = Column(String, nullable=False)
    subcategory = Column(String, nullable=True)
    status = Column(String, default="research")  # research/validation/sourcing/sampling/production/shipping/launch/live/discontinued
    market_size_est = Column(Float, nullable=True)  # estimated annual market size
    competition_level = Column(String, nullable=True)  # low/medium/high/very_high
    monthly_revenue_est = Column(Float, nullable=True)
    target_price = Column(Float, nullable=True)
    target_margin = Column(Float, nullable=True)  # percentage
    target_bsr = Column(Integer, nullable=True)
    main_keywords = Column(JSON, nullable=True)  # ["keyword1", "keyword2", ...]
    validation_score = Column(Float, nullable=True)  # 0-100
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sourcing_leads = relationship("PLSourcingLead", back_populates="product")
    launch_plan = relationship("PLLaunchPlan", back_populates="product", uselist=False)
    brand_assets = relationship("PLBrandAsset", back_populates="product")


class PLSourcingLead(Base):
    __tablename__ = "pl_sourcing_leads"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("pl_products.id"), nullable=False)
    supplier_name = Column(String, nullable=False)
    supplier_country = Column(String, nullable=False)
    contact_info = Column(String, nullable=True)
    alibaba_url = Column(String, nullable=True)
    unit_price = Column(Float, nullable=True)
    moq = Column(Integer, nullable=True)  # Minimum Order Quantity
    sample_price = Column(Float, nullable=True)
    sample_status = Column(String, default="not_ordered")  # not_ordered/ordered/received/approved/rejected
    production_status = Column(String, default="not_started")  # not_started/in_production/completed/shipped
    lead_time_days = Column(Integer, nullable=True)
    quality_rating = Column(Float, nullable=True)  # 0-5 stars
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("PLProduct", back_populates="sourcing_leads")


class PLLaunchPlan(Base):
    __tablename__ = "pl_launch_plans"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("pl_products.id"), nullable=False, unique=True)
    launch_date = Column(String, nullable=True)  # YYYY-MM-DD
    launch_budget = Column(Float, nullable=True)
    status = Column(String, default="planning")  # planning/pre_launch/launching/post_launch/completed
    milestones = Column(JSON, default=[])  # [{"milestone": "Listing Created", "completed": false, "date": null}, ...]
    keyword_targets = Column(JSON, nullable=True)  # ["keyword1", "keyword2", ...]
    ppc_budget = Column(Float, nullable=True)
    review_target = Column(Integer, nullable=True)
    giveaway_units = Column(Integer, nullable=True)
    initial_inventory = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("PLProduct", back_populates="launch_plan")


class PLReviewTracker(Base):
    __tablename__ = "pl_review_tracker"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    asin = Column(String, nullable=False, index=True)
    total_reviews = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    five_star = Column(Integer, default=0)
    four_star = Column(Integer, default=0)
    three_star = Column(Integer, default=0)
    two_star = Column(Integer, default=0)
    one_star = Column(Integer, default=0)
    review_velocity_30d = Column(Integer, default=0)  # reviews added in last 30 days
    last_checked = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class PLBrandAsset(Base):
    __tablename__ = "pl_brand_assets"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("pl_products.id"), nullable=True)
    asset_type = Column(String, nullable=False)  # logo/trademark/a_plus/storefront/listing_images/video/brand_story
    name = Column(String, nullable=False)
    status = Column(String, default="not_started")  # not_started/in_progress/review/approved/published
    file_url = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("PLProduct", back_populates="brand_assets")


# =====================================================================
# Pydantic Schemas
# =====================================================================

class PLProductCreate(BaseModel):
    product_name: str
    brand_name: str
    category: str
    subcategory: Optional[str] = None
    market_size_est: Optional[float] = None
    competition_level: Optional[str] = None
    target_price: Optional[float] = None
    target_margin: Optional[float] = None
    target_bsr: Optional[int] = None
    main_keywords: Optional[List[str]] = None


class PLProductUpdate(BaseModel):
    product_name: Optional[str] = None
    brand_name: Optional[str] = None
    asin: Optional[str] = None
    status: Optional[str] = None
    market_size_est: Optional[float] = None
    competition_level: Optional[str] = None
    monthly_revenue_est: Optional[float] = None
    target_price: Optional[float] = None
    target_margin: Optional[float] = None
    target_bsr: Optional[int] = None
    main_keywords: Optional[List[str]] = None


class PLProductResponse(BaseModel):
    id: int
    org_id: str
    client_id: str
    product_name: str
    brand_name: str
    asin: Optional[str]
    category: str
    subcategory: Optional[str]
    status: str
    market_size_est: Optional[float]
    competition_level: Optional[str]
    monthly_revenue_est: Optional[float]
    target_price: Optional[float]
    target_margin: Optional[float]
    target_bsr: Optional[int]
    main_keywords: Optional[List[str]]
    validation_score: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PLSourcingLeadCreate(BaseModel):
    supplier_name: str
    supplier_country: str
    contact_info: Optional[str] = None
    alibaba_url: Optional[str] = None
    unit_price: Optional[float] = None
    moq: Optional[int] = None
    sample_price: Optional[float] = None
    lead_time_days: Optional[int] = None
    quality_rating: Optional[float] = None
    notes: Optional[str] = None


class PLSourcingLeadUpdate(BaseModel):
    supplier_name: Optional[str] = None
    supplier_country: Optional[str] = None
    contact_info: Optional[str] = None
    alibaba_url: Optional[str] = None
    unit_price: Optional[float] = None
    moq: Optional[int] = None
    sample_price: Optional[float] = None
    sample_status: Optional[str] = None
    production_status: Optional[str] = None
    lead_time_days: Optional[int] = None
    quality_rating: Optional[float] = None
    notes: Optional[str] = None


class PLSourcingLeadResponse(BaseModel):
    id: int
    product_id: int
    supplier_name: str
    supplier_country: str
    contact_info: Optional[str]
    alibaba_url: Optional[str]
    unit_price: Optional[float]
    moq: Optional[int]
    sample_price: Optional[float]
    sample_status: str
    production_status: str
    lead_time_days: Optional[int]
    quality_rating: Optional[float]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PLLaunchPlanCreate(BaseModel):
    launch_date: Optional[str] = None
    launch_budget: Optional[float] = None
    ppc_budget: Optional[float] = None
    review_target: Optional[int] = None
    giveaway_units: Optional[int] = None
    initial_inventory: Optional[int] = None
    keyword_targets: Optional[List[str]] = None


class PLLaunchPlanUpdate(BaseModel):
    launch_date: Optional[str] = None
    launch_budget: Optional[float] = None
    status: Optional[str] = None
    milestones: Optional[List[dict]] = None
    keyword_targets: Optional[List[str]] = None
    ppc_budget: Optional[float] = None
    review_target: Optional[int] = None
    giveaway_units: Optional[int] = None
    initial_inventory: Optional[int] = None


class PLLaunchPlanResponse(BaseModel):
    id: int
    product_id: int
    launch_date: Optional[str]
    launch_budget: Optional[float]
    status: str
    milestones: list
    keyword_targets: Optional[List[str]]
    ppc_budget: Optional[float]
    review_target: Optional[int]
    giveaway_units: Optional[int]
    initial_inventory: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class PLReviewTrackerCreate(BaseModel):
    asin: str
    total_reviews: int = 0
    average_rating: float = 0.0
    five_star: int = 0
    four_star: int = 0
    three_star: int = 0
    two_star: int = 0
    one_star: int = 0
    review_velocity_30d: int = 0


class PLReviewTrackerResponse(BaseModel):
    id: int
    org_id: str
    client_id: str
    asin: str
    total_reviews: int
    average_rating: float
    five_star: int
    four_star: int
    three_star: int
    two_star: int
    one_star: int
    review_velocity_30d: int
    last_checked: datetime

    class Config:
        from_attributes = True


class PLBrandAssetCreate(BaseModel):
    asset_type: str
    name: str
    notes: Optional[str] = None


class PLBrandAssetUpdate(BaseModel):
    asset_type: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None


class PLBrandAssetResponse(BaseModel):
    id: int
    org_id: str
    client_id: str
    product_id: Optional[int]
    asset_type: str
    name: str
    status: str
    file_url: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ValidationScoreResult(BaseModel):
    score: float  # 0-100
    market_size_rating: float
    competition_rating: float
    margin_rating: float
    demand_trend_rating: float
    barrier_to_entry_rating: float
    recommendation: str  # "GO", "NO-GO", "INVESTIGATE"
    rationale: str


# =====================================================================
# Validation Scoring Engine
# =====================================================================

def calculate_validation_score(product: PLProduct) -> ValidationScoreResult:
    """
    Scores a private label opportunity 0-100 based on:
    - Market size (25%)
    - Competition level (20%)
    - Margin potential (25%)
    - Demand trend (15%)
    - Barrier to entry (15%)
    """

    # Market size rating (0-100): estimated annual market size
    market_size_rating = 0
    if product.market_size_est:
        if product.market_size_est > 100_000_000:  # >$100M
            market_size_rating = 100
        elif product.market_size_est > 50_000_000:
            market_size_rating = 90
        elif product.market_size_est > 10_000_000:
            market_size_rating = 80
        elif product.market_size_est > 1_000_000:
            market_size_rating = 60
        else:
            market_size_rating = 30

    # Competition rating (0-100): inverse of competition level
    competition_rating = 0
    if product.competition_level == "low":
        competition_rating = 100
    elif product.competition_level == "medium":
        competition_rating = 70
    elif product.competition_level == "high":
        competition_rating = 40
    elif product.competition_level == "very_high":
        competition_rating = 15

    # Margin rating (0-100): target margin percentage
    margin_rating = 0
    if product.target_margin:
        if product.target_margin >= 50:
            margin_rating = 100
        elif product.target_margin >= 40:
            margin_rating = 90
        elif product.target_margin >= 30:
            margin_rating = 75
        elif product.target_margin >= 20:
            margin_rating = 50
        else:
            margin_rating = 20

    # Demand trend rating (0-100): estimated monthly revenue as proxy
    demand_trend_rating = 0
    if product.monthly_revenue_est:
        if product.monthly_revenue_est > 50_000:
            demand_trend_rating = 100
        elif product.monthly_revenue_est > 10_000:
            demand_trend_rating = 85
        elif product.monthly_revenue_est > 1_000:
            demand_trend_rating = 60
        else:
            demand_trend_rating = 30

    # Barrier to entry rating (0-100): based on BSR target and keyword complexity
    barrier_to_entry_rating = 0
    if product.target_bsr:
        if product.target_bsr < 5_000:  # Highly competitive
            barrier_to_entry_rating = 30
        elif product.target_bsr < 20_000:
            barrier_to_entry_rating = 50
        elif product.target_bsr < 100_000:
            barrier_to_entry_rating = 75
        else:
            barrier_to_entry_rating = 90
    elif product.main_keywords:
        # Fallback: use keyword complexity
        barrier_to_entry_rating = 60

    # Weighted score
    total_score = (
        (market_size_rating * 0.25) +
        (competition_rating * 0.20) +
        (margin_rating * 0.25) +
        (demand_trend_rating * 0.15) +
        (barrier_to_entry_rating * 0.15)
    )

    # Recommendation logic
    if total_score >= 75:
        recommendation = "GO"
        rationale = "Strong opportunity with favorable market conditions and profit potential."
    elif total_score >= 50:
        recommendation = "INVESTIGATE"
        rationale = "Mixed signals. Further research recommended before commitment."
    else:
        recommendation = "NO-GO"
        rationale = "Significant risks or unfavorable conditions. Consider alternatives."

    return ValidationScoreResult(
        score=round(total_score, 1),
        market_size_rating=round(market_size_rating, 1),
        competition_rating=round(competition_rating, 1),
        margin_rating=round(margin_rating, 1),
        demand_trend_rating=round(demand_trend_rating, 1),
        barrier_to_entry_rating=round(barrier_to_entry_rating, 1),
        recommendation=recommendation,
        rationale=rationale
    )


# =====================================================================
# Launch Playbook Generator
# =====================================================================

def generate_launch_playbook(product: PLProduct) -> List[dict]:
    """
    Generates a milestone checklist for product launch:
    1. Listing Created
    2. PPC Campaigns Live
    3. Review Campaign Started
    4. Inventory Check
    5. Week 1 Review
    6. Week 2 Optimization
    7. Month 1 Report
    """
    milestones = [
        {"milestone": "Listing Created", "completed": False, "date": None},
        {"milestone": "PPC Campaigns Live", "completed": False, "date": None},
        {"milestone": "Review Campaign Started", "completed": False, "date": None},
        {"milestone": "Inventory Check", "completed": False, "date": None},
        {"milestone": "Week 1 Review", "completed": False, "date": None},
        {"milestone": "Week 2 Optimization", "completed": False, "date": None},
        {"milestone": "Month 1 Report", "completed": False, "date": None},
    ]
    return milestones


# =====================================================================
# APIRouter Setup
# =====================================================================

router = APIRouter(prefix="/private-label", tags=["Private Label"])


# =====================================================================
# Private Label Products Endpoints
# =====================================================================

@router.post("/products")
def create_product(
    product: PLProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new private label product"""
    db_product = PLProduct(
        org_id=current_user.org_id,
        client_id=current_user.client_id,
        **product.dict()
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/products", response_model=List[PLProductResponse])
def list_products(
    status: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List private label products with optional filters"""
    query = db.query(PLProduct).filter(PLProduct.org_id == current_user.org_id)

    if client_id:
        query = query.filter(PLProduct.client_id == client_id)
    if status:
        query = query.filter(PLProduct.status == status)
    if category:
        query = query.filter(PLProduct.category == category)

    return query.order_by(PLProduct.created_at.desc()).all()


@router.get("/products/{product_id}", response_model=PLProductResponse)
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific product by ID"""
    product = db.query(PLProduct).filter(
        PLProduct.id == product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@router.put("/products/{product_id}", response_model=PLProductResponse)
def update_product(
    product_id: int,
    product_update: PLProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a private label product"""
    product = db.query(PLProduct).filter(
        PLProduct.id == product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    return product


@router.post("/products/{product_id}/validate")
def validate_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run validation scoring on a product"""
    product = db.query(PLProduct).filter(
        PLProduct.id == product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    validation_result = calculate_validation_score(product)

    # Update product with validation score
    product.validation_score = validation_result.score
    db.commit()

    return validation_result


# =====================================================================
# Sourcing Leads Endpoints
# =====================================================================

@router.post("/products/{product_id}/sourcing", response_model=PLSourcingLeadResponse)
def create_sourcing_lead(
    product_id: int,
    lead: PLSourcingLeadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new sourcing lead for a product"""
    product = db.query(PLProduct).filter(
        PLProduct.id == product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db_lead = PLSourcingLead(product_id=product_id, **lead.dict())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead


@router.get("/products/{product_id}/sourcing", response_model=List[PLSourcingLeadResponse])
def list_sourcing_leads(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List sourcing leads for a product"""
    product = db.query(PLProduct).filter(
        PLProduct.id == product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return db.query(PLSourcingLead).filter(
        PLSourcingLead.product_id == product_id
    ).order_by(PLSourcingLead.created_at.desc()).all()


@router.put("/sourcing/{lead_id}", response_model=PLSourcingLeadResponse)
def update_sourcing_lead(
    lead_id: int,
    lead_update: PLSourcingLeadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a sourcing lead"""
    lead = db.query(PLSourcingLead).filter(PLSourcingLead.id == lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Sourcing lead not found")

    # Verify authorization
    product = db.query(PLProduct).filter(
        PLProduct.id == lead.product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=403, detail="Unauthorized")

    update_data = lead_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead


# =====================================================================
# Launch Plans Endpoints
# =====================================================================

@router.post("/products/{product_id}/launch-plan", response_model=PLLaunchPlanResponse)
def create_launch_plan(
    product_id: int,
    plan: PLLaunchPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a launch plan for a product"""
    product = db.query(PLProduct).filter(
        PLProduct.id == product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Generate milestones
    milestones = generate_launch_playbook(product)

    db_plan = PLLaunchPlan(
        product_id=product_id,
        milestones=milestones,
        **plan.dict()
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan


@router.get("/products/{product_id}/launch-plan", response_model=PLLaunchPlanResponse)
def get_launch_plan(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get launch plan for a product"""
    product = db.query(PLProduct).filter(
        PLProduct.id == product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    plan = db.query(PLLaunchPlan).filter(
        PLLaunchPlan.product_id == product_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Launch plan not found")

    return plan


@router.put("/launch-plans/{plan_id}", response_model=PLLaunchPlanResponse)
def update_launch_plan(
    plan_id: int,
    plan_update: PLLaunchPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a launch plan"""
    plan = db.query(PLLaunchPlan).filter(PLLaunchPlan.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Launch plan not found")

    # Verify authorization
    product = db.query(PLProduct).filter(
        PLProduct.id == plan.product_id,
        PLProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=403, detail="Unauthorized")

    update_data = plan_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)

    plan.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(plan)
    return plan


# =====================================================================
# Review Tracker Endpoints
# =====================================================================

@router.post("/review-tracker", response_model=PLReviewTrackerResponse)
def create_review_entry(
    review: PLReviewTrackerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a review tracker entry"""
    existing = db.query(PLReviewTracker).filter(
        PLReviewTracker.org_id == current_user.org_id,
        PLReviewTracker.client_id == current_user.client_id,
        PLReviewTracker.asin == review.asin
    ).first()

    if existing:
        # Update existing
        update_data = review.dict()
        for field, value in update_data.items():
            setattr(existing, field, value)
        existing.last_checked = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    db_review = PLReviewTracker(
        org_id=current_user.org_id,
        client_id=current_user.client_id,
        **review.dict()
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review


@router.get("/review-tracker", response_model=List[PLReviewTrackerResponse])
def list_review_trackers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all review tracker entries for current user"""
    return db.query(PLReviewTracker).filter(
        PLReviewTracker.org_id == current_user.org_id,
        PLReviewTracker.client_id == current_user.client_id
    ).order_by(PLReviewTracker.last_checked.desc()).all()


@router.get("/review-tracker/{asin}", response_model=PLReviewTrackerResponse)
def get_review_tracker(
    asin: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get review history for a specific ASIN"""
    tracker = db.query(PLReviewTracker).filter(
        PLReviewTracker.org_id == current_user.org_id,
        PLReviewTracker.client_id == current_user.client_id,
        PLReviewTracker.asin == asin
    ).first()

    if not tracker:
        raise HTTPException(status_code=404, detail="Review tracker not found")

    return tracker


# =====================================================================
# Brand Assets Endpoints
# =====================================================================

@router.post("/brand-assets", response_model=PLBrandAssetResponse)
def create_brand_asset(
    asset: PLBrandAssetCreate,
    product_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new brand asset"""
    if product_id:
        product = db.query(PLProduct).filter(
            PLProduct.id == product_id,
            PLProduct.org_id == current_user.org_id
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    db_asset = PLBrandAsset(
        org_id=current_user.org_id,
        client_id=current_user.client_id,
        product_id=product_id,
        **asset.dict()
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset


@router.get("/brand-assets", response_model=List[PLBrandAssetResponse])
def list_brand_assets(
    product_id: Optional[int] = Query(None),
    asset_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List brand assets"""
    query = db.query(PLBrandAsset).filter(
        PLBrandAsset.org_id == current_user.org_id,
        PLBrandAsset.client_id == current_user.client_id
    )

    if product_id:
        query = query.filter(PLBrandAsset.product_id == product_id)
    if asset_type:
        query = query.filter(PLBrandAsset.asset_type == asset_type)

    return query.order_by(PLBrandAsset.created_at.desc()).all()


@router.put("/brand-assets/{asset_id}", response_model=PLBrandAssetResponse)
def update_brand_asset(
    asset_id: int,
    asset_update: PLBrandAssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a brand asset"""
    asset = db.query(PLBrandAsset).filter(
        PLBrandAsset.id == asset_id,
        PLBrandAsset.org_id == current_user.org_id
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Brand asset not found")

    update_data = asset_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)

    asset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(asset)
    return asset


# =====================================================================
# Dashboard Endpoint
# =====================================================================

class DashboardSummary(BaseModel):
    total_products: int
    products_by_status: dict
    active_launches: int
    review_health: dict
    avg_validation_score: float


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Private Label dashboard summary"""
    # Total products
    total_products = db.query(func.count(PLProduct.id)).filter(
        PLProduct.org_id == current_user.org_id,
        PLProduct.client_id == current_user.client_id
    ).scalar() or 0

    # Products by status
    status_counts = db.query(
        PLProduct.status,
        func.count(PLProduct.id).label("count")
    ).filter(
        PLProduct.org_id == current_user.org_id,
        PLProduct.client_id == current_user.client_id
    ).group_by(PLProduct.status).all()

    products_by_status = {status: count for status, count in status_counts}

    # Active launches
    active_launches = db.query(func.count(PLLaunchPlan.id)).filter(
        PLLaunchPlan.status.in_(["planning", "pre_launch", "launching"])
    ).join(PLProduct).filter(
        PLProduct.org_id == current_user.org_id,
        PLProduct.client_id == current_user.client_id
    ).scalar() or 0

    # Review health
    reviews = db.query(PLReviewTracker).filter(
        PLReviewTracker.org_id == current_user.org_id,
        PLReviewTracker.client_id == current_user.client_id
    ).all()

    healthy = sum(1 for r in reviews if r.average_rating > 4.3)
    warning = sum(1 for r in reviews if 4.0 <= r.average_rating <= 4.3)
    critical = sum(1 for r in reviews if r.average_rating < 4.0)

    review_health = {
        "healthy": healthy,
        "warning": warning,
        "critical": critical,
        "total": len(reviews)
    }

    # Average validation score
    avg_score = db.query(func.avg(PLProduct.validation_score)).filter(
        PLProduct.org_id == current_user.org_id,
        PLProduct.client_id == current_user.client_id,
        PLProduct.validation_score.isnot(None)
    ).scalar() or 0.0

    return DashboardSummary(
        total_products=total_products,
        products_by_status=products_by_status,
        active_launches=active_launches,
        review_health=review_health,
        avg_validation_score=round(avg_score, 1)
    )
