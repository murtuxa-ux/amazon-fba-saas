"""
Ecom Era Client Portal & Onboarding Module
Phase 2: Complete client management, onboarding wizard, and notes system
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import List, Optional
import enum

from auth import get_current_user
from database import get_db, Base, engine
from models import User

# ============================================================================
# ENUMS
# ============================================================================

class MarketplaceEnum(str, enum.Enum):
    US = "US"
    CA = "CA"
    UK = "UK"
    DE = "DE"
    FR = "FR"
    ES = "ES"
    IT = "IT"
    AU = "AU"
    JP = "JP"


class OnboardingStatusEnum(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class NoteTypeEnum(str, enum.Enum):
    GENERAL = "general"
    MEETING = "meeting"
    ACTION = "action"
    MILESTONE = "milestone"


# ============================================================================
# SQLALCHEMY MODELS
# ============================================================================

class ClientProfile(Base):
    """Client profile and account information"""
    __tablename__ = "client_profiles"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)

    # Company info
    company_name = Column(String(255), nullable=False)
    brand_name = Column(String(255), nullable=False)
    amazon_store_url = Column(String(500), nullable=True)
    marketplace = Column(String(50), default="US", nullable=False)
    main_category = Column(String(255), nullable=True)

    # Business metrics
    monthly_revenue = Column(Integer, default=0, nullable=False)
    product_count = Column(Integer, default=0, nullable=False)

    # Onboarding
    onboarding_status = Column(String(50), default="pending", nullable=False)
    onboarding_step = Column(Integer, default=0, nullable=False)

    # Performance targets
    target_acos = Column(Integer, nullable=True)
    target_tacos = Column(Integer, nullable=True)
    target_margin = Column(Integer, nullable=True)

    # Notifications
    notification_email = Column(String(255), nullable=True)
    notification_preferences = Column(JSON, default={
        "weekly_digest": True,
        "critical_alerts": True,
        "monthly_report": True
    }, nullable=False)

    # Branding
    logo_url = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    onboarding_checklist = relationship("OnboardingChecklist", back_populates="client", cascade="all, delete-orphan")
    notes = relationship("ClientNote", back_populates="client", cascade="all, delete-orphan")


class OnboardingChecklist(Base):
    """Onboarding steps and completion tracking"""
    __tablename__ = "onboarding_checklist"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("client_profiles.id"), index=True, nullable=False)

    step_name = Column(String(255), nullable=False)
    step_order = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)

    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    client = relationship("ClientProfile", back_populates="onboarding_checklist")


class ClientNote(Base):
    """Client notes and interaction tracking"""
    __tablename__ = "client_notes"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("client_profiles.id"), index=True, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    note_type = Column(String(50), default="general", nullable=False)
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    client = relationship("ClientProfile", back_populates="notes")


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class NotificationPreferences(BaseModel):
    weekly_digest: bool = True
    critical_alerts: bool = True
    monthly_report: bool = True


class ClientProfileCreate(BaseModel):
    company_name: str
    brand_name: str
    amazon_store_url: Optional[str] = None
    marketplace: str = "US"
    main_category: Optional[str] = None
    monthly_revenue: int = 0
    product_count: int = 0
    target_acos: Optional[int] = None
    target_tacos: Optional[int] = None
    target_margin: Optional[int] = None
    notification_email: Optional[EmailStr] = None
    notification_preferences: Optional[NotificationPreferences] = None
    logo_url: Optional[str] = None

    @validator("marketplace")
    def validate_marketplace(cls, v):
        valid_markets = [m.value for m in MarketplaceEnum]
        if v not in valid_markets:
            raise ValueError(f"Invalid marketplace. Must be one of {valid_markets}")
        return v


class ClientProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    brand_name: Optional[str] = None
    amazon_store_url: Optional[str] = None
    marketplace: Optional[str] = None
    main_category: Optional[str] = None
    monthly_revenue: Optional[int] = None
    product_count: Optional[int] = None
    target_acos: Optional[int] = None
    target_tacos: Optional[int] = None
    target_margin: Optional[int] = None
    notification_email: Optional[EmailStr] = None
    notification_preferences: Optional[NotificationPreferences] = None
    logo_url: Optional[str] = None


class ClientProfileResponse(BaseModel):
    id: int
    company_name: str
    brand_name: str
    amazon_store_url: Optional[str]
    marketplace: str
    main_category: Optional[str]
    monthly_revenue: int
    product_count: int
    onboarding_status: str
    onboarding_step: int
    target_acos: Optional[int]
    target_tacos: Optional[int]
    target_margin: Optional[int]
    notification_email: Optional[str]
    notification_preferences: dict
    logo_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OnboardingChecklistItemResponse(BaseModel):
    id: int
    step_name: str
    step_order: int
    description: Optional[str]
    is_completed: bool
    completed_at: Optional[datetime]
    completed_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OnboardingChecklistResponse(BaseModel):
    client_id: int
    items: List[OnboardingChecklistItemResponse]
    completion_percentage: float
    all_completed: bool

    class Config:
        from_attributes = True


class ClientNoteCreate(BaseModel):
    note_type: str = "general"
    content: str
    is_pinned: bool = False

    @validator("note_type")
    def validate_note_type(cls, v):
        valid_types = [t.value for t in NoteTypeEnum]
        if v not in valid_types:
            raise ValueError(f"Invalid note type. Must be one of {valid_types}")
        return v


class ClientNoteResponse(BaseModel):
    id: int
    note_type: str
    content: str
    is_pinned: bool
    author_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientOverviewItem(BaseModel):
    id: int
    company_name: str
    brand_name: str
    marketplace: str
    monthly_revenue: int
    product_count: int
    onboarding_status: str
    onboarding_step: int
    completion_percentage: float


class ClientOverviewResponse(BaseModel):
    total_clients: int
    pending_onboarding: int
    in_progress_onboarding: int
    completed_onboarding: int
    clients: List[ClientOverviewItem]


# ============================================================================
# ROUTER & ENDPOINTS
# ============================================================================

router = APIRouter(prefix="/client-portal", tags=["Client Portal"])

# Default onboarding template
DEFAULT_ONBOARDING_STEPS = [
    {
        "step_name": "Welcome Call",
        "step_order": 1,
        "description": "Initial consultation with client to understand goals and timeline"
    },
    {
        "step_name": "Amazon Credentials",
        "step_order": 2,
        "description": "Securely collect Amazon Seller Central credentials and verify access"
    },
    {
        "step_name": "Product Catalog Setup",
        "step_order": 3,
        "description": "Import and organize product catalog, validate listings"
    },
    {
        "step_name": "PPC Audit",
        "step_order": 4,
        "description": "Complete audit of existing campaigns and ad spend"
    },
    {
        "step_name": "Target Setting",
        "step_order": 5,
        "description": "Define ACoS, TACOS, and margin targets with client"
    },
    {
        "step_name": "First Report",
        "step_order": 6,
        "description": "Generate and review baseline performance report"
    },
    {
        "step_name": "Strategy Approval",
        "step_order": 7,
        "description": "Present strategy recommendations and secure client approval"
    },
    {
        "step_name": "Go Live",
        "step_order": 8,
        "description": "Launch optimization campaigns and monitor initial results"
    }
]


def get_onboarding_progress(checklist: List[OnboardingChecklist]) -> tuple:
    """Calculate onboarding progress percentage and status"""
    if not checklist:
        return 0, False

    completed = sum(1 for item in checklist if item.is_completed)
    total = len(checklist)
    percentage = (completed / total * 100) if total > 0 else 0
    all_completed = completed == total

    return percentage, all_completed


def create_onboarding_checklist(client_id: int, db: Session):
    """Create default onboarding checklist for a new client"""
    for step in DEFAULT_ONBOARDING_STEPS:
        checklist_item = OnboardingChecklist(
            client_id=client_id,
            step_name=step["step_name"],
            step_order=step["step_order"],
            description=step["description"],
            is_completed=False
        )
        db.add(checklist_item)
    db.commit()


@router.post("/profiles", response_model=ClientProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_client_profile(
    profile: ClientProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new client profile"""
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    db_profile = ClientProfile(
        org_id=current_user.org_id,
        user_id=current_user.id,
        company_name=profile.company_name,
        brand_name=profile.brand_name,
        amazon_store_url=profile.amazon_store_url,
        marketplace=profile.marketplace,
        main_category=profile.main_category,
        monthly_revenue=profile.monthly_revenue,
        product_count=profile.product_count,
        target_acos=profile.target_acos,
        target_tacos=profile.target_tacos,
        target_margin=profile.target_margin,
        notification_email=profile.notification_email or current_user.email,
        notification_preferences=profile.notification_preferences.dict() if profile.notification_preferences else {},
        logo_url=profile.logo_url,
        onboarding_status="pending"
    )

    db.add(db_profile)
    db.flush()

    create_onboarding_checklist(db_profile.id, db)

    db.commit()
    db.refresh(db_profile)

    return db_profile


