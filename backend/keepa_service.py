"""
Keepa API Integration — Ecom Era FBA SaaS v6.0
Fetches product data and price history from Keepa API.
Uses httpx for async-compatible HTTP requests.
"""

import httpx
from typing import Optional


KEEPA_API_URL = "https://api.keepa.com"


def _keepa_time_to_minutes(kt: int) -> int:
    """Convert Keepa time (minutes since 2011-01-01) to Unix timestamp minutes."""
    return kt + 21564000  # offset from Keepa epoch


def get_keepa_data(asin: str, api_key: str, domain: int = 1) -> dict:
    """
    Fetch product data from Keepa for a single ASIN.

    Args:
        asin: Amazon ASIN (e.g., "B08N5WRWNW")
        api_key: Keepa API key
        domain: Amazon domain ID (1=US, 2=UK, 3=DE, 4=FR, 5=JP, 6=CA, etc.)

    Returns:
        dict with product info: title, brand, category, bsr, monthly_sales,
        current_price, price_volatility_pct, fba_sellers, etc.
    """
    params = {
        "key": api_key,
        "domain": domain,
        "asin": asin,
        "stats": 90,  # 90-day stats
        "offers": 20,  # FBA offer data
    }

    try:
        resp = httpx.get(f"{KEEPA_API_URL}/product", params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as e:
        raise Exception(f"Keepa API error ({e.response.status_code}): {e.response.text}")
    except httpx.RequestError as e:
        raise Exception(f"Keepa API connection error: {str(e)}")

    products = data.get("products", [])
    if not products:
        raise Exception(f"No Keepa data found for ASIN {asin}")

    product = products[0]
    stats = product.get("stats", {})
    csv_data = product.get("csv", [])

    # ── Extract core fields ─────────────────────────────────────────────────
    title = product.get("title", "")
    brand = product.get("brand", "")
    category_tree = product.get("categoryTree", [])
    category = category_tree[-1].get("name", "") if category_tree else ""

    # BSR (current)
    bsr = stats.get("current", [None] * 4)[3] or 0
    if bsr < 0:
        bsr = 0

    # Monthly sales estimate from stats
    monthly_sales = stats.get("monthlySold", 0) or 0
    if monthly_sales < 0:
        # Fallback: estimate from BSR
        monthly_sales = _estimate_sales_from_bsr(bsr)

    # ── Price data ──────────────────────────────────────────────────────────
    # Current Amazon price (csv index 0 = Amazon price)
    current_price_raw = stats.get("current", [None])[0]
    current_price = round(current_price_raw / 100, 2) if current_price_raw and current_price_raw > 0 else 0.0

    # If no Amazon price, try Buy Box price (csv index 18)
    if current_price <= 0:
        buybox_raw = stats.get("current", [None] * 19)[18] if len(stats.get("current", [])) > 18 else None
        current_price = round(buybox_raw / 100, 2) if buybox_raw and buybox_raw > 0 else 0.0

    # 90-day price stats for volatility
    avg_90 = stats.get("avg90", [None])[0]
    avg_price_90d = round(avg_90 / 100, 2) if avg_90 and avg_90 > 0 else current_price

    min_90 = stats.get("min90", [None])[0]
    min_price_90d = round(min_90 / 100, 2) if min_90 and min_90 > 0 else current_price

    max_90 = stats.get("max90", [None])[0]
    max_price_90d = round(max_90 / 100, 2) if max_90 and max_90 > 0 else current_price

    # Price volatility = (max - min) / avg * 100
    if avg_price_90d > 0:
        price_volatility_pct = round((max_price_90d - min_price_90d) / avg_price_90d * 100, 1)
    else:
        price_volatility_pct = 0.0

    # ── Seller / competition data ───────────────────────────────────────────
    offers = product.get("offers", [])
    fba_sellers = sum(1 for o in offers if o.get("isFBA", False))
    total_sellers = len(offers)

    # Reviews and rating
    reviews = stats.get("current", [None] * 17)[16] if len(stats.get("current", [])) > 16 else 0
    rating = product.get("rating", 0)
    if reviews and reviews < 0:
        reviews = 0

    return {
        "asin": asin,
        "title": title,
        "brand": brand,
        "category": category,
        "bsr": bsr,
        "monthly_sales": monthly_sales,
        "current_price": current_price,
        "avg_price_90d": avg_price_90d,
        "min_price_90d": min_price_90d,
        "max_price_90d": max_price_90d,
        "price_volatility_pct": price_volatility_pct,
        "fba_sellers": fba_sellers,
        "total_sellers": total_sellers,
        "reviews": reviews or 0,
        "rating": rating or 0,
        "source": "keepa",
    }


def _estimate_sales_from_bsr(bsr: int) -> int:
    """Rough monthly sales estimate from BSR (US marketplace)."""
    if bsr <= 0:
        return 0
    if bsr <= 100:
        return 5000
    if bsr <= 500:
        return 3000
    if bsr <= 1000:
        return 2000
    if bsr <= 5000:
        return 500
    if bsr <= 10000:
        return 200
    if bsr <= 50000:
        return 50
    if bsr <= 100000:
        return 20
    return 5
