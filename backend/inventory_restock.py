from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, desc
from sqlalchemy.orm import Session, relationship
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
from auth import get_current_user, tenant_session
from database import get_db, Base, engine
from models import User
import math

# ============================================================================
# SQLALCHEMY MODELS
# ============================================================================

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False)
    client_id = Column(Integer, nullable=False)
    asin = Column(String(10), nullable=False)
    sku = Column(String(100), nullable=False)
    product_title = Column(String(500), nullable=False)
    fnsku = Column(String(50), nullable=True)
    condition = Column(String(20), default="New")
    fulfillable_qty = Column(Integer, default=0)
    inbound_qty = Column(Integer, default=0)
    reserved_qty = Column(Integer, default=0)
    unfulfillable_qty = Column(Integer, default=0)
    total_qty = Column(Integer, default=0)
    reorder_point = Column(Integer, default=0)
    safety_stock = Column(Integer, default=10)
    lead_time_days = Column(Integer, default=14)
    daily_velocity = Column(Float, default=0.0)
    days_of_stock = Column(Float, default=0.0)
    restock_status = Column(String(20), default="healthy")  # healthy/low/critical/out_of_stock/overstock
    last_synced = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    alerts = relationship("RestockAlert", back_populates="inventory_item", cascade="all, delete-orphan")
    storage_fees = relationship("StorageFeeProjection", back_populates="inventory_item", cascade="all, delete-orphan")


class RestockAlert(Base):
    __tablename__ = "restock_alerts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False)
    client_id = Column(Integer, nullable=False)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # low_stock/out_of_stock/restock_needed/overstock/stranded/aged
    severity = Column(String(20), default="info")  # info/warning/critical
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    inventory_item = relationship("InventoryItem", back_populates="alerts")


class InboundShipment(Base):
    __tablename__ = "inbound_shipments"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False)
    client_id = Column(Integer, nullable=False)
    shipment_id = Column(String(50), unique=True, nullable=False)
    shipment_name = Column(String(200), nullable=False)
    destination_fc = Column(String(20), nullable=False)
    status = Column(String(20), default="working")  # working/shipped/in_transit/delivered/checked_in/receiving/closed
    quantity_shipped = Column(Integer, default=0)
    quantity_received = Column(Integer, default=0)
    ship_date = Column(DateTime, nullable=True)
    expected_date = Column(DateTime, nullable=True)
    carrier = Column(String(50), nullable=True)
    tracking = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StorageFeeProjection(Base):
    __tablename__ = "storage_fee_projections"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False)
    client_id = Column(Integer, nullable=False)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    asin = Column(String(10), nullable=False)
    current_age_days = Column(Integer, default=0)
    monthly_storage_fee = Column(Float, default=0.0)
    long_term_storage_fee = Column(Float, default=0.0)
    projected_3mo_fee = Column(Float, default=0.0)
    recommended_action = Column(String(20), default="hold")  # hold/promote/remove/liquidate
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    inventory_item = relationship("InventoryItem", back_populates="storage_fees")


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class InventoryItemBase(BaseModel):
    asin: str
    sku: str
    product_title: str
    fnsku: Optional[str] = None
    condition: str = "New"
    fulfillable_qty: int = 0
    inbound_qty: int = 0
    reserved_qty: int = 0
    unfulfillable_qty: int = 0
    safety_stock: int = 10
    lead_time_days: int = 14
    daily_velocity: float = 0.0


class InventoryItemCreate(InventoryItemBase):
    client_id: int


class InventoryItemUpdate(BaseModel):
    fulfillable_qty: Optional[int] = None
    inbound_qty: Optional[int] = None
    reserved_qty: Optional[int] = None
    unfulfillable_qty: Optional[int] = None
    daily_velocity: Optional[float] = None
    safety_stock: Optional[int] = None
    lead_time_days: Optional[int] = None


