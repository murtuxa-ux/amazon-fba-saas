"""
Ecom Era FBA SaaS v6.0 — Main Application
Multi-tenant, JWT-authenticated API built with FastAPI and PostgreSQL
"""

from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from config import settings
from database import get_db, init_db, Base, engine
from models import (
    Organization, User, Client, Product, WeeklyReport,
    Supplier, ScoutResult, ActivityLog,
)
from auth import (
    get_current_user, require_role, hash_password, verify_password,
    create_access_token, get_org_scoped_query,
)
from ai_engine import calculate_score, get_decision, get_risk_level
from fba_scoring import compute_fba_score, compute_profit
from keepa_service import get_keepa_data
from stripe_billing import router as billing_router
from plan_middleware import enforce_client_limit, enforce_scout_limit

# Phase 3/4 AI module routers
from ai_recommendations import router as recommendations_router
from market_analyzer import router as market_router
from competitor_tracker import router as competitor_router
from pricing_optimizer import router as pricing_router
from inventory_forecaster import router as inventory_router
from risk_analyzer import router as risk_router
from report_generator import router as report_gen_router
from notification_service import router as notification_router
from batch_processor import router as batch_router
from analytics_engine import router as analytics_router

# Stage 5/6 module routers
from websocket_manager import router as ws_router
from email_service import router as email_router
from pdf_exporter import router as export_router
from scheduler import router as scheduler_router
from system_monitor import router as system_router

