from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal
import math

from auth import get_current_user
from database import get_db, Base, engine
from models import User

# Database Models
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Numeric, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()

class PeriodTypeEnum(str, enum.Enum):
    monthly = "monthly"
    quarterly = "quarterly"
    annual = "annual"

class StatusEnum(str, enum.Enum):
    draft = "draft"
    reviewed = "reviewed"
    approved = "approved"
    finalized = "finalized"

class InvoiceStatusEnum(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"

class ExpenseTypeEnum(str, enum.Enum):
    fixed = "fixed"
    variable = "variable"
    one_time = "one_time"

class PLStatement(Base):
    __tablename__ = "pl_statements"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    period_type = Column(SQLEnum(PeriodTypeEnum), default=PeriodTypeEnum.monthly)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Revenue
    gross_revenue = Column(Numeric(12, 2), default=0)
    refunds = Column(Numeric(12, 2), default=0)
    net_revenue = Column(Numeric(12, 2), default=0)

    # Costs
    cogs = Column(Numeric(12, 2), default=0)
    fba_fees = Column(Numeric(12, 2), default=0)
    referral_fees = Column(Numeric(12, 2), default=0)
    ppc_spend = Column(Numeric(12, 2), default=0)
    other_ad_spend = Column(Numeric(12, 2), default=0)
    storage_fees = Column(Numeric(12, 2), default=0)
    prep_fees = Column(Numeric(12, 2), default=0)
    shipping_inbound = Column(Numeric(12, 2), default=0)
    other_expenses = Column(Numeric(12, 2), default=0)
    agency_fee = Column(Numeric(12, 2), default=0)

    # Calculated Profits
    gross_profit = Column(Numeric(12, 2), default=0)
    net_profit = Column(Numeric(12, 2), default=0)
    margin_pct = Column(Float, default=0)
    acos_pct = Column(Float, default=0)
    tacos_pct = Column(Float, default=0)

    status = Column(SQLEnum(StatusEnum), default=StatusEnum.draft)
    notes = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    expense_entries = relationship("ExpenseEntry", back_populates="pl_statement")
    invoices = relationship("Invoice", back_populates="pl_statement")

class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(SQLEnum(ExpenseTypeEnum), default=ExpenseTypeEnum.variable)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    expense_entries = relationship("ExpenseEntry", back_populates="category")

class ExpenseEntry(Base):
    __tablename__ = "expense_entries"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    pl_statement_id = Column(Integer, ForeignKey("pl_statements.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=True)
    date = Column(DateTime, nullable=False)
    receipt_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("ExpenseCategory", back_populates="expense_entries")
    pl_statement = relationship("PLStatement", back_populates="expense_entries")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    pl_statement_id = Column(Integer, ForeignKey("pl_statements.id"), nullable=True)
    invoice_number = Column(String, unique=True, nullable=False)
    issue_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    status = Column(SQLEnum(InvoiceStatusEnum), default=InvoiceStatusEnum.draft)
    payment_date = Column(DateTime, nullable=True)
    payment_method = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pl_statement = relationship("PLStatement", back_populates="invoices")

class CashFlowProjection(Base):
    __tablename__ = "cash_flow_projections"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    projected_revenue = Column(Numeric(12, 2), default=0)
    projected_expenses = Column(Numeric(12, 2), default=0)
    projected_profit = Column(Numeric(12, 2), default=0)
    actual_revenue = Column(Numeric(12, 2), nullable=True)
    actual_expenses = Column(Numeric(12, 2), nullable=True)
    actual_profit = Column(Numeric(12, 2), nullable=True)
    variance_pct = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Schemas
class PLStatementCreate(BaseModel):
    client_id: int
    period_type: PeriodTypeEnum
    period_start: datetime
    period_end: datetime
    gross_revenue: Decimal = 0
    refunds: Decimal = 0
    cogs: Decimal = 0
    fba_fees: Decimal = 0
    referral_fees: Decimal = 0
    ppc_spend: Decimal = 0
    other_ad_spend: Decimal = 0
    storage_fees: Decimal = 0
    prep_fees: Decimal = 0
    shipping_inbound: Decimal = 0
    other_expenses: Decimal = 0
    agency_fee: Decimal = 0
    notes: Optional[str] = None

class PLStatementUpdate(BaseModel):
    gross_revenue: Optional[Decimal] = None
    refunds: Optional[Decimal] = None
    cogs: Optional[Decimal] = None
    fba_fees: Optional[Decimal] = None
    referral_fees: Optional[Decimal] = None
    ppc_spend: Optional[Decimal] = None
    other_ad_spend: Optional[Decimal] = None
    storage_fees: Optional[Decimal] = None
    prep_fees: Optional[Decimal] = None
    shipping_inbound: Optional[Decimal] = None
    other_expenses: Optional[Decimal] = None
    agency_fee: Optional[Decimal] = None
    notes: Optional[str] = None
    status: Optional[StatusEnum] = None

class PLStatementResponse(BaseModel):
    id: int
    org_id: int
    client_id: int
    period_type: str
    period_start: datetime
    period_end: datetime
    gross_revenue: float
    refunds: float
    net_revenue: float
    cogs: float
    fba_fees: float
    referral_fees: float
    ppc_spend: float
    other_ad_spend: float
    storage_fees: float
    prep_fees: float
    shipping_inbound: float
    other_expenses: float
    agency_fee: float
    gross_profit: float
    net_profit: float
    margin_pct: float
    acos_pct: float
    tacos_pct: float
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

class ExpenseCategoryCreate(BaseModel):
    name: str
    type: ExpenseTypeEnum
    description: Optional[str] = None

class ExpenseCategoryResponse(BaseModel):
    id: int
    org_id: int
    name: str
    type: str
    description: Optional[str]

class ExpenseEntryCreate(BaseModel):
    client_id: int
    pl_statement_id: Optional[int] = None
    category_id: int
    amount: Decimal
    description: Optional[str] = None
    date: datetime
    receipt_url: Optional[str] = None

class ExpenseEntryResponse(BaseModel):
    id: int
    org_id: int
    client_id: int
    pl_statement_id: Optional[int]
    category_id: int
    amount: float
    description: Optional[str]
    date: datetime
    receipt_url: Optional[str]

class InvoiceCreate(BaseModel):
    client_id: int
    pl_statement_id: Optional[int] = None
    issue_date: datetime
    due_date: datetime
    subtotal: Decimal
    tax_amount: Decimal = 0
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatusEnum] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    org_id: int
    client_id: int
    pl_statement_id: Optional[int]
    invoice_number: str
    issue_date: datetime
    due_date: datetime
    subtotal: float
    tax_amount: float
    total: float
    status: str
    payment_date: Optional[datetime]
    payment_method: Optional[str]
    notes: Optional[str]
    created_at: datetime

class CashFlowProjectionResponse(BaseModel):
    id: int
    org_id: int
    client_id: int
    period_start: datetime
    period_end: datetime
    projected_revenue: float
    projected_expenses: float
    projected_profit: float
    actual_revenue: Optional[float]
    actual_expenses: Optional[float]
    actual_profit: Optional[float]
    variance_pct: Optional[float]

class DashboardResponse(BaseModel):
    total_revenue: float
    total_profit: float
    outstanding_invoices_amount: float
    avg_margin_pct: float
    monthly_trends: List[dict]
    top_clients: List[dict]
    overdue_invoices: List[dict]

# Helper Functions
def calculate_pl_metrics(pl: PLStatement) -> PLStatement:
    """Calculate all P&L metrics from line items"""
    gross_rev = float(pl.gross_revenue) if pl.gross_revenue else 0
    refunds_val = float(pl.refunds) if pl.refunds else 0
    net_rev = gross_rev - refunds_val

    cogs_val = float(pl.cogs) if pl.cogs else 0
    fba_val = float(pl.fba_fees) if pl.fba_fees else 0
    ref_val = float(pl.referral_fees) if pl.referral_fees else 0
    ppc_val = float(pl.ppc_spend) if pl.ppc_spend else 0
    other_ad = float(pl.other_ad_spend) if pl.other_ad_spend else 0
    storage_val = float(pl.storage_fees) if pl.storage_fees else 0
    prep_val = float(pl.prep_fees) if pl.prep_fees else 0
    ship_val = float(pl.shipping_inbound) if pl.shipping_inbound else 0
    other_val = float(pl.other_expenses) if pl.other_expenses else 0
    agency_val = float(pl.agency_fee) if pl.agency_fee else 0

    total_cogs = cogs_val + fba_val + ref_val + storage_val + prep_val + ship_val
    total_ad_spend = ppc_val + other_ad
    total_expenses = total_cogs + total_ad_spend + other_val + agency_val

    gross_profit = net_rev - cogs_val
    net_profit = net_rev - total_expenses

    margin_pct = (gross_profit / net_rev * 100) if net_rev > 0 else 0
    acos_pct = (total_ad_spend / net_rev * 100) if net_rev > 0 else 0
    tacos_pct = (total_expenses / net_rev * 100) if net_rev > 0 else 0

    pl.net_revenue = Decimal(str(net_rev))
    pl.gross_profit = Decimal(str(gross_profit))
    pl.net_profit = Decimal(str(net_profit))
    pl.margin_pct = margin_pct
    pl.acos_pct = acos_pct
    pl.tacos_pct = tacos_pct

    return pl

def generate_invoice_number(db: Session, org_id: int) -> str:
    """Generate unique invoice number EE-YYYY-NNNN"""
    year = datetime.utcnow().year
    count = db.query(func.count(Invoice.id)).filter(
        Invoice.org_id == org_id,
        func.extract('year', Invoice.created_at) == year
    ).scalar() + 1
    return f"EE-{year}-{str(count).zfill(4)}"

def project_cash_flow(db: Session, org_id: int, client_id: int) -> CashFlowProjection:
    """Generate cash flow projection based on trailing 3-month data"""
    now = datetime.utcnow()
    three_months_ago = now - timedelta(days=90)

    recent_pls = db.query(PLStatement).filter(
        PLStatement.org_id == org_id,
        PLStatement.client_id == client_id,
        PLStatement.period_end >= three_months_ago,
        PLStatement.status != StatusEnum.draft
    ).order_by(PLStatement.period_end.desc()).limit(3).all()

    if not recent_pls:
        avg_revenue = 0
        avg_expenses = 0
    else:
        avg_revenue = sum(float(p.net_revenue) for p in recent_pls) / len(recent_pls)
        total_exp = sum(
            float(p.cogs) + float(p.fba_fees) + float(p.referral_fees) +
            float(p.ppc_spend) + float(p.other_ad_spend) + float(p.storage_fees) +
            float(p.prep_fees) + float(p.shipping_inbound) + float(p.other_expenses) +
            float(p.agency_fee)
            for p in recent_pls
        ) / len(recent_pls)
        avg_expenses = total_exp

    avg_profit = avg_revenue - avg_expenses

    period_start = now.replace(day=1)
    if period_start.month == 12:
        period_end = period_start.replace(year=period_start.year + 1, month=1) - timedelta(days=1)
    else:
        period_end = period_start.replace(month=period_start.month + 1) - timedelta(days=1)

    projection = CashFlowProjection(
        org_id=org_id,
        client_id=client_id,
        period_start=period_start,
        period_end=period_end,
        projected_revenue=Decimal(str(avg_revenue)),
        projected_expenses=Decimal(str(avg_expenses)),
        projected_profit=Decimal(str(avg_profit))
    )

    return projection

# Router Setup
router = APIRouter(prefix="/finance", tags=["Finance"])

# P&L Statement Endpoints
@router.get("/pl-statements")
async def list_pl_statements(
    client_id: Optional[int] = Query(None),
    period_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PLStatement).filter(PLStatement.org_id == current_user.org_id)

    if client_id:
        query = query.filter(PLStatement.client_id == client_id)
    if period_type:
        query = query.filter(PLStatement.period_type == period_type)
    if status:
        query = query.filter(PLStatement.status == status)

    statements = query.order_by(PLStatement.period_end.desc()).all()
    return [
        {
            "id": s.id,
            "org_id": s.org_id,
            "client_id": s.client_id,
            "period_type": s.period_type.value,
            "period_start": s.period_start,
            "period_end": s.period_end,
            "gross_revenue": float(s.gross_revenue),
            "refunds": float(s.refunds),
            "net_revenue": float(s.net_revenue),
            "cogs": float(s.cogs),
            "fba_fees": float(s.fba_fees),
            "referral_fees": float(s.referral_fees),
            "ppc_spend": float(s.ppc_spend),
            "other_ad_spend": float(s.other_ad_spend),
            "storage_fees": float(s.storage_fees),
            "prep_fees": float(s.prep_fees),
            "shipping_inbound": float(s.shipping_inbound),
            "other_expenses": float(s.other_expenses),
            "agency_fee": float(s.agency_fee),
            "gross_profit": float(s.gross_profit),
            "net_profit": float(s.net_profit),
            "margin_pct": s.margin_pct,
            "acos_pct": s.acos_pct,
            "tacos_pct": s.tacos_pct,
            "status": s.status.value,
            "notes": s.notes,
            "created_at": s.created_at,
            "updated_at": s.updated_at
        }
        for s in statements
    ]

@router.post("/pl-statements")
async def create_pl_statement(
    pl_data: PLStatementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pl = PLStatement(
        org_id=current_user.org_id,
        client_id=pl_data.client_id,
        period_type=pl_data.period_type,
        period_start=pl_data.period_start,
        period_end=pl_data.period_end,
        gross_revenue=pl_data.gross_revenue,
        refunds=pl_data.refunds,
        cogs=pl_data.cogs,
        fba_fees=pl_data.fba_fees,
        referral_fees=pl_data.referral_fees,
        ppc_spend=pl_data.ppc_spend,
        other_ad_spend=pl_data.other_ad_spend,
        storage_fees=pl_data.storage_fees,
        prep_fees=pl_data.prep_fees,
        shipping_inbound=pl_data.shipping_inbound,
        other_expenses=pl_data.other_expenses,
        agency_fee=pl_data.agency_fee,
        notes=pl_data.notes,
        created_by=current_user.id
    )

    pl = calculate_pl_metrics(pl)
    db.add(pl)
    db.commit()
    db.refresh(pl)

    return {
        "id": pl.id,
        "org_id": pl.org_id,
        "client_id": pl.client_id,
        "period_type": pl.period_type.value,
        "period_start": pl.period_start,
        "period_end": pl.period_end,
        "gross_revenue": float(pl.gross_revenue),
        "refunds": float(pl.refunds),
        "net_revenue": float(pl.net_revenue),
        "cogs": float(pl.cogs),
        "fba_fees": float(pl.fba_fees),
        "referral_fees": float(pl.referral_fees),
        "ppc_spend": float(pl.ppc_spend),
        "other_ad_spend": float(pl.other_ad_spend),
        "storage_fees": float(pl.storage_fees),
        "prep_fees": float(pl.prep_fees),
        "shipping_inbound": float(pl.shipping_inbound),
        "other_expenses": float(pl.other_expenses),
        "agency_fee": float(pl.agency_fee),
        "gross_profit": float(pl.gross_profit),
        "net_profit": float(pl.net_profit),
        "margin_pct": pl.margin_pct,
        "acos_pct": pl.acos_pct,
        "tacos_pct": pl.tacos_pct,
        "status": pl.status.value,
        "notes": pl.notes,
        "created_at": pl.created_at,
        "updated_at": pl.updated_at
    }

@router.get("/pl-statements/{statement_id}")
async def get_pl_statement(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pl = db.query(PLStatement).filter(
        PLStatement.id == statement_id,
        PLStatement.org_id == current_user.org_id
    ).first()

    if not pl:
        raise HTTPException(status_code=404, detail="P&L statement not found")

    return {
        "id": pl.id,
        "org_id": pl.org_id,
        "client_id": pl.client_id,
        "period_type": pl.period_type.value,
        "period_start": pl.period_start,
        "period_end": pl.period_end,
        "gross_revenue": float(pl.gross_revenue),
        "refunds": float(pl.refunds),
        "net_revenue": float(pl.net_revenue),
        "cogs": float(pl.cogs),
        "fba_fees": float(pl.fba_fees),
        "referral_fees": float(pl.referral_fees),
        "ppc_spend": float(pl.ppc_spend),
        "other_ad_spend": float(pl.other_ad_spend),
        "storage_fees": float(pl.storage_fees),
        "prep_fees": float(pl.prep_fees),
        "shipping_inbound": float(pl.shipping_inbound),
        "other_expenses": float(pl.other_expenses),
        "agency_fee": float(pl.agency_fee),
        "gross_profit": float(pl.gross_profit),
        "net_profit": float(pl.net_profit),
        "margin_pct": pl.margin_pct,
        "acos_pct": pl.acos_pct,
        "tacos_pct": pl.tacos_pct,
        "status": pl.status.value,
        "notes": pl.notes,
        "created_at": pl.created_at,
        "updated_at": pl.updated_at
    }

@router.put("/pl-statements/{statement_id}")
async def update_pl_statement(
    statement_id: int,
    pl_data: PLStatementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pl = db.query(PLStatement).filter(
        PLStatement.id == statement_id,
        PLStatement.org_id == current_user.org_id
    ).first()

    if not pl:
        raise HTTPException(status_code=404, detail="P&L statement not found")

    for field, value in pl_data.dict(exclude_unset=True).items():
        setattr(pl, field, value)

    pl = calculate_pl_metrics(pl)
    pl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pl)

    return {
        "id": pl.id,
        "org_id": pl.org_id,
        "client_id": pl.client_id,
        "period_type": pl.period_type.value,
        "period_start": pl.period_start,
        "period_end": pl.period_end,
        "gross_revenue": float(pl.gross_revenue),
        "refunds": float(pl.refunds),
        "net_revenue": float(pl.net_revenue),
        "cogs": float(pl.cogs),
        "fba_fees": float(pl.fba_fees),
        "referral_fees": float(pl.referral_fees),
        "ppc_spend": float(pl.ppc_spend),
        "other_ad_spend": float(pl.other_ad_spend),
        "storage_fees": float(pl.storage_fees),
        "prep_fees": float(pl.prep_fees),
        "shipping_inbound": float(pl.shipping_inbound),
        "other_expenses": float(pl.other_expenses),
        "agency_fee": float(pl.agency_fee),
        "gross_profit": float(pl.gross_profit),
        "net_profit": float(pl.net_profit),
        "margin_pct": pl.margin_pct,
        "acos_pct": pl.acos_pct,
        "tacos_pct": pl.tacos_pct,
        "status": pl.status.value,
        "notes": pl.notes,
        "created_at": pl.created_at,
        "updated_at": pl.updated_at
    }

@router.post("/pl-statements/{statement_id}/calculate")
async def calculate_pl(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pl = db.query(PLStatement).filter(
        PLStatement.id == statement_id,
        PLStatement.org_id == current_user.org_id
    ).first()

    if not pl:
        raise HTTPException(status_code=404, detail="P&L statement not found")

    pl = calculate_pl_metrics(pl)
    pl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pl)

    return {
        "id": pl.id,
        "gross_profit": float(pl.gross_profit),
        "net_profit": float(pl.net_profit),
        "margin_pct": pl.margin_pct,
        "acos_pct": pl.acos_pct,
        "tacos_pct": pl.tacos_pct,
        "status": pl.status.value
    }

@router.post("/pl-statements/{statement_id}/finalize")
async def finalize_pl(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pl = db.query(PLStatement).filter(
        PLStatement.id == statement_id,
        PLStatement.org_id == current_user.org_id
    ).first()

    if not pl:
        raise HTTPException(status_code=404, detail="P&L statement not found")

    pl = calculate_pl_metrics(pl)
    pl.status = StatusEnum.finalized
    pl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pl)

    return {"status": "finalized", "id": pl.id}

# Expense Category Endpoints
@router.get("/expense-categories")
async def list_expense_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    categories = db.query(ExpenseCategory).filter(
        ExpenseCategory.org_id == current_user.org_id
    ).all()

    return [
        {
            "id": c.id,
            "org_id": c.org_id,
            "name": c.name,
            "type": c.type.value,
            "description": c.description
        }
        for c in categories
    ]

@router.post("/expense-categories")
async def create_expense_category(
    category_data: ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = ExpenseCategory(
        org_id=current_user.org_id,
        name=category_data.name,
        type=category_data.type,
        description=category_data.description
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return {
        "id": category.id,
        "org_id": category.org_id,
        "name": category.name,
        "type": category.type.value,
        "description": category.description
    }

# Expense Entry Endpoints
@router.get("/expenses")
async def list_expenses(
    client_id: Optional[int] = Query(None),
    pl_statement_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ExpenseEntry).filter(ExpenseEntry.org_id == current_user.org_id)

    if client_id:
        query = query.filter(ExpenseEntry.client_id == client_id)
    if pl_statement_id:
        query = query.filter(ExpenseEntry.pl_statement_id == pl_statement_id)

    entries = query.order_by(ExpenseEntry.date.desc()).all()

    return [
        {
            "id": e.id,
            "org_id": e.org_id,
            "client_id": e.client_id,
            "pl_statement_id": e.pl_statement_id,
            "category_id": e.category_id,
            "category_name": e.category.name if e.category else None,
            "amount": float(e.amount),
            "description": e.description,
            "date": e.date,
            "receipt_url": e.receipt_url
        }
        for e in entries
    ]

@router.post("/expenses")
async def create_expense(
    expense_data: ExpenseEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = ExpenseEntry(
        org_id=current_user.org_id,
        client_id=expense_data.client_id,
        pl_statement_id=expense_data.pl_statement_id,
        category_id=expense_data.category_id,
        amount=expense_data.amount,
        description=expense_data.description,
        date=expense_data.date,
        receipt_url=expense_data.receipt_url
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "id": entry.id,
        "org_id": entry.org_id,
        "client_id": entry.client_id,
        "pl_statement_id": entry.pl_statement_id,
        "category_id": entry.category_id,
        "amount": float(entry.amount),
        "description": entry.description,
        "date": entry.date,
        "receipt_url": entry.receipt_url
    }

# Invoice Endpoints
@router.get("/invoices")
async def list_invoices(
    client_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice).filter(Invoice.org_id == current_user.org_id)

    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if status:
        query = query.filter(Invoice.status == status)

    invoices = query.order_by(Invoice.issue_date.desc()).all()

    return [
        {
            "id": i.id,
            "org_id": i.org_id,
            "client_id": i.client_id,
            "pl_statement_id": i.pl_statement_id,
            "invoice_number": i.invoice_number,
            "issue_date": i.issue_date,
            "due_date": i.due_date,
            "subtotal": float(i.subtotal),
            "tax_amount": float(i.tax_amount),
            "total": float(i.total),
            "status": i.status.value,
            "payment_date": i.payment_date,
            "payment_method": i.payment_method,
            "notes": i.notes,
            "created_at": i.created_at
        }
        for i in invoices
    ]

@router.post("/invoices")
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice_number = generate_invoice_number(db, current_user.org_id)
    total = float(invoice_data.subtotal) + float(invoice_data.tax_amount)

    invoice = Invoice(
        org_id=current_user.org_id,
        client_id=invoice_data.client_id,
        pl_statement_id=invoice_data.pl_statement_id,
        invoice_number=invoice_number,
        issue_date=invoice_data.issue_date,
        due_date=invoice_data.due_date,
        subtotal=invoice_data.subtotal,
        tax_amount=invoice_data.tax_amount,
        total=Decimal(str(total)),
        notes=invoice_data.notes
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return {
        "id": invoice.id,
        "org_id": invoice.org_id,
        "client_id": invoice.client_id,
        "pl_statement_id": invoice.pl_statement_id,
        "invoice_number": invoice.invoice_number,
        "issue_date": invoice.issue_date,
        "due_date": invoice.due_date,
        "subtotal": float(invoice.subtotal),
        "tax_amount": float(invoice.tax_amount),
        "total": float(invoice.total),
        "status": invoice.status.value,
        "payment_date": invoice.payment_date,
        "payment_method": invoice.payment_method,
        "notes": invoice.notes,
        "created_at": invoice.created_at
    }

@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.org_id == current_user.org_id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "id": invoice.id,
        "org_id": invoice.org_id,
        "client_id": invoice.client_id,
        "pl_statement_id": invoice.pl_statement_id,
        "invoice_number": invoice.invoice_number,
        "issue_date": invoice.issue_date,
        "due_date": invoice.due_date,
        "subtotal": float(invoice.subtotal),
        "tax_amount": float(invoice.tax_amount),
        "total": float(invoice.total),
        "status": invoice.status.value,
        "payment_date": invoice.payment_date,
        "payment_method": invoice.payment_method,
        "notes": invoice.notes,
        "created_at": invoice.created_at
    }

@router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.org_id == current_user.org_id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice_data.status:
        invoice.status = invoice_data.status
    if invoice_data.payment_date:
        invoice.payment_date = invoice_data.payment_date
    if invoice_data.payment_method:
        invoice.payment_method = invoice_data.payment_method

    invoice.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(invoice)

    return {
        "id": invoice.id,
        "status": invoice.status.value,
        "payment_date": invoice.payment_date,
        "payment_method": invoice.payment_method
    }

@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.org_id == current_user.org_id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = InvoiceStatusEnum.sent
    invoice.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "sent"}

@router.post("/invoices/{invoice_id}/paid")
async def mark_invoice_paid(
    invoice_id: int,
    payment_method: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.org_id == current_user.org_id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = InvoiceStatusEnum.paid
    invoice.payment_date = datetime.utcnow()
    if payment_method:
        invoice.payment_method = payment_method
    invoice.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "paid", "payment_date": invoice.payment_date}

# Cash Flow Endpoints
@router.get("/cash-flow")
async def list_cash_flow(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CashFlowProjection).filter(CashFlowProjection.org_id == current_user.org_id)

    if client_id:
        query = query.filter(CashFlowProjection.client_id == client_id)

    projections = query.order_by(CashFlowProjection.period_end.desc()).all()

    return [
        {
            "id": p.id,
            "org_id": p.org_id,
            "client_id": p.client_id,
            "period_start": p.period_start,
            "period_end": p.period_end,
            "projected_revenue": float(p.projected_revenue),
            "projected_expenses": float(p.projected_expenses),
            "projected_profit": float(p.projected_profit),
            "actual_revenue": float(p.actual_revenue) if p.actual_revenue else None,
            "actual_expenses": float(p.actual_expenses) if p.actual_expenses else None,
            "actual_profit": float(p.actual_profit) if p.actual_profit else None,
            "variance_pct": p.variance_pct
        }
        for p in projections
    ]

@router.post("/cash-flow/project")
async def generate_projection(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projection = project_cash_flow(db, current_user.org_id, client_id)
    db.add(projection)
    db.commit()
    db.refresh(projection)

    return {
        "id": projection.id,
        "org_id": projection.org_id,
        "client_id": projection.client_id,
        "period_start": projection.period_start,
        "period_end": projection.period_end,
        "projected_revenue": float(projection.projected_revenue),
        "projected_expenses": float(projection.projected_expenses),
        "projected_profit": float(projection.projected_profit)
    }

# Dashboard Endpoint
@router.get("/dashboard")
async def get_finance_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total revenue and profit across all clients
    all_statements = db.query(PLStatement).filter(
        PLStatement.org_id == current_user.org_id,
        PLStatement.status != StatusEnum.draft
    ).all()

    total_revenue = sum(float(s.net_revenue) for s in all_statements)
    total_profit = sum(float(s.net_profit) for s in all_statements)

    # Outstanding invoices
    outstanding = db.query(func.sum(Invoice.total)).filter(
        Invoice.org_id == current_user.org_id,
        Invoice.status.in_([InvoiceStatusEnum.sent, InvoiceStatusEnum.overdue])
    ).scalar() or 0

    # Average margin
    margins = [s.margin_pct for s in all_statements if s.margin_pct]
    avg_margin = sum(margins) / len(margins) if margins else 0

    # Monthly trends (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    recent = db.query(PLStatement).filter(
        PLStatement.org_id == current_user.org_id,
        PLStatement.period_end >= six_months_ago,
        PLStatement.status != StatusEnum.draft
    ).order_by(PLStatement.period_end).all()

    monthly_trends = []
    for stmt in recent:
        monthly_trends.append({
            "month": stmt.period_end.strftime("%Y-%m"),
            "revenue": float(stmt.net_revenue),
            "profit": float(stmt.net_profit)
        })

    # Top 5 clients by revenue
    from sqlalchemy import func
    client_revenue = db.query(
        PLStatement.client_id,
        func.sum(PLStatement.net_revenue).label("total")
    ).filter(
        PLStatement.org_id == current_user.org_id,
        PLStatement.status != StatusEnum.draft
    ).group_by(PLStatement.client_id).order_by(func.sum(PLStatement.net_revenue).desc()).limit(5).all()

    top_clients = [{"client_id": cr[0], "revenue": float(cr[1])} for cr in client_revenue]

    # Overdue invoices
    overdue = db.query(Invoice).filter(
        Invoice.org_id == current_user.org_id,
        Invoice.status == InvoiceStatusEnum.overdue
    ).order_by(Invoice.due_date).limit(10).all()

    overdue_list = [
        {
            "invoice_number": inv.invoice_number,
            "client_id": inv.client_id,
            "total": float(inv.total),
            "due_date": inv.due_date
        }
        for inv in overdue
    ]

    return {
        "total_revenue": float(total_revenue),
        "total_profit": float(total_profit),
        "outstanding_invoices_amount": float(outstanding),
        "avg_margin_pct": avg_margin,
        "monthly_trends": monthly_trends,
        "top_clients": top_clients,
        "overdue_invoices": overdue_list
    }
