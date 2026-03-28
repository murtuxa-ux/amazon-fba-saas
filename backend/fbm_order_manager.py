"""
FBM (Fulfilled by Merchant) Order Manager Module
Amazon Wholesale SaaS Platform (Ecom Era)

Manages FBM orders for wholesale sellers doing merchant-fulfilled operations.
Tracks order lifecycle, shipping, delivery, and returns with Amazon compliance metrics.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text, and_, or_
from sqlalchemy.orm import Session

from auth import get_current_user
from models import User, Organization, FBMOrder, FBMOrderItem
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fbm-orders", tags=["fbm-orders"])


# ============================================================================
# ENUMS
# ============================================================================

class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    RETURNED = "returned"
    CANCELLED = "cancelled"


class Priority(str, Enum):
    STANDARD = "standard"
    EXPEDITED = "expedited"
    PRIORITY = "priority"


class ReturnCondition(str, Enum):
    NEW = "new"
    LIKE_NEW = "like_new"
    USED = "used"
    DEFECTIVE = "defective"


class PerformanceStatus(str, Enum):
    HEALTHY = "healthy"
    AT_RISK = "at_risk"
    CRITICAL = "critical"


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class BuyerAddress(BaseModel):
    street: str
    city: str
    state: str
    zip: str
    country: str = "US"


class FBMOrderItemInput(BaseModel):
    asin: str
    sku: str
    quantity: int = Field(gt=0)
    unit_price: Decimal


class FBMOrderItemResponse(BaseModel):
    id: int
    asin: str
    sku: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    class Config:
        from_attributes = True


class CreateFBMOrderRequest(BaseModel):
    amazon_order_id: str
    buyer_name: str
    buyer_address: BuyerAddress
    order_date: datetime
    ship_by_date: datetime
    delivery_by_date: datetime
    items: List[FBMOrderItemInput]
    priority: Priority = Priority.STANDARD
    notes: Optional[str] = None


class UpdateFBMOrderRequest(BaseModel):
    status: Optional[OrderStatus] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None


class ShippingInfoRequest(BaseModel):
    carrier: str
    tracking_number: str
    shipping_method: str
    ship_date: Optional[datetime] = None


class DeliveryConfirmationRequest(BaseModel):
    delivery_date: Optional[datetime] = None


class ReturnProcessRequest(BaseModel):
    return_reason: str
    refund_amount: Decimal
    return_condition: ReturnCondition


class FBMOrderResponse(BaseModel):
    id: int
    amazon_order_id: str
    buyer_name: str
    buyer_address_line1: str
    buyer_city: str
    buyer_state: str
    buyer_zip: str
    buyer_country: str
    order_date: datetime
    ship_by_date: datetime
    delivery_by_date: datetime
    status: OrderStatus
    priority: Priority
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_method: Optional[str] = None
    ship_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    return_reason: Optional[str] = None
    refund_amount: Optional[Decimal] = None
    total_amount: Decimal
    notes: Optional[str] = None
    items: List[FBMOrderItemResponse]
    created_at: datetime
    updated_at: datetime
    is_overdue: bool = False
    days_until_ship_deadline: Optional[int] = None

    class Config:
        from_attributes = True


class DashboardMetrics(BaseModel):
    total_orders: int
    pending_orders: int
    shipped_today: int
    delivered_this_week: int
    avg_handling_time_hours: float
    late_shipment_count: int
    on_time_delivery_pct: float
    return_rate_pct: float
    revenue_this_month: Decimal
    period_start: datetime
    period_end: datetime


class PerformanceMetrics(BaseModel):
    order_defect_rate: float
    late_shipment_rate: float
    pre_fulfillment_cancel_rate: float
    valid_tracking_rate: float
    performance_status: PerformanceStatus
    last_updated: datetime
    notes: Optional[str] = None


class BulkShippingRequest(BaseModel):
    shipments: List[dict] = Field(
        ...,
        example=[
            {
                "order_id": 1,
                "carrier": "UPS",
                "tracking_number": "1Z999AA10123456784"
            }
        ]
    )


class PendingOrderResponse(BaseModel):
    id: int
    amazon_order_id: str
    buyer_name: str
    status: OrderStatus
    priority: Priority
    order_date: datetime
    ship_by_date: datetime
    days_until_deadline: int
    is_overdue: bool
    total_amount: Decimal
    item_count: int

    class Config:
        from_attributes = True


class ReturnRecord(BaseModel):
    id: int
    amazon_order_id: str
    buyer_name: str
    return_reason: str
    refund_amount: Decimal
    return_condition: Optional[str]
    return_date: datetime
    status: OrderStatus
    total_order_amount: Decimal

    class Config:
        from_attributes = True


class ShippingLabel(BaseModel):
    order_id: int
    amazon_order_id: str
    carrier: str
    tracking_number: str
    label_url: str
    expires_at: datetime


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _check_org_access(db: Session, current_user: User, order_id: int) -> FBMOrder:
    """Verify order belongs to current user's organization."""
    order = db.query(FBMOrder).filter(
        FBMOrder.id == order_id,
        FBMOrder.org_id == current_user.org_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FBM order not found"
        )
    return order


