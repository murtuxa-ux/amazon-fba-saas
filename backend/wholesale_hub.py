from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import Session, relationship
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import math

from auth import get_current_user, tenant_session
from database import get_db, Base, engine
from models import User

# ============================================================================
# ENUMS
# ============================================================================

class ApprovalStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    ungated = "ungated"

class HuntStatus(str, Enum):
    lead = "lead"
    sourced = "sourced"
    approved = "approved"
    ordered = "ordered"
    received = "received"
    listed = "listed"

class POStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    confirmed = "confirmed"
    shipped = "shipped"
    received = "received"
    invoiced = "invoiced"

# ============================================================================
# SQLAlchemy MODELS
# ============================================================================

class WholesaleProduct(Base):
    __tablename__ = "wholesale_products"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True)
    client_id = Column(Integer, nullable=True)
    asin = Column(String(20), index=True)
    product_title = Column(String(500))
    brand = Column(String(200), nullable=True)
    category = Column(String(200), nullable=True)
    supplier_id = Column(Integer, ForeignKey("wholesale_suppliers.id"), nullable=True)

    buy_price = Column(Float)
    amazon_price = Column(Float)
    fba_fee = Column(Float, default=0.0)
    referral_fee = Column(Float, default=0.0)
    prep_cost = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    roi_pct = Column(Float, default=0.0)
    margin_pct = Column(Float, default=0.0)

    bsr = Column(Integer, nullable=True)
    bsr_category = Column(String(200), nullable=True)
    monthly_sales_est = Column(Integer, default=0)
    buy_box_pct = Column(Float, default=0.0)
    num_fba_sellers = Column(Integer, default=0)

    is_hazmat = Column(Boolean, default=False)
    is_gated = Column(Boolean, default=False)
    approval_status = Column(SQLEnum(ApprovalStatus), default=ApprovalStatus.pending)
    hunt_status = Column(SQLEnum(HuntStatus), default=HuntStatus.lead)

    score = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = relationship("WholesaleSupplier", back_populates="products")
    deal_score = relationship("WholesaleDealScore", back_populates="product", uselist=False, cascade="all, delete-orphan")
    po_items = relationship("WholesalePOLineItem", back_populates="product")

class WholesaleSupplier(Base):
    __tablename__ = "wholesale_suppliers"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True)
    name = Column(String(300), index=True)
    contact_person = Column(String(200), nullable=True)
    email = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    website = Column(String(500), nullable=True)
    address = Column(Text, nullable=True)

    payment_terms = Column(String(200), nullable=True)
    min_order_qty = Column(Integer, default=1)
    min_order_value = Column(Float, nullable=True)
    lead_time_days = Column(Integer, default=7)
    reliability_rating = Column(Float, default=3.0)

    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    products = relationship("WholesaleProduct", back_populates="supplier")
    purchase_orders = relationship("WholesalePurchaseOrder", back_populates="supplier")

class WholesalePurchaseOrder(Base):
    __tablename__ = "wholesale_purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True)
    client_id = Column(Integer, nullable=True)
    supplier_id = Column(Integer, ForeignKey("wholesale_suppliers.id"))

    po_number = Column(String(50), unique=True, index=True)
    order_date = Column(DateTime, default=datetime.utcnow)
    expected_delivery = Column(DateTime, nullable=True)
    status = Column(SQLEnum(POStatus), default=POStatus.draft)

    subtotal = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = relationship("WholesaleSupplier", back_populates="purchase_orders")
    line_items = relationship("WholesalePOLineItem", back_populates="purchase_order", cascade="all, delete-orphan")

class WholesalePOLineItem(Base):
    __tablename__ = "wholesale_po_line_items"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("wholesale_purchase_orders.id"))
    product_id = Column(Integer, ForeignKey("wholesale_products.id"), nullable=True)
    asin = Column(String(20), nullable=True)
    quantity = Column(Integer)
    unit_price = Column(Float)
    total_price = Column(Float)

    purchase_order = relationship("WholesalePurchaseOrder", back_populates="line_items")
    product = relationship("WholesaleProduct", back_populates="po_items")

class WholesaleDealScore(Base):
    __tablename__ = "wholesale_deal_scores"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("wholesale_products.id"), unique=True)
    score_breakdown = Column(JSON)

    product = relationship("WholesaleProduct", back_populates="deal_score")

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class WholesaleSupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    min_order_qty: int = 1
    min_order_value: Optional[float] = None
    lead_time_days: int = 7
    reliability_rating: float = 3.0
    notes: Optional[str] = None

class WholesaleSupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    min_order_qty: Optional[int] = None
    min_order_value: Optional[float] = None
    lead_time_days: Optional[int] = None
    reliability_rating: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class WholesaleSupplierResponse(BaseModel):
    id: int
    name: str
    contact_person: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    website: Optional[str]
    address: Optional[str]
    payment_terms: Optional[str]
    min_order_qty: int
    min_order_value: Optional[float]
    lead_time_days: int
    reliability_rating: float
    is_active: bool
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class WholesaleProductCreate(BaseModel):
    asin: str
    product_title: str
    brand: Optional[str] = None
    category: Optional[str] = None
    supplier_id: Optional[int] = None
    client_id: Optional[int] = None
    buy_price: float
    amazon_price: float
    bsr: Optional[int] = None
    bsr_category: Optional[str] = None
    monthly_sales_est: int = 0
    buy_box_pct: float = 0.0
    num_fba_sellers: int = 0
    is_hazmat: bool = False
    is_gated: bool = False
    notes: Optional[str] = None

class WholesaleProductUpdate(BaseModel):
    product_title: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    supplier_id: Optional[int] = None
    buy_price: Optional[float] = None
    amazon_price: Optional[float] = None
    bsr: Optional[int] = None
    bsr_category: Optional[str] = None
    monthly_sales_est: Optional[int] = None
    buy_box_pct: Optional[float] = None
    num_fba_sellers: Optional[int] = None
    is_hazmat: Optional[bool] = None
    is_gated: Optional[bool] = None
    approval_status: Optional[ApprovalStatus] = None
    hunt_status: Optional[HuntStatus] = None
    notes: Optional[str] = None

class WholesaleProductResponse(BaseModel):
    id: int
    asin: str
    product_title: str
    brand: Optional[str]
    category: Optional[str]
    supplier_id: Optional[int]
    buy_price: float
    amazon_price: float
    fba_fee: float
    referral_fee: float
    prep_cost: float
    shipping_cost: float
    net_profit: float
    roi_pct: float
    margin_pct: float
    bsr: Optional[int]
    bsr_category: Optional[str]
    monthly_sales_est: int
    buy_box_pct: float
    num_fba_sellers: int
    is_hazmat: bool
    is_gated: bool
    approval_status: ApprovalStatus
    hunt_status: HuntStatus
    score: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class POLineItemCreate(BaseModel):
    product_id: Optional[int] = None
    asin: Optional[str] = None
    quantity: int
    unit_price: float

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    client_id: Optional[int] = None
    po_number: str
    expected_delivery: Optional[datetime] = None
    shipping_cost: float = 0.0
    notes: Optional[str] = None
    line_items: List[POLineItemCreate]

class PurchaseOrderUpdate(BaseModel):
    status: Optional[POStatus] = None
    expected_delivery: Optional[datetime] = None
    shipping_cost: Optional[float] = None
    notes: Optional[str] = None

class POLineItemResponse(BaseModel):
    id: int
    asin: Optional[str]
    quantity: int
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True

