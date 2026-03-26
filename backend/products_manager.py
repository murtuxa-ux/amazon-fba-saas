"""
Product Pipeline Management Module for Amazon FBA Wholesale SaaS

Manages product lifecycle: hunted -> contacted -> approved -> ordered -> live -> discontinued
Tracks financials, supplier info, BSR, and status transitions with full audit trail.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum as PyEnum
import json

from database import Base, get_db
from auth import get_current_user


# ============================================================================
# ENUMS
# ============================================================================

class ProductStatus(str, PyEnum):
    """Pipeline status stages"""
    HUNTED = "hunted"
    CONTACTED = "contacted"
    APPROVED = "approved"
    ORDERED = "ordered"
    LIVE = "live"
    DISCONTINUED = "discontinued"


# ============================================================================
# SQLALCHEMY MODELS
# ============================================================================

class PipelineProduct(Base):
    """Product in the FBA wholesale pipeline"""
    __tablename__ = "pipeline_products"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    asin = Column(String(20), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    brand = Column(String(255), nullable=True, index=True)
    category = Column(String(255), nullable=True, index=True)

    supplier_name = Column(String(255), nullable=True)
    supplier_contact = Column(String(255), nullable=True)

    cost_price = Column(Float, nullable=False, default=0.0)
    sell_price = Column(Float, nullable=False, default=0.0)
    fba_fee = Column(Float, nullable=False, default=0.0)
    referral_fee = Column(Float, nullable=False, default=0.0)
    net_profit = Column(Float, nullable=False, default=0.0)
    roi_pct = Column(Float, nullable=False, default=0.0)

    monthly_sales_est = Column(Integer, nullable=True, default=0)
    bsr = Column(Integer, nullable=True)

    status = Column(String(20), nullable=False, default=ProductStatus.HUNTED, index=True)
    status_history = Column(Text, nullable=True)  # JSON string with status transitions

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    status_logs = relationship("ProductStatusLog", back_populates="product", cascade="all, delete-orphan")

    def add_status_history_entry(self, old_status: str, new_status: str, changed_by_id: int, notes: str = None):
        """Append a status change to history"""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "old_status": old_status,
            "new_status": new_status,
            "changed_by_id": changed_by_id,
            "notes": notes
        }

        if self.status_history:
            history = json.loads(self.status_history)
            history.append(entry)
        else:
            history = [entry]

        self.status_history = json.dumps(history)

    def get_status_history(self) -> List[Dict[str, Any]]:
        """Parse and return status history"""
        if not self.status_history:
            return []
        return json.loads(self.status_history)


class ProductStatusLog(Base):
    """Audit trail for product status changes"""
    __tablename__ = "product_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("pipeline_products.id"), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    old_status = Column(String(20), nullable=False)
    new_status = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    product = relationship("PipelineProduct", back_populates="status_logs")


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class StatusHistoryEntry(BaseModel):
    """Status history entry from JSON"""
    timestamp: str
    old_status: str
    new_status: str
    changed_by_id: int
    notes: Optional[str] = None


class ProductStatusLogResponse(BaseModel):
    """Status log entry response"""
    id: int
    product_id: int
    changed_by: int
    old_status: str
    new_status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PipelineProductCreate(BaseModel):
    """Create new product"""
    client_id: Optional[int] = None
    assigned_to: int
    asin: str = Field(..., max_length=20)
    title: str = Field(..., max_length=500)
    brand: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=255)
    supplier_name: Optional[str] = Field(None, max_length=255)
    supplier_contact: Optional[str] = Field(None, max_length=255)
    cost_price: float = Field(default=0.0, ge=0)
    sell_price: float = Field(default=0.0, ge=0)
    fba_fee: float = Field(default=0.0, ge=0)
    referral_fee: float = Field(default=0.0, ge=0)
    net_profit: float = Field(default=0.0)
    roi_pct: float = Field(default=0.0)
    monthly_sales_est: Optional[int] = Field(None, ge=0)
    bsr: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None


class PipelineProductUpdate(BaseModel):
    """Update product fields"""
    client_id: Optional[int] = None
    assigned_to: Optional[int] = None
    asin: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=500)
    brand: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=255)
    supplier_name: Optional[str] = Field(None, max_length=255)
    supplier_contact: Optional[str] = Field(None, max_length=255)
    cost_price: Optional[float] = Field(None, ge=0)
    sell_price: Optional[float] = Field(None, ge=0)
    fba_fee: Optional[float] = Field(None, ge=0)
    referral_fee: Optional[float] = Field(None, ge=0)
    net_profit: Optional[float] = Field(None)
    roi_pct: Optional[float] = Field(None)
    monthly_sales_est: Optional[int] = Field(None, ge=0)
    bsr: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None


class StatusChangeRequest(BaseModel):
    """Request to change product status"""
    new_status: ProductStatus
    notes: Optional[str] = None


class PipelineProductResponse(BaseModel):
    """Response for single product with full details"""
    id: int
    org_id: str
    client_id: Optional[int] = None
    assigned_to: int
    asin: str
    title: str
    brand: Optional[str] = None
    category: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    cost_price: float
    sell_price: float
    fba_fee: float
    referral_fee: float
    net_profit: float
    roi_pct: float
    monthly_sales_est: Optional[int] = None
    bsr: Optional[int] = None
    status: str
    status_history: List[StatusHistoryEntry] = []
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PipelineProductListResponse(BaseModel):
    """Response for product in list (lighter payload)"""
    id: int
    org_id: str
    client_id: Optional[int] = None
    assigned_to: int
    asin: str
    title: str
    brand: Optional[str] = None
    category: Optional[str] = None
    cost_price: float
    sell_price: float
    net_profit: float
    roi_pct: float
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PipelineStats(BaseModel):
    """Pipeline statistics"""
    total_products: int
    status_counts: Dict[str, int]
    total_value: float
    total_inventory_cost: float
    avg_roi_pct: float
    avg_roi_by_status: Dict[str, float]
    total_monthly_sales_est: int


class BulkImportRequest(BaseModel):
    """Bulk import from CSV-like data"""
    products: List[PipelineProductCreate]


class BulkImportResponse(BaseModel):
    """Bulk import result"""
    created_count: int
    total_count: int
    errors: List[Dict[str, Any]] = []


# ============================================================================
# ROUTER
# ============================================================================

router = APIRouter(prefix="/products-pipeline", tags=["products-pipeline"])


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("", response_model=PipelineProductResponse)
def create_product(
    payload: PipelineProductCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new product in pipeline (defaults to 'hunted' status)"""
    org_id = current_user.get("org_id")
    user_id = current_user.get("user_id")

    product = PipelineProduct(
        org_id=org_id,
        client_id=payload.client_id,
        assigned_to=payload.assigned_to,
        asin=payload.asin,
        title=payload.title,
        brand=payload.brand,
        category=payload.category,
        supplier_name=payload.supplier_name,
        supplier_contact=payload.supplier_contact,
        cost_price=payload.cost_price,
        sell_price=payload.sell_price,
        fba_fee=payload.fba_fee,
        referral_fee=payload.referral_fee,
        net_profit=payload.net_profit,
        roi_pct=payload.roi_pct,
        monthly_sales_est=payload.monthly_sales_est,
        bsr=payload.bsr,
        notes=payload.notes,
        status=ProductStatus.HUNTED
    )

    # Initialize status history
    product.add_status_history_entry(
        old_status=None,
        new_status=ProductStatus.HUNTED,
        changed_by_id=user_id,
        notes="Product created"
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


@router.get("", response_model=Dict[str, Any])
def list_products(
    status: Optional[ProductStatus] = Query(None),
    client_id: Optional[int] = Query(None),
    assigned_to: Optional[int] = Query(None),
    brand: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Search in title and ASIN"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List products with filters and pagination"""
    org_id = current_user.get("org_id")

    query = db.query(PipelineProduct).filter(PipelineProduct.org_id == org_id)

    if status:
        query = query.filter(PipelineProduct.status == status)

    if client_id is not None:
        query = query.filter(PipelineProduct.client_id == client_id)

    if assigned_to is not None:
        query = query.filter(PipelineProduct.assigned_to == assigned_to)

    if brand:
        query = query.filter(PipelineProduct.brand.ilike(f"%{brand}%"))

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            (PipelineProduct.title.ilike(search_term)) |
            (PipelineProduct.asin.ilike(search_term))
        )

    total = query.count()
    products = query.order_by(PipelineProduct.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [PipelineProductListResponse.from_orm(p) for p in products]
    }


@router.get("/{product_id}", response_model=PipelineProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get single product with full details and status history"""
    org_id = current_user.get("org_id")

    product = db.query(PipelineProduct).filter(
        PipelineProduct.id == product_id,
        PipelineProduct.org_id == org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@router.put("/{product_id}", response_model=PipelineProductResponse)
def update_product(
    product_id: int,
    payload: PipelineProductUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update product fields"""
    org_id = current_user.get("org_id")

    product = db.query(PipelineProduct).filter(
        PipelineProduct.id == product_id,
        PipelineProduct.org_id == org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update only provided fields
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(product, field, value)

    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)

    return product


@router.put("/{product_id}/status", response_model=PipelineProductResponse)
def change_product_status(
    product_id: int,
    payload: StatusChangeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Change product status and create audit log entry"""
    org_id = current_user.get("org_id")
    user_id = current_user.get("user_id")

    product = db.query(PipelineProduct).filter(
        PipelineProduct.id == product_id,
        PipelineProduct.org_id == org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_status = product.status

    # Create status log entry
    log_entry = ProductStatusLog(
        product_id=product.id,
        changed_by=user_id,
        old_status=old_status,
        new_status=payload.new_status,
        notes=payload.notes
    )
    db.add(log_entry)

    # Update product status
    product.status = payload.new_status
    product.add_status_history_entry(
        old_status=old_status,
        new_status=payload.new_status,
        changed_by_id=user_id,
        notes=payload.notes
    )
    product.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(product)

    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a product and its status logs"""
    org_id = current_user.get("org_id")

    product = db.query(PipelineProduct).filter(
        PipelineProduct.id == product_id,
        PipelineProduct.org_id == org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()

    return {"message": "Product deleted successfully"}


@router.get("/stats/pipeline", response_model=PipelineStats)
def get_pipeline_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get pipeline statistics and metrics"""
    org_id = current_user.get("org_id")

    products = db.query(PipelineProduct).filter(
        PipelineProduct.org_id == org_id
    ).all()

    if not products:
        return PipelineStats(
            total_products=0,
            status_counts={},
            total_value=0.0,
            total_inventory_cost=0.0,
            avg_roi_pct=0.0,
            avg_roi_by_status={},
            total_monthly_sales_est=0
        )

    # Count by status
    status_counts = {}
    for status in ProductStatus:
        count = sum(1 for p in products if p.status == status)
        status_counts[status.value] = count

    # Total value and cost
    total_value = sum(p.sell_price for p in products)
    total_inventory_cost = sum(p.cost_price for p in products)

    # Average ROI
    roi_values = [p.roi_pct for p in products if p.roi_pct is not None]
    avg_roi_pct = sum(roi_values) / len(roi_values) if roi_values else 0.0

    # Average ROI by status
    avg_roi_by_status = {}
    for status in ProductStatus:
        status_products = [p for p in products if p.status == status]
        roi_values = [p.roi_pct for p in status_products if p.roi_pct is not None]
        avg_roi_by_status[status.value] = sum(roi_values) / len(roi_values) if roi_values else 0.0

    # Total monthly sales estimate
    total_monthly_sales_est = sum(p.monthly_sales_est or 0 for p in products)

    return PipelineStats(
        total_products=len(products),
        status_counts=status_counts,
        total_value=total_value,
        total_inventory_cost=total_inventory_cost,
        avg_roi_pct=avg_roi_pct,
        avg_roi_by_status=avg_roi_by_status,
        total_monthly_sales_est=total_monthly_sales_est
    )


@router.get("/by-client/{client_id}", response_model=Dict[str, Any])
def get_products_by_client(
    client_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all products for a specific client"""
    org_id = current_user.get("org_id")

    query = db.query(PipelineProduct).filter(
        PipelineProduct.org_id == org_id,
        PipelineProduct.client_id == client_id
    )

    total = query.count()
    products = query.order_by(PipelineProduct.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "client_id": client_id,
        "items": [PipelineProductListResponse.from_orm(p) for p in products]
    }


@router.post("/bulk-import", response_model=BulkImportResponse)
def bulk_import_products(
    payload: BulkImportRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Import multiple products from CSV-like data"""
    org_id = current_user.get("org_id")
    user_id = current_user.get("user_id")

    created_count = 0
    errors = []

    for idx, product_data in enumerate(payload.products):
        try:
            product = PipelineProduct(
                org_id=org_id,
                client_id=product_data.client_id,
                assigned_to=product_data.assigned_to,
                asin=product_data.asin,
                title=product_data.title,
                brand=product_data.brand,
                category=product_data.category,
                supplier_name=product_data.supplier_name,
                supplier_contact=product_data.supplier_contact,
                cost_price=product_data.cost_price,
                sell_price=product_data.sell_price,
                fba_fee=product_data.fba_fee,
                referral_fee=product_data.referral_fee,
                net_profit=product_data.net_profit,
                roi_pct=product_data.roi_pct,
                monthly_sales_est=product_data.monthly_sales_est,
                bsr=product_data.bsr,
                notes=product_data.notes,
                status=ProductStatus.HUNTED
            )

            product.add_status_history_entry(
                old_status=None,
                new_status=ProductStatus.HUNTED,
                changed_by_id=user_id,
                notes="Bulk imported"
            )

            db.add(product)
            created_count += 1

        except Exception as e:
            errors.append({
                "row": idx,
                "error": str(e),
                "asin": product_data.asin if hasattr(product_data, 'asin') else "unknown"
            })

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Bulk import failed: {str(e)}")

    return BulkImportResponse(
        created_count=created_count,
        total_count=len(payload.products),
        errors=errors
    )