def _calculate_days_until_deadline(ship_by_date: datetime) -> int:
    """Calculate days remaining until ship deadline."""
    now = datetime.utcnow()
    delta = ship_by_date - now
    return delta.days


def _is_overdue(ship_by_date: datetime) -> bool:
    """Check if order is overdue for shipping."""
    return datetime.utcnow() > ship_by_date


def _calculate_handling_time(order_date: datetime, ship_date: Optional[datetime]) -> Optional[float]:
    """Calculate hours from order to shipment."""
    if not ship_date or not order_date:
        return None
    delta = ship_date - order_date
    return delta.total_seconds() / 3600


def _compute_performance_status(
    defect_rate: float,
    late_rate: float,
    cancel_rate: float,
    tracking_rate: float
) -> PerformanceStatus:
    """
    Compute FBM health status based on Amazon's actual thresholds.

    Amazon FBM Performance Thresholds (Standard):
    - Order Defect Rate: < 1%
    - Late Shipment Rate: < 4%
    - Pre-fulfillment Cancel Rate: < 0.5%
    - Valid Tracking Rate: > 95%
    """
    critical_thresholds = {
        "defect_rate": 2.0,
        "late_rate": 6.0,
        "cancel_rate": 1.0,
        "tracking_rate": 90.0
    }

    at_risk_thresholds = {
        "defect_rate": 1.5,
        "late_rate": 5.0,
        "cancel_rate": 0.75,
        "tracking_rate": 92.5
    }

    # Check critical thresholds
    if (defect_rate >= critical_thresholds["defect_rate"] or
        late_rate >= critical_thresholds["late_rate"] or
        cancel_rate >= critical_thresholds["cancel_rate"] or
        tracking_rate <= critical_thresholds["tracking_rate"]):
        return PerformanceStatus.CRITICAL

    # Check at-risk thresholds
    if (defect_rate >= at_risk_thresholds["defect_rate"] or
        late_rate >= at_risk_thresholds["late_rate"] or
        cancel_rate >= at_risk_thresholds["cancel_rate"] or
        tracking_rate <= at_risk_thresholds["tracking_rate"]):
        return PerformanceStatus.AT_RISK

    return PerformanceStatus.HEALTHY


# ============================================================================
# ENDPOINT: List FBM Orders
# ============================================================================