# ── App Setup ───────────────────────────────────────────────────────────────────
app = FastAPI(title="Ecom Era FBA Wholesale SaaS", version="6.0")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
# Always ensure the Vercel frontend is allowed
if "https://amazon-fba-saas.vercel.app" not in origins:
    origins.append("https://amazon-fba-saas.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(billing_router)
app.include_router(recommendations_router)
app.include_router(market_router)
app.include_router(competitor_router)
app.include_router(pricing_router)
app.include_router(inventory_router)
app.include_router(risk_router)
app.include_router(report_gen_router)
app.include_router(notification_router)
app.include_router(batch_router)
app.include_router(analytics_router)
app.include_router(ws_router)
app.include_router(email_router)
app.include_router(export_router)
app.include_router(scheduler_router)
app.include_router(system_router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# ── Health Check ────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "version": "6.0", "service": "Ecom Era FBA SaaS"}


# ── Seed Demo Data ──────────────────────────────────────────────────────────────
@app.post("/seed")
def seed_demo_data(db: Session = Depends(get_db)):
    """Create demo org + users if they don't exist. Safe to call multiple times."""
    existing = db.query(User).filter(User.username == "murtaza").first()
    if existing:
        return {"status": "already seeded", "message": "Demo data already exists."}

    org = Organization(name="Ecom Era", plan="enterprise", created_at=datetime.utcnow())
    db.add(org)
    db.flush()

    demo_users = [
        {"username": "murtaza", "password": "Admin@2024", "name": "Murtaza", "email": "murtaza@ecomera.io", "role": "owner"},
        {"username": "bilal", "password": "Manager@123", "name": "Bilal Qureshi", "email": "bilal@ecomera.io", "role": "admin"},
        {"username": "ali", "password": "Manager@123", "name": "Ali Hassan", "email": "ali@ecomera.io", "role": "manager"},
        {"username": "sarah", "password": "Manager@123", "name": "Sarah Khan", "email": "sarah@ecomera.io", "role": "manager"},
        {"username": "hamza", "password": "Manager@123", "name": "Hamza Ahmed", "email": "hamza@ecomera.io", "role": "viewer"},
    ]

    created = []
    for u in demo_users:
        user = User(
            org_id=org.id,
            username=u["username"],
            password_hash=hash_password(u["password"]),
            name=u["name"],
            email=u["email"],
            role=u["role"],
            avatar=u["name"][0].upper(),
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(user)
        created.append(u["username"])

    db.commit()
    return {"status": "seeded", "org": org.name, "users_created": created}


# ── Helpers ─────────────────────────────────────────────────────────────────────
def _now():
    return datetime.utcnow()


def _log_activity(db: Session, user: User, action: str, detail: str = ""):
    entry = ActivityLog(
        org_id=user.org_id,
        user_id=user.id,
        action=action,
        detail=detail,
        created_at=_now(),
    )
    db.add(entry)
    db.commit()


# ── Request / Response Models ───────────────────────────────────────────────────
class LoginInput(BaseModel):
    username: str
    password: str


class SignupInput(BaseModel):
    org_name: str
    name: str
    email: str
    username: str
    password: str


class AddUserInput(BaseModel):
    username: str
    password: str
    name: str
    email: str
    role: str = "manager"


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str


class ClientInput(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    marketplace: Optional[str] = "US"
    plan: Optional[str] = "Starter"
    assigned_am: Optional[str] = ""
    monthly_budget: Optional[float] = 0.0
    start_date: Optional[str] = ""
    status: Optional[str] = "active"
    asins: Optional[List[str]] = []
    notes: Optional[str] = ""


class ClientUpdateInput(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    marketplace: Optional[str] = None
    plan: Optional[str] = None
    assigned_am: Optional[str] = None
    monthly_budget: Optional[float] = None
    start_date: Optional[str] = None
    status: Optional[str] = None
    asins: Optional[List[str]] = None
    notes: Optional[str] = None


class ProductInput(BaseModel):
    asin: str
    cost: float
    price: float
    fba_fee: float
    monthly_sales: Optional[float] = None
    competition: Optional[float] = None
    price_stability: Optional[float] = None
    buybox_pct: Optional[float] = None


class WeeklyInput(BaseModel):
    week: str
    manager: str
    hunted: int
    analyzed: int
    contacted: int
    approved: int
    purchased: int
    revenue: float
    profit: float


class SupplierInput(BaseModel):
    name: str
    brand: str
    contact: str
    response_rate: float
    approval_rate: float
    notes: Optional[str] = ""


class ScoutInput(BaseModel):
    asin: str
    title: Optional[str] = ""
    brand: Optional[str] = ""
    category: Optional[str] = ""
    bsr: int
    monthly_sales: int
    current_price: float
    avg_price_90d: Optional[float] = None
    min_price_90d: Optional[float] = None
    max_price_90d: Optional[float] = None
    price_volatility_pct: float
    fba_sellers: int
    total_sellers: Optional[int] = None
    reviews: Optional[int] = None
    rating: Optional[float] = None
    cost: Optional[float] = None
    referral_pct: Optional[float] = 0.15
    fba_fee: Optional[float] = 3.22


class BulkScoutInput(BaseModel):
    asins: List[str]
    keepa_api_key: Optional[str] = None
    cost_per_unit: Optional[float] = None
    referral_pct: Optional[float] = 0.15
    fba_fee: Optional[float] = 3.22
    domain: Optional[int] = 1


class SettingsInput(BaseModel):
    keepa_api_key: str


# ── Root ────────────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "Ecom Era FBA SaaS V6 running", "version": "6.0"}


# ── Auth Routes ─────────────────────────────────────────────────────────────────
@app.post("/auth/login")
def login(data: LoginInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username.strip().lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated.")

    token = create_access_token({"user_id": user.id, "org_id": user.org_id})
    org = db.query(Organization).filter(Organization.id == user.org_id).first()

    return {
        "token": token,
        "username": user.username,
        "name": user.name,
        "role": user.role,
        "email": user.email,
        "avatar": user.avatar or user.name[0].upper(),
        "org_id": user.org_id,
        "org_name": org.name if org else "",
    }


@app.post("/auth/signup")
def signup(data: SignupInput, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username.strip().lower()).first():
        raise HTTPException(status_code=400, detail="Username already exists.")
    if db.query(User).filter(User.email == data.email.strip().lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    org = Organization(name=data.org_name.strip(), plan="starter", created_at=_now())
    db.add(org)
    db.flush()

    user = User(
        org_id=org.id,
        username=data.username.strip().lower(),
        password_hash=hash_password(data.password),
        name=data.name.strip(),
        email=data.email.strip().lower(),
        role="owner",
        avatar=data.name[0].upper() if data.name else "U",
        is_active=True,
        created_at=_now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": user.id, "org_id": org.id})
    return {
        "token": token,
        "username": user.username,
        "name": user.name,
        "role": user.role,
        "email": user.email,
        "avatar": user.avatar,
        "org_id": org.id,
        "org_name": org.name,
    }


@app.post("/auth/logout")
def logout():
    return {"status": "logged out"}


@app.get("/auth/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "avatar": user.avatar or user.name[0].upper(),
        "org_id": user.org_id,
        "org_name": org.name if org else "",
    }


# ── Users (Team Management) ────────────────────────────────────────────────────
@app.get("/users")
def list_users(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(User).filter(User.org_id == user.org_id, User.is_active == True).all()
    return [
        {
            "id": m.id, "username": m.username, "name": m.name,
            "email": m.email, "role": m.role,
            "avatar": m.avatar or m.name[0].upper(),
        }
        for m in members
    ]


@app.post("/users")
def add_user(
    data: AddUserInput,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.username == data.username.strip().lower()).first():
        raise HTTPException(status_code=400, detail="Username already exists.")
    new_user = User(
        org_id=user.org_id,
        username=data.username.strip().lower(),
        password_hash=hash_password(data.password),
        name=data.name.strip(),
        email=data.email.strip(),
        role=data.role,
        avatar=data.name[0].upper() if data.name else "U",
        is_active=True,
        created_at=_now(),
    )
    db.add(new_user)
    db.commit()
    _log_activity(db, user, "user_added", f"Added user {data.username}")
    return {"status": "created", "username": data.username}


@app.post("/auth/change-password")
def change_password(
    data: ChangePasswordInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect.")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"status": "password changed"}


# ── Clients ─────────────────────────────────────────────────────────────────────
@app.get("/clients")
def list_clients(
    status: Optional[str] = None,
    assigned_am: Optional[str] = None,
    marketplace: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = get_org_scoped_query(db, user, Client)
    if status:
        q = q.filter(Client.status == status)
    if assigned_am:
        q = q.filter(Client.assigned_am == assigned_am)
    if marketplace:
        q = q.filter(Client.marketplace == marketplace)
    clients = q.order_by(Client.name).all()
    return {
        "count": len(clients),
        "clients": [
            {
                "id": c.id, "name": c.name, "email": c.email, "phone": c.phone,
                "marketplace": c.marketplace, "plan": c.plan, "assigned_am": c.assigned_am,
                "monthly_budget": c.monthly_budget, "start_date": c.start_date,
                "status": c.status, "notes": c.notes, "created_at": str(c.created_at),
            }
            for c in clients
        ],
    }


@app.post("/clients")
def add_client(
    data: ClientInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = Client(
        org_id=user.org_id,
        name=data.name,
        email=data.email or "",
        phone=data.phone or "",
        marketplace=data.marketplace or "US",
        plan=data.plan or "Starter",
        assigned_am=data.assigned_am or "",
        monthly_budget=data.monthly_budget or 0.0,
        start_date=data.start_date or str(_now().date()),
        status=data.status or "active",
        notes=data.notes or "",
        created_at=_now(),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    _log_activity(db, user, "client_added", f"Added client {data.name}")
    return {"status": "created", "client": {"id": client.id, "name": client.name}}


@app.get("/clients/{client_id}")
def get_client(
    client_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = get_org_scoped_query(db, user, Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found.")
    return {
        "id": c.id, "name": c.name, "email": c.email, "phone": c.phone,
        "marketplace": c.marketplace, "plan": c.plan, "assigned_am": c.assigned_am,
        "monthly_budget": c.monthly_budget, "start_date": c.start_date,
        "status": c.status, "notes": c.notes, "created_at": str(c.created_at),
    }


@app.put("/clients/{client_id}")
def update_client(
    client_id: int,
    data: ClientUpdateInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = get_org_scoped_query(db, user, Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found.")
    for field, val in data.dict(exclude_none=True).items():
        setattr(c, field, val)
    db.commit()
    return {"status": "updated", "client": {"id": c.id, "name": c.name}}


@app.delete("/clients/{client_id}")
def delete_client(
    client_id: int,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    c = get_org_scoped_query(db, user, Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found.")
    db.delete(c)
    db.commit()
    _log_activity(db, user, "client_deleted", f"Deleted client {c.name}")
    return {"removed": 1}


# ── Reports & KPIs ──────────────────────────────────────────────────────────────
@app.get("/reports/summary")
def reports_summary(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    manager: Optional[str] = None,
    verdict: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wq = get_org_scoped_query(db, user, WeeklyReport)
    if manager:
        wq = wq.filter(WeeklyReport.manager == manager)
    if start_date:
        wq = wq.filter(WeeklyReport.week >= start_date)
    if end_date:
        wq = wq.filter(WeeklyReport.week <= end_date)
    weeks = wq.all()

    sq = get_org_scoped_query(db, user, ScoutResult)
    if verdict:
        sq = sq.filter(ScoutResult.verdict == verdict)
    scouts = sq.all()

    total_revenue = sum(w.revenue for w in weeks)
    total_profit = sum(w.profit for w in weeks)
    avg_roi = round((total_profit / total_revenue * 100) if total_revenue > 0 else 0, 2)

    verdict_counts = {"Winner": 0, "Maybe": 0, "Skip": 0}
    for s in scouts:
        v = getattr(s, "verdict", "Skip") or "Skip"
        verdict_counts[v] = verdict_counts.get(v, 0) + 1

    manager_summary = {}
    for w in weeks:
        m = w.manager
        if m not in manager_summary:
            manager_summary[m] = {"manager": m, "revenue": 0, "profit": 0, "approved": 0, "purchased": 0}
        manager_summary[m]["revenue"] += w.revenue
        manager_summary[m]["profit"] += w.profit
        manager_summary[m]["approved"] += w.approved or 0
        manager_summary[m]["purchased"] += w.purchased or 0

    for m in manager_summary:
        rev = manager_summary[m]["revenue"]
        pro = manager_summary[m]["profit"]
        manager_summary[m]["roi_pct"] = round((pro / rev * 100) if rev > 0 else 0, 2)

    return {
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "avg_roi_pct": avg_roi,
        "weeks_count": len(weeks),
        "scouts_count": len(scouts),
        "verdict_counts": verdict_counts,
        "manager_summary": list(manager_summary.values()),
    }


@app.get("/reports/kpi")
def reports_kpi(
    manager: Optional[str] = None,
    period: Optional[str] = "monthly",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kpi_targets = {
        "hunted": {"weekly": 50, "monthly": 200, "quarterly": 600},
        "analyzed": {"weekly": 30, "monthly": 120, "quarterly": 360},
        "approved": {"weekly": 5, "monthly": 20, "quarterly": 60},
        "purchased": {"weekly": 3, "monthly": 12, "quarterly": 36},
        "revenue": {"weekly": 10000, "monthly": 40000, "quarterly": 120000},
    }
    wq = get_org_scoped_query(db, user, WeeklyReport)
    if manager:
        wq = wq.filter(WeeklyReport.manager == manager)
    weeks = wq.all()

    manager_kpi = {}
    for w in weeks:
        m = w.manager
        if m not in manager_kpi:
            manager_kpi[m] = {
                "manager": m, "hunted": 0, "analyzed": 0, "contacted": 0,
                "approved": 0, "purchased": 0, "revenue": 0.0, "profit": 0.0, "weeks": 0,
            }
        manager_kpi[m]["hunted"] += w.hunted or 0
        manager_kpi[m]["analyzed"] += w.analyzed or 0
        manager_kpi[m]["contacted"] += w.contacted or 0
        manager_kpi[m]["approved"] += w.approved or 0
        manager_kpi[m]["purchased"] += w.purchased or 0
        manager_kpi[m]["revenue"] += w.revenue or 0
        manager_kpi[m]["profit"] += w.profit or 0
        manager_kpi[m]["weeks"] += 1

    p = period or "monthly"
    for m, d in manager_kpi.items():
        rev = d["revenue"]
        pro = d["profit"]
        d["roi_pct"] = round((pro / rev * 100) if rev > 0 else 0, 1)
        d["approval_rate"] = round((d["approved"] / d["analyzed"] * 100) if d["analyzed"] > 0 else 0, 1)
        d["conversion"] = round((d["purchased"] / d["approved"] * 100) if d["approved"] > 0 else 0, 1)
        for metric in ["hunted", "analyzed", "approved", "purchased", "revenue"]:
            target = kpi_targets.get(metric, {}).get(p, 1)
            d[f"{metric}_target"] = target
            d[f"{metric}_pct"] = round((d[metric] / target * 100) if target > 0 else 0, 1)

    return {"period": p, "targets": kpi_targets, "managers": list(manager_kpi.values())}


# ── Settings ────────────────────────────────────────────────────────────────────
@app.post("/settings")
def save_settings(
    data: SettingsInput,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if org:
        org.keepa_api_key = data.keepa_api_key.strip()
        db.commit()
    return {"status": "saved", "keepa_api_key_set": True}


@app.get("/settings")
def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    return {"keepa_api_key_set": bool(org and getattr(org, "keepa_api_key", None))}


# ── Analyze ─────────────────────────────────────────────────────────────────────
@app.post("/analyze")
def analyze_product(
    data: ProductInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    api_key = getattr(org, "keepa_api_key", None) if org else None

    if api_key:
        try:
            keepa = get_keepa_data(data.asin, api_key)
        except Exception:
            keepa = {"monthly_sales": 500, "competition": 8, "price_stability": 0.75, "buybox_pct": 85, "source": "fallback"}
    else:
        keepa = {"monthly_sales": 500, "competition": 8, "price_stability": 0.75, "buybox_pct": 85, "source": "mock"}

    monthly_sales = data.monthly_sales or keepa.get("monthly_sales", 500)
    competition = data.competition or keepa.get("competition", 8)
    price_stability = data.price_stability or keepa.get("price_stability", 0.75)
    buybox_pct = data.buybox_pct or keepa.get("buybox_pct", 85)

    net_profit = data.price - data.cost - data.fba_fee
    roi = net_profit / data.cost if data.cost > 0 else 0
    score = calculate_score(roi, monthly_sales, competition, price_stability, buybox_pct)
    decision = get_decision(score)
    risk = get_risk_level(price_stability, buybox_pct)

    product = Product(
        org_id=user.org_id,
        asin=data.asin,
        cost=data.cost,
        price=data.price,
        fba_fee=data.fba_fee,
        net_profit=round(net_profit, 2),
        roi_pct=round(roi * 100, 2),
        ai_score=round(score, 2),
        decision=decision,
        risk_level=risk,
        created_at=_now(),
    )
    db.add(product)
    db.commit()

    return {
        "asin": data.asin, "cost": data.cost, "price": data.price, "fba_fee": data.fba_fee,
        "net_profit": round(net_profit, 2), "roi_pct": round(roi * 100, 2),
        "monthly_sales": monthly_sales, "competition": competition,
        "price_stability": price_stability, "buybox_pct": buybox_pct,
        "ai_score": round(score, 2), "decision": decision, "risk_level": risk,
        "keepa_source": keepa.get("source", "unknown"),
    }


@app.get("/products")
def list_products(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    products = get_org_scoped_query(db, user, Product).order_by(Product.created_at.desc()).all()
    return {
        "count": len(products),
        "products": [
            {
                "asin": p.asin, "cost": p.cost, "price": p.price, "fba_fee": p.fba_fee,
                "net_profit": p.net_profit, "roi_pct": p.roi_pct,
                "ai_score": p.ai_score, "decision": p.decision, "risk_level": p.risk_level,
            }
            for p in products
        ],
    }


# ── Weekly Reports ──────────────────────────────────────────────────────────────
@app.post("/weekly")
def add_weekly(
    data: WeeklyInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roi_pct = round((data.profit / data.revenue * 100) if data.revenue > 0 else 0, 2)
    entry = WeeklyReport(
        org_id=user.org_id,
        week=data.week, manager=data.manager,
        hunted=data.hunted, analyzed=data.analyzed, contacted=data.contacted,
        approved=data.approved, purchased=data.purchased,
        revenue=data.revenue, profit=data.profit, roi_pct=roi_pct,
        created_at=_now(),
    )
    db.add(entry)
    db.commit()
    return {"status": "saved", "entry": {"week": data.week, "manager": data.manager}}


@app.get("/weekly")
def list_weekly(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    weeks = get_org_scoped_query(db, user, WeeklyReport).order_by(WeeklyReport.week.desc()).all()
    return {
        "count": len(weeks),
        "weeks": [
            {
                "week": w.week, "manager": w.manager,
                "hunted": w.hunted, "analyzed": w.analyzed, "contacted": w.contacted,
                "approved": w.approved, "purchased": w.purchased,
                "revenue": w.revenue, "profit": w.profit, "roi_pct": w.roi_pct,
            }
            for w in weeks
        ],
    }


# ── Dashboard ───────────────────────────────────────────────────────────────────
@app.get("/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    weeks = get_org_scoped_query(db, user, WeeklyReport).all()
    products = get_org_scoped_query(db, user, Product).all()
    clients = get_org_scoped_query(db, user, Client).all()
    members = db.query(User).filter(User.org_id == user.org_id, User.is_active == True).all()

    total_revenue = sum(w.revenue for w in weeks)
    total_profit = sum(w.profit for w in weeks)
    avg_roi = (total_profit / total_revenue * 100) if total_revenue > 0 else 0

    return {
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "avg_roi_pct": round(avg_roi, 2),
        "buy_decisions": sum(1 for p in products if p.decision == "BUY"),
        "high_risk_asins": sum(1 for p in products if p.risk_level == "HIGH RISK"),
        "total_products_analyzed": len(products),
        "active_clients": sum(1 for c in clients if c.status == "active"),
        "total_clients": len(clients),
        "total_managers": sum(1 for m in members if m.role in ("manager", "account_manager")),
    }


# ── Suppliers ───────────────────────────────────────────────────────────────────
@app.post("/suppliers")
def add_supplier(
    data: SupplierInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    supplier = Supplier(
        org_id=user.org_id,
        name=data.name, brand=data.brand, contact=data.contact,
        response_rate=data.response_rate, approval_rate=data.approval_rate,
        priority_score=round(data.response_rate * 0.5 + data.approval_rate * 0.5, 2),
        notes=data.notes or "",
        created_at=_now(),
    )
    db.add(supplier)
    db.commit()
    return {"status": "saved", "supplier": {"name": supplier.name, "brand": supplier.brand}}


@app.get("/suppliers")
def list_suppliers(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    suppliers = get_org_scoped_query(db, user, Supplier).order_by(Supplier.priority_score.desc()).all()
    return {
        "count": len(suppliers),
        "suppliers": [
            {
                "name": s.name, "brand": s.brand, "contact": s.contact,
                "response_rate": s.response_rate, "approval_rate": s.approval_rate,
                "priority_score": s.priority_score, "notes": s.notes,
            }
            for s in suppliers
        ],
    }


# ── Leaderboard ─────────────────────────────────────────────────────────────────
@app.get("/leaderboard")
def leaderboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    weeks = get_org_scoped_query(db, user, WeeklyReport).all()
    managers = {}
    for w in weeks:
        m = w.manager
        if m not in managers:
            managers[m] = {"manager": m, "approved": 0, "purchased": 0, "profitable": 0, "revenue": 0, "profit": 0}
        managers[m]["approved"] += w.approved or 0
        managers[m]["purchased"] += w.purchased or 0
        managers[m]["profitable"] += 1 if (w.profit or 0) > 0 else 0
        managers[m]["revenue"] += w.revenue or 0
        managers[m]["profit"] += w.profit or 0

    scores = []
    for m, d in managers.items():
        d["score"] = (d["approved"] * 2) + (d["purchased"] * 5) + (d["profitable"] * 10)
        scores.append(d)
    scores.sort(key=lambda x: x["score"], reverse=True)
    return {"leaderboard": scores}


# ── FBA Scout ───────────────────────────────────────────────────────────────────
@app.post("/scout")
def scout_product(
    data: ScoutInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scoring = compute_fba_score(
        bsr=data.bsr, monthly_sales=data.monthly_sales,
        price_volatility_pct=data.price_volatility_pct,
        fba_sellers=data.fba_sellers, current_price=data.current_price,
    )

    profit = {}
    if data.cost is not None:
        profit = compute_profit(
            price=data.current_price, cost=data.cost,
            referral_pct=data.referral_pct or 0.15, fba_fee=data.fba_fee or 3.22,
        )
        fees_fixed = (data.current_price * (data.referral_pct or 0.15)) + (data.fba_fee or 3.22)
        profit["breakeven_cost_25pct"] = round(data.current_price * 0.75 - fees_fixed, 2)

    result = ScoutResult(
        org_id=user.org_id,
        asin=data.asin, title=data.title, brand=data.brand, category=data.category,
        bsr=data.bsr, monthly_sales=data.monthly_sales,
        current_price=data.current_price,
        price_volatility_pct=data.price_volatility_pct,
        fba_sellers=data.fba_sellers,
        fba_score=scoring.get("fba_score", 0),
        verdict=scoring.get("verdict", "Skip"),
        created_at=_now(),
    )
    db.add(result)
    db.commit()

    return {
        "asin": data.asin, "title": data.title, "brand": data.brand,
        "category": data.category, "bsr": data.bsr, "monthly_sales": data.monthly_sales,
        "current_price": data.current_price, "fba_sellers": data.fba_sellers,
        "amazon_url": f"https://www.amazon.com/dp/{data.asin}",
        **scoring, "profit_calc": profit,
    }


@app.get("/scout")
def list_scouts(
    verdict: Optional[str] = None,
    min_score: Optional[int] = None,
    max_score: Optional[int] = None,
    limit: Optional[int] = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = get_org_scoped_query(db, user, ScoutResult)
    if verdict:
        q = q.filter(ScoutResult.verdict == verdict)
    if min_score:
        q = q.filter(ScoutResult.fba_score >= min_score)
    if max_score:
        q = q.filter(ScoutResult.fba_score <= max_score)
    results = q.order_by(ScoutResult.fba_score.desc()).limit(limit or 50).all()
    return {
        "count": len(results),
        "results": [
            {
                "asin": r.asin, "title": r.title, "brand": r.brand,
                "category": r.category, "bsr": r.bsr, "monthly_sales": r.monthly_sales,
                "current_price": r.current_price, "fba_sellers": r.fba_sellers,
                "fba_score": r.fba_score, "verdict": r.verdict,
                "amazon_url": f"https://www.amazon.com/dp/{r.asin}",
            }
            for r in results
        ],
    }


@app.delete("/scout/{asin}")
def delete_scout(
    asin: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = get_org_scoped_query(db, user, ScoutResult).filter(ScoutResult.asin == asin).first()
    if result:
        db.delete(result)
        db.commit()
        return {"removed": 1}
    return {"removed": 0}


@app.post("/scout/bulk")
def scout_bulk(
    data: BulkScoutInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw_asins = [a.strip().upper() for a in data.asins if a.strip()]
    unique_asins = list(dict.fromkeys(raw_asins))
    if len(unique_asins) == 0:
        raise HTTPException(status_code=400, detail="No valid ASINs provided.")
    if len(unique_asins) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 ASINs per request.")

    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    api_key = (data.keepa_api_key or "").strip() or (getattr(org, "keepa_api_key", None) if org else None)
    if not api_key:
        raise HTTPException(status_code=400, detail="Keepa API key not configured.")

    results = []
    error_details = []
    for asin in unique_asins:
        try:
            keepa = get_keepa_data(asin, api_key, domain=data.domain or 1)
            scoring = compute_fba_score(
                bsr=keepa["bsr"], monthly_sales=keepa["monthly_sales"],
                price_volatility_pct=keepa["price_volatility_pct"],
                fba_sellers=keepa["fba_sellers"], current_price=keepa["current_price"],
            )
            profit = {}
            if data.cost_per_unit is not None and keepa["current_price"] > 0:
                profit = compute_profit(
                    price=keepa["current_price"], cost=data.cost_per_unit,
                    referral_pct=data.referral_pct or 0.15, fba_fee=data.fba_fee or 3.22,
                )
                price = keepa["current_price"]
                fees_fixed = (price * (data.referral_pct or 0.15)) + (data.fba_fee or 3.22)
                profit["breakeven_cost_25pct"] = round(price * 0.75 - fees_fixed, 2)

            scout_entry = ScoutResult(
                org_id=user.org_id,
                asin=asin, title=keepa.get("title", ""),
                brand=keepa.get("brand", ""), category=keepa.get("category", ""),
                bsr=keepa.get("bsr", 0), monthly_sales=keepa.get("monthly_sales", 0),
                current_price=keepa.get("current_price", 0),
                price_volatility_pct=keepa.get("price_volatility_pct", 0),
                fba_sellers=keepa.get("fba_sellers", 0),
                fba_score=scoring.get("fba_score", 0),
                verdict=scoring.get("verdict", "Skip"),
                created_at=_now(),
            )
            db.add(scout_entry)
            result = {**keepa, **scoring, "amazon_url": f"https://www.amazon.com/dp/{asin}", "profit_calc": profit}
            results.append(result)
        except Exception as e:
            error_details.append({"asin": asin, "error": str(e)})

    db.commit()
    results.sort(key=lambda x: x.get("fba_score", 0), reverse=True)
    return {"processed": len(results), "errors": len(error_details), "results": results, "error_details": error_details}


# ── Activity Feed ───────────────────────────────────────────────────────────────
@app.get("/activity")
def get_activity(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = (
        get_org_scoped_query(db, user, ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "action": log.action,
            "detail": log.detail,
            "created_at": str(log.created_at),
            "user_id": log.user_id,
        }
        for log in logs
    ]
