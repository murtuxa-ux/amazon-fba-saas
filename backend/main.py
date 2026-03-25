from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import secrets
import hashlib
import uuid
from datetime import datetime, timedelta
from ai_engine import calculate_score, get_decision, get_risk_level
from keepa_service import get_keepa_data
from fba_scoring import compute_fba_score, compute_profit

app = FastAPI(title="Ecom Era FBA Wholesale SaaS", version="5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def _now() -> str:
    return datetime.utcnow().isoformat()

# ── In-memory Stores ──────────────────────────────────────────────────────────

# Default account manager accounts
users_db = {
    "murtaza": {
        "password_hash": _hash("Admin@2024"),
        "role":  "admin",
        "name":  "Murtaza",
        "email": "murtuxa@gmail.com",
        "avatar": "M",
    },
    "bilal": {
        "password_hash": _hash("Manager@123"),
        "role":  "account_manager",
        "name":  "Bilal Qureshi",
        "email": "bilal@ecomera.com",
        "avatar": "B",
    },
    "ali": {
        "password_hash": _hash("Manager@123"),
        "role":  "account_manager",
        "name":  "Ali Hassan",
        "email": "ali@ecomera.com",
        "avatar": "A",
    },
    "sarah": {
        "password_hash": _hash("Manager@123"),
        "role":  "account_manager",
        "name":  "Sarah Khan",
        "email": "sarah@ecomera.com",
        "avatar": "S",
    },
    "hamza": {
        "password_hash": _hash("Manager@123"),
        "role":  "account_manager",
        "name":  "Hamza Malik",
        "email": "hamza@ecomera.com",
        "avatar": "H",
    },
}

active_tokens = {}   # token -> username
products_db   = []
weekly_db     = []
suppliers_db  = []
scout_db      = []
clients_db    = []
settings_store = {"keepa_api_key": None}

# ── Auth Models ───────────────────────────────────────────────────────────────

class LoginInput(BaseModel):
    username: str
    password: str

class AddUserInput(BaseModel):
    username: str
    password: str
    name:     str
    email:    str
    role:     str = "account_manager"

class ChangePasswordInput(BaseModel):
    current_password: str
    new_password:     str

# ── Client Models ─────────────────────────────────────────────────────────────

class ClientInput(BaseModel):
    name:           str
    email:          Optional[str] = ""
    phone:          Optional[str] = ""
    marketplace:    Optional[str] = "US"
    plan:           Optional[str] = "Starter"
    assigned_am:    Optional[str] = ""   # username of account manager
    monthly_budget: Optional[float] = 0.0
    start_date:     Optional[str] = ""
    status:         Optional[str] = "active"
    asins:          Optional[List[str]] = []
    notes:          Optional[str] = ""

class ClientUpdateInput(BaseModel):
    name:           Optional[str] = None
    email:          Optional[str] = None
    phone:          Optional[str] = None
    marketplace:    Optional[str] = None
    plan:           Optional[str] = None
    assigned_am:    Optional[str] = None
    monthly_budget: Optional[float] = None
    start_date:     Optional[str] = None
    status:         Optional[str] = None
    asins:          Optional[List[str]] = None
    notes:          Optional[str] = None

# ── Existing Models ───────────────────────────────────────────────────────────

class ProductInput(BaseModel):
    asin:           str
    cost:           float
    price:          float
    fba_fee:        float
    monthly_sales:  Optional[float] = None
    competition:    Optional[float] = None
    price_stability:Optional[float] = None
    buybox_pct:     Optional[float] = None

class WeeklyInput(BaseModel):
    week:      str
    manager:   str
    hunted:    int
    analyzed:  int
    contacted: int
    approved:  int
    purchased: int
    revenue:   float
    profit:    float

class SupplierInput(BaseModel):
    name:          str
    brand:         str
    contact:       str
    response_rate: float
    approval_rate: float
    notes:         Optional[str] = ""

class ScoutInput(BaseModel):
    asin:                str
    title:               Optional[str] = ""
    brand:               Optional[str] = ""
    category:            Optional[str] = ""
    bsr:                 int
    monthly_sales:       int
    current_price:       float
    avg_price_90d:       Optional[float] = None
    min_price_90d:       Optional[float] = None
    max_price_90d:       Optional[float] = None
    price_volatility_pct:float
    fba_sellers:         int
    total_sellers:       Optional[int] = None
    reviews:             Optional[int] = None
    rating:              Optional[float] = None
    cost:                Optional[float] = None
    referral_pct:        Optional[float] = 0.15
    fba_fee:             Optional[float] = 3.22

class BulkScoutInput(BaseModel):
    asins:         List[str]
    keepa_api_key: Optional[str] = None
    cost_per_unit: Optional[float] = None
    referral_pct:  Optional[float] = 0.15
    fba_fee:       Optional[float] = 3.22
    domain:        Optional[int] = 1

class SettingsInput(BaseModel):
    keepa_api_key: str

# ── Auth Helpers ──────────────────────────────────────────────────────────────

def _get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    username = active_tokens.get(token)
    if not username or username not in users_db:
        return None
    return {"username": username, **{k: v for k, v in users_db[username].items() if k != "password_hash"}}

def _require_auth(authorization: Optional[str] = Header(None)):
    user = _get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user

def _require_admin(authorization: Optional[str] = Header(None)):
    user = _require_auth(authorization)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"status": "Ecom Era FBA SaaS V5 running ✅", "version": "5.0"}

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login")
def login(data: LoginInput):
    username = data.username.strip().lower()
    user = users_db.get(username)
    if not user or user["password_hash"] != _hash(data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    token = secrets.token_hex(32)
    active_tokens[token] = username
    return {
        "token":    token,
        "username": username,
        "name":     user["name"],
        "role":     user["role"],
        "email":    user["email"],
        "avatar":   user.get("avatar", username[0].upper()),
    }

@app.post("/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        active_tokens.pop(token, None)
    return {"status": "logged out"}

@app.get("/auth/me")
def me(authorization: Optional[str] = Header(None)):
    user = _require_auth(authorization)
    return user

@app.get("/users")
def list_users(authorization: Optional[str] = Header(None)):
    _require_auth(authorization)
    return [
        {"username": u, "name": d["name"], "email": d["email"],
         "role": d["role"], "avatar": d.get("avatar", u[0].upper())}
        for u, d in users_db.items()
    ]

@app.post("/users")
def add_user(data: AddUserInput, authorization: Optional[str] = Header(None)):
    _require_admin(authorization)
    if data.username in users_db:
        raise HTTPException(status_code=400, detail="Username already exists.")
    users_db[data.username.strip().lower()] = {
        "password_hash": _hash(data.password),
        "role":   data.role,
        "name":   data.name,
        "email":  data.email,
        "avatar": data.name[0].upper() if data.name else data.username[0].upper(),
    }
    return {"status": "created", "username": data.username}

@app.post("/auth/change-password")
def change_password(data: ChangePasswordInput, authorization: Optional[str] = Header(None)):
    user = _require_auth(authorization)
    username = user["username"]
    if users_db[username]["password_hash"] != _hash(data.current_password):
        raise HTTPException(status_code=400, detail="Current password incorrect.")
    users_db[username]["password_hash"] = _hash(data.new_password)
    return {"status": "password changed"}

# ── Clients ───────────────────────────────────────────────────────────────────

@app.get("/clients")
def list_clients(
    status:      Optional[str] = None,
    assigned_am: Optional[str] = None,
    marketplace: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    _require_auth(authorization)
    result = clients_db[:]
    if status:      result = [c for c in result if c.get("status") == status]
    if assigned_am: result = [c for c in result if c.get("assigned_am") == assigned_am]
    if marketplace: result = [c for c in result if c.get("marketplace") == marketplace]
    result.sort(key=lambda c: c.get("name", ""))
    return {"count": len(result), "clients": result}

@app.post("/clients")
def add_client(data: ClientInput, authorization: Optional[str] = Header(None)):
    _require_auth(authorization)
    client = {
        "id":             str(uuid.uuid4()),
        "name":           data.name,
        "email":          data.email or "",
        "phone":          data.phone or "",
        "marketplace":    data.marketplace or "US",
        "plan":           data.plan or "Starter",
        "assigned_am":    data.assigned_am or "",
        "monthly_budget": data.monthly_budget or 0.0,
        "start_date":     data.start_date or _now()[:10],
        "status":         data.status or "active",
        "asins":          data.asins or [],
        "notes":          data.notes or "",
        "created_at":     _now(),
        "revenue_total":  0.0,
        "profit_total":   0.0,
    }
    clients_db.append(client)
    return {"status": "created", "client": client}

@app.get("/clients/{client_id}")
def get_client(client_id: str, authorization: Optional[str] = Header(None)):
    _require_auth(authorization)
    c = next((x for x in clients_db if x["id"] == client_id), None)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found.")
    return c

@app.put("/clients/{client_id}")
def update_client(client_id: str, data: ClientUpdateInput, authorization: Optional[str] = Header(None)):
    _require_auth(authorization)
    c = next((x for x in clients_db if x["id"] == client_id), None)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found.")
    for field, val in data.dict(exclude_none=True).items():
        c[field] = val
    c["updated_at"] = _now()
    return {"status": "updated", "client": c}

@app.delete("/clients/{client_id}")
def delete_client(client_id: str, authorization: Optional[str] = Header(None)):
    _require_admin(authorization)
    global clients_db
    before = len(clients_db)
    clients_db = [c for c in clients_db if c["id"] != client_id]
    return {"removed": before - len(clients_db)}

# ── Reports & KPIs ────────────────────────────────────────────────────────────

@app.get("/reports/summary")
def reports_summary(
    period:      Optional[str] = None,   # weekly | monthly | quarterly | yearly
    start_date:  Optional[str] = None,
    end_date:    Optional[str] = None,
    manager:     Optional[str] = None,
    client_id:   Optional[str] = None,
    verdict:     Optional[str] = None,   # Winner | Maybe | Skip
    marketplace: Optional[str] = None,
    min_score:   Optional[int] = None,
    max_score:   Optional[int] = None,
    authorization: Optional[str] = Header(None),
):
    _require_auth(authorization)

    # Filter weekly reports
    weeks = weekly_db[:]
    if manager:    weeks = [w for w in weeks if w.get("manager") == manager]
    if start_date: weeks = [w for w in weeks if w.get("week", "") >= start_date]
    if end_date:   weeks = [w for w in weeks if w.get("week", "") <= end_date]

    # Filter scout results
    scouts = scout_db[:]
    if verdict:    scouts = [s for s in scouts if s.get("verdict") == verdict]
    if min_score:  scouts = [s for s in scouts if s.get("fba_score", 0) >= min_score]
    if max_score:  scouts = [s for s in scouts if s.get("fba_score", 0) <= max_score]

    # Aggregate
    total_revenue = sum(w["revenue"] for w in weeks)
    total_profit  = sum(w["profit"]  for w in weeks)
    avg_roi = round((total_profit / total_revenue * 100) if total_revenue > 0 else 0, 2)

    # Scout breakdown by verdict
    verdict_counts = {"Winner": 0, "Maybe": 0, "Skip": 0}
    for s in scouts:
        v = s.get("verdict", "Skip")
        verdict_counts[v] = verdict_counts.get(v, 0) + 1

    # Manager breakdown
    manager_summary = {}
    for w in weeks:
        m = w["manager"]
        if m not in manager_summary:
            manager_summary[m] = {"manager": m, "revenue": 0, "profit": 0, "approved": 0, "purchased": 0}
        manager_summary[m]["revenue"]   += w["revenue"]
        manager_summary[m]["profit"]    += w["profit"]
        manager_summary[m]["approved"]  += w.get("approved", 0)
        manager_summary[m]["purchased"] += w.get("purchased", 0)

    for m in manager_summary:
        rev = manager_summary[m]["revenue"]
        pro = manager_summary[m]["profit"]
        manager_summary[m]["roi_pct"] = round((pro / rev * 100) if rev > 0 else 0, 2)

    return {
        "total_revenue":   round(total_revenue, 2),
        "total_profit":    round(total_profit, 2),
        "avg_roi_pct":     avg_roi,
        "weeks_count":     len(weeks),
        "scouts_count":    len(scouts),
        "verdict_counts":  verdict_counts,
        "manager_summary": list(manager_summary.values()),
        "weekly_data":     weeks,
        "top_scouts":      sorted(scouts, key=lambda x: x.get("fba_score", 0), reverse=True)[:10],
    }

@app.get("/reports/kpi")
def reports_kpi(
    manager:   Optional[str] = None,
    period:    Optional[str] = "monthly",
    authorization: Optional[str] = Header(None),
):
    _require_auth(authorization)

    # KPI targets per account manager (can be customised)
    kpi_targets = {
        "hunted":    {"weekly": 50, "monthly": 200, "quarterly": 600},
        "analyzed":  {"weekly": 30, "monthly": 120, "quarterly": 360},
        "approved":  {"weekly": 5,  "monthly": 20,  "quarterly": 60},
        "purchased": {"weekly": 3,  "monthly": 12,  "quarterly": 36},
        "revenue":   {"weekly": 10000, "monthly": 40000, "quarterly": 120000},
    }

    weeks = weekly_db[:]
    if manager:
        weeks = [w for w in weeks if w.get("manager") == manager]

    # Build per-manager KPI data
    manager_kpi = {}
    for w in weeks:
        m = w["manager"]
        if m not in manager_kpi:
            manager_kpi[m] = {
                "manager":   m,
                "hunted":    0, "analyzed": 0, "contacted": 0,
                "approved":  0, "purchased": 0,
                "revenue":   0.0, "profit": 0.0,
                "weeks":     0,
            }
        manager_kpi[m]["hunted"]    += w.get("hunted", 0)
        manager_kpi[m]["analyzed"]  += w.get("analyzed", 0)
        manager_kpi[m]["contacted"] += w.get("contacted", 0)
        manager_kpi[m]["approved"]  += w.get("approved", 0)
        manager_kpi[m]["purchased"] += w.get("purchased", 0)
        manager_kpi[m]["revenue"]   += w.get("revenue", 0)
        manager_kpi[m]["profit"]    += w.get("profit", 0)
        manager_kpi[m]["weeks"]     += 1

    p = period or "monthly"
    for m, d in manager_kpi.items():
        rev = d["revenue"]
        pro = d["profit"]
        d["roi_pct"]       = round((pro / rev * 100) if rev > 0 else 0, 1)
        d["approval_rate"] = round((d["approved"] / d["analyzed"] * 100) if d["analyzed"] > 0 else 0, 1)
        d["conversion"]    = round((d["purchased"] / d["approved"] * 100) if d["approved"] > 0 else 0, 1)
        # % of target achieved
        for metric in ["hunted", "analyzed", "approved", "purchased", "revenue"]:
            target = kpi_targets.get(metric, {}).get(p, 1)
            d[f"{metric}_target"] = target
            d[f"{metric}_pct"]    = round((d[metric] / target * 100) if target > 0 else 0, 1)

    return {
        "period":      p,
        "targets":     kpi_targets,
        "managers":    list(manager_kpi.values()),
        "total_managers": len(manager_kpi),
    }

# ── Settings ──────────────────────────────────────────────────────────────────

@app.post("/settings")
def save_settings(data: SettingsInput, authorization: Optional[str] = Header(None)):
    settings_store["keepa_api_key"] = data.keepa_api_key.strip()
    return {"status": "saved", "keepa_api_key_set": True}

@app.get("/settings")
def get_settings(authorization: Optional[str] = Header(None)):
    return {"keepa_api_key_set": bool(settings_store.get("keepa_api_key"))}

# ── Analyze (legacy manual route) ────────────────────────────────────────────

@app.post("/analyze")
def analyze_product(data: ProductInput):
    api_key = settings_store.get("keepa_api_key")
    if api_key:
        try:
            keepa = get_keepa_data(data.asin, api_key)
        except Exception:
            keepa = {"monthly_sales": 500, "competition": 8, "price_stability": 0.75, "buybox_pct": 85, "source": "fallback"}
    else:
        keepa = {"monthly_sales": 500, "competition": 8, "price_stability": 0.75, "buybox_pct": 85, "source": "mock"}

    monthly_sales   = data.monthly_sales    or keepa.get("monthly_sales", 500)
    competition     = data.competition      or keepa.get("competition", 8)
    price_stability = data.price_stability  or keepa.get("price_stability", 0.75)
    buybox_pct      = data.buybox_pct       or keepa.get("buybox_pct", 85)

    net_profit = data.price - data.cost - data.fba_fee
    roi        = net_profit / data.cost if data.cost > 0 else 0

    score    = calculate_score(roi, monthly_sales, competition, price_stability, buybox_pct)
    decision = get_decision(score)
    risk     = get_risk_level(price_stability, buybox_pct)

    result = {
        "asin":            data.asin,
        "cost":            data.cost,
        "price":           data.price,
        "fba_fee":         data.fba_fee,
        "net_profit":      round(net_profit, 2),
        "roi_pct":         round(roi * 100, 2),
        "monthly_sales":   monthly_sales,
        "competition":     competition,
        "price_stability": price_stability,
        "buybox_pct":      buybox_pct,
        "ai_score":        round(score, 2),
        "decision":        decision,
        "risk_level":      risk,
        "keepa_source":    keepa["source"],
    }
    products_db.append(result)
    return result

@app.get("/products")
def list_products():
    return {"count": len(products_db), "products": products_db}

@app.post("/weekly")
def add_weekly(data: WeeklyInput):
    entry = data.dict()
    entry["roi_pct"] = round((data.profit / data.revenue * 100) if data.revenue > 0 else 0, 2)
    weekly_db.append(entry)
    return {"status": "saved", "entry": entry}

@app.get("/weekly")
def list_weekly():
    return {"count": len(weekly_db), "weeks": weekly_db}

@app.get("/dashboard")
def dashboard():
    total_revenue = sum(w["revenue"] for w in weekly_db)
    total_profit  = sum(w["profit"]  for w in weekly_db)
    avg_roi       = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    buy_count     = sum(1 for p in products_db if p["decision"] == "BUY")
    high_risk     = sum(1 for p in products_db if p["risk_level"] == "HIGH RISK")
    active_clients= sum(1 for c in clients_db if c.get("status") == "active")

    return {
        "total_revenue":           round(total_revenue, 2),
        "total_profit":            round(total_profit, 2),
        "avg_roi_pct":             round(avg_roi, 2),
        "buy_decisions":           buy_count,
        "high_risk_asins":         high_risk,
        "total_products_analyzed": len(products_db),
        "active_clients":          active_clients,
        "total_clients":           len(clients_db),
        "total_managers":          sum(1 for u in users_db.values() if u["role"] == "account_manager"),
    }

@app.post("/suppliers")
def add_supplier(data: SupplierInput):
    entry = data.dict()
    entry["priority_score"] = round(data.response_rate * 0.5 + data.approval_rate * 0.5, 2)
    suppliers_db.append(entry)
    return {"status": "saved", "supplier": entry}

@app.get("/suppliers")
def list_suppliers():
    ranked = sorted(suppliers_db, key=lambda x: x["priority_score"], reverse=True)
    return {"count": len(ranked), "suppliers": ranked}

@app.get("/leaderboard")
def leaderboard():
    scores   = []
    managers = {}
    for w in weekly_db:
        m = w["manager"]
        if m not in managers:
            managers[m] = {"manager": m, "approved": 0, "purchased": 0, "profitable": 0, "revenue": 0, "profit": 0}
        managers[m]["approved"]   += w["approved"]
        managers[m]["purchased"]  += w["purchased"]
        managers[m]["profitable"] += 1 if w["profit"] > 0 else 0
        managers[m]["revenue"]    += w["revenue"]
        managers[m]["profit"]     += w["profit"]

    for m, d in managers.items():
        d["score"] = (d["approved"] * 2) + (d["purchased"] * 5) + (d["profitable"] * 10)
        scores.append(d)

    scores.sort(key=lambda x: x["score"], reverse=True)
    return {"leaderboard": scores}

# ── FBA Scout ─────────────────────────────────────────────────────────────────

@app.post("/scout")
def scout_product(data: ScoutInput):
    scoring = compute_fba_score(
        bsr=data.bsr,
        monthly_sales=data.monthly_sales,
        price_volatility_pct=data.price_volatility_pct,
        fba_sellers=data.fba_sellers,
        current_price=data.current_price,
    )
    profit = {}
    if data.cost is not None:
        profit = compute_profit(
            price=data.current_price,
            cost=data.cost,
            referral_pct=data.referral_pct or 0.15,
            fba_fee=data.fba_fee or 3.22,
        )
    fees_fixed    = (data.current_price * (data.referral_pct or 0.15)) + (data.fba_fee or 3.22)
    breakeven_cost = round(data.current_price * 0.75 - fees_fixed, 2)
    profit["breakeven_cost_25pct"] = breakeven_cost

    result = {
        "asin": data.asin, "title": data.title, "brand": data.brand,
        "category": data.category, "bsr": data.bsr, "monthly_sales": data.monthly_sales,
        "current_price": data.current_price, "avg_price_90d": data.avg_price_90d,
        "min_price_90d": data.min_price_90d, "max_price_90d": data.max_price_90d,
        "price_volatility_pct": data.price_volatility_pct, "fba_sellers": data.fba_sellers,
        "total_sellers": data.total_sellers, "reviews": data.reviews, "rating": data.rating,
        "amazon_url": f"https://www.amazon.com/dp/{data.asin}",
        **scoring,
        "profit_calc": profit,
        "scouted_at": _now(),
    }
    scout_db.append(result)
    return result

@app.get("/scout")
def list_scouts(
    verdict:   Optional[str] = None,
    min_score: Optional[int] = None,
    max_score: Optional[int] = None,
    limit:     Optional[int] = 50,
):
    results = scout_db[:]
    if verdict:    results = [r for r in results if r.get("verdict") == verdict]
    if min_score:  results = [r for r in results if r.get("fba_score", 0) >= min_score]
    if max_score:  results = [r for r in results if r.get("fba_score", 0) <= max_score]
    sorted_results = sorted(results, key=lambda x: x.get("fba_score", 0), reverse=True)
    return {"count": len(sorted_results), "results": sorted_results[:limit]}

@app.delete("/scout/{asin}")
def delete_scout(asin: str):
    global scout_db
    before   = len(scout_db)
    scout_db = [s for s in scout_db if s["asin"] != asin]
    return {"removed": before - len(scout_db)}

@app.post("/scout/bulk")
def scout_bulk(data: BulkScoutInput):
    raw_asins    = [a.strip().upper() for a in data.asins if a.strip()]
    unique_asins = list(dict.fromkeys(raw_asins))

    if len(unique_asins) == 0:
        raise HTTPException(status_code=400, detail="No valid ASINs provided.")
    if len(unique_asins) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 ASINs per request.")

    api_key = (data.keepa_api_key or "").strip() or settings_store.get("keepa_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Keepa API key not configured.")

    results       = []
    error_details = []

    for asin in unique_asins:
        try:
            keepa   = get_keepa_data(asin, api_key, domain=data.domain or 1)
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
            if price > 0:
                fees_fixed     = (price * (data.referral_pct or 0.15)) + (data.fba_fee or 3.22)
                profit["breakeven_cost_25pct"] = round(price * 0.75 - fees_fixed, 2)

            result = {**keepa, **scoring, "amazon_url": f"https://www.amazon.com/dp/{asin}",
                      "profit_calc": profit, "scouted_at": _now()}
            results.append(result)
            scout_db.append(result)
        except Exception as e:
            error_details.append({"asin": asin, "error": str(e)})

    results.sort(key=lambda x: x.get("fba_score", 0), reverse=True)
    return {"processed": len(results), "errors": len(error_details),
            "results": results, "error_details": error_details}