@router.get("/", response_model=List[FBMOrderResponse])
async def list_fbm_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: Optional[OrderStatus] = Query(None),
    priority_filter: Optional[Priority] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """
    List all FBM orders with optional filters.

    Query Parameters:
    - status_filter: pending/processing/shipped/delivered/returned/cancelled
    - priority_filter: standard/expedited/priority
    - date_from: Start date for order_date range
    - date_to: End date for order_date range
    - skip: Pagination offset
    - limit: Max results (max 500)
    """
    try:
        query = db.query(FBMOrder).filter(FBMOrder.org_id == current_user.org_id)

        if status_filter:
            query = query.filter(FBMOrder.status == status_filter.value)

        if priority_filter:
            query = query.filter(FBMOrder.priority == priority_filter.value)

        if date_from:
            query = query.filter(FBMOrder.order_date >= date_from)

        if date_to:
            query = query.filter(FBMOrder.order_date <= date_to)

        orders = query.order_by(FBMOrder.created_at.desc()).offset(skip).limit(limit).all()

        # Enrich with computed fields
        for order in orders:
            order.is_overdue = _is_overdue(order.ship_by_date)
            order.days_until_ship_deadline = _calculate_days_until_deadline(order.ship_by_date)

        logger.info(
            f"Listed {len(orders)} FBM orders for org {current_user.org_id}",
            extra={"org_id": current_user.org_id}
        )

        return orders

    except Exception as e:
        logger.error(f"Error listing FBM orders: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve FBM orders"
        )


# ============================================================================
# ENDPOINT: Create FBM Order
# ============================================================================

