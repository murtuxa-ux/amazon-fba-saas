"""
Brand Approval & Ungating Tracker Module
Manages Amazon brand ungating/approval requests for Ecom Era FBA/FBM platform
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, func, text
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from auth import get_current_user
from database import get_db
from models import User, Organization, BrandApproval, BrandDocument, BrandTimeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/brand-approvals", tags=["brand-approvals"])


# ============================================================================
# Enums
# ============================================================================

class ApprovalStatus(str, Enum):
    """Brand approval request statuses"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"


class DocumentType(str, Enum):
    """Types of documents required for brand approval"""
    INVOICE = "invoice"
    LETTER_OF_AUTHORIZATION = "letter_of_authorization"
    CERTIFICATE = "certificate"
    OTHER = "other"


class EventType(str, Enum):
    """Timeline event types"""
    SUBMITTED = "submitted"
    DOCUMENT_REQUESTED = "document_requested"
    DOCUMENT_UPLOADED = "document_uploaded"
    APPROVED = "approved"
    REJECTED = "rejected"
    FOLLOW_UP = "follow_up"


class Priority(str, Enum):
    """Request priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ============================================================================
# Pydantic Schemas
# ============================================================================

class DocumentChecklistItem(BaseModel):
    """Document checklist item schema"""
    id: Optional[int] = None
    document_name: str
    document_type: DocumentType
    is_submitted: bool = False
    is_verified: bool = False
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TimelineEvent(BaseModel):
    """Timeline event schema"""
    id: Optional[int] = None
    event_type: EventType
    description: str
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BrandApprovalCreate(BaseModel):
    """Schema for creating a brand approval request"""
    brand_name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    account_id: Optional[int] = None
    notes: Optional[str] = None
    priority: Priority = Priority.MEDIUM


class BrandApprovalUpdate(BaseModel):
    """Schema for updating a brand approval request"""
    status: Optional[ApprovalStatus] = None
    priority: Optional[Priority] = None
    notes: Optional[str] = None
    documents_submitted: Optional[int] = None


class BrandApprovalResponse(BaseModel):
    """Full brand approval response schema"""
    id: int
    org_id: int
    brand_name: str
    category: str
    account_id: Optional[int]
    status: ApprovalStatus
    priority: Priority
    notes: Optional[str]
    documents_required: int
    documents_submitted: int
    submitted_date: Optional[datetime]
    resolved_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    documents: List[DocumentChecklistItem] = []
    timeline: List[TimelineEvent] = []

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    """Schema for creating a document checklist item"""
    document_name: str = Field(..., min_length=1, max_length=255)
    document_type: DocumentType
    is_submitted: bool = False
    notes: Optional[str] = None


class DocumentUpdate(BaseModel):
    """Schema for updating document status"""
    is_submitted: Optional[bool] = None
    is_verified: Optional[bool] = None
    notes: Optional[str] = None


class TimelineEventCreate(BaseModel):
    """Schema for creating a timeline event"""
    event_type: EventType
    description: str = Field(..., min_length=1, max_length=500)


class CategoryRequirements(BaseModel):
    """Category requirements schema"""
    category: str
    typically_required_docs: List[str]
    avg_approval_days: int
    difficulty_level: str  # easy, medium, hard
    tips: List[str]


class ApprovalStats(BaseModel):
    """Dashboard statistics schema"""
    total_applications: int
    approved_count: int
    pending_count: int
    rejected_count: int
    in_progress_count: int
    approval_rate_pct: float
    avg_processing_days: float
    by_category: Dict[str, Dict[str, Any]]


# ============================================================================
# Mock Category Requirements Data
# ============================================================================

CATEGORY_REQUIREMENTS = {
    "Beauty": CategoryRequirements(
        category="Beauty",
        typically_required_docs=["Invoice", "Certificate of Authority", "GS1 Registration"],
        avg_approval_days=14,
        difficulty_level="medium",
        tips=[
            "Provide recent invoices from brand owner",
            "Ensure GS1 codes are correctly registered",
            "Include letter of authorization from brand"
        ]
    ),
    "Supplements": CategoryRequirements(
        category="Supplements",
        typically_required_docs=["Invoice", "Dietary Supplement Label", "Compliance Certificate"],
        avg_approval_days=21,
        difficulty_level="hard",
        tips=[
            "Obtain FDA compliance documentation",
            "Include full ingredient list and sourcing",
            "Provide manufacturing facility certifications"
        ]
    ),
    "Automotive": CategoryRequirements(
        category="Automotive",
        typically_required_docs=["Invoice", "Manufacturer ID", "Product Specification"],
        avg_approval_days=10,
        difficulty_level="easy",
        tips=[
            "Include OEM certification if applicable",
            "Provide detailed product specifications",
            "Include brand registration number"
        ]
    ),
    "Electronics": CategoryRequirements(
        category="Electronics",
        typically_required_docs=["Invoice", "FCC Certification", "Warranty Information"],
        avg_approval_days=7,
        difficulty_level="easy",
        tips=[
            "Provide FCC/CE certifications",
            "Include manufacturer warranty details",
            "Ensure UPC/EAN registration"
        ]
    ),
    "Jewelry": CategoryRequirements(
        category="Jewelry",
        typically_required_docs=["Invoice", "Hallmark Certificate", "Authenticity Certificate"],
        avg_approval_days=28,
        difficulty_level="hard",
        tips=[
            "Provide hallmark/purity certificates",
            "Include letter of authorization from designer",
            "Document full chain of custody"
        ]
    ),
    "Watches": CategoryRequirements(
        category="Watches",
        typically_required_docs=["Invoice", "Brand Authorization", "Authenticity Certificate"],
        avg_approval_days=14,
        difficulty_level="medium",
        tips=[
            "Obtain written brand authorization",
            "Include warranty registration",
            "Provide authentic serial number documentation"
        ]
    ),
    "Clothing": CategoryRequirements(
        category="Clothing",
        typically_required_docs=["Invoice", "Brand Documentation"],
        avg_approval_days=7,
        difficulty_level="easy",
        tips=[
            "Recent wholesale invoice sufficient",
            "Brand name clearly documented",
            "Size/color range documentation helpful"
        ]
    ),
}

# ============================================================================
# Helper Functions
# ============================================================================

def get_user_org_scope(current_user: User) -> int:
    """Get org_id from current user"""
    return current_user.org_id


def calculate_processing_days(submitted_date: Optional[datetime], resolved_date: Optional[datetime]) -> Optional[int]:
    """Calculate processing days between submission and resolution"""
    if not submitted_date or not resolved_date:
        return None
    delta = resolved_date - submitted_date
    return delta.days


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/", response_model=List[BrandApprovalResponse])
def list_brand_approvals(
    status: Optional[ApprovalStatus] = Query(None),
    category: Optional[str] = Query(None),
    account_id: Optional[int] = Query(None),
    priority: Optional[Priority] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all brand approval requests for the current organization.

    Filters:
    - status: pending, in_progress, approved, rejected
    - category: product category
    - account_id: specific Amazon account
    - priority: high, medium, low
    """
    try:
        query = db.query(BrandApproval).filter(
            BrandApproval.org_id == get_user_org_scope(current_user)
        )

        if status:
            query = query.filter(BrandApproval.status == status)
        if category:
            query = query.filter(BrandApproval.category.ilike(f"%{category}%"))
        if account_id:
            query = query.filter(BrandApproval.account_id == account_id)
        if priority:
            query = query.filter(BrandApproval.priority == priority)

        approvals = query.order_by(BrandApproval.created_at.desc()).offset(skip).limit(limit).all()

        logger.info(
            f"Listed {len(approvals)} brand approvals for org_id={get_user_org_scope(current_user)}, "
            f"filters: status={status}, category={category}"
        )
        return approvals

    except Exception as e:
        logger.error(f"Error listing brand approvals: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list brand approvals")