@router.get("/profiles", response_model=List[ClientProfileResponse])
async def list_client_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List all client profiles for the organization"""
    profiles = db.query(ClientProfile).filter(
        ClientProfile.org_id == current_user.org_id
    ).offset(skip).limit(limit).all()

    return profiles


@router.get("/profiles/{profile_id}", response_model=ClientProfileResponse)
async def get_client_profile(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific client profile"""
    profile = db.query(ClientProfile).filter(
        ClientProfile.id == profile_id,
        ClientProfile.org_id == current_user.org_id
    ).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client profile not found")

    return profile


@router.put("/profiles/{profile_id}", response_model=ClientProfileResponse)
async def update_client_profile(
    profile_id: int,
    profile_update: ClientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a client profile"""
    if current_user.role not in ["owner", "admin", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    profile = db.query(ClientProfile).filter(
        ClientProfile.id == profile_id,
        ClientProfile.org_id == current_user.org_id
    ).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client profile not found")

    for field, value in profile_update.dict(exclude_unset=True).items():
        if field == "notification_preferences" and value:
            setattr(profile, field, value.dict())
        else:
            setattr(profile, field, value)

    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)

    return profile


@router.get("/profiles/{profile_id}/onboarding", response_model=OnboardingChecklistResponse)
async def get_onboarding_checklist(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get onboarding checklist for a client"""
    profile = db.query(ClientProfile).filter(
        ClientProfile.id == profile_id,
        ClientProfile.org_id == current_user.org_id
    ).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client profile not found")

    checklist = db.query(OnboardingChecklist).filter(
        OnboardingChecklist.client_id == profile_id
    ).order_by(OnboardingChecklist.step_order).all()

    completion_percentage, all_completed = get_onboarding_progress(checklist)

    return OnboardingChecklistResponse(
        client_id=profile_id,
        items=checklist,
        completion_percentage=completion_percentage,
        all_completed=all_completed
    )


@router.put("/profiles/{profile_id}/onboarding/{step_id}", response_model=OnboardingChecklistItemResponse)
async def mark_onboarding_step_complete(
    profile_id: int,
    step_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an onboarding step as complete"""
    profile = db.query(ClientProfile).filter(
        ClientProfile.id == profile_id,
        ClientProfile.org_id == current_user.org_id
    ).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client profile not found")

    step = db.query(OnboardingChecklist).filter(
        OnboardingChecklist.id == step_id,
        OnboardingChecklist.client_id == profile_id
    ).first()

    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onboarding step not found")

    step.is_completed = True
    step.completed_at = datetime.utcnow()
    step.completed_by = current_user.id
    step.updated_at = datetime.utcnow()

    checklist = db.query(OnboardingChecklist).filter(
        OnboardingChecklist.client_id == profile_id
    ).all()

    completion_percentage, all_completed = get_onboarding_progress(checklist)

    if completion_percentage > 0:
        profile.onboarding_status = "in_progress"
    if all_completed:
        profile.onboarding_status = "completed"

    profile.onboarding_step = max(item.step_order for item in checklist if item.is_completed)
    profile.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(step)

    return step


@router.post("/profiles/{profile_id}/onboarding/reset")
async def reset_onboarding(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset onboarding for a client"""
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    profile = db.query(ClientProfile).filter(
        ClientProfile.id == profile_id,
        ClientProfile.org_id == current_user.org_id
    ).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client profile not found")

    steps = db.query(OnboardingChecklist).filter(
        OnboardingChecklist.client_id == profile_id
    ).all()

    for step in steps:
        step.is_completed = False
        step.completed_at = None
        step.completed_by = None
        step.updated_at = datetime.utcnow()

    profile.onboarding_status = "pending"
    profile.onboarding_step = 0
    profile.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Onboarding reset successfully", "profile_id": profile_id}


@router.get("/profiles/{profile_id}/notes", response_model=List[ClientNoteResponse])
async def get_client_notes(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get all notes for a client"""
    profile = db.query(ClientProfile).filter(
        ClientProfile.id == profile_id,
        ClientProfile.org_id == current_user.org_id
    ).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client profile not found")

    notes = db.query(ClientNote).filter(
        ClientNote.org_id == current_user.org_id,
        ClientNote.client_id == profile_id,
    ).order_by(
        ClientNote.is_pinned.desc(),
        ClientNote.created_at.desc()
    ).offset(skip).limit(limit).all()

    return notes


@router.post("/profiles/{profile_id}/notes", response_model=ClientNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_client_note(
    profile_id: int,
    note: ClientNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new note for a client"""
    profile = db.query(ClientProfile).filter(
        ClientProfile.id == profile_id,
        ClientProfile.org_id == current_user.org_id
    ).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client profile not found")

    db_note = ClientNote(
        org_id=current_user.org_id,
        client_id=profile_id,
        author_id=current_user.id,
        note_type=note.note_type,
        content=note.content,
        is_pinned=note.is_pinned
    )

    db.add(db_note)
    db.commit()
    db.refresh(db_note)

    return db_note


@router.get("/my-dashboard", response_model=ClientProfileResponse)
async def get_my_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard for the current client user"""
    profile = db.query(ClientProfile).filter(
        ClientProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No client profile found for current user")

    return profile


@router.get("/overview", response_model=ClientOverviewResponse)
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overview of all clients and onboarding progress"""
    if current_user.role not in ["owner", "admin", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    profiles = db.query(ClientProfile).filter(
        ClientProfile.org_id == current_user.org_id
    ).all()

    clients_overview = []
    pending_count = 0
    in_progress_count = 0
    completed_count = 0

    for profile in profiles:
        checklist = db.query(OnboardingChecklist).filter(
            OnboardingChecklist.client_id == profile.id
        ).all()

        completion_percentage, _ = get_onboarding_progress(checklist)

        clients_overview.append(ClientOverviewItem(
            id=profile.id,
            company_name=profile.company_name,
            brand_name=profile.brand_name,
            marketplace=profile.marketplace,
            monthly_revenue=profile.monthly_revenue,
            product_count=profile.product_count,
            onboarding_status=profile.onboarding_status,
            onboarding_step=profile.onboarding_step,
            completion_percentage=completion_percentage
        ))

        if profile.onboarding_status == "pending":
            pending_count += 1
        elif profile.onboarding_status == "in_progress":
            in_progress_count += 1
        elif profile.onboarding_status == "completed":
            completed_count += 1

    return ClientOverviewResponse(
        total_clients=len(profiles),
        pending_onboarding=pending_count,
        in_progress_onboarding=in_progress_count,
        completed_onboarding=completed_count,
        clients=clients_overview
    )
