"""
FastAPI Purchase Order Tracking Module
For Amazon FBA Wholesale SaaS - manages full PO lifecycle from creation to FBA live
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Date, ForeignKey, func, and_
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from database import Base, get_db
from auth import get_current_user


# ============================================================================
# SQLAlchemy ORM Models
# ============================================================================

class PurchaseOrder(Base):
    """Purchase Order model tracking full lifecycle from PO creation to FBA live"""
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    po_number = Column(String, unique=True, nullable=False, index=True)
    supplier_name = Column(String, nullable=False, index=True)
    supplier_contact = Column(String, nullable=True)

    status = Column(
        String,
        nullable=False,
        default="draft",
        index=True,
    )

    order_date = Column(Date, nullable=True)
    expected_delivery = Column(Date, nullable=True)
    actual_delivery = Column(Date, nullable=True)

    shipping_method = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True, index=True)

    subtotal = Column(Float, nullable=False, default=0.0)
    shipping_cost = Column(Float, nullable=False, default=0.0)
    total_cost = Column(Float, nullable=False, default=0.0)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    line_items = relationship("POLineItem", back_populates="purchase_order", cascade="all, delete-orphan")
    status_logs = relationship("POStatusLog", back_populates="purchase_order", cascade="all, delete-orphan")


class POLineItem(Base):
    """Line items for purchase orders with FBA pricing metrics"""
    __tablename__ = "po_line_items"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)

    asin = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    brand = Column(String, nullable=True, index=True)

    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)

    quantity_received = Column(Integer, nullable=False, default=0)

    expected_sell_price = Column(Float, nullable=True)
    expected_profit = Column(Float, nullable=True)
    expected_roi = Column(Float, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    purchase_order = relationship("PurchaseOrder", back_populates="line_items")


class POStatusLog(Base):
    """Audit trail for PO status changes"""
    __tablename__ = "po_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    old_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    purchase_order = relationship("PurchaseOrder", back_populates="status_logs")


# ============================================================================
# Pydantic Request/Response Models
# ============================================================================

class POLineItemCreate(BaseModel):
    """Line item creation request"""
    asin: str
    title: str
    brand: Optional[str] = None
    quantity: int = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)
    expected_sell_price: Optional[float] = Field(None, ge=0)
    expected_profit: Optional[float] = None
    expected_roi: Optional[float] = None


class POLineItemUpdate(BaseModel):
    """Line item update request"""
    title: Optional[str] = None
    brand: Optional[str] = None
    quantity: Optional[int] = Field(None, gt=0)
    unit_cost: Optional[float] = Field(None, ge=0)
    quantity_received: Optional[int] = Field(None, ge=0)
    expected_sell_price: Optional[float] = Field(None, ge=0)
    expected_profit: Optional[float] = None
    expected_roi: Optional[float] = None


class POLineItemResponse(BaseModel):
    """Line item response"""
    id: int
    asin: str
    title: str
    brand: Optional[str]
    quantity: int
    unit_cost: float
    total_cost: float
    quantity_received: int
    expected_sell_price: Optional[float]
    expected_profit: Optional[float]
    expected_roi: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class POStatusLogResponse(BaseModel):
    """Status log response"""
    id: int
    changed_by: str
    old_status: str
    new_status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseOrderCreate(BaseModel):
    """PO creation request"""
    client_id: Optional[int] = None
    supplier_name: str
    supplier_contact: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery: Optional[date] = None
    shipping_method: Optional[str] = None
    tracking_number: Optional[str] = None
    subtotal: float = Field(..., ge=0)
    shipping_cost: float = Field(default=0, ge=0)
    notes: Optional[str] = None
    line_items: Optional[List[POLineItemCreate]] = None


class PurchaseOrderUpdate(BaseModel):
    """PO update request"""
    client_id: Optional[int] = None
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery: Optional[date] = None
    shipping_method: Optional[str] = None
    tracking_number: Optional[str] = None
    subtotal: Optional[float] = Field(None, ge=0)
    shipping_cost: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class PurchaseOrderStatusChange(BaseModel):
    """Status change request"""
    new_status: str
    notes: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    """Full PO response with line items and status history"""
    id: int
    org_id: str
    client_id: Optional[int]
    created_by: str
    po_number: str
    supplier_name: str
    supplier_contact: Optional[str]
    status: str
    order_date: Optional[date]
    expected_delivery: Optional[date]
    actual_delivery: Optional[date]
    shipping_method: Optional[str]
    tracking_number: Optional[str]
    subtotal: float
    shipping_cost: float
    total_cost: float
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    line_items: List[POLineItemResponse]
    status_logs: List[POStatusLogResponse]

    class Config:
        from_attributes = True


class PurchaseOrderListResponse(BaseModel):
    """PO list response (without full details)"""
    id: int
    po_number: str
    supplier_name: str
    status: str
    order_date: Optional[date]
    expected_delivery: Optional[date]
    actual_delivery: Optional[date]
    total_cost: float
    created_at: datetime
    client_id: Optional[int]

    class Config:
        from_attributes = True


class POStatsResponse(BaseModel):
    """PO statistics response"""
    total_pos: int
    by_status: dict
    total_spend: float
    pending_deliveries: int
    avg_delivery_days: Optional[float]


# ============================================================================
# Router Setup
# ============================================================================

router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])


# ============================================================================
# Helper Functions
# ============================================================================

def generate_po_number(db: Session, org_id: str) -> str:
    """Generate unique PO number in format PO-YYYY-XXXX"""
    from datetime import datetime
    year = datetime.utcnow().year

    last_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.org_id == org_id,
        PurchaseOrder.po_number.like(f"PO-{year}-%")
    ).order_by(PurchaseOrder.po_number.desc()).first()

    if last_po:
        sequence = int(last_po.po_number.split("-")[-1]) + 1
    else:
        sequence = 1

    return f"PO-{year}-{sequence:04d}"


def recalculate_po_totals(po: PurchaseOrder):
    """Recalculate PO totals based on line items"""
    po.subtotal = sum(item.total_cost for item in po.line_items) if po.line_items else 0.0
    po.total_cost = po.subtotal + po.shipping_cost


def log_status_change(
    db: Session,
    po: PurchaseOrder,
    new_status: str,
    changed_by: str,
    notes: Optional[str] = None
):
    """Create status log entry"""
    log = POStatusLog(
        po_id=po.id,
        changed_by=changed_by,
        old_status=po.status,
        new_status=new_status,
        notes=notes,
    )
    db.add(log)


# ============================================================================
# Endpoints
# ============================================================================

@router.post("", response_model=PurchaseOrderResponse)
def create_purchase_order(
    po_create: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new purchase order with optional line items"""
    org_id = current_user.get("org_id")
    user_id = current_user.get("user_id")

    po_number = generate_po_number(db, org_id)

    po = PurchaseOrder(
        org_id=org_id,
        client_id=po_create.client_id,
        created_by=user_id,
        po_number=po_number,
        supplier_name=po_create.supplier_name,
        supplier_contact=po_create.supplier_contact,
        order_date=po_create.order_date,
        expected_delivery=po_create.expected_delivery,
        shipping_method=po_create.shipping_method,
        tracking_number=po_create.tracking_number,
        subtotal=po_create.subtotal,
        shipping_cost=po_create.shipping_cost,
        notes=po_create.notes,
    )

    if po_create.line_items:
        for item_data in po_create.line_items:
            item = POLineItem(
                asin=item_data.asin,
                title=item_data.title,
                brand=item_data.brand,
                quantity=item_data.quantity,
                unit_cost=item_data.unit_cost,
                total_cost=item_data.quantity * item_data.unit_cost,
                expected_sell_price=item_data.expected_sell_price,
                expected_profit=item_data.expected_profit,
                expected_roi=item_data.expected_roi,
            )
            po.line_items.append(item)

    recalculate_po_totals(po)

    log_status_change(db, po, "draft", user_id, "PO created")

    db.add(po)
    db.commit()
    db.refresh(po)

    return po


