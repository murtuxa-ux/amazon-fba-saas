from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from database import Base, get_db
from auth import get_current_user

# ============================================================================
# SQLALCHEMY MODELS
# ============================================================================

class ClientPnL(Base):
    __tablename__ = "client_pnl"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    logged_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    month = Column(String(7), nullable=False)  # Format: "2026-03"
    year = Column(Integer, nullable=False)

    revenue = Column(Float, default=0)
    cogs = Column(Float, default=0)
    fba_fees = Column(Float, default=0)
    referral_fees = Column(Float, default=0)
    ad_spend = Column(Float, default=0)
    other_expenses = Column(Float, default=0)

    units_sold = Column(Integer, default=0)
    orders_count = Column(Integer, default=0)
    active_asins = Column(Integer, default=0)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    line_items = relationship("PnLLineItem", back_populates="pnl", cascade="all, delete-orphan")

    # Computed properties
    @property
    def gross_profit(self):
        return self.revenue - self.cogs

    @property
    def net_profit(self):
        return self.gross_profit - self.fba_fees - self.referral_fees - self.ad_spend - self.other_expenses

    @property
    def profit_margin_pct(self):
        if self.revenue == 0:
            return 0.0
        return round((self.net_profit / self.revenue) * 100, 2)

    __table_args__ = (
        __table__.unique_constraint('org_id', 'client_id', 'month', name='uq_pnl_client_month'),
    )


class PnLLineItem(Base):
    __tablename__ = "pnl_line_items"

    id = Column(Integer, primary_key=True, index=True)
    pnl_id = Column(Integer, ForeignKey("client_pnl.id"), nullable=False, index=True)

    asin = Column(String(10), nullable=False)
    title = Column(String(500), nullable=True)

    revenue = Column(Float, default=0)
    cogs = Column(Float, default=0)
    fees = Column(Float, default=0)
    ad_spend = Column(Float, default=0)

    units_sold = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    pnl = relationship("ClientPnL", back_populates="line_items")

    @property
    def profit(self):
        return self.revenue - self.cogs - self.fees - self.ad_spend


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class PnLLineItemCreate(BaseModel):
    asin: str
    title: Optional[str] = None
    revenue: float = 0.0
    cogs: float = 0.0
    fees: float = 0.0
    ad_spend: float = 0.0
    units_sold: int = 0


class PnLLineItemUpdate(BaseModel):
    asin: Optional[str] = None
    title: Optional[str] = None
    revenue: Optional[float] = None
    cogs: Optional[float] = None
    fees: Optional[float] = None
    ad_spend: Optional[float] = None
    units_sold: Optional[int] = None


class PnLLineItemResponse(BaseModel):
    id: int
    pnl_id: int
    asin: str
    title: Optional[str]
    revenue: float
    cogs: float
    fees: float
    ad_spend: float
    units_sold: int
    profit: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientPnLCreate(BaseModel):
    client_id: int
    month: str  # Format: "2026-03"
    revenue: float = 0.0
    cogs: float = 0.0
    fba_fees: float = 0.0
    referral_fees: float = 0.0
    ad_spend: float = 0.0
    other_expenses: float = 0.0
    units_sold: int = 0
    orders_count: int = 0
    active_asins: int = 0
    notes: Optional[str] = None


class ClientPnLUpdate(BaseModel):
    revenue: Optional[float] = None
    cogs: Optional[float] = None
    fba_fees: Optional[float] = None
    referral_fees: Optional[float] = None
    ad_spend: Optional[float] = None
    other_expenses: Optional[float] = None
    units_sold: Optional[int] = None
    orders_count: Optional[int] = None
    active_asins: Optional[int] = None
    notes: Optional[str] = None


class ClientPnLResponse(BaseModel):
    id: int
    org_id: int
    client_id: int
    logged_by: int
    month: str
    year: int
    revenue: float
    cogs: float
    fba_fees: float
    referral_fees: float
    ad_spend: float
    other_expenses: float
    gross_profit: float
    net_profit: float
    profit_margin_pct: float
    units_sold: int
    orders_count: int
    active_asins: int
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    line_items: List[PnLLineItemResponse] = []

    class Config:
        from_attributes = True


class ClientPnLSummaryRow(BaseModel):
    month: str
    revenue: float
    cogs: float
    gross_profit: float
    net_profit: float
    profit_margin_pct: float
    fba_fees: float
    referral_fees: float
    ad_spend: float
    other_expenses: float
    units_sold: int
    orders_count: int
    active_asins: int


class ClientPnLSummary(BaseModel):
    client_id: int
    rows: List[ClientPnLSummaryRow]
    total_revenue: float
    total_net_profit: float
    avg_profit_margin_pct: float


class MonthlyOverviewRow(BaseModel):
    client_id: int
    client_name: Optional[str]
    revenue: float
    net_profit: float
    profit_margin_pct: float
    units_sold: int


class MonthlyOverview(BaseModel):
    month: str
    rows: List[MonthlyOverviewRow]
    total_revenue: float
    total_net_profit: float
    avg_profit_margin_pct: float


class TrendDataPoint(BaseModel):
    month: str
    revenue: float
    net_profit: float
    avg_profit_margin_pct: float


