"""
FBA Shipment Planner module for Amazon FBA Wholesale SaaS platform.
Handles planning, tracking, and management of FBA shipments.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from auth import get_current_user, tenant_session
from models import User, Organization, FBAShipment, FBAShipmentItem
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fba-shipments", tags=["fba-shipments"])


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class FBAShipmentItemCreate(BaseModel):
    asin: str
    sku: str
    quantity: int
    units_per_case: int
    number_of_cases: int
    prep_type: str = Field(..., description="none/poly_bag/bubble_wrap/label/sticker")
    condition: str = Field(..., description="new/used")


class FBAShipmentItemUpdate(BaseModel):
    asin: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[int] = None
    units_per_case: Optional[int] = None
    number_of_cases: Optional[int] = None
    prep_type: Optional[str] = None
    condition: Optional[str] = None


class FBAShipmentItemResponse(BaseModel):
    id: int
    asin: str
    sku: str
    quantity: int
    units_per_case: int
    number_of_cases: int
    prep_type: str
    condition: str
    fnsku: Optional[str]
    is_prepped: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FBAShipmentCreate(BaseModel):
    shipment_name: str
    destination_fc: str = Field(..., description="e.g., PHX6, ONT8, SBD2")
    shipping_method: str = Field(..., description="SPD/LTL/FTL")
    carrier: str
    notes: Optional[str] = None


class FBAShipmentUpdate(BaseModel):
    shipment_name: Optional[str] = None
    destination_fc: Optional[str] = None
    shipping_method: Optional[str] = None
    carrier: Optional[str] = None
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None


class FBAShipmentResponse(BaseModel):
    id: int
    shipment_name: str
    shipment_id: Optional[str]
    destination_fc: str
    shipping_method: str
    carrier: str
    tracking_number: Optional[str]
    status: str
    ship_date: Optional[datetime]
    estimated_arrival: Optional[datetime]
    actual_arrival: Optional[datetime]
    total_units: int
    total_boxes: int
    total_weight_lbs: float
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FBAShipmentDetailResponse(FBAShipmentResponse):
    items: List[FBAShipmentItemResponse] = []


class PackingPlanResponse(BaseModel):
    number_of_boxes: int
    items_per_box: int
    total_weight_lbs: float
    total_dimensions: str
    box_labels_needed: int


class ShipmentMetrics(BaseModel):
    total_shipments: int
    in_transit: int
    awaiting_receipt: int
    units_shipped_this_month: int
    avg_receipt_time_days: Optional[float]
    shipments_by_status: dict
    shipments_by_fc: dict


class TrackingEvent(BaseModel):
    timestamp: datetime
    status: str
    location: str
    description: str


class TrackingResponse(BaseModel):
    tracking_number: str
    tracking_events: List[TrackingEvent]
    estimated_delivery: datetime
    current_status: str


class ShippingCostEstimate(BaseModel):
    weight_lbs: float
    dimensions: str
    shipping_method: str
    estimated_cost: float
    cost_per_unit: float
    delivery_time_estimate: str


class ShippingCostEstimateRequest(BaseModel):
    weight_lbs: float
    dimensions: str
    shipping_method: str
    origin_zip: str
    destination_fc: str


class PrepRequirements(BaseModel):
    category: str
    required_prep_types: List[str]
    description: str
    fba_labeling_required: bool


class PrepGuidelinesResponse(BaseModel):
    guidelines: List[PrepRequirements]
    common_prep_types: dict
    fba_labeling_requirements: str


# ============================================================================
# FULFILLMENT CENTER DATA
# ============================================================================

FULFILLMENT_CENTERS = {
    "PHX6": {"name": "Phoenix, AZ", "state": "AZ", "region": "Southwest"},
    "ONT8": {"name": "Ontario, CA", "state": "CA", "region": "West"},
    "SBD2": {"name": "San Bernardino, CA", "state": "CA", "region": "West"},
    "PHH5": {"name": "Phoenix, AZ", "state": "AZ", "region": "Southwest"},
    "PHF3": {"name": "Phoenix, AZ", "state": "AZ", "region": "Southwest"},
    "DFW5": {"name": "Dallas-Fort Worth, TX", "state": "TX", "region": "South"},
    "HOU3": {"name": "Houston, TX", "state": "TX", "region": "South"},
    "MCI3": {"name": "Kansas City, MO", "state": "MO", "region": "Midwest"},
    "STL3": {"name": "St. Louis, MO", "state": "MO", "region": "Midwest"},
    "ORD3": {"name": "Chicago, IL", "state": "IL", "region": "Midwest"},
    "MSC3": {"name": "Memphis, TN", "state": "TN", "region": "South"},
    "ATL4": {"name": "Atlanta, GA", "state": "GA", "region": "South"},
    "MDW5": {"name": "Chicago, IL", "state": "IL", "region": "Midwest"},
    "JFK8": {"name": "New York, NY", "state": "NY", "region": "Northeast"},
    "DTW7": {"name": "Detroit, MI", "state": "MI", "region": "Midwest"},
}

PREP_GUIDELINES = [
    {
        "category": "Books",
        "required_prep_types": ["label"],
        "description": "All books require barcode labels",
        "fba_labeling_required": True,
    },
    {
        "category": "Media",
        "required_prep_types": ["label"],
        "description": "DVDs, CDs, and other media require barcode labels",
        "fba_labeling_required": True,
    },
    {
        "category": "Clothing",
        "required_prep_types": ["poly_bag", "label"],
        "description": "Clothing must be poly-bagged and labeled",
        "fba_labeling_required": True,
    },
    {
        "category": "Electronics",
        "required_prep_types": ["bubble_wrap"],
        "description": "Fragile electronics should be bubble-wrapped",
        "fba_labeling_required": True,
    },
    {
        "category": "General Merchandise",
        "required_prep_types": ["none"],
        "description": "Standard items may not require prep",
        "fba_labeling_required": True,
    },
]

COMMON_PREP_TYPES = {
    "none": "No special prep required",
    "poly_bag": "Item is placed in a poly bag for protection",
    "bubble_wrap": "Item is wrapped in bubble wrap for fragile goods",
    "label": "FBA barcode label is applied to item",
    "sticker": "FBA sticker is applied to item",
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _get_shipment_or_404(db: Session, shipment_id: int, org_id: int) -> FBAShipment:
    """Retrieve a shipment by ID with org-scoping."""
    shipment = db.query(FBAShipment).filter(
        FBAShipment.id == shipment_id,
        FBAShipment.org_id == org_id
    ).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


def _calculate_packing_plan(items: List[FBAShipmentItem]) -> dict:
    """Calculate packing plan based on shipment items."""
    total_items = sum(item.number_of_cases * item.units_per_case for item in items)

    # Assume standard boxes fit 20 items
    boxes_needed = max(1, (total_items + 19) // 20)
    items_per_box = (total_items + boxes_needed - 1) // boxes_needed if boxes_needed > 0 else 0

    # Estimate weight: assume 1 lb per item on average
    total_weight = float(total_items * 1.0)

    # Standard box dimensions: 12x10x8 inches
    total_dimensions = f"{boxes_needed} boxes @ 12x10x8 inches"

    return {
        "number_of_boxes": boxes_needed,
        "items_per_box": items_per_box,
        "total_weight_lbs": round(total_weight, 2),
        "total_dimensions": total_dimensions,
        "box_labels_needed": boxes_needed,
    }


def _estimate_delivery_days(shipping_method: str, destination_fc: str) -> int:
    """Estimate delivery days based on shipping method and destination."""
    base_days = {
        "SPD": 5,  # Standard parcel delivery
        "LTL": 7,  # Less-than-truckload
        "FTL": 10,  # Full truckload
    }
    return base_days.get(shipping_method, 7)



# ============================================================================
# ENDPOINTS: SHIPMENT LIST AND CRUD
# ============================================================================

@router.get("/", response_model=List[FBAShipmentResponse])
async def list_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
    status: Optional[str] = Query(None, description="draft/ready/shipped/in_transit/received/closed"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
):
    """List all shipments with optional filters."""
    query = db.query(FBAShipment).filter(FBAShipment.org_id == current_user.org_id)

    if status:
        query = query.filter(FBAShipment.status == status)

    if start_date:
        query = query.filter(FBAShipment.created_at >= start_date)

    if end_date:
        query = query.filter(FBAShipment.created_at <= end_date)

    shipments = query.order_by(FBAShipment.created_at.desc()).offset(skip).limit(limit).all()
    logger.info(f"User {current_user.id} listed shipments: {len(shipments)} results")
    return shipments


@router.post("/", response_model=FBAShipmentResponse)
async def create_shipment(
    shipment: FBAShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Create a new shipment plan."""
    # Validate fulfillment center
    if shipment.destination_fc not in FULFILLMENT_CENTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid FC code. Valid codes: {', '.join(FULFILLMENT_CENTERS.keys())}"
        )

    # Validate shipping method
    if shipment.shipping_method not in ["SPD", "LTL", "FTL"]:
        raise HTTPException(status_code=400, detail="Invalid shipping method")

    new_shipment = FBAShipment(
        org_id=current_user.org_id,
        shipment_name=shipment.shipment_name,
        destination_fc=shipment.destination_fc,
        shipping_method=shipment.shipping_method,
        carrier=shipment.carrier,
        status="draft",
        total_units=0,
        total_boxes=0,
        total_weight_lbs=0.0,
        notes=shipment.notes,
    )

    db.add(new_shipment)
    db.commit()
    db.refresh(new_shipment)

    logger.info(f"User {current_user.id} created shipment {new_shipment.id}")
    return new_shipment