@router.get("", response_model=List[PurchaseOrderListResponse])
def list_purchase_orders(
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    supplier_name: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List purchase orders with optional filtering and pagination"""
    org_id = current_user.get("org_id")

    query = db.query(PurchaseOrder).filter(PurchaseOrder.org_id == org_id)

    if status:
        query = query.filter(PurchaseOrder.status == status)

    if client_id:
        query = query.filter(PurchaseOrder.client_id == client_id)

    if supplier_name:
        query = query.filter(PurchaseOrder.supplier_name.ilike(f"%{supplier_name}%"))

    if date_from:
        query = query.filter(PurchaseOrder.order_date >= date_from)

    if date_to:
        query = query.filter(PurchaseOrder.order_date <= date_to)

    query = query.order_by(PurchaseOrder.created_at.desc())

    pos = query.offset(skip).limit(limit).all()

    return pos


@router.get("/stats", response_model=POStatsResponse)
def get_po_statistics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get purchase order statistics summary"""
    org_id = current_user.get("org_id")

    query = db.query(PurchaseOrder).filter(PurchaseOrder.org_id == org_id)

    total_pos = query.count()

    by_status = {}
    for status_val in ["draft", "submitted", "confirmed", "shipped", "received", "checked_in", "live"]:
        count = query.filter(PurchaseOrder.status == status_val).count()
        by_status[status_val] = count

    total_spend = db.query(func.sum(PurchaseOrder.total_cost)).filter(
        PurchaseOrder.org_id == org_id
    ).scalar() or 0.0

    pending_deliveries = query.filter(
        and_(
            PurchaseOrder.status.in_(["submitted", "confirmed", "shipped"]),
            PurchaseOrder.expected_delivery != None,
        )
    ).count()

    delivery_logs = db.query(
        func.avg(
            func.julianday(PurchaseOrder.actual_delivery) - func.julianday(PurchaseOrder.order_date)
        )
    ).filter(
        and_(
            PurchaseOrder.org_id == org_id,
            PurchaseOrder.actual_delivery != None,
            PurchaseOrder.order_date != None,
        )
    ).scalar()

    avg_delivery_days = float(delivery_logs) if delivery_logs else None

    return POStatsResponse(
        total_pos=total_pos,
        by_status=by_status,
        total_spend=total_spend,
        pending_deliveries=pending_deliveries,
        avg_delivery_days=avg_delivery_days,
    )


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get full PO with line items and status history"""
    org_id = current_user.get("org_id")

    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.org_id == org_id,
        )
    ).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    return po


@router.get("/by-client/{client_id}", response_model=List[PurchaseOrderListResponse])
def get_po_by_client(
    client_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all purchase orders for a specific client"""
    org_id = current_user.get("org_id")

    pos = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.org_id == org_id,
            PurchaseOrder.client_id == client_id,
        )
    ).order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()

    return pos