class InventoryItemResponse(InventoryItemBase):
    id: int
    client_id: int
    total_qty: int
    reorder_point: int
    days_of_stock: float
    restock_status: str
    last_synced: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RestockAlertResponse(BaseModel):
    id: int
    client_id: int
    inventory_item_id: int
    alert_type: str
    severity: str
    message: str
    is_read: bool
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InboundShipmentBase(BaseModel):
    shipment_id: str
    shipment_name: str
    destination_fc: str
    quantity_shipped: int
    quantity_received: int = 0
    ship_date: Optional[datetime] = None
    expected_date: Optional[datetime] = None
    carrier: Optional[str] = None
    tracking: Optional[str] = None


class InboundShipmentCreate(InboundShipmentBase):
    client_id: int


class InboundShipmentUpdate(BaseModel):
    status: Optional[str] = None
    quantity_received: Optional[int] = None
    carrier: Optional[str] = None
    tracking: Optional[str] = None


class InboundShipmentResponse(InboundShipmentBase):
    id: int
    client_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StorageFeeProjectionResponse(BaseModel):
    id: int
    asin: str
    current_age_days: int
    monthly_storage_fee: float
    long_term_storage_fee: float
    projected_3mo_fee: float
    recommended_action: str

    class Config:
        from_attributes = True


class RestockCalculationRequest(BaseModel):
    daily_velocity: float
    lead_time_days: int
    safety_stock: int


class DashboardResponse(BaseModel):
    total_skus: int = Field(default=0)
    healthy_count: int = Field(default=0)
    low_stock_count: int = Field(default=0)
    critical_count: int = Field(default=0)
    out_of_stock_count: int = Field(default=0)
    total_alerts: int = Field(default=0)
    unread_alerts: int = Field(default=0)
    inbound_shipments_count: int = Field(default=0)
    total_storage_fee_monthly: float = Field(default=0)


# ============================================================================
# RESTOCK CALCULATOR
# ============================================================================

def calculate_restock_metrics(daily_velocity: float, lead_time_days: int, safety_stock: int, buffer_days: int = 7):
    """
    Calculate restock metrics including reorder point, days of stock, and units to order.
    Factors in a 7-day buffer for safety.
    """
    if daily_velocity <= 0:
        return {
            "reorder_point": safety_stock,
            "days_of_stock": 0.0,
            "units_to_order": 0,
            "restock_date": None
        }

    # Reorder point = (daily velocity * lead time) + safety stock + buffer
    reorder_point = int((daily_velocity * lead_time_days) + safety_stock + (daily_velocity * buffer_days))

    # Units to order: enough to bring stock back to reorder point + buffer
    units_to_order = reorder_point + int(daily_velocity * 14)  # 14 days of safety stock

    return {
        "reorder_point": reorder_point,
        "days_of_stock": 0.0,
        "units_to_order": units_to_order,
        "restock_date": datetime.utcnow() + timedelta(days=lead_time_days)
    }


def update_inventory_status(item: InventoryItem) -> str:
    """Determine restock status based on fulfillable qty and days of stock."""
    if item.fulfillable_qty == 0:
        return "out_of_stock"
    elif item.fulfillable_qty > item.reorder_point * 1.5:
        return "overstock"
    elif item.fulfillable_qty < item.reorder_point:
        return "critical"
    elif item.fulfillable_qty < item.reorder_point + 10:
        return "low"
    else:
        return "healthy"


# ============================================================================
# ALERT GENERATOR
# ============================================================================

