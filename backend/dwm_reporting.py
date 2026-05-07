"""
DWM Reporting System — Ecom Era FBA SaaS v7.0
Daily / Weekly / Monthly reporting for Account Managers & Sourcing Executives.

Models:
  - DWMDailyLog: Individual daily entries (products hunted, brands contacted)
  - DWMWeeklySummary: Auto-aggregated weekly rollup per team member
  - DWMMonthlySummary: Auto-aggregated monthly rollup per team member
  - DWMApproval: Tracks brand/distributor approvals with order values

Endpoints:
  POST   /dwm/daily                  — Submit a daily log entry
  GET    /dwm/daily                  — List daily logs (filters: user, date range, role)
  PUT    /dwm/daily/{id}             — Update a daily log
  DELETE /dwm/daily/{id}             — Delete a daily log

  GET    /dwm/weekly                 — Get weekly summaries (auto-aggregated)
  GET    /dwm/monthly                — Get monthly summaries (auto-aggregated)

  POST   /dwm/approval               — Record an approval (brand or distributor)
  GET    /dwm/approvals               — List approvals (filters)
  PUT    /dwm/approval/{id}           — Update an approval
  DELETE /dwm/approval/{id}           — Delete an approval

  GET    /dwm/dashboard               — Management dashboard (team-wide KPIs)
  GET    /dwm/leaderboard             — Leaderboard rankings
  GET    /dwm/team-members            — List team members for dropdowns
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy import Column, ForeignKey, String, Integer, Float, Text, DateTime, Date, Boolean, func, and_
from sqlalchemy.orm import Session, relationship
from collections import defaultdict
import math

from database import Base, get_db
from auth import get_current_user, tenant_session
from models import User, Organization

router = APIRouter(prefix="/dwm", tags=["DWM Reporting"])


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class DWMDailyLog(Base):
    """Each row = one day's work for one team member."""
    __tablename__ = "dwm_daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    log_date = Column(Date, nullable=False, index=True)
    role_type = Column(String(50), default="account_manager")  # account_manager / sourcing_executive
    products_hunted = Column(Integer, default=0)
    brands_contacted = Column(Integer, default=0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DWMDailyProduct(Base):
    """Individual products hunted in a daily log."""
    __tablename__ = "dwm_daily_products"

    id = Column(Integer, primary_key=True, index=True)
    daily_log_id = Column(Integer, ForeignKey("dwm_daily_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    asin = Column(String(20), default="")
    product_name = Column(String(500), default="")
    brand = Column(String(255), default="")
    category = Column(String(255), default="")
    brand_url = Column(String(500), default="")


class DWMDailyBrand(Base):
    """Brands/distributors contacted in a daily log."""
    __tablename__ = "dwm_daily_brands"

    id = Column(Integer, primary_key=True, index=True)
    daily_log_id = Column(Integer, ForeignKey("dwm_daily_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_name = Column(String(255), default="")
    distributor_name = Column(String(255), default="")
    category = Column(String(255), default="")
    contact_method = Column(String(100), default="")  # email / phone / website / other
    contact_status = Column(String(100), default="pending")  # pending / responded / approved / rejected


class DWMApproval(Base):
    """Brand or distributor approvals with order values."""
    __tablename__ = "dwm_approvals"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    approval_type = Column(String(50), default="brand")  # brand / distributor
    name = Column(String(255), nullable=False)  # Brand or distributor name
    category = Column(String(255), default="")
    order_value = Column(Float, default=0.0)  # Initial order value in $
    reorder_value = Column(Float, default=0.0)  # Reorder value in $
    approval_date = Column(Date, nullable=False)
    week_number = Column(Integer, default=0)
    month = Column(String(20), default="")  # e.g. "March 2026"
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class DailyProductInput(BaseModel):
    asin: Optional[str] = ""
    product_name: Optional[str] = ""
    brand: Optional[str] = ""
    category: Optional[str] = ""
    brand_url: Optional[str] = ""


class DailyBrandInput(BaseModel):
    brand_name: Optional[str] = ""
    distributor_name: Optional[str] = ""
    category: Optional[str] = ""
    contact_method: Optional[str] = ""
    contact_status: Optional[str] = "pending"


class DailyLogInput(BaseModel):
    log_date: str  # YYYY-MM-DD
    role_type: Optional[str] = "account_manager"
    products: Optional[List[DailyProductInput]] = []
    brands: Optional[List[DailyBrandInput]] = []
    notes: Optional[str] = ""


class DailyLogUpdateInput(BaseModel):
    products: Optional[List[DailyProductInput]] = None
    brands: Optional[List[DailyBrandInput]] = None
    notes: Optional[str] = None


class ApprovalInput(BaseModel):
    approval_type: str = "brand"
    name: str
    category: Optional[str] = ""
    order_value: Optional[float] = 0.0
    reorder_value: Optional[float] = 0.0
    approval_date: str  # YYYY-MM-DD
    notes: Optional[str] = ""


class ApprovalUpdateInput(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    order_value: Optional[float] = None
    reorder_value: Optional[float] = None
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _parse_date(s: str) -> date:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {s}. Use YYYY-MM-DD.")


def _get_week_number(d: date) -> int:
    return d.isocalendar()[1]


def _get_month_str(d: date) -> str:
    return d.strftime("%B %Y")


def _week_range(year: int, week: int):
    """Return (start_date, end_date) for a given ISO week."""
    jan4 = date(year, 1, 4)
    start = jan4 - timedelta(days=jan4.isoweekday() - 1) + timedelta(weeks=week - 1)
    end = start + timedelta(days=6)
    return start, end


# ═══════════════════════════════════════════════════════════════════════════════
# DAILY LOG ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/daily")
def create_daily_log(
    data: DailyLogInput,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    log_date = _parse_date(data.log_date)

    # Check if a log already exists for this user on this date
    existing = db.query(DWMDailyLog).filter(
        DWMDailyLog.user_id == user.id,
        DWMDailyLog.log_date == log_date,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Daily log already exists for {data.log_date}. Use PUT to update.")

    log = DWMDailyLog(
        org_id=user.org_id,
        user_id=user.id,
        log_date=log_date,
        role_type=data.role_type or "account_manager",
        products_hunted=len(data.products) if data.products else 0,
        brands_contacted=len(data.brands) if data.brands else 0,
        notes=data.notes or "",
        created_at=datetime.utcnow(),
    )
    db.add(log)
    db.flush()

    # Add products
    for p in (data.products or []):
        db.add(DWMDailyProduct(
            daily_log_id=log.id,
            asin=p.asin or "",
            product_name=p.product_name or "",
            brand=p.brand or "",
            category=p.category or "",
            brand_url=p.brand_url or "",
        ))

    # Add brands contacted
    for b in (data.brands or []):
        db.add(DWMDailyBrand(
            daily_log_id=log.id,
            brand_name=b.brand_name or "",
            distributor_name=b.distributor_name or "",
            category=b.category or "",
            contact_method=b.contact_method or "",
            contact_status=b.contact_status or "pending",
        ))

    db.commit()
    db.refresh(log)

    return {
        "id": log.id,
        "log_date": str(log.log_date),
        "role_type": log.role_type,
        "products_hunted": log.products_hunted,
        "brands_contacted": log.brands_contacted,
        "notes": log.notes,
        "message": "Daily log created successfully.",
    }


@router.get("/daily")
def list_daily_logs(
    user_id: Optional[int] = Query(None),
    role_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    q = db.query(DWMDailyLog).filter(DWMDailyLog.org_id == user.org_id)

    if user_id:
        q = q.filter(DWMDailyLog.user_id == user_id)
    if role_type:
        q = q.filter(DWMDailyLog.role_type == role_type)
    if start_date:
        q = q.filter(DWMDailyLog.log_date >= _parse_date(start_date))
    if end_date:
        q = q.filter(DWMDailyLog.log_date <= _parse_date(end_date))

    total = q.count()
    logs = q.order_by(DWMDailyLog.log_date.desc()).offset((page - 1) * limit).limit(limit).all()

    results = []
    for log in logs:
        # Fetch related products and brands
        products = db.query(DWMDailyProduct).filter(DWMDailyProduct.daily_log_id == log.id).all()
        brands = db.query(DWMDailyBrand).filter(DWMDailyBrand.daily_log_id == log.id).all()

        # Get user name
        member = db.query(User).filter(User.id == log.user_id).first()

        results.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": member.name if member else "Unknown",
            "log_date": str(log.log_date),
            "day_name": log.log_date.strftime("%A") if log.log_date else "",
            "role_type": log.role_type,
            "products_hunted": log.products_hunted,
            "brands_contacted": log.brands_contacted,
            "notes": log.notes,
            "products": [
                {"id": p.id, "asin": p.asin, "product_name": p.product_name, "brand": p.brand, "category": p.category, "brand_url": p.brand_url}
                for p in products
            ],
            "brands": [
                {"id": b.id, "brand_name": b.brand_name, "distributor_name": b.distributor_name, "category": b.category, "contact_method": b.contact_method, "contact_status": b.contact_status}
                for b in brands
            ],
        })

    return {"total": total, "page": page, "limit": limit, "logs": results}


@router.put("/daily/{log_id}")
def update_daily_log(
    log_id: int,
    data: DailyLogUpdateInput,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    log = db.query(DWMDailyLog).filter(DWMDailyLog.id == log_id, DWMDailyLog.org_id == user.org_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Daily log not found.")

    if data.notes is not None:
        log.notes = data.notes

    # Replace products if provided
    if data.products is not None:
        db.query(DWMDailyProduct).filter(DWMDailyProduct.daily_log_id == log.id).delete()
        for p in data.products:
            db.add(DWMDailyProduct(
                daily_log_id=log.id, asin=p.asin or "", product_name=p.product_name or "",
                brand=p.brand or "", category=p.category or "", brand_url=p.brand_url or "",
            ))
        log.products_hunted = len(data.products)

    # Replace brands if provided
    if data.brands is not None:
        db.query(DWMDailyBrand).filter(DWMDailyBrand.daily_log_id == log.id).delete()
        for b in data.brands:
            db.add(DWMDailyBrand(
                daily_log_id=log.id, brand_name=b.brand_name or "", distributor_name=b.distributor_name or "",
                category=b.category or "", contact_method=b.contact_method or "", contact_status=b.contact_status or "pending",
            ))
        log.brands_contacted = len(data.brands)

    log.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Daily log updated.", "id": log.id}


@router.delete("/daily/{log_id}")
def delete_daily_log(
    log_id: int,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    log = db.query(DWMDailyLog).filter(DWMDailyLog.id == log_id, DWMDailyLog.org_id == user.org_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Daily log not found.")

    db.query(DWMDailyProduct).filter(DWMDailyProduct.daily_log_id == log.id).delete()
    db.query(DWMDailyBrand).filter(DWMDailyBrand.daily_log_id == log.id).delete()
    db.delete(log)
    db.commit()
    return {"message": "Daily log deleted.", "id": log_id}


# ═══════════════════════════════════════════════════════════════════════════════
# APPROVAL ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/approval")
def create_approval(
    data: ApprovalInput,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    d = _parse_date(data.approval_date)
    approval = DWMApproval(
        org_id=user.org_id,
        user_id=user.id,
        approval_type=data.approval_type,
        name=data.name,
        category=data.category or "",
        order_value=data.order_value or 0.0,
        reorder_value=data.reorder_value or 0.0,
        approval_date=d,
        week_number=_get_week_number(d),
        month=_get_month_str(d),
        notes=data.notes or "",
        created_at=datetime.utcnow(),
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return {"id": approval.id, "message": "Approval recorded."}


@router.get("/approvals")
def list_approvals(
    user_id: Optional[int] = Query(None),
    approval_type: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    q = db.query(DWMApproval).filter(DWMApproval.org_id == user.org_id)
    if user_id:
        q = q.filter(DWMApproval.user_id == user_id)
    if approval_type:
        q = q.filter(DWMApproval.approval_type == approval_type)
    if month:
        q = q.filter(DWMApproval.month == month)

    total = q.count()
    items = q.order_by(DWMApproval.approval_date.desc()).offset((page - 1) * limit).limit(limit).all()

    results = []
    for a in items:
        member = db.query(User).filter(User.id == a.user_id).first()
        results.append({
            "id": a.id, "user_id": a.user_id, "user_name": member.name if member else "Unknown",
            "approval_type": a.approval_type, "name": a.name, "category": a.category,
            "order_value": a.order_value, "reorder_value": a.reorder_value,
            "approval_date": str(a.approval_date), "week_number": a.week_number,
            "month": a.month, "notes": a.notes,
        })

    return {"total": total, "page": page, "limit": limit, "approvals": results}


@router.put("/approval/{approval_id}")
def update_approval(
    approval_id: int,
    data: ApprovalUpdateInput,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    a = db.query(DWMApproval).filter(DWMApproval.id == approval_id, DWMApproval.org_id == user.org_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Approval not found.")
    if data.name is not None: a.name = data.name
    if data.category is not None: a.category = data.category
    if data.order_value is not None: a.order_value = data.order_value
    if data.reorder_value is not None: a.reorder_value = data.reorder_value
    if data.notes is not None: a.notes = data.notes
    db.commit()
    return {"message": "Approval updated.", "id": a.id}


@router.delete("/approval/{approval_id}")
def delete_approval(
    approval_id: int,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    a = db.query(DWMApproval).filter(DWMApproval.id == approval_id, DWMApproval.org_id == user.org_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Approval not found.")
    db.delete(a)
    db.commit()
    return {"message": "Approval deleted.", "id": approval_id}


# ═══════════════════════════════════════════════════════════════════════════════
# WEEKLY SUMMARY (Auto-Aggregated)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/weekly")
def get_weekly_summaries(
    year: Optional[int] = Query(None),
    week: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    role_type: Optional[str] = Query(None),
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Auto-aggregate daily logs into weekly summaries per team member."""
    now = date.today()
    target_year = year or now.year
    target_week = week or _get_week_number(now)

    start, end = _week_range(target_year, target_week)

    q = db.query(DWMDailyLog).filter(
        DWMDailyLog.org_id == user.org_id,
        DWMDailyLog.log_date >= start,
        DWMDailyLog.log_date <= end,
    )
    if user_id:
        q = q.filter(DWMDailyLog.user_id == user_id)
    if role_type:
        q = q.filter(DWMDailyLog.role_type == role_type)

    logs = q.all()

    # Group by user
    by_user = defaultdict(list)
    for log in logs:
        by_user[log.user_id].append(log)

    summaries = []
    for uid, user_logs in by_user.items():
        member = db.query(User).filter(User.id == uid).first()

        total_products = sum(l.products_hunted for l in user_logs)
        total_brands = sum(l.brands_contacted for l in user_logs)
        days_logged = len(user_logs)

        # Get approvals for this user in this week
        approvals = db.query(DWMApproval).filter(
            DWMApproval.user_id == uid,
            DWMApproval.approval_date >= start,
            DWMApproval.approval_date <= end,
        ).all()

        brand_approvals = [a for a in approvals if a.approval_type == "brand"]
        dist_approvals = [a for a in approvals if a.approval_type == "distributor"]
        total_order_value = sum(a.order_value for a in approvals)
        total_reorder_value = sum(a.reorder_value for a in approvals)

        # Daily breakdown
        daily_breakdown = []
        for log in sorted(user_logs, key=lambda x: x.log_date):
            daily_breakdown.append({
                "date": str(log.log_date),
                "day": log.log_date.strftime("%A"),
                "products_hunted": log.products_hunted,
                "brands_contacted": log.brands_contacted,
            })

        summaries.append({
            "user_id": uid,
            "user_name": member.name if member else "Unknown",
            "role_type": user_logs[0].role_type if user_logs else "account_manager",
            "week": target_week,
            "year": target_year,
            "week_range": f"{start} to {end}",
            "days_logged": days_logged,
            "total_products_hunted": total_products,
            "total_brands_contacted": total_brands,
            "avg_products_per_day": round(total_products / max(days_logged, 1), 1),
            "avg_brands_per_day": round(total_brands / max(days_logged, 1), 1),
            "brand_approvals": len(brand_approvals),
            "distributor_approvals": len(dist_approvals),
            "total_approvals": len(approvals),
            "total_order_value": total_order_value,
            "total_reorder_value": total_reorder_value,
            "approval_details": [
                {"name": a.name, "type": a.approval_type, "order_value": a.order_value, "reorder_value": a.reorder_value}
                for a in approvals
            ],
            "daily_breakdown": daily_breakdown,
        })

    # Sort by total products hunted descending (leaderboard style)
    summaries.sort(key=lambda x: x["total_products_hunted"], reverse=True)

    return {
        "week": target_week,
        "year": target_year,
        "week_range": f"{start} to {end}",
        "team_size": len(summaries),
        "summaries": summaries,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MONTHLY SUMMARY (Auto-Aggregated)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/monthly")
def get_monthly_summaries(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    role_type: Optional[str] = Query(None),
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Auto-aggregate daily logs into monthly summaries per team member."""
    now = date.today()
    target_year = year or now.year
    target_month = month or now.month

    # Calculate month date range
    month_start = date(target_year, target_month, 1)
    if target_month == 12:
        month_end = date(target_year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(target_year, target_month + 1, 1) - timedelta(days=1)

    month_name = month_start.strftime("%B %Y")

    q = db.query(DWMDailyLog).filter(
        DWMDailyLog.org_id == user.org_id,
        DWMDailyLog.log_date >= month_start,
        DWMDailyLog.log_date <= month_end,
    )
    if user_id:
        q = q.filter(DWMDailyLog.user_id == user_id)
    if role_type:
        q = q.filter(DWMDailyLog.role_type == role_type)

    logs = q.all()

    by_user = defaultdict(list)
    for log in logs:
        by_user[log.user_id].append(log)

    summaries = []
    for uid, user_logs in by_user.items():
        member = db.query(User).filter(User.id == uid).first()

        total_products = sum(l.products_hunted for l in user_logs)
        total_brands = sum(l.brands_contacted for l in user_logs)
        days_logged = len(user_logs)

        # Get approvals for this user in this month
        approvals = db.query(DWMApproval).filter(
            DWMApproval.user_id == uid,
            DWMApproval.approval_date >= month_start,
            DWMApproval.approval_date <= month_end,
        ).all()

        brand_approvals = [a for a in approvals if a.approval_type == "brand"]
        dist_approvals = [a for a in approvals if a.approval_type == "distributor"]
        total_order_value = sum(a.order_value for a in approvals)
        total_reorder_value = sum(a.reorder_value for a in approvals)

        # Weekly breakdown within this month
        by_week = defaultdict(lambda: {"products": 0, "brands": 0, "days": 0})
        for log in user_logs:
            wk = _get_week_number(log.log_date)
            by_week[wk]["products"] += log.products_hunted
            by_week[wk]["brands"] += log.brands_contacted
            by_week[wk]["days"] += 1

        weekly_breakdown = [
            {"week": wk, "products_hunted": d["products"], "brands_contacted": d["brands"], "days_logged": d["days"]}
            for wk, d in sorted(by_week.items())
        ]

        summaries.append({
            "user_id": uid,
            "user_name": member.name if member else "Unknown",
            "role_type": user_logs[0].role_type if user_logs else "account_manager",
            "month": month_name,
            "year": target_year,
            "days_logged": days_logged,
            "total_products_hunted": total_products,
            "total_brands_contacted": total_brands,
            "avg_products_per_day": round(total_products / max(days_logged, 1), 1),
            "brand_approvals": len(brand_approvals),
            "distributor_approvals": len(dist_approvals),
            "total_approvals": len(approvals),
            "total_order_value": total_order_value,
            "total_reorder_value": total_reorder_value,
            "total_orders_placed": total_order_value + total_reorder_value,
            "approval_details": [
                {"name": a.name, "type": a.approval_type, "order_value": a.order_value, "reorder_value": a.reorder_value}
                for a in approvals
            ],
            "weekly_breakdown": weekly_breakdown,
        })

    summaries.sort(key=lambda x: x["total_products_hunted"], reverse=True)

    # Team totals
    team_products = sum(s["total_products_hunted"] for s in summaries)
    team_brands = sum(s["total_brands_contacted"] for s in summaries)
    team_approvals = sum(s["total_approvals"] for s in summaries)
    team_order_value = sum(s["total_order_value"] for s in summaries)

    return {
        "month": month_name,
        "year": target_year,
        "team_size": len(summaries),
        "team_totals": {
            "total_products_hunted": team_products,
            "total_brands_contacted": team_brands,
            "total_approvals": team_approvals,
            "total_order_value": team_order_value,
        },
        "summaries": summaries,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MANAGEMENT DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard")
def management_dashboard(
    period: str = Query("week", regex="^(week|month)$"),
    year: Optional[int] = Query(None),
    week: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    High-level management dashboard with team KPIs.
    period = 'week' or 'month'
    """
    now = date.today()
    target_year = year or now.year

    if period == "week":
        target_week = week or _get_week_number(now)
        start, end = _week_range(target_year, target_week)
        period_label = f"Week {target_week}, {target_year}"
    else:
        target_month = month or now.month
        start = date(target_year, target_month, 1)
        if target_month == 12:
            end = date(target_year + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(target_year, target_month + 1, 1) - timedelta(days=1)
        period_label = start.strftime("%B %Y")

    # All daily logs in period
    logs = db.query(DWMDailyLog).filter(
        DWMDailyLog.org_id == user.org_id,
        DWMDailyLog.log_date >= start,
        DWMDailyLog.log_date <= end,
    ).all()

    # All approvals in period
    approvals = db.query(DWMApproval).filter(
        DWMApproval.org_id == user.org_id,
        DWMApproval.approval_date >= start,
        DWMApproval.approval_date <= end,
    ).all()

    # Active team members (users who have logged at least one entry)
    active_user_ids = set(l.user_id for l in logs)

    # Aggregate
    total_products = sum(l.products_hunted for l in logs)
    total_brands = sum(l.brands_contacted for l in logs)
    total_days = len(logs)
    brand_approvals = sum(1 for a in approvals if a.approval_type == "brand")
    dist_approvals = sum(1 for a in approvals if a.approval_type == "distributor")
    total_order_value = sum(a.order_value for a in approvals)
    total_reorder_value = sum(a.reorder_value for a in approvals)

    # Per-person summary for the sparkline/table
    by_user = defaultdict(lambda: {"products": 0, "brands": 0, "days": 0, "approvals": 0, "order_value": 0})
    for l in logs:
        by_user[l.user_id]["products"] += l.products_hunted
        by_user[l.user_id]["brands"] += l.brands_contacted
        by_user[l.user_id]["days"] += 1
    for a in approvals:
        by_user[a.user_id]["approvals"] += 1
        by_user[a.user_id]["order_value"] += a.order_value

    team_breakdown = []
    for uid, stats in by_user.items():
        member = db.query(User).filter(User.id == uid).first()
        team_breakdown.append({
            "user_id": uid,
            "user_name": member.name if member else "Unknown",
            "products_hunted": stats["products"],
            "brands_contacted": stats["brands"],
            "days_logged": stats["days"],
            "approvals": stats["approvals"],
            "order_value": stats["order_value"],
            "avg_products_per_day": round(stats["products"] / max(stats["days"], 1), 1),
        })

    team_breakdown.sort(key=lambda x: x["products_hunted"], reverse=True)

    # Trend data (daily totals for chart)
    daily_trend = defaultdict(lambda: {"products": 0, "brands": 0})
    for l in logs:
        key = str(l.log_date)
        daily_trend[key]["products"] += l.products_hunted
        daily_trend[key]["brands"] += l.brands_contacted

    trend = [
        {"date": d, "products": v["products"], "brands": v["brands"]}
        for d, v in sorted(daily_trend.items())
    ]

    return {
        "period": period,
        "period_label": period_label,
        "date_range": f"{start} to {end}",
        "kpis": {
            "active_team_members": len(active_user_ids),
            "total_products_hunted": total_products,
            "total_brands_contacted": total_brands,
            "total_log_entries": total_days,
            "brand_approvals": brand_approvals,
            "distributor_approvals": dist_approvals,
            "total_approvals": brand_approvals + dist_approvals,
            "total_order_value": total_order_value,
            "total_reorder_value": total_reorder_value,
            "avg_products_per_person": round(total_products / max(len(active_user_ids), 1), 1),
            "avg_brands_per_person": round(total_brands / max(len(active_user_ids), 1), 1),
        },
        "team_breakdown": team_breakdown,
        "daily_trend": trend,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LEADERBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/leaderboard")
def get_leaderboard(
    metric: str = Query("products_hunted", regex="^(products_hunted|brands_contacted|approvals|order_value)$"),
    period: str = Query("month", regex="^(week|month|all_time)$"),
    year: Optional[int] = Query(None),
    week: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    now = date.today()
    target_year = year or now.year

    if period == "week":
        target_week = week or _get_week_number(now)
        start, end = _week_range(target_year, target_week)
    elif period == "month":
        target_month = month or now.month
        start = date(target_year, target_month, 1)
        end = date(target_year, target_month + 1, 1) - timedelta(days=1) if target_month < 12 else date(target_year, 12, 31)
    else:
        start = date(2020, 1, 1)
        end = now

    logs = db.query(DWMDailyLog).filter(
        DWMDailyLog.org_id == user.org_id,
        DWMDailyLog.log_date >= start,
        DWMDailyLog.log_date <= end,
    ).all()

    approvals = db.query(DWMApproval).filter(
        DWMApproval.org_id == user.org_id,
        DWMApproval.approval_date >= start,
        DWMApproval.approval_date <= end,
    ).all()

    by_user = defaultdict(lambda: {"products_hunted": 0, "brands_contacted": 0, "approvals": 0, "order_value": 0.0})
    for l in logs:
        by_user[l.user_id]["products_hunted"] += l.products_hunted
        by_user[l.user_id]["brands_contacted"] += l.brands_contacted
    for a in approvals:
        by_user[a.user_id]["approvals"] += 1
        by_user[a.user_id]["order_value"] += a.order_value

    leaderboard = []
    for uid, stats in by_user.items():
        member = db.query(User).filter(User.id == uid).first()
        leaderboard.append({
            "rank": 0,
            "user_id": uid,
            "user_name": member.name if member else "Unknown",
            "avatar": member.avatar if member else "U",
            **stats,
        })

    leaderboard.sort(key=lambda x: x[metric], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1

    return {"metric": metric, "period": period, "leaderboard": leaderboard}


# ═══════════════════════════════════════════════════════════════════════════════
# TEAM MEMBERS (for dropdown filters)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/team-members")
def get_team_members(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    members = db.query(User).filter(User.org_id == user.org_id, User.is_active == True).all()
    return {
        "members": [
            {"id": m.id, "name": m.name, "role": m.role, "avatar": m.avatar or m.name[0].upper()}
            for m in members
        ]
    }