@router.put("/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: int,
    po_update: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update PO header information"""
    org_id = current_user.get("org_id")

    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.org_id == org_id,
        )
    ).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po_update.client_id is not None:
        po.client_id = po_update.client_id

    if po_update.supplier_name is not None:
        po.supplier_name = po_update.supplier_name

    if po_update.supplier_contact is not None:
        po.supplier_contact = po_update.supplier_contact

    if po_update.order_date is not None:
        po.order_date = po_update.order_date

    if po_update.expected_delivery is not None:
        po.expected_delivery = po_update.expected_delivery

    if po_update.shipping_method is not None:
        po.shipping_method = po_update.shipping_method

    if po_update.tracking_number is not None:
        po.tracking_number = po_update.tracking_number

    if po_update.subtotal is not None:
        po.subtotal = po_update.subtotal

    if po_update.shipping_cost is not None:
        po.shipping_cost = po_update.shipping_cost

    if po_update.notes is not None:
        po.notes = po_update.notes

    recalculate_po_totals(po)

    db.commit()
    db.refresh(po)

    return po


@router.put("/{po_id}/status", response_model=PurchaseOrderResponse)
def change_po_status(
    po_id: int,
    status_change: PurchaseOrderStatusChange,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Change PO status and create audit log entry"""
    org_id = current_user.get("org_id")
    user_id = current_user.get("user_id")

    valid_statuses = {"draft", "submitted", "confirmed", "shipped", "received", "checked_in", "live"}
    if status_change.new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.org_id == org_id,
        )
    ).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status == status_change.new_status:
        raise HTTPException(status_code=400, detail="PO is already in this status")

    old_status = po.status
    po.status = status_change.new_status

    if status_change.new_status == "received" and po.actual_delivery is None:
        po.actual_delivery = date.today()

    log_status_change(db, po, status_change.new_status, user_id, status_change.notes)

    db.commit()
    db.refresh(po)

    return po