def generate_inventory_alerts(db: Session, org_id: int, client_id: int) -> List[RestockAlert]:
    """
    Scan inventory and generate alerts for:
    - Low stock (below reorder point)
    - Out of stock
    - Aged inventory (>180 days)
    - Stranded inventory (high unfulfillable qty)
    """
    items = db.query(InventoryItem).filter(
        InventoryItem.org_id == org_id,
        InventoryItem.client_id == client_id
    ).all()

    new_alerts = []

    for item in items:
        # Clear existing unresolved alerts for this item
        existing_alerts = db.query(RestockAlert).filter(
            RestockAlert.inventory_item_id == item.id,
            RestockAlert.is_resolved == False
        ).all()

        for alert in existing_alerts:
            alert.is_resolved = True

        # Generate new alerts
        if item.fulfillable_qty == 0:
            alert = RestockAlert(
                org_id=org_id,
                client_id=client_id,
                inventory_item_id=item.id,
                alert_type="out_of_stock",
                severity="critical",
                message=f"{item.sku} ({item.asin}) is out of stock"
            )
            new_alerts.append(alert)
        elif item.fulfillable_qty < item.reorder_point:
            alert = RestockAlert(
                org_id=org_id,
                client_id=client_id,
                inventory_item_id=item.id,
                alert_type="low_stock",
                severity="warning",
                message=f"{item.sku} stock ({item.fulfillable_qty}) below reorder point ({item.reorder_point})"
            )
            new_alerts.append(alert)

        # Check for aged inventory (>180 days)
        if item.created_at < datetime.utcnow() - timedelta(days=180):
            alert = RestockAlert(
                org_id=org_id,
                client_id=client_id,
                inventory_item_id=item.id,
                alert_type="aged",
                severity="warning",
                message=f"{item.sku} has been in inventory for over 180 days"
            )
            new_alerts.append(alert)

        # Check for stranded inventory (high unfulfillable)
        if item.unfulfillable_qty > item.fulfillable_qty * 0.2:
            alert = RestockAlert(
                org_id=org_id,
                client_id=client_id,
                inventory_item_id=item.id,
                alert_type="stranded",
                severity="warning",
                message=f"{item.sku} has {item.unfulfillable_qty} stranded units"
            )
            new_alerts.append(alert)

    db.add_all(new_alerts)
    db.commit()
    return new_alerts


