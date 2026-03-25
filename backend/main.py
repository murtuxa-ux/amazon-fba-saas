from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from ai_engine import calculate_score, get_decision, get_risk_level
from keepa_service import get_keepa_data
from fba_scoring import compute_fba_score, compute_profit

app = FastAPI(title="Amazon FBA Wholesale SaaS", version="4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

products_db  = []
weekly_db    = []
suppliers_db = []
managers_db  = []
scout_db     = []
settings_store = {"keepa_api_key": None}

@app.get("/")
def home():
    return {"status": "Amazon FBA SaaS V4 is running"}

@app.post("/settings")
def save_settings(data: SettingsInput):
    settings_store["keepa_api_key"] = data.keepa_api_key.strip()
    return {"status": "saved", "keepa_api_key_set": True}

@app.get("/settings")
def get_settings():
    return {"keepa_api_key_set": bool(settings_store.get("keepa_api_key"))}

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

    monthly_sales   = data.monthly_sales   or keepa.get("monthly_sales", 500)
    competition     = data.competition     or keepa.get("competition", 8)
    price_stability = data.price_stability or keepa.get("price_stability", 0.75)
    buybox_pct      = data.buybox_pct      or keepa.get("buybox_pct", 85)

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
    return {
        "total_revenue":           round(total_revenue, 2),
        "total_profit":            round(total_profit, 2),
        "avg_roi_pct":             round(avg_roi, 2),
        "buy_decisions":           buy_count,
        "high_risk_asins":         high_risk,
        "total_products_analyzed": len(products_db),
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
    fees_fixed     = (data.current_price * (data.referral_pct or 0.15)) + (data.fba_fee or 3.22)
    breakeven_cost = round(data.current_price * 0.75 - fees_fixed, 2)
    profit["breakeven_cost_25pct"] = breakeven_cost
    result = {
        "asin":                 data.asin,
        "title":                data.title,
        "brand":                data.brand,
        "category":             data.category,
        "bsr":                  data.bsr,
        "monthly_sales":        data.monthly_sales,
        "current_price":        data.current_price,
        "avg_price_90d":        data.avg_price_90d,
        "min_price_90d":        data.min_price_90d,
        "max_price_90d":        data.max_price_90d,
        "price_volatility_pct": data.price_volatility_pct,
        "fba_sellers":          data.fba_sellers,
        "total_sellers":        data.total_sellers,
        "reviews":              data.reviews,
        "rating":               data.rating,
        "amazon_url":           f"https://www.amazon.com/dp/{data.asin}",
        **scoring,
        "profit_calc":          profit,
    }
    scout_db.append(result)
    return result

@app.get("/scout")
def list_scouts():
    sorted_results = sorted(scout_db, key=lambda x: x.get("fba_score", 0), reverse=True)
    return {"count": len(sorted_results), "results": sorted_results}

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
        raise HTTPException(
            status_code=400,
            detail="Keepa API key not configured. Go to Settings and enter your key, or pass it in the request."
        )

    results       = []
    error_details = []

    for asin in unique_asins:
        try:
            keepa = get_keepa_data(asin, api_key, domain=data.domain or 1)
            scoring = compute_fba_score(
                bsr=keepa["bsr"],
                monthly_sales=keepa["monthly_sales"],
                price_volatility_pct=keepa["price_volatility_pct"],
                fba_sellers=keepa["fba_sellers"],
                current_price=keepa["current_price"],
            )
            profit = {}
            if data.cost_per_unit is not None and keepa["current_price"] > 0:
                profit = compute_profit(
                    price=keepa["current_price"],
                    cost=data.cost_per_unit,
                    referral_pct=data.referral_pct or 0.15,
                    fba_fee=data.fba_fee or 3.22,
                )
            price = keepa["current_price"]
            if price > 0:
                fees_fixed     = (price * (data.referral_pct or 0.15)) + (data.fba_fee or 3.22)
                breakeven_cost = round(price * 0.75 - fees_fixed, 2)
                profit["breakeven_cost_25pct"] = breakeven_cost
            result = {
                **keepa,
                **scoring,
                "amazon_url":  f"https://www.amazon.com/dp/{asin}",
                "profit_calc": profit,
            }
            results.append(result)
            scout_db.append(result)
        except Exception as e:
            error_details.append({"asin": asin, "error": str(e)})

    results.sort(key=lambda x: x.get("fba_score", 0), reverse=True)

    return {
        "processed":     len(results),
        "errors":        len(error_details),
        "results":       results,
        "error_details": error_details,
    }