@router.post("/", response_model=BrandApprovalResponse, status_code=status.HTTP_201_CREATED)
def create_brand_approval(
    approval: BrandApprovalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new brand approval request.

    Input:
    - brand_name: Name of the brand
    - category: Product category
    - account_id: Optional Amazon account ID
    - notes: Optional notes
    - priority: high, medium, or low
    """
    try:
        new_approval = BrandApproval(
            org_id=get_user_org_scope(current_user),
            brand_name=approval.brand_name,
            category=approval.category,
            account_id=approval.account_id,
            status=ApprovalStatus.PENDING,
            priority=approval.priority,
            notes=approval.notes,
            documents_required=0,
         documents_submitted=0,
            submitted_date=datetime.utcnow(),
        )
        db.add(new_approval)
        db.flush()

        # Add timeline event
        timeline_event = BrandTimeline(
            approval_id=new_approval.id,
            event_type=EventType.SUBMITTED,
            description=f"Brand approval request created for {approval.brand_name}",
            created_by=current_user.email,
        )
        db.add(timeline_event)
        db.commit()

        logger.info(
            f"Created brand approval request id={new_approval.id}, brand={approval.brand_name}, "
            f"org_id={get_user_org_scope(current_user)}"
        )
        return new_approval

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating brand approval: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create brand approval")


@router.get("/{approval_id}", response_model=BrandApprovalResponse)
def get_brand_approval(
    approval_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed approval status with timeline"""
    try:
        approval = db.query(BrandApproval).filter(
            and_(
                BrandApproval.id == approval_id,
                BrandApproval.org_id == get_user_org_scope(current_user),
            )
        ).first()

        if not approval:
            raise HTTPException(status_code=404, detail="Brand approval not found")

        logger.info(f"Retrieved brand approval id={approval_id}")
        return approval

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving brand approval: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve brand approval")


@router.put("/{approval_id}", response_model=BrandApprovalResponse)
def update_brand_approval(
    approval_id: int,
    update_data: BrandApprovalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update brand approval status, priority, or notes"""
    try:
        approval = db.query(BrandApproval).filter(
            and_(
                BrandApproval.id == approval_id,
                BrandApproval.org_id == get_user_org_scope(current_user),
            )
        ).first()

        if not approval:
            raise HTTPException(status_code=404, detail="Brand approval not found")

        update_dict = update_data.model_dump(exclude_unset=True)

        # Track status changes for timeline
        old_status = approval.status
        if "status" in update_dict:
            new_status = update_dict["status"]
            if new_status != old_status:
                approval.resolved_date = datetime.utcnow()

                # Add timeline event for status change
                event_type = EventType.APPROVED if new_status == ApprovalStatus.APPROVED else EventType.REJECTED
                timeline_event = BrandTimeline(
                    approval_id=approval.id,
                    event_type=event_type,
                    description=f"Status changed from {old_status} to {new_status}",
                    created_by=current_user.email,
                )
                db.add(timeline_event)

        for key, value in update_dict.items():
            setattr(approval, key, value)

        approval.updated_at = datetime.utcnow()
        db.commit()

        logger.info(
            f"Updated brand approval id={approval_id}, status={approval.status}, "
            f"org_id={get_user_org_scope(current_user)}"
        )
        return approval

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating brand approval: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update brand approval")


@router.delete("/{approval_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand_approval(
    approval_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a brand approval request"""
    try:
        approval = db.query(BrandApproval).filter(
            and_(
                BrandApproval.id == approval_id,
                BrandApproval.org_id == get_user_org_scope(current_user),
            )
        ).first()

        if not approval:
            raise HTTPException(status_code=404, detail="Brand approval not found")

        # Delete related documents and timeline events
        db.query(BrandDocument).filter(BrandDocument.approval_id == approval_id).delete()
        db.query(BrandTimeline).filter(BrandTimeline.approval_id == approval_id).delete()

        db.delete(approval)
        db.commit()

        logger.info(f"Deleted brand approval id={approval_id}, org_id={get_user_org_scope(current_user)}")

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting brand approval: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete brand approval")


# ============================================================================
# Document Management Endpoints
# ============================================================================

@router.post("/{approval_id}/documents", response_model=DocumentChecklistItem, status_code=status.HTTP_201_CREATED)
def add_document_to_approval(
    approval_id: int,
    document: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add a required document checklist item to an approval request.

    Input:
    - document_name: Name of the document
    - document_type: invoice, letter_of_authorization, certificate, or other
    - is_submitted: Whether document is submitted
    - notes: Optional notes about the document
    """
    try:
        approval = db.query(BrandApproval).filter(
            and_(
                BrandApproval.id == approval_id,
                BrandApproval.org_id == get_user_org_scope(current_user),
            )
        ).first()

        if not approval:
            raise HTTPException(status_code=404, detail="Brand approval not found")

        new_document = BrandDocument(
            approval_id=approval_id,
            document_name=document.document_name,
            document_type=document.document_type,
            is_submitted=document.is_submitted,
            is_verified=False,
            notes=document.notes,
        )
        db.add(new_document)

        # Update documents_required count
        approval.documents_required = db.query(func.count(BrandDocument.id)).filter(
            BrandDocument.approval_id == approval_id
        ).scalar() + 1

        approval.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Added document to approval id={approval_id}: {document.document_name}")
        return new_document

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding document to approval: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add document to approval")


@router.get("/{approval_id}/documents", response_model=List[DocumentChecklistItem])
def get_approval_documents(
    approval_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all document checklist items for an approval request"""
    try:
        approval = db.query(BrandApproval).filter(
            and_(
                BrandApproval.id == approval_id,
                BrandApproval.org_id == get_user_org_scope(current_user),
            )
        ).first()

        if not approval:
            raise HTTPException(status_code=404, detail="Brand approval not found")

        documents = db.query(BrandDocument).filter(
            BrandDocument.approval_id == approval_id
        ).order_by(BrandDocument.created_at).all()

        logger.info(f"Retrieved {len(documents)} documents for approval id={approval_id}")
        return documents

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving approval documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve approval documents")


@router.put("/{approval_id}/documents/{doc_id}", response_model=DocumentChecklistItem)
def update_document_status(
    approval_id: int,
    doc_id: int,
    update_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update document submission or verification status"""
    try:
        approval = db.query(BrandApproval).filter(
            and_(
                BrandApproval.id == approval_id,
                BrandApproval.org_id == get_user_org_scope(current_user),
            )
        ).first()

        if not approval:
            raise HTTPException(status_code=404, detail="Brand approval not found")

        document = db.query(BrandDocument).filter(
            and_(
                BrandDocument.id == doc_id,
                BrandDocument.approval_id == approval_id,
            )
        ).first()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        update_dict = update_data.model_dump(exclude_unset=True)

        # Track submission changes for timeline and counting
        if "is_submitted" in update_dict and update_dict["is_submitted"] and not document.is_submitted:
            approval.documents_submitted += 1
            timeline_event = BrandTimeline(
                approval_id=approval.id,
                event_type=EventType.DOCUMENT_UPLOADED,
                description=f"Document '{document.document_name}' uploaded",
                created_by=current_user.email,
            )
            db.add(timeline_event)

        for key, value in update_dict.items():
            setattr(document, key, value)

        approval.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Updated document id={doc_id} for approval id={approval_id}")
        return document

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating document status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update document status")


# ============================================================================
# Timeline Endpoints
# ============================================================================

@router.post("/{approval_id}/timeline", response_model=TimelineEvent, status_code=status.HTTP_201_CREATED)
def add_timeline_event(
    approval_id: int,
    event: TimelineEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add a timeline event to an approval request.

    Event types: submitted, document_requested, document_uploaded, approved, rejected, follow_up
    """
    try:
        approval = db.query(BrandApproval).filter(
            and_(
                BrandApproval.id == approval_id,
                BrandApproval.org_id == get_user_org_scope(current_user),
            )
        ).first()

        if not approval:
            raise HTTPException(status_code=404, detail="Brand approval not found")

        new_event = BrandTimeline(
            approval_id=approval_id,
            event_type=event.event_type,
            description=event.description,
            created_by=current_user.email,
        )
        db.add(new_event)
        approval.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Added timeline event to approval id={approval_id}: {event.event_type}")
        return new_event

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding timeline event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add timeline event")


# ============================================================================
# Statistics & Analytics Endpoints
# ============================================================================

@router.get("/stats/dashboard", response_model=ApprovalStats)
def get_approval_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get dashboard statistics for brand approvals.

    Returns:
    - total_applications
    - approved_count
    - pending_count
    - rejected_count
    - approval_rate_pct
    - avg_processing_days
    - by_category breakdown
    """
    try:
        org_id = get_user_org_scope(current_user)

        # Base query
        approvals = db.query(BrandApproval).filter(BrandApproval.org_id == org_id).all()
        total = len(approvals)

        # Status counts
        approved = len([a for a in approvals if a.status == ApprovalStatus.APPROVED])
        pending = len([a for a in approvals if a.status == ApprovalStatus.PENDING])
        rejected = len([a for a in approvals if a.status == ApprovalStatus.REJECTED])
        in_progress = len([a for a in approvals if a.status == ApprovalStatus.IN_PROGRESS])

        # Approval rate
        approval_rate = (approved / total * 100) if total > 0 else 0.0

        # Processing days
        processing_days_list = [
            calculate_processing_days(a.submitted_date, a.resolved_date)
            for a in approvals if a.resolved_date and a.submitted_date
        ]
        avg_processing = sum(processing_days_list) / len(processing_days_list) if processing_days_list else 0.0

        # By category breakdown
        category_dict: Dict[str, Dict[str, Any]] = {}
        for approval in approvals:
            cat = approval.category
            if cat not in category_dict:
                category_dict[cat] = {
                    "total": 0,
                    "approved": 0,
                    "pending": 0,
                    "rejected": 0,
                    "in_progress": 0,
                }
            category_dict[cat]["total"] += 1
            if approval.status == ApprovalStatus.APPROVED:
                category_dict[cat]["approved"] += 1
            elif approval.status == ApprovalStatus.PENDING:
                category_dict[cat]["pending"] += 1
            elif approval.status == ApprovalStatus.REJECTED:
                category_dict[cat]["rejected"] += 1
            elif approval.status == ApprovalStatus.IN_PROGRESS:
                category_dict[cat]["in_progress"] += 1

        stats = ApprovalStats(
            total_applications=total,
            approved_count=approved,
            pending_count=pending,
            rejected_count=rejected,
            in_progress_count=in_progress,
            approval_rate_pct=round(approval_rate, 2),
            avg_processing_days=round(avg_processing, 2),
            by_category=category_dict,
        )

        logger.info(f"Retrieved approval stats for org_id={org_id}: total={total}, approved={approved}")
        return stats

    except Exception as e:
        logger.error(f"Error retrieving approval stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve approval statistics")


@router.get("/requirements/by-category", response_model=List[CategoryRequirements])
def get_category_requirements():
    """
    Get common brand approval requirements by category.

    Returns category name, typically required documents, average approval time,
    difficulty level, and tips for successful approval.
    """
    try:
        requirements_list = list(CATEGORY_REQUIREMENTS.values())
        logger.info(f"Retrieved requirements for {len(requirements_list)} categories")
        return requirements_list

    except Exception as e:
        logger.error(f"Error retrieving category requirements: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve category requirements")


@router.get("/requirements/{category}", response_model=CategoryRequirements)
def get_category_requirement_detail(category: str):
    """Get detailed requirements for a specific category"""
    try:
        requirement = CATEGORY_REQUIREMENTS.get(category)
        if not requirement:
            raise HTTPException(status_code=404, detail=f"Requirements not found for category: {category}")

        logger.info(f"Retrieved requirements for category: {category}")
        return requirement

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving category requirement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve category requirement")


# ============================================================================
# Template & Reference Endpoints
# ============================================================================

@router.get("/templates/common-documents")
def get_common_document_templates(category: Optional[str] = Query(None)):
    """
    Get document templates and checklists for common brands/categories.

    Returns typical required documents and submission format guidelines.
    """
    try:
        templates = {}

        if category:
            req = CATEGORY_REQUIREMENTS.get(category)
            if req:
                templates[category] = {
                    "required_documents": req.typically_required_docs,
                    "tips": req.tips,
                    "avg_approval_days": req.avg_approval_days,
                }
        else:
            # Return templates for all categories
            for cat_name, req in CATEGORY_REQUIREMENTS.items():
                templates[cat_name] = {
                    "required_documents": req.typically_required_docs,
                    "tips": req.tips,
                    "avg_approval_days": req.avg_approval_days,
                }

        logger.info(f"Retrieved document templates for {len(templates)} categories")
        return {"templates": templates}

    except Exception as e:
        logger.error(f"Error retrieving document templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve document templates")


@router.get("/templates/checklist/{category}")
def get_category_checklist(
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get pre-populated checklist for a specific category"""
    try:
        req = CATEGORY_REQUIREMENTS.get(category)
        if not req:
            raise HTTPException(status_code=404, detail=f"No requirements found for category: {category}")

        checklist = [
            {
                "document_name": doc,
                "document_type": "invoice" if "invoice" in doc.lower() else "certificate" if "certificate" in doc.lower() else "letter_of_authorization",
                "is_submitted": False,
                "notes": None,
            }
            for doc in req.typically_required_docs
        ]

        logger.info(f"Generated checklist for category: {category}")
        return {
            "category": category,
            "checklist": checklist,
            "tips": req.tips,
            "estimated_approval_days": req.avg_approval_days,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating category checklist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate category checklist")