# ============================================================================
# API ROUTER
# ============================================================================

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/items", response_model=List[InventoryItemResponse])
def list_inventory_items(
    client_id: int = Query(...),
    restock_status: Optional[str] = None,
    min_days_of_stock: Optional[int] = None,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """List inventory items with optional filters."""
    query = db.query(InventoryItem).filter(
        InventoryItem.org_id == current_user.org_id,
        InventoryItem.client_id == client_id
    )

    if restock_status:
        query = query.filter(InventoryItem.restock_status == restock_status)

    if min_days_of_stock is not None:
        query = query.filter(InventoryItem.days_of_stock >= min_days_of_stock)

    items = query.all()

    # Calculate days of stock for each item
    for item in items:
        if item.daily_velocity > 0:
            item.days_of_stock = item.fulfillable_qty / item.daily_velocity
        else:
            item.days_of_stock = 0.0
        item.total_qty = item.fulfillable_qty + item.inbound_qty + item.reserved_qty

    return items


@router.post("/items", response_model=InventoryItemResponse)
def create_inventory_item(
    item_data: InventoryItemCreate,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Create a new inventory item."""
    metrics = calculate_restock_metrics(
        item_data.daily_velocity,
        item_data.lead_time_days,
        item_data.safety_stock
    )

    item = InventoryItem(
        org_id=current_user.org_id,
        client_id=item_data.client_id,
        asin=item_data.asin,
        sku=item_data.sku,
        product_title=item_data.product_title,
        fnsku=item_data.fnsku,
        condition=item_data.condition,
        fulfillable_qty=item_data.fulfillable_qty,
        inbound_qty=item_data.inbound_qty,
        reserved_qty=item_data.reserved_qty,
        unfulfillable_qty=item_data.unfulfillable_qty,
        total_qty=item_data.fulfillable_qty + item_data.inbound_qty + item_data.reserved_qty,
        reorder_point=metrics["reorder_point"],
        safety_stock=item_data.safety_stock,
        lead_time_days=item_data.lead_time_days,
        daily_velocity=item_data.daily_velocity
    )
    item.restock_status = update_inventory_status(item)

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=InventoryItemResponse)
def get_inventory_item(
    item_id: int,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Get a specific inventory item."""
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.org_id == current_user.org_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if item.daily_velocity > 0:
        item.days_of_stock = item.fulfillable_qty / item.daily_velocity

    return item


@router.put("/items/{item_id}", response_model=InventoryItemResponse)
def update_inventory_item(
    item_id: int,
    item_data: InventoryItemUpdate,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Update an inventory item."""
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.org_id == current_user.org_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = item_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    item.total_qty = item.fulfillable_qty + item.inbound_qty + item.reserved_qty
    if item.daily_velocity > 0:
        item.days_of_stock = item.fulfillable_qty / item.daily_velocity
    item.restock_status = update_inventory_status(item)
    item.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(item)
    return item


@router.post("/items/{item_id}/calculate-restock")
def calculate_restock_for_item(
    item_id: int,
    calc_request: RestockCalculationRequest,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Calculate restock metrics for an item."""
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.org_id == current_user.org_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    metrics = calculate_restock_metrics(
        calc_request.daily_velocity,
        calc_request.lead_time_days,
        calc_request.safety_stock
    )

    item.reorder_point = metrics["reorder_point"]
    item.daily_velocity = calc_request.daily_velocity
    item.lead_time_days = calc_request.lead_time_days
    item.safety_stock = calc_request.safety_stock
    if item.daily_velocity > 0:
        item.days_of_stock = item.fulfillable_qty / item.daily_velocity

    db.commit()
    db.refresh(item)

    return {
        "item_id": item.id,
        "reorder_point": metrics["reorder_point"],
        "units_to_order": metrics["units_to_order"],
        "restock_date": metrics["restock_date"],
        "current_stock": item.fulfillable_qty,
        "daily_velocity": calc_request.daily_velocity
    }


@router.post("/generate-alerts")
def generate_alerts_endpoint(
    client_id: int = Query(...),
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Scan inventory and generate alerts."""
    alerts = generate_inventory_alerts(db, current_user.org_id, client_id)
    return {"alerts_generated": len(alerts), "alerts": [RestockAlertResponse.from_orm(a) for a in alerts]}


@router.get("/alerts", response_model=List[RestockAlertResponse])
def list_alerts(
    client_id: int = Query(...),
    severity: Optional[str] = None,
    is_read: Optional[bool] = None,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """List restock alerts with optional filters."""
    query = db.query(RestockAlert).filter(
        RestockAlert.org_id == current_user.org_id,
        RestockAlert.client_id == client_id,
        RestockAlert.is_resolved == False
    )

    if severity:
        query = query.filter(RestockAlert.severity == severity)

    if is_read is not None:
        query = query.filter(RestockAlert.is_read == is_read)

    return query.order_by(desc(RestockAlert.created_at)).all()


@router.put("/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Mark an alert as read."""
    alert = db.query(RestockAlert).filter(
        RestockAlert.id == alert_id,
        RestockAlert.org_id == current_user.org_id
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()
    return {"status": "marked_read"}


@router.put("/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Resolve an alert."""
    alert = db.query(RestockAlert).filter(
        RestockAlert.id == alert_id,
        RestockAlert.org_id == current_user.org_id
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_resolved = True
    db.commit()
    return {"status": "resolved"}


@router.get("/shipments", response_model=List[InboundShipmentResponse])
def list_shipments(
    client_id: int = Query(...),
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """List inbound shipments for a client."""
    return db.query(InboundShipment).filter(
        InboundShipment.org_id == current_user.org_id,
        InboundShipment.client_id == client_id
    ).order_by(desc(InboundShipment.created_at)).all()


@router.post("/shipments", response_model=InboundShipmentResponse)
def create_shipment(
    shipment_data: InboundShipmentCreate,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Create a new inbound shipment."""
    shipment = InboundShipment(
        org_id=current_user.org_id,
        client_id=shipment_data.client_id,
        shipment_id=shipment_data.shipment_id,
        shipment_name=shipment_data.shipment_name,
        destination_fc=shipment_data.destination_fc,
        quantity_shipped=shipment_data.quantity_shipped,
        quantity_received=shipment_data.quantity_received,
        ship_date=shipment_data.ship_date,
        expected_date=shipment_data.expected_date,
        carrier=shipment_data.carrier,
        tracking=shipment_data.tracking
    )

    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


@router.get("/shipments/{shipment_id}", response_model=InboundShipmentResponse)
def get_shipment(
    shipment_id: int,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Get a specific shipment."""
    shipment = db.query(InboundShipment).filter(
        InboundShipment.id == shipment_id,
        InboundShipment.org_id == current_user.org_id
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    return shipment


@router.put("/shipments/{shipment_id}", response_model=InboundShipmentResponse)
def update_shipment(
    shipment_id: int,
    shipment_data: InboundShipmentUpdate,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Update a shipment."""
    shipment = db.query(InboundShipment).filter(
        InboundShipment.id == shipment_id,
        InboundShipment.org_id == current_user.org_id
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    update_data = shipment_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shipment, field, value)

    shipment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shipment)
    return shipment


@router.get("/storage-fees", response_model=List[StorageFeeProjectionResponse])
def list_storage_fees(
    client_id: int = Query(...),
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """List storage fee projections for a client."""
    return db.query(StorageFeeProjection).filter(
        StorageFeeProjection.org_id == current_user.org_id,
        StorageFeeProjection.client_id == client_id
    ).order_by(desc(StorageFeeProjection.projected_3mo_fee)).all()


@router.post("/storage-fees/calculate")
def calculate_storage_fees(
    client_id: int = Query(...),
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Calculate storage fees for all items of a client."""
    items = db.query(InventoryItem).filter(
        InventoryItem.org_id == current_user.org_id,
        InventoryItem.client_id == client_id
    ).all()

    projections = []
    for item in items:
        age_days = (datetime.utcnow() - item.created_at).days

        # Standard storage: $0.87/unit/month for units >0
        monthly_storage = (item.fulfillable_qty * 0.87) / 100

        # LTS fee: $6.90/unit for items >90 days old
        lts_fee = 0
        if age_days > 90:
            lts_fee = item.fulfillable_qty * 6.90 / 100

        projected_3mo = (monthly_storage * 3) + lts_fee

        # Recommend action based on age and fee
        recommended = "hold"
        if age_days > 365:
            recommended = "liquidate"
        elif age_days > 180:
            recommended = "remove"
        elif projected_3mo > 50:
            recommended = "promote"

        # Delete existing and create new
        db.query(StorageFeeProjection).filter(
            StorageFeeProjection.inventory_item_id == item.id
        ).delete()

        projection = StorageFeeProjection(
            org_id=current_user.org_id,
            client_id=client_id,
            inventory_item_id=item.id,
            asin=item.asin,
            current_age_days=age_days,
            monthly_storage_fee=monthly_storage,
            long_term_storage_fee=lts_fee,
            projected_3mo_fee=projected_3mo,
            recommended_action=recommended
        )
        projections.append(projection)

    db.add_all(projections)
    db.commit()

    return {
        "projections_calculated": len(projections),
        "total_monthly_fee": sum(p.monthly_storage_fee for p in projections),
        "total_lts_fee": sum(p.long_term_storage_fee for p in projections)
    }


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_summary(
    client_id: int = Query(...),
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """Get inventory dashboard summary."""
    items = db.query(InventoryItem).filter(
        InventoryItem.org_id == current_user.org_id,
        InventoryItem.client_id == client_id
    ).all()

    # Update status for all items
    for item in items:
        item.restock_status = update_inventory_status(item)

    healthy = sum(1 for i in items if i.restock_status == "healthy")
    low = sum(1 for i in items if i.restock_status == "low")
    critical = sum(1 for i in items if i.restock_status == "critical")
    oos = sum(1 for i in items if i.restock_status == "out_of_stock")

    alerts = db.query(RestockAlert).filter(
        RestockAlert.org_id == current_user.org_id,
        RestockAlert.client_id == client_id,
        RestockAlert.is_resolved == False
    ).all()

    unread_alerts = sum(1 for a in alerts if not a.is_read)

    shipments = db.query(InboundShipment).filter(
        InboundShipment.org_id == current_user.org_id,
        InboundShipment.client_id == client_id,
        InboundShipment.status != "closed"
    ).count()

    fees = db.query(StorageFeeProjection).filter(
        StorageFeeProjection.org_id == current_user.org_id,
        StorageFeeProjection.client_id == client_id
    ).all()

    total_fee = sum(f.monthly_storage_fee for f in fees)

    return DashboardResponse(
        total_skus=len(items),
        healthy_count=healthy,
        low_stock_count=low,
        critical_count=critical,
        out_of_stock_count=oos,
        total_alerts=len(alerts),
        unread_alerts=unread_alerts,
        inbound_shipments_count=shipments,
        total_storage_fee_monthly=total_fee
    )