@router.post("/", response_model=FBMOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_fbm_order(
    request: CreateFBMOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or import a new FBM order.

    This endpoint allows creating orders manually or importing from external sources.
    """
    try:
        # Validate dates
        if request.order_date >= request.ship_by_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ship_by_date must be after order_date"
            )

        if request.ship_by_date >= request.delivery_by_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="delivery_by_date must be after ship_by_date"
            )

        if not request.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must contain at least one item"
            )

        # Check for duplicate amazon_order_id
        existing = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.amazon_order_id == request.amazon_order_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order with this Amazon Order ID already exists"
            )

        # Calculate total amount
        total_amount = sum(
            Decimal(item.quantity) * item.unit_price
            for item in request.items
        )

        # Create order
        new_order = FBMOrder(
            org_id=current_user.org_id,
            amazon_order_id=request.amazon_order_id,
            buyer_name=request.buyer_name,
            buyer_address_line1=request.buyer_address.street,
            buyer_city=request.buyer_address.city,
            buyer_state=request.buyer_address.state,
            buyer_zip=request.buyer_address.zip,
            buyer_country=request.buyer_address.country,
            order_date=request.order_date,
            ship_by_date=request.ship_by_date,
            delivery_by_date=request.delivery_by_date,
            status=OrderStatus.PENDING.value,
            priority=request.priority.value,
            total_amount=total_amount,
            notes=request.notes,
        )

        db.add(new_order)
        db.flush()

        # Create order items
        for item in request.items:
            item_total = Decimal(item.quantity) * item.unit_price
            order_item = FBMOrderItem(
                order_id=new_order.id,
                asin=item.asin,
                sku=item.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item_total,
            )
            db.add(order_item)

        db.commit()
        db.refresh(new_order)

        logger.info(
            f"Created FBM order {new_order.id} (Amazon ID: {request.amazon_order_id}) "
            f"for org {current_user.org_id}",
            extra={"org_id": current_user.org_id, "order_id": new_order.id}
        )

        new_order.is_overdue = False
        new_order.days_until_ship_deadline = _calculate_days_until_deadline(new_order.ship_by_date)

        return new_order

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating FBM order: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create FBM order"
        )


# ============================================================================
# ENDPOINT: Get Order Details
# ============================================================================

@router.get("/{order_id}", response_model=FBMOrderResponse)
async def get_fbm_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get complete details for a specific FBM order including all items and tracking."""
    try:
        order = _check_org_access(db, current_user, order_id)

        order.is_overdue = _is_overdue(order.ship_by_date)
        order.days_until_ship_deadline = _calculate_days_until_deadline(order.ship_by_date)

        return order

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving FBM order {order_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order details"
        )


# ============================================================================
# ENDPOINT: Update FBM Order
# ============================================================================

@router.put("/{order_id}", response_model=FBMOrderResponse)
async def update_fbm_order(
    order_id: int,
    request: UpdateFBMOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update order status, tracking, or notes."""
    try:
        order = _check_org_access(db, current_user, order_id)

        if request.status:
            order.status = request.status.value

        if request.tracking_number is not None:
            order.tracking_number = request.tracking_number

        if request.notes is not None:
            order.notes = request.notes

        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)

        logger.info(
            f"Updated FBM order {order_id} for org {current_user.org_id}",
            extra={"org_id": current_user.org_id, "order_id": order_id}
        )

        order.is_overdue = _is_overdue(order.ship_by_date)
        order.days_until_ship_deadline = _calculate_days_until_deadline(order.ship_by_date)

        return order

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating FBM order {order_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order"
        )


# ============================================================================
# ENDPOINT: Delete/Cancel FBM Order
# ============================================================================

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fbm_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel an FBM order. Can only cancel pending/processing orders."""
    try:
        order = _check_org_access(db, current_user, order_id)

        if order.status not in [OrderStatus.PENDING.value, OrderStatus.PROCESSING.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel order with status: {order.status}"
            )

        order.status = OrderStatus.CANCELLED.value
        order.updated_at = datetime.utcnow()
        db.commit()

        logger.info(
            f"Cancelled FBM order {order_id} for org {current_user.org_id}",     extra={"org_id": current_user.org_id, "order_id": order_id}
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting FBM order {order_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel order"
        )


# ============================================================================
# ENDPOINT: Ship Order
# ============================================================================

@router.post("/{order_id}/ship", response_model=FBMOrderResponse)
async def ship_fbm_order(
    order_id: int,
    request: ShippingInfoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark order as shipped with carrier and tracking information."""
    try:
        order = _check_org_access(db, current_user, order_id)

        if order.status == OrderStatus.CANCELLED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot ship a cancelled order"
            )

        order.status = OrderStatus.SHIPPED.value
        order.carrier = request.carrier
        order.tracking_number = request.tracking_number
        order.shipping_method = request.shipping_method
        order.ship_date = request.ship_date or datetime.utcnow()
        order.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(order)

        logger.info(
            f"Shipped FBM order {order_id}: {request.carrier} {request.tracking_number}",
            extra={"org_id": current_user.org_id, "order_id": order_id}
        )

        order.is_overdue = _is_overdue(order.ship_by_date)
        order.days_until_ship_deadline = _calculate_days_until_deadline(order.ship_by_date)

        return order

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error shipping FBM order {order_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark order as shipped"
        )


# ============================================================================
# ENDPOINT: Deliver Order
# ============================================================================

@router.post("/{order_id}/deliver", response_model=FBMOrderResponse)
async def deliver_fbm_order(
    order_id: int,
    request: DeliveryConfirmationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark order as delivered."""
    try:
        order = _check_org_access(db, current_user, order_id)

        if order.status not in [OrderStatus.SHIPPED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only shipped orders can be marked as delivered"
            )

        order.status = OrderStatus.DELIVERED.value
        order.delivery_date = request.delivery_date or datetime.utcnow()
        order.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(order)

        logger.info(
            f"Marked FBM order {order_id} as delivered",
            extra={"org_id": current_user.org_id, "order_id": order_id}
        )

        order.is_overdue = False
        order.days_until_ship_deadline = None

        return order

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error delivering FBM order {order_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark order as delivered"
        )


# ============================================================================
# ENDPOINT: Process Return
# ============================================================================

@router.post("/{order_id}/return", response_model=FBMOrderResponse)
async def process_fbm_return(
    order_id: int,
    request: ReturnProcessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process a return for a delivered order."""
    try:
        order = _check_org_access(db, current_user, order_id)

        if order.status != OrderStatus.DELIVERED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only delivered orders can be returned"
            )

        if request.refund_amount > order.total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refund amount cannot exceed order total"
            )

        order.status = OrderStatus.RETURNED.value
        order.return_reason = request.return_reason
        order.refund_amount = request.refund_amount
        order.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(order)

        logger.info(
            f"Processed return for FBM order {order_id}: ${request.refund_amount}",
            extra={"org_id": current_user.org_id, "order_id": order_id}
        )

        return order

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing return for order {order_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process return"
        )


# ============================================================================
# ENDPOINT: FBM Dashboard
# ============================================================================

@router.get("/dashboard/metrics", response_model=DashboardMetrics)
async def get_fbm_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    period_days: int = Query(30, ge=1, le=365),
):
    """
    Get FBM operations dashboard with key performance indicators.

    Metrics include:
    - Order counts (total, pending, shipped today, delivered this week)
    - Handling time (avg hours from order to shipment)
    - Late shipments and on-time delivery %
    - Return rate and monthly revenue
    """
    try:
        now = datetime.utcnow()
        period_start = now - timedelta(days=period_days)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Query base
        base_query = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.created_at >= period_start
        )

        # Total orders
        total_orders = base_query.count()

        # Pending orders
        pending_orders = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.status == OrderStatus.PENDING.value
        ).count()

        # Shipped today
        shipped_today = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.status == OrderStatus.SHIPPED.value,
            FBMOrder.ship_date >= today_start
        ).count()

        # Delivered this week
        delivered_this_week = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.status == OrderStatus.DELIVERED.value,
            FBMOrder.delivery_date >= week_start
        ).count()

        # Average handling time
        shipped_orders = base_query.filter(
            FBMOrder.ship_date.isnot(None)
        ).all()

        handling_times = [
            _calculate_handling_time(order.order_date, order.ship_date)
            for order in shipped_orders
            if _calculate_handling_time(order.order_date, order.ship_date) is not None
        ]
        avg_handling_time_hours = (
            sum(handling_times) / len(handling_times)
            if handling_times
            else 0
        )

        # Late shipments (shipped after ship_by_date)
        late_shipment_count = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.ship_date.isnot(None),
            FBMOrder.ship_date > FBMOrder.ship_by_date
        ).count()

        # On-time delivery %
        on_time_count = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.delivery_date.isnot(None),
            FBMOrder.delivery_date <= FBMOrder.delivery_by_date
        ).count()

        delivered_total = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.delivery_date.isnot(None)
        ).count()

        on_time_delivery_pct = (
            (on_time_count / delivered_total * 100)
            if delivered_total > 0
            else 0
        )

        # Return rate %
        returns = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.status == OrderStatus.RETURNED.value
        ).count()

        return_rate_pct = (
            (returns / total_orders * 100)
            if total_orders > 0
            else 0
        )

        # Revenue this month
        revenue = db.query(text("SUM(total_amount)")).filter(
            text(f"org_id = {current_user.org_id} AND created_at >= '{month_start}'")
        ).scalar() or Decimal(0)

        logger.info(
            f"Generated FBM dashboard for org {current_user.org_id}",
            extra={"org_id": current_user.org_id}
        )

        return DashboardMetrics(
            total_orders=total_orders,
            pending_orders=pending_orders,
            shipped_today=shipped_today,
            delivered_this_week=delivered_this_week,
            avg_handling_time_hours=avg_handling_time_hours,
            late_shipment_count=late_shipment_count,
            on_time_delivery_pct=on_time_delivery_pct,
            return_rate_pct=return_rate_pct,
            revenue_this_month=revenue,
            period_start=period_start,
            period_end=now,
        )

    except Exception as e:
        logger.error(f"Error generating FBM dashboard: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard metrics"
        )


# ============================================================================
# ENDPOINT: Performance Metrics
# ============================================================================

@router.get("/metrics/performance", response_model=PerformanceMetrics)
async def get_performance_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    period_days: int = Query(30, ge=1, le=365),
):
    """
    Get detailed FBM performance metrics aligned with Amazon's health scorecard.

    Amazon FBM Health Metrics:
    - Order Defect Rate (ODR): Returned + A-to-Z claims / Total orders < 1%
    - Late Shipment Rate (LSR): Late shipped / Total shipped < 4%
    - Pre-fulfillment Cancel Rate (PFCR): Cancelled / Total < 0.5%
    - Valid Tracking Rate (VTR): Valid tracking provided / Total shipped > 95%

    Performance Status: healthy (all metrics OK) / at_risk / critical
    """
    try:
        now = datetime.utcnow()
        period_start = now - timedelta(days=period_days)

        # Total orders in period
        total_orders = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.created_at >= period_start
        ).count()

        if total_orders == 0:
            return PerformanceMetrics(
                order_defect_rate=0.0,
                late_shipment_rate=0.0,
                pre_fulfillment_cancel_rate=0.0,
                valid_tracking_rate=100.0,
                performance_status=PerformanceStatus.HEALTHY,
                last_updated=now,
                notes="No orders in period"
            )

        # Order Defect Rate (returns / total)
        returned_orders = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.status == OrderStatus.RETURNED.value,
            FBMOrder.created_at >= period_start
        ).count()

        order_defect_rate = (returned_orders / total_orders * 100) if total_orders > 0 else 0

        # Late Shipment Rate
        shipped_orders = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.ship_date.isnot(None),
            FBMOrder.created_at >= period_start
        ).all()

        late_count = sum(
            1 for order in shipped_orders
            if order.ship_date > order.ship_by_date
        )

        late_shipment_rate = (
            (late_count / len(shipped_orders) * 100)
            if shipped_orders
            else 0
        )

        # Pre-fulfillment Cancel Rate
        cancelled_orders = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.status == OrderStatus.CANCELLED.value,
            FBMOrder.created_at >= period_start
        ).count()

        pre_fulfillment_cancel_rate = (
            (cancelled_orders / total_orders * 100)
            if total_orders > 0
            else 0
        )

        # Valid Tracking Rate
        valid_tracking_count = sum(
            1 for order in shipped_orders
            if order.tracking_number and order.tracking_number.strip()
        )

        valid_tracking_rate = (
            (valid_tracking_count / len(shipped_orders) * 100)
            if shipped_orders
            else 100
        )

        # Compute performance status
        performance_status = _compute_performance_status(
            order_defect_rate,
            late_shipment_rate,
            pre_fulfillment_cancel_rate,
            valid_tracking_rate
        )

        logger.info(
            f"Generated performance metrics for org {current_user.org_id}: "
            f"ODR={order_defect_rate:.2f}%, LSR={late_shipment_rate:.2f}%, "
            f"PFCR={pre_fulfillment_cancel_rate:.2f}%, VTR={valid_tracking_rate:.2f}%",
            extra={"org_id": current_user.org_id}
        )

        return PerformanceMetrics(
            order_defect_rate=round(order_defect_rate, 2),
            late_shipment_rate=round(late_shipment_rate, 2),
            pre_fulfillment_cancel_rate=round(pre_fulfillment_cancel_rate, 2),
            valid_tracking_rate=round(valid_tracking_rate, 2),
            performance_status=performance_status,
            last_updated=now,
        )

    except Exception as e:
        logger.error(f"Error calculating performance metrics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate performance metrics"
        )


# ============================================================================
# ENDPOINT: Pending Orders
# ============================================================================

@router.get("/pending", response_model=List[PendingOrderResponse])
async def get_pending_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    include_overdue: bool = Query(True),
):
    """
    Get all orders needing action (ship_by date approaching).

    Sorted by urgency (ship_by_date closest first).
    Flagged if overdue.
    """
    try:
        now = datetime.utcnow()

        query = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.status.in_([OrderStatus.PENDING.value, OrderStatus.PROCESSING.value])
        )

        orders = query.order_by(FBMOrder.ship_by_date.asc()).all()

        # Enrich with computed fields
        for order in orders:
            order.is_overdue = _is_overdue(order.ship_by_date)
            order.days_until_deadline = _calculate_days_until_deadline(order.ship_by_date)
            order.item_count = len(order.items) if order.items else 0

        # Filter out non-overdue if not requested
        if not include_overdue:
            orders = [o for o in orders if not o.is_overdue]

        logger.info(
            f"Retrieved {len(orders)} pending FBM orders for org {current_user.org_id}",
            extra={"org_id": current_user.org_id}
        )

        return orders

    except Exception as e:
        logger.error(f"Error retrieving pending orders: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pending orders"
        )


# ============================================================================
# ENDPOINT: Bulk Ship Orders
# ============================================================================

@router.post("/bulk-ship", status_code=status.HTTP_200_OK)
async def bulk_ship_orders(
    request: BulkShippingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bulk mark multiple orders as shipped.

    Input: list of {order_id, carrier, tracking_number}
    """
    try:
        if not request.shipments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Shipments list cannot be empty"
            )

        if len(request.shipments) > 500:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 500 orders per bulk operation"
            )

        successful = 0
        failed = 0
        errors = []

        for shipment in request.shipments:
            try:
                order = _check_org_access(db, current_user, shipment.get("order_id"))

                if order.status == OrderStatus.CANCELLED.value:
                    failed += 1
                    errors.append(
                        f"Order {shipment.get('order_id')}: Cannot ship cancelled order"
                    )
                    continue

                order.status = OrderStatus.SHIPPED.value
                order.carrier = shipment.get("carrier")
                order.tracking_number = shipment.get("tracking_number")
                order.ship_date = datetime.utcnow()
                order.updated_at = datetime.utcnow()

                successful += 1

            except HTTPException:
                failed += 1
                errors.append(f"Order {shipment.get('order_id')}: Not found or access denied")
            except Exception as e:
                failed += 1
                errors.append(f"Order {shipment.get('order_id')}: {str(e)}")

        db.commit()

        logger.info(
            f"Bulk shipped {successful} orders for org {current_user.org_id} "
            f"({failed} failed)",
            extra={"org_id": current_user.org_id}
        )

        return {
            "successful": successful,
            "failed": failed,
            "errors": errors if errors else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error bulk shipping orders: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk ship orders"
        )


# ============================================================================
# ENDPOINT: Returns List
# ============================================================================

@router.get("/returns", response_model=List[ReturnRecord])
async def list_returns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List all returns with status and refund information."""
    try:
        returns = db.query(FBMOrder).filter(
            FBMOrder.org_id == current_user.org_id,
            FBMOrder.status == OrderStatus.RETURNED.value
        ).order_by(
            FBMOrder.updated_at.desc()
        ).offset(skip).limit(limit).all()

        # Enrich with return date
        for r in returns:
            r.return_date = r.updated_at

        logger.info(
            f"Retrieved {len(returns)} return records for org {current_user.org_id}",
            extra={"org_id": current_user.org_id}
        )

        return returns

    except Exception as e:
        logger.error(f"Error retrieving returns: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve returns"
        )


# ============================================================================
# ENDPOINT: Shipping Labels (Mock)
# ============================================================================

@router.get("/shipping-labels/{order_id}", response_model=ShippingLabel)
async def get_shipping_label(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mock endpoint for generating shipping labels.

    In production, this would integrate with carrier APIs.
    """
    try:
        order = _check_org_access(db, current_user, order_id)

        if not order.tracking_number or not order.carrier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must have carrier and tracking number"
            )

        # Mock label URL
        label_url = (
            f"https://labels.ecomera.io/fbm/{order.org_id}/"
            f"{order.id}_{order.tracking_number}.pdf"
        )

        expires_at = datetime.utcnow() + timedelta(days=30)

        logger.info(
            f"Generated shipping label for order {order_id}",
            extra={"org_id": current_user.org_id, "order_id": order_id}
        )

        return ShippingLabel(
            order_id=order_id,
            amazon_order_id=order.amazon_order_id,
            carrier=order.carrier,
            tracking_number=order.tracking_number,
            label_url=label_url,
            expires_at=expires_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating shipping label: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate shipping label"
        )