class PurchaseOrderResponse(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    status: POStatus
    order_date: datetime
    expected_delivery: Optional[datetime]
    subtotal: float
    shipping_cost: float
    total: float
    notes: Optional[str]
    line_items: List[POLineItemResponse]
    created_at: datetime

    class Config:
        from_attributes = True

class DealScoreRequest(BaseModel):
    bsr: Optional[int] = None
    roi_pct: float
    num_fba_sellers: int
    buy_box_pct: float = 0.0
    monthly_sales_est: int = 0

class DealScoreResponse(BaseModel):
    score: float
    breakdown: Dict[str, Any]
    recommendation: str

class ProfitCalcRequest(BaseModel):
    buy_price: float
    amazon_price: float
    weight_oz: float = 0.0
    category: str = "general"

class ProfitCalcResponse(BaseModel):
    amazon_price: float
    buy_price: float
    fba_fee: float
    referral_fee: float
    net_profit: float
    roi_pct: float
    margin_pct: float

# ============================================================================
# DEAL SCORING ALGORITHM
# ============================================================================

def calculate_deal_score(product: WholesaleProduct) -> Dict[str, Any]:
    """
    Score products 0-100 based on:
    - BSR rank (weight 20): lower is better
    - ROI (weight 25): higher is better
    - Competition/FBA sellers (weight 15): lower is better
    - Buy box share (weight 20): higher is better
    - Estimated monthly demand (weight 20): higher is better
    """
    scores = {}

    # BSR Score (0-20): lower BSR = higher score
    if product.bsr and product.bsr > 0:
        bsr_score = max(0, 20 - (product.bsr / 1000))
        bsr_score = min(20, bsr_score)
    else:
        bsr_score = 0
    scores["bsr_score"] = round(bsr_score, 2)

    # ROI Score (0-25): higher ROI = higher score
    roi_score = min(25, (product.roi_pct / 4))
    scores["roi_score"] = round(roi_score, 2)

    # Competition Score (0-15): fewer sellers = higher score
    if product.num_fba_sellers > 0:
        competition_score = max(0, 15 - (product.num_fba_sellers * 0.5))
        competition_score = min(15, max(0, competition_score))
    else:
        competition_score = 15
    scores["competition_score"] = round(competition_score, 2)

    # Buy Box Score (0-20): higher buy box % = higher score
    buy_box_score = (product.buy_box_pct / 100) * 20
    buy_box_score = min(20, max(0, buy_box_score))
    scores["buy_box_score"] = round(buy_box_score, 2)

    # Demand Score (0-20): higher monthly sales = higher score
    if product.monthly_sales_est > 0:
        demand_score = min(20, math.log(product.monthly_sales_est + 1) * 3)
    else:
        demand_score = 0
    scores["demand_score"] = round(demand_score, 2)

    total_score = (
        scores["bsr_score"] +
        scores["roi_score"] +
        scores["competition_score"] +
        scores["buy_box_score"] +
        scores["demand_score"]
    )
    scores["total_score"] = round(total_score, 2)

    # Recommendation
    if total_score >= 80:
        recommendation = "Strong Buy"
    elif total_score >= 60:
        recommendation = "Buy"
    elif total_score >= 40:
        recommendation = "Hold"
    else:
        recommendation = "Pass"

    scores["recommendation"] = recommendation

    return scores

# ============================================================================
# PROFITABILITY CALCULATOR
# ============================================================================

def calculate_profitability(buy_price: float, amazon_price: float, weight_oz: float = 0.0, category: str = "general") -> Dict[str, float]:
    """
    Calculate FBA fees, referral fees, and net profit.
    Simplified FBA fee calculation based on category.
    """
    referral_rate = {
        "electronics": 0.08,
        "books": 0.15,
        "apparel": 0.17,
        "general": 0.15
    }.get(category.lower(), 0.15)

    # Simplified FBA fee (per unit): weight * rate + base
    if weight_oz > 0:
        fba_fee = (weight_oz / 16) * 0.50 + 0.50
    else:
        fba_fee = 0.50

    referral_fee = amazon_price * referral_rate
    total_fees = fba_fee + referral_fee

    net_profit = amazon_price - buy_price - total_fees
    roi_pct = (net_profit / buy_price * 100) if buy_price > 0 else 0
    margin_pct = (net_profit / amazon_price * 100) if amazon_price > 0 else 0

    return {
        "amazon_price": round(amazon_price, 2),
        "buy_price": round(buy_price, 2),
        "fba_fee": round(fba_fee, 2),
        "referral_fee": round(referral_fee, 2),
        "net_profit": round(net_profit, 2),
        "roi_pct": round(roi_pct, 2),
        "margin_pct": round(margin_pct, 2)
    }

# ============================================================================
# API ROUTER
# ============================================================================

router = APIRouter(prefix="/wholesale", tags=["Wholesale"])

# ============================================================================
# WHOLESALE PRODUCTS ENDPOINTS
# ============================================================================

@router.get("/products", response_model=List[WholesaleProductResponse])
def list_products(
    hunt_status: Optional[HuntStatus] = Query(None),
    min_roi: Optional[float] = Query(None),
    min_score: Optional[float] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """List wholesale products with optional filters"""
    query = db.query(WholesaleProduct).filter(WholesaleProduct.org_id == current_user.org_id)

    if hunt_status:
        query = query.filter(WholesaleProduct.hunt_status == hunt_status)
    if min_roi is not None:
        query = query.filter(WholesaleProduct.roi_pct >= min_roi)
    if min_score is not None:
        query = query.filter(WholesaleProduct.score >= min_score)
    if client_id:
        query = query.filter(WholesaleProduct.client_id == client_id)

    return query.order_by(WholesaleProduct.created_at.desc()).all()

@router.post("/products", response_model=WholesaleProductResponse)
def create_product(
    product: WholesaleProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Create a new wholesale product"""
    profit_calc = calculate_profitability(
        product.buy_price,
        product.amazon_price,
        category=product.category or "general"
    )

    db_product = WholesaleProduct(
        org_id=current_user.org_id,
        asin=product.asin,
        product_title=product.product_title,
        brand=product.brand,
        category=product.category,
        supplier_id=product.supplier_id,
        client_id=product.client_id,
        buy_price=product.buy_price,
        amazon_price=product.amazon_price,
        fba_fee=profit_calc["fba_fee"],
        referral_fee=profit_calc["referral_fee"],
        net_profit=profit_calc["net_profit"],
        roi_pct=profit_calc["roi_pct"],
        margin_pct=profit_calc["margin_pct"],
        bsr=product.bsr,
        bsr_category=product.bsr_category,
        monthly_sales_est=product.monthly_sales_est,
        buy_box_pct=product.buy_box_pct,
        num_fba_sellers=product.num_fba_sellers,
        is_hazmat=product.is_hazmat,
        is_gated=product.is_gated,
        notes=product.notes
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # Calculate and store deal score
    score_data = calculate_deal_score(db_product)
    db_product.score = score_data["total_score"]
    db_deal_score = WholesaleDealScore(
        product_id=db_product.id,
        score_breakdown=score_data
    )
    db.add(db_deal_score)
    db.commit()
    db.refresh(db_product)

    return db_product

@router.get("/products/{product_id}", response_model=WholesaleProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Get a specific wholesale product"""
    product = db.query(WholesaleProduct).filter(
        WholesaleProduct.id == product_id,
        WholesaleProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/products/{product_id}", response_model=WholesaleProductResponse)
def update_product(
    product_id: int,
    product_update: WholesaleProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Update a wholesale product"""
    db_product = db.query(WholesaleProduct).filter(
        WholesaleProduct.id == product_id,
        WholesaleProduct.org_id == current_user.org_id
    ).first()

    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)

    db_product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_product)

    return db_product

@router.post("/products/{product_id}/score", response_model=DealScoreResponse)
def score_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Calculate deal score for a product"""
    product = db.query(WholesaleProduct).filter(
        WholesaleProduct.id == product_id,
        WholesaleProduct.org_id == current_user.org_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    score_data = calculate_deal_score(product)
    product.score = score_data["total_score"]

    existing_score = db.query(WholesaleDealScore).filter(
        WholesaleDealScore.product_id == product_id
    ).first()

    if existing_score:
        existing_score.score_breakdown = score_data
    else:
        db_deal_score = WholesaleDealScore(
            product_id=product_id,
            score_breakdown=score_data
        )
        db.add(db_deal_score)

    db.commit()

    return DealScoreResponse(
        score=score_data["total_score"],
        breakdown=score_data,
        recommendation=score_data["recommendation"]
    )

@router.post("/calculate-profit", response_model=ProfitCalcResponse)
def calculate_profit(req: ProfitCalcRequest):
    """Calculate profitability metrics for a product"""
    result = calculate_profitability(
        req.buy_price,
        req.amazon_price,
        req.weight_oz,
        req.category
    )
    return result

# ============================================================================
# WHOLESALE SUPPLIERS ENDPOINTS
# ============================================================================

@router.get("/suppliers", response_model=List[WholesaleSupplierResponse])
def list_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """List all suppliers"""
    return db.query(WholesaleSupplier).filter(
        WholesaleSupplier.org_id == current_user.org_id,
        WholesaleSupplier.is_active == True
    ).order_by(WholesaleSupplier.name).all()

@router.post("/suppliers", response_model=WholesaleSupplierResponse)
def create_supplier(
    supplier: WholesaleSupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Create a new supplier"""
    db_supplier = WholesaleSupplier(
        org_id=current_user.org_id,
        **supplier.dict()
    )
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.get("/suppliers/{supplier_id}", response_model=WholesaleSupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Get a specific supplier"""
    supplier = db.query(WholesaleSupplier).filter(
        WholesaleSupplier.id == supplier_id,
        WholesaleSupplier.org_id == current_user.org_id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.put("/suppliers/{supplier_id}", response_model=WholesaleSupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier_update: WholesaleSupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Update a supplier"""
    db_supplier = db.query(WholesaleSupplier).filter(
        WholesaleSupplier.id == supplier_id,
        WholesaleSupplier.org_id == current_user.org_id
    ).first()

    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    update_data = supplier_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_supplier, field, value)

    db_supplier.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

# ============================================================================
# PURCHASE ORDERS ENDPOINTS
# ============================================================================

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    status: Optional[POStatus] = Query(None),
    supplier_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """List purchase orders with optional filters"""
    query = db.query(WholesalePurchaseOrder).filter(WholesalePurchaseOrder.org_id == current_user.org_id)

    if status:
        query = query.filter(WholesalePurchaseOrder.status == status)
    if supplier_id:
        query = query.filter(WholesalePurchaseOrder.supplier_id == supplier_id)
    if client_id:
        query = query.filter(WholesalePurchaseOrder.client_id == client_id)

    return query.order_by(WholesalePurchaseOrder.created_at.desc()).all()

@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
def create_purchase_order(
    po: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Create a new purchase order"""
    db_po = WholesalePurchaseOrder(
        org_id=current_user.org_id,
        client_id=po.client_id,
        supplier_id=po.supplier_id,
        po_number=po.po_number,
        expected_delivery=po.expected_delivery,
        shipping_cost=po.shipping_cost,
        notes=po.notes
    )

    subtotal = 0.0
    for item in po.line_items:
        item_total = item.quantity * item.unit_price
        subtotal += item_total

        db_item = WholesalePOLineItem(
            asin=item.asin,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item_total
        )
        db_po.line_items.append(db_item)

    db_po.subtotal = round(subtotal, 2)
    db_po.total = round(subtotal + po.shipping_cost, 2)

    db.add(db_po)
    db.commit()
    db.refresh(db_po)
    return db_po

@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Get a specific purchase order"""
    po = db.query(WholesalePurchaseOrder).filter(
        WholesalePurchaseOrder.id == po_id,
        WholesalePurchaseOrder.org_id == current_user.org_id
    ).first()

    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po

@router.put("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: int,
    po_update: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Update a purchase order"""
    db_po = db.query(WholesalePurchaseOrder).filter(
        WholesalePurchaseOrder.id == po_id,
        WholesalePurchaseOrder.org_id == current_user.org_id
    ).first()

    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    update_data = po_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_po, field, value)

    db_po.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_po)
    return db_po

@router.post("/purchase-orders/{po_id}/submit")
def submit_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Submit a draft purchase order"""
    db_po = db.query(WholesalePurchaseOrder).filter(
        WholesalePurchaseOrder.id == po_id,
        WholesalePurchaseOrder.org_id == current_user.org_id
    ).first()

    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if db_po.status != POStatus.draft:
        raise HTTPException(status_code=400, detail="Only draft POs can be submitted")

    db_po.status = POStatus.submitted
    db_po.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_po)

    return {"status": "submitted", "po_id": po_id}

# ============================================================================
# WHOLESALE DASHBOARD ENDPOINT
# ============================================================================

@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(tenant_session)
):
    """Get wholesale operations dashboard summary"""
    base_query = db.query(WholesaleProduct).filter(WholesaleProduct.org_id == current_user.org_id)

    # Pipeline summary
    pipeline = {}
    for status in HuntStatus:
        count = base_query.filter(WholesaleProduct.hunt_status == status).count()
        pipeline[status.value] = count

    # Top 10 deals by score
    top_deals = db.query(WholesaleProduct).filter(
        WholesaleProduct.org_id == current_user.org_id
    ).order_by(WholesaleProduct.score.desc()).limit(10).all()

    top_deals_data = [
        {
            "id": d.id,
            "asin": d.asin,
            "product_title": d.product_title,
            "score": d.score,
            "roi_pct": d.roi_pct,
            "hunt_status": d.hunt_status.value
        }
        for d in top_deals
    ]

    # Total products by approval status
    approval_summary = {}
    for status in ApprovalStatus:
        count = base_query.filter(WholesaleProduct.approval_status == status).count()
        approval_summary[status.value] = count

    # Purchase order stats
    po_stats = db.query(WholesalePurchaseOrder).filter(
        WholesalePurchaseOrder.org_id == current_user.org_id
    )
    total_po_value = sum(po.total for po in po_stats.all())
    po_count = po_stats.count()

    # Supplier stats
    suppliers = db.query(WholesaleSupplier).filter(
        WholesaleSupplier.org_id == current_user.org_id,
        WholesaleSupplier.is_active == True
    ).all()

    supplier_stats = [
        {
            "id": s.id,
            "name": s.name,
            "reliability_rating": s.reliability_rating,
            "product_count": db.query(WholesaleProduct).filter(
                WholesaleProduct.supplier_id == s.id
            ).count()
        }
        for s in suppliers
    ]

    return {
        "pipeline": pipeline,
        "total_products": base_query.count(),
        "approval_summary": approval_summary,
        "top_deals": top_deals_data,
        "purchase_orders": {
            "total_count": po_count,
            "total_value": round(total_po_value, 2)
        },
        "suppliers": supplier_stats,
        "avg_deal_score": round(base_query.with_entities(
            db.func.avg(WholesaleProduct.score)
        ).scalar() or 0, 2)
    }
