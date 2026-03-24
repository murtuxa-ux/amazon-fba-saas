from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from ai_engine import calculate_score, get_decision, get_risk_level
from keepa_service import get_keepa_data

app = FastAPI(title="Amazon FBA Wholesale SaaS", version="4.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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

products_db = []
weekly_db = []
suppliers_db = []

@app.get("/")
def home():
    return {"status": "Amazon FBA SaaS V4 is running"}

@app.post("/analyze")
def analyze_product(data: ProductInput):
    keepa = get_keepa_data(data.asin)
    monthly_sales = data.monthly_sales or keepa["monthly_sales"]
    competition = data.competition or keepa["competition"]
    price_stability = data.price_stability or keepa["price_stability"]
    buybox_pct = data.buybox_pct or keepa["buybox_pct"]
    net_profit = data.price - data.cost - data.fba_fee
    roi = net_profit / data.cost if data.cost > 0 else 0
    score = calculate_score(roi, monthly_sales, competition, price_stability, buybox_pct)
    decision = get_decision(score)
    risk = get_risk_level(price_stability, buybox_pct)
    result = {"asin": data.asin, "cost": data.cost, "price": data.price, "fba_fee": data.fba_fee,
              "net_profit": round(net_profit, 2), "roi_pct": round(roi * 100, 2),
              "monthly_sales": monthly_sales, "competition": competition,
              "price_stability": price_stability, "buybox_pct": buybox_pct,
              "ai_score": round(score, 2), "decision": decision, "risk_level": risk,
              "keepa_source": keepa["source"]}
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
    total_profit = sum(w["profit"] for w in weekly_db)
    avg_roi = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    return {"total_revenue": round(total_revenue, 2), "total_profit": round(total_profit, 2),
            "avg_roi_pct": round(avg_roi, 2),
            "buy_decisions": sum(1 for p in products_db if p["decision"] == "BUY"),
            "high_risk_asins": sum(1 for p in products_db if p["risk_level"] == "HIGH RISK"),
            "total_products_analyzed": len(products_db)}

@app.post("/suppliers")
def add_supplier(data: SupplierInput):
    entry = data.dict()
    entry["priority_score"] = round(data.response_rate * 0.5 + data.approval_rate * 0.5, 2)
    suppliers_db.append(entry)
    return {"status": "saved", "supplier": entry}

@app.get("/suppliers")
def list_suppliers():
    return {"count": len(suppliers_db), "suppliers": sorted(suppliers_db, key=lambda x: x["priority_score"], reverse=True)}

@app.get("/leaderboard")
def leaderboard():
    managers = {}
    for w in weekly_db:
        m = w["manager"]
        if m not in managers:
            managers[m] = {"manager": m, "approved": 0, "purchased": 0, "profitable": 0, "revenue": 0, "profit": 0}
        managers[m]["approved"] += w["approved"]
        managers[m]["purchased"] += w["purchased"]
        managers[m]["profitable"] += 1 if w["profit"] > 0 else 0
        managers[m]["revenue"] += w["revenue"]
        managers[m]["profit"] += w["profit"]
    scores = [dict(**d, score=(d["approved"]*2)+(d["purchased"]*5)+(d["profitable"]*10)) for d in managers.values()]
    return {"leaderboard": sorted(scores, key=lambda x: x["score"], reverse=True)}