class TrendResponse(BaseModel):
    trends: List[TrendDataPoint]


# ============================================================================
# FASTAPI ROUTER
# ============================================================================

router = APIRouter(prefix="/client-pnl", tags=["Client P&L"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def extract_year_from_month(month_str: str) -> int:
    """Extract year from month string format 'YYYY-MM'"""
    return int(month_str.split('-')[0])


def get_current_org(current_user=Depends(get_current_user)) -> int:
    """Get org_id from current user context"""
    return current_user.org_id


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("", response_model=ClientPnLResponse)
def create_or_update_pnl(
    data: ClientPnLCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org),
    current_user=Depends(get_current_user)
):
    """
    Create or update (upsert) monthly P&L for a client.
    Auto-computes gross_profit, net_profit, and profit_margin_pct.
    """
    # Extract year from month string
    year = extract_year_from_month(data.month)

    # Check if P&L exists for this month
    existing_pnl = db.query(ClientPnL).filter(
        ClientPnL.org_id == org_id,
        ClientPnL.client_id == data.client_id,
        ClientPnL.month == data.month
    ).first()

    if existing_pnl:
        # Update existing
        existing_pnl.revenue = data.revenue
        existing_pnl.cogs = data.cogs
        existing_pnl.fba_fees = data.fba_fees
        existing_pnl.referral_fees = data.referral_fees
        existing_pnl.ad_spend = data.ad_spend
        existing_pnl.other_expenses = data.other_expenses
        existing_pnl.units_sold = data.units_sold
        existing_pnl.orders_count = data.orders_count
        existing_pnl.active_asins = data.active_asins
        existing_pnl.notes = data.notes
        existing_pnl.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_pnl)
        return existing_pnl

    # Create new
    new_pnl = ClientPnL(
        org_id=org_id,
        client_id=data.client_id,
        logged_by=current_user.id,
        month=data.month,
        year=year,
        revenue=data.revenue,
        cogs=data.cogs,
        fba_fees=data.fba_fees,
        referral_fees=data.referral_fees,
        ad_spend=data.ad_spend,
        other_expenses=data.other_expenses,
        units_sold=data.units_sold,
        orders_count=data.orders_count,
        active_asins=data.active_asins,
        notes=data.notes
    )
    db.add(new_pnl)
    db.commit()
    db.refresh(new_pnl)
    return new_pnl