@router.get("/prep-requirements", response_model=PrepGuidelinesResponse)
async def get_prep_requirements(
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Get FBA prep requirement guidelines."""
    guidelines = [PrepRequirements(**g) for g in PREP_GUIDELINES]

    logger.info(f"User {current_user.id} viewed prep requirements")

    return PrepGuidelinesResponse(
        guidelines=guidelines,
        common_prep_types=COMMON_PREP_TYPES,
        fba_labeling_requirements=(
            "All items shipped to FBA must have a barcode label. For bundles, "
            "each unit requires its own label. Commingled inventory may use FNSKU labels."
        ),
    )


@router.get("/{id}", response_model=FBAShipmentDetailResponse)
async def get_shipment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Get shipment details with all items."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)
    return shipment


@router.put("/{id}", response_model=FBAShipmentResponse)
async def update_shipment(
    id: int,
    update_data: FBAShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Update shipment details."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)

    # Validate FC if being updated
    if update_data.destination_fc and update_data.destination_fc not in FULFILLMENT_CENTERS:
        raise HTTPException(status_code=400, detail="Invalid fulfillment center code")

    # Validate shipping method if being updated
    if update_data.shipping_method and update_data.shipping_method not in ["SPD", "LTL", "FTL"]:
        raise HTTPException(status_code=400, detail="Invalid shipping method")

    # Validate status transition
    if update_data.status:
        valid_statuses = ["draft", "ready", "shipped", "in_transit", "received", "closed"]
        if update_data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status")

    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(shipment, key, value)

    shipment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shipment)

    logger.info(f"User {current_user.id} updated shipment {id}")
    return shipment


@router.delete("/{id}")
async def delete_shipment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Delete a draft shipment."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)

    if shipment.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Only draft shipments can be deleted"
        )

    db.delete(shipment)
    db.commit()

    logger.info(f"User {current_user.id} deleted shipment {id}")
    return {"message": "Shipment deleted successfully"}



# ============================================================================
# ENDPOINTS: SHIPMENT ITEMS
# ============================================================================

@router.post("/{id}/items", response_model=FBAShipmentItemResponse)
async def add_shipment_item(
    id: int,
    item: FBAShipmentItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Add items to a shipment."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)

    # Validate prep type
    if item.prep_type not in COMMON_PREP_TYPES:
        raise HTTPException(status_code=400, detail="Invalid prep type")

    # Validate condition
    if item.condition not in ["new", "used"]:
        raise HTTPException(status_code=400, detail="Invalid condition")

    new_item = FBAShipmentItem(
        shipment_id=id,
        asin=item.asin,
        sku=item.sku,
        quantity=item.quantity,
        units_per_case=item.units_per_case,
        number_of_cases=item.number_of_cases,
        prep_type=item.prep_type,
        condition=item.condition,
        is_prepped=False,
    )

    db.add(new_item)

    # Update shipment totals
    item_total_units = item.quantity * item.number_of_cases
    shipment.total_units += item_total_units
    shipment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(new_item)

    logger.info(f"User {current_user.id} added item to shipment {id}")
    return new_item


@router.get("/{id}/items", response_model=List[FBAShipmentItemResponse])
async def list_shipment_items(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """List all items in a shipment."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)
    items = db.query(FBAShipmentItem).filter(FBAShipmentItem.shipment_id == id).all()
    return items


@router.put("/{id}/items/{item_id}", response_model=FBAShipmentItemResponse)
async def update_shipment_item(
    id: int,
    item_id: int,
    update_data: FBAShipmentItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Update an item in a shipment."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)

    item = db.query(FBAShipmentItem).filter(
        FBAShipmentItem.id == item_id,
        FBAShipmentItem.shipment_id == id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Validate prep type if being updated
    if update_data.prep_type and update_data.prep_type not in COMMON_PREP_TYPES:
        raise HTTPException(status_code=400, detail="Invalid prep type")

    # Validate condition if being updated
    if update_data.condition and update_data.condition not in ["new", "used"]:
        raise HTTPException(status_code=400, detail="Invalid condition")

    # Calculate old vs new unit count for shipment total adjustment
    old_units = item.quantity * item.number_of_cases

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(item, key, value)

    new_units = item.quantity * item.number_of_cases
    shipment.total_units += (new_units - old_units)
    shipment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(item)

    logger.info(f"User {current_user.id} updated item {item_id} in shipment {id}")
    return item


@router.delete("/{id}/items/{item_id}")
async def delete_shipment_item(
    id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Remove an item from a shipment."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)

    item = db.query(FBAShipmentItem).filter(
        FBAShipmentItem.id == item_id,
        FBAShipmentItem.shipment_id == id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update shipment totals
    units_removed = item.quantity * item.number_of_cases
    shipment.total_units -= units_removed
    shipment.updated_at = datetime.utcnow()

    db.delete(item)
    db.commit()

    logger.info(f"User {current_user.id} deleted item {item_id} from shipment {id}")
    return {"message": "Item removed successfully"}



# ============================================================================
# ENDPOINTS: PACKING AND SHIPPING
# ============================================================================

@router.get("/{id}/packing", response_model=PackingPlanResponse)
async def generate_packing_plan(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Generate a packing plan for the shipment."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)

    items = db.query(FBAShipmentItem).filter(FBAShipmentItem.shipment_id == id).all()

    if not items:
        raise HTTPException(status_code=400, detail="Shipment has no items")

    packing_plan = _calculate_packing_plan(items)

    # Update shipment with packing info
    shipment.total_boxes = packing_plan["number_of_boxes"]
    shipment.total_weight_lbs = packing_plan["total_weight_lbs"]
    db.commit()

    logger.info(f"User {current_user.id} generated packing plan for shipment {id}")
    return packing_plan


@router.post("/{id}/ship")
async def mark_shipment_shipped(
    id: int,
    tracking_number: str,
    ship_date: Optional[datetime] = None,
    estimated_arrival: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Mark shipment as shipped."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)

    shipment.tracking_number = tracking_number
    shipment.status = "shipped"
    shipment.ship_date = ship_date or datetime.utcnow()

    if not estimated_arrival:
        days = _estimate_delivery_days(shipment.shipping_method, shipment.destination_fc)
        estimated_arrival = shipment.ship_date + timedelta(days=days)

    shipment.estimated_arrival = estimated_arrival
    shipment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(shipment)

    logger.info(f"User {current_user.id} marked shipment {id} as shipped (tracking: {tracking_number})")
    return {"message": "Shipment marked as shipped", "tracking_number": tracking_number}


# ============================================================================
# ENDPOINTS: TRACKING AND METRICS
# ============================================================================

@router.get("/{id}/tracking", response_model=TrackingResponse)
async def get_tracking(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Get tracking updates for a shipment (mock data)."""
    shipment = _get_shipment_or_404(db, id, current_user.org_id)

    if not shipment.tracking_number:
        raise HTTPException(status_code=400, detail="Shipment has no tracking number")

    # Mock tracking events
    now = datetime.utcnow()
    tracking_events = [
        TrackingEvent(
            timestamp=now,
            status="In Transit",
            location="Distribution Center",
            description="Package in transit to fulfillment center"
        ),
        TrackingEvent(
            timestamp=now - timedelta(hours=12),
            status="Picked Up",
            location="Origin Facility",
            description="Package picked up by carrier"
        ),
    ]

    estimated_delivery = shipment.estimated_arrival or now + timedelta(days=5)

    return TrackingResponse(
        tracking_number=shipment.tracking_number,
        tracking_events=tracking_events,
        estimated_delivery=estimated_delivery,
        current_status="In Transit"
    )


@router.get("/dashboard/metrics", response_model=ShipmentMetrics)
async def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Get shipment dashboard metrics."""
    org_id = current_user.org_id

    # Get counts by status
    statuses = ["draft", "ready", "shipped", "in_transit", "received", "closed"]
    shipments_by_status = {}
    for status in statuses:
        count = db.query(FBAShipment).filter(
            FBAShipment.org_id == org_id,
            FBAShipment.status == status
        ).count()
        shipments_by_status[status] = count

    # Get counts by FC
    fc_counts = db.query(FBAShipment.destination_fc).filter(
        FBAShipment.org_id == org_id
    ).all()
    shipments_by_fc = {}
    for fc_tuple in fc_counts:
        fc = fc_tuple[0]
        count = db.query(FBAShipment).filter(
            FBAShipment.org_id == org_id,
            FBAShipment.destination_fc == fc
        ).count()
        shipments_by_fc[fc] = count

    # Calculate metrics
    total_shipments = db.query(FBAShipment).filter(
        FBAShipment.org_id == org_id
    ).count()

    in_transit = shipments_by_status.get("in_transit", 0) + shipments_by_status.get("shipped", 0)
    awaiting_receipt = shipments_by_status.get("in_transit", 0)

    # Units shipped this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    units_this_month = db.query(FBAShipment).filter(
        FBAShipment.org_id == org_id,
        FBAShipment.ship_date >= start_of_month
    ).all()
    units_shipped_this_month = sum(s.total_units for s in units_this_month)

    # Average receipt time (mock)
    avg_receipt_time = 5.5

    logger.info(f"User {current_user.id} viewed dashboard metrics")

    return ShipmentMetrics(
        total_shipments=total_shipments,
        in_transit=in_transit,
        awaiting_receipt=awaiting_receipt,
        units_shipped_this_month=units_shipped_this_month,
        avg_receipt_time_days=avg_receipt_time,
        shipments_by_status=shipments_by_status,
        shipments_by_fc=shipments_by_fc,
    )


# ============================================================================
# ENDPOINTS: PREP GUIDELINES AND COST ESTIMATES
# ============================================================================

@router.post("/estimate-cost", response_model=ShippingCostEstimate)
async def estimate_shipping_cost(
    request: ShippingCostEstimateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session),
):
    """Estimate shipping cost based on shipment parameters."""
    # Validate inputs
    if request.shipping_method not in ["SPD", "LTL", "FTL"]:
        raise HTTPException(status_code=400, detail="Invalid shipping method")

    if request.destination_fc not in FULFILLMENT_CENTERS:
        raise HTTPException(status_code=400, detail="Invalid fulfillment center")

    # Mock cost calculation
    base_cost_per_lb = {
        "SPD": 0.50,
        "LTL": 0.35,
        "FTL": 0.25,
    }

    weight_cost = request.weight_lbs * base_cost_per_lb.get(request.shipping_method, 0.40)
    handling_fee = 25.00
    estimated_cost = round(weight_cost + handling_fee, 2)

    # Estimate units (mock: assume 1 lb = 1 unit on average)
    estimated_units = max(1, int(request.weight_lbs))
    cost_per_unit = round(estimated_cost / estimated_units, 2)

    delivery_time = {
        "SPD": "5-7 business days",
        "LTL": "7-10 business days",
        "FTL": "10-14 business days",
    }

    logger.info(
        f"User {current_user.id} estimated shipping cost: "
        f"{request.shipping_method} to {request.destination_fc}"
    )

    return ShippingCostEstimate(
        weight_lbs=request.weight_lbs,
        dimensions=request.dimensions,
        shipping_method=request.shipping_method,
        estimated_cost=estimated_cost,
        cost_per_unit=cost_per_unit,
        delivery_time_estimate=delivery_time.get(request.shipping_method, "Unknown"),
    )