@router.post("/{po_id}/items", response_model=POLineItemResponse)
def add_line_item(
    po_id: int,
    item_create: POLineItemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add line item to purchase order"""
    org_id = current_user.get("org_id")

    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.org_id == org_id,
        )
    ).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    item = POLineItem(
        po_id=po_id,
        asin=item_create.asin,
        title=item_create.title,
        brand=item_create.brand,
        quantity=item_create.quantity,
        unit_cost=item_create.unit_cost,
        total_cost=item_create.quantity * item_create.unit_cost,
        expected_sell_price=item_create.expected_sell_price,
        expected_profit=item_create.expected_profit,
        expected_roi=item_create.expected_roi,
    )

    po.line_items.append(item)
    recalculate_po_totals(po)

    db.commit()
    db.refresh(item)

    return item


@router.put("/{po_id}/items/{item_id}", response_model=POLineItemResponse)
def update_line_item(
    po_id: int,
    item_id: int,
    item_update: POLineItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update line item"""
    org_id = current_user.get("org_id")

    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.org_id == org_id,
        )
    ).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    item = db.query(POLineItem).filter(
        and_(
            POLineItem.id == item_id,
            POLineItem.po_id == po_id,
        )
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Line item not found")

    if item_update.title is not None:
        item.title = item_update.title

    if item_update.brand is not None:
        item.brand = item_update.brand

    if item_update.quantity is not None:
        item.quantity = item_update.quantity
        item.total_cost = item.quantity * item.unit_cost

    if item_update.unit_cost is not None:
        item.unit_cost = item_update.unit_cost
        item.total_cost = item.quantity * item.unit_cost

    if item_update.quantity_received is not None:
        item.quantity_received = item_update.quantity_received

    if item_update.expected_sell_price is not None:
        item.expected_sell_price = item_update.expected_sell_price

    if item_update.expected_profit is not None:
        item.expected_profit = item_update.expected_profit

    if item_update.expected_roi is not None:
        item.expected_roi = item_update.expected_roi

    recalculate_po_totals(po)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/{po_id}/items/{item_id}")
def delete_line_item(
    po_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove line item from purchase order"""
    org_id = current_user.get("org_id")

    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.org_id == org_id,
        )
    ).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    item = db.query(POLineItem).filter(
        and_(
            POLineItem.id == item_id,
            POLineItem.po_id == po_id,
        )
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Line item not found")

    db.delete(item)
    recalculate_po_totals(po)

    db.commit()

    return {"detail": "Line item deleted"}


@router.delete("/{po_id}")
def delete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete purchase order (only allowed if status is draft)"""
    org_id = current_user.get("org_id")

    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.org_id == org_id,
        )
    ).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Can only delete purchase orders with draft status",
        )

    db.delete(po)
    db.commit()

    return {"detail": "Purchase order deleted"}