@router.get("", response_model=List[ClientPnLResponse])
def list_pnls(
    client_id: Optional[int] = Query(None),
    month: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    start_month: Optional[str] = Query(None),
    end_month: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """
    List P&Ls with optional filters by client_id, month, year, or date range.
    Date range: start_month and end_month in format "2026-03"
    """
    query = db.query(ClientPnL).filter(ClientPnL.org_id == org_id)

    if client_id:
        query = query.filter(ClientPnL.client_id == client_id)

    if month:
        query = query.filter(ClientPnL.month == month)

    if year:
        query = query.filter(ClientPnL.year == year)

    if start_month and end_month:
        query = query.filter(
            ClientPnL.month >= start_month,
            ClientPnL.month <= end_month
        )
    elif start_month:
        query = query.filter(ClientPnL.month >= start_month)
    elif end_month:
        query = query.filter(ClientPnL.month <= end_month)

    total = query.count()
    pnls = query.order_by(ClientPnL.month.desc(), ClientPnL.client_id).offset(skip).limit(limit).all()

    return pnls


@router.get("/{id}", response_model=ClientPnLResponse)
def get_pnl(
    id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """Get single P&L with all line items"""
    pnl = db.query(ClientPnL).filter(
        ClientPnL.id == id,
        ClientPnL.org_id == org_id
    ).first()

    if not pnl:
        raise HTTPException(status_code=404, detail="P&L not found")

    return pnl


@router.put("/{id}", response_model=ClientPnLResponse)
def update_pnl(
    id: int,
    data: ClientPnLUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """Update P&L record"""
    pnl = db.query(ClientPnL).filter(
        ClientPnL.id == id,
        ClientPnL.org_id == org_id
    ).first()

    if not pnl:
        raise HTTPException(status_code=404, detail="P&L not found")

    # Update only provided fields
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pnl, key, value)

    pnl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pnl)
    return pnl


@router.delete("/{id}")
def delete_pnl(
    id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """Delete P&L record and associated line items"""
    pnl = db.query(ClientPnL).filter(
        ClientPnL.id == id,
        ClientPnL.org_id == org_id
    ).first()

    if not pnl:
        raise HTTPException(status_code=404, detail="P&L not found")

    db.delete(pnl)
    db.commit()
    return {"message": "P&L deleted successfully"}


@router.get("/client/{client_id}/summary", response_model=ClientPnLSummary)
def get_client_pnl_summary(
    client_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """
    Get client's P&L over all months with totals and trends.
    """
    pnls = db.query(ClientPnL).filter(
        ClientPnL.org_id == org_id,
        ClientPnL.client_id == client_id
    ).order_by(ClientPnL.month.asc()).all()

    if not pnls:
        raise HTTPException(status_code=404, detail="No P&L records found for client")

    rows = [
        ClientPnLSummaryRow(
            month=pnl.month,
            revenue=pnl.revenue,
            cogs=pnl.cogs,
            gross_profit=pnl.gross_profit,
            net_profit=pnl.net_profit,
            profit_margin_pct=pnl.profit_margin_pct,
            fba_fees=pnl.fba_fees,
            referral_fees=pnl.referral_fees,
            ad_spend=pnl.ad_spend,
            other_expenses=pnl.other_expenses,
            units_sold=pnl.units_sold,
            orders_count=pnl.orders_count,
            active_asins=pnl.active_asins
        )
        for pnl in pnls
    ]

    total_revenue = sum(pnl.revenue for pnl in pnls)
    total_net_profit = sum(pnl.net_profit for pnl in pnls)
    avg_profit_margin = (
        (total_net_profit / total_revenue * 100) if total_revenue > 0 else 0.0
    )

    return ClientPnLSummary(
        client_id=client_id,
        rows=rows,
        total_revenue=total_revenue,
        total_net_profit=total_net_profit,
        avg_profit_margin_pct=round(avg_profit_margin, 2)
    )


@router.get("/monthly-overview", response_model=MonthlyOverview)
def get_monthly_overview(
    month: str = Query(..., description="Month in format 2026-03"),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """
    Get all clients' P&L for a given month with totals row.
    """
    pnls = db.query(ClientPnL).filter(
        ClientPnL.org_id == org_id,
        ClientPnL.month == month
    ).order_by(ClientPnL.client_id).all()

    rows = [
        MonthlyOverviewRow(
            client_id=pnl.client_id,
            client_name=None,  # Set to client name if relationship available
            revenue=pnl.revenue,
            net_profit=pnl.net_profit,
            profit_margin_pct=pnl.profit_margin_pct,
            units_sold=pnl.units_sold
        )
        for pnl in pnls
    ]

    total_revenue = sum(pnl.revenue for pnl in pnls)
    total_net_profit = sum(pnl.net_profit for pnl in pnls)
    avg_profit_margin = (
        (total_net_profit / total_revenue * 100) if total_revenue > 0 else 0.0
    )

    return MonthlyOverview(
        month=month,
        rows=rows,
        total_revenue=total_revenue,
        total_net_profit=total_net_profit,
        avg_profit_margin_pct=round(avg_profit_margin, 2)
    )


@router.get("/trends", response_model=TrendResponse)
def get_pnl_trends(
    client_id: Optional[int] = Query(None),
    start_month: Optional[str] = Query(None),
    end_month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """
    Get revenue/profit trends across all clients (or filtered) by month for charting.
    Aggregates all clients' P&L for each month.
    """
    query = db.query(
        ClientPnL.month,
        func.sum(ClientPnL.revenue).label('total_revenue'),
        func.sum(ClientPnL.net_profit).label('total_net_profit')
    ).filter(ClientPnL.org_id == org_id)

    if client_id:
        query = query.filter(ClientPnL.client_id == client_id)

    if start_month:
        query = query.filter(ClientPnL.month >= start_month)

    if end_month:
        query = query.filter(ClientPnL.month <= end_month)

    results = query.group_by(ClientPnL.month).order_by(ClientPnL.month.asc()).all()

    trends = [
        TrendDataPoint(
            month=result[0],
            revenue=result[1] or 0.0,
            net_profit=result[2] or 0.0,
            avg_profit_margin_pct=round(
                ((result[2] or 0) / (result[1] or 1) * 100), 2
            ) if result[1] else 0.0
        )
        for result in results
    ]

    return TrendResponse(trends=trends)


@router.post("/{id}/line-items", response_model=PnLLineItemResponse)
def add_line_item(
    id: int,
    item_data: PnLLineItemCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """Add per-product line item to P&L"""
    pnl = db.query(ClientPnL).filter(
        ClientPnL.id == id,
        ClientPnL.org_id == org_id
    ).first()

    if not pnl:
        raise HTTPException(status_code=404, detail="P&L not found")

    line_item = PnLLineItem(
        pnl_id=id,
        asin=item_data.asin,
        title=item_data.title,
        revenue=item_data.revenue,
        cogs=item_data.cogs,
        fees=item_data.fees,
        ad_spend=item_data.ad_spend,
        units_sold=item_data.units_sold
    )
    db.add(line_item)
    db.commit()
    db.refresh(line_item)
    return line_item


@router.delete("/{id}/line-items/{item_id}")
def delete_line_item(
    id: int,
    item_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org)
):
    """Remove line item from P&L"""
    pnl = db.query(ClientPnL).filter(
        ClientPnL.id == id,
        ClientPnL.org_id == org_id
    ).first()

    if not pnl:
        raise HTTPException(status_code=404, detail="P&L not found")

    line_item = db.query(PnLLineItem).filter(
        PnLLineItem.id == item_id,
        PnLLineItem.pnl_id == id
    ).first()

    if not line_item:
        raise HTTPException(status_code=404, detail="Line item not found")

    db.delete(line_item)
    db.commit()
    return {"message": "Line item deleted successfully"}
