"""
Keepa Service — Amazon FBA Wholesale
======================================
Fetches real product intelligence from the Keepa API.
Keepa API docs: https://keepa.com/#!api

Domain codes: 1=US, 2=UK, 3=DE, 4=FR, 5=JP, 8=IT, 9=ES, 10=IN, 11=CA, 13=AU
"""

import requests
from typing import Optional


KEEPA_API_BASE = "https://api.keepa.com"


def get_keepa_data(asin: str, api_key: str, domain: int = 1) -> dict:
    """
    Fetch product intelligence for an ASIN from the Keepa API.
    Returns normalized product data ready for FBA scoring.

    Args:
        asin:    Amazon ASIN (10-character)
        api_key: Your Keepa API access key
        domain:  Amazon marketplace (1=US default)

    Returns:
        Normalized dict with bsr, monthly_sales, price data, competition, etc.

    Raises:
        ValueError: if ASIN not found or API call fails
    """
    url = f"{KEEPA_API_BASE}/product"
    params = {
        "key":     api_key,
        "domain":  domain,
        "asin":    asin,
        "stats":   90,
        "history": 1,
    }

    try:
        resp = requests.get(url, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.Timeout:
        raise ValueError(f"Keepa API timed out for ASIN {asin}")
    except requests.exceptions.HTTPError as e:
        if resp.status_code == 400:
            raise ValueError(f"Invalid Keepa API key or bad request for ASIN {asin}")
        raise ValueError(f"Keepa API HTTP error for ASIN {asin}: {e}")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Keepa API request failed for ASIN {asin}: {e}")

    products = data.get("products")
    if not products or len(products) == 0:
        raise ValueError(f"No Keepa data found for ASIN {asin}")

    return _parse_keepa_product(products[0], asin)


def _safe(lst, idx, divisor=1, default=None):
    """Safely extract a value from a Keepa stats array."""
    try:
        val = lst[idx]
        if val is None or val == -1:
            return default
        return round(val / divisor, 2) if divisor != 1 else val
    except (IndexError, TypeError):
        return default


def _parse_keepa_product(product: dict, asin: str) -> dict:
    """
    Parse a raw Keepa product object into a normalised FBA-scoring dict.

    Keepa array indices for stats.current, stats.avg, stats.min, stats.max:
        0  = Sales Rank (BSR)
        1  = Amazon (direct) price
        2  = Marketplace new lowest price
        3  = Marketplace new Buy Box price
        9  = Used price
        11 = Count of new FBA offers
        12 = Count of all new offers (FBA + FBM)
        16 = Count of used offers
    Prices are stored in Keepa Cents (divide by 100 for USD).
    """
    stats     = product.get("stats") or {}
    current   = stats.get("current") or []
    avg_vals  = stats.get("avg")     or []
    min_vals  = stats.get("min")     or []
    max_vals  = stats.get("max")     or []

    bsr = _safe(current, 0)
    if bsr is None or bsr <= 0:
        bsr = 999_999

    current_price = _safe(current, 3, divisor=100) or _safe(current, 2, divisor=100) or 0.0
    avg_price_90d = _safe(avg_vals,  3, divisor=100) or _safe(avg_vals,  2, divisor=100)
    min_price_90d = _safe(min_vals,  3, divisor=100) or _safe(min_vals,  2, divisor=100)
    max_price_90d = _safe(max_vals,  3, divisor=100) or _safe(max_vals,  2, divisor=100)

    price_volatility_pct = 0.0
    if avg_price_90d and min_price_90d is not None and max_price_90d is not None and avg_price_90d > 0:
        price_volatility_pct = round((max_price_90d - min_price_90d) / avg_price_90d * 100, 1)

    fba_sellers   = int(_safe(current, 11) or 0)
    total_sellers = int(_safe(current, 12) or 0)

    monthly_sales = int(product.get("monthlySold") or 0)
    if monthly_sales == 0 and bsr < 999_999:
        monthly_sales = _estimate_sales_from_bsr(int(bsr))

    title = product.get("title") or ""
    brand = product.get("brand") or ""

    category = ""
    category_tree = product.get("categoryTree") or []
    if category_tree and isinstance(category_tree, list):
        try:
            category = category_tree[-1].get("name", "")
        except (AttributeError, KeyError):
            category = ""

    reviews = int(product.get("reviewCount") or 0)
    avg_rating_raw = product.get("avgRating") or 0
    rating = round(avg_rating_raw / 10, 1) if avg_rating_raw > 0 else 0.0

    return {
        "asin":                asin,
        "title":               title,
        "brand":               brand,
        "category":            category,
        "bsr":                 int(bsr),
        "monthly_sales":       monthly_sales,
        "current_price":       float(current_price),
        "avg_price_90d":       avg_price_90d,
        "min_price_90d":       min_price_90d,
        "max_price_90d":       max_price_90d,
        "price_volatility_pct": price_volatility_pct,
        "fba_sellers":         fba_sellers,
        "total_sellers":       total_sellers,
        "reviews":             reviews,
        "rating":              rating,
        "source":              "keepa",
    }


def _estimate_sales_from_bsr(bsr: int) -> int:
    """
    Rough BSR to monthly sales heuristic for US Amazon.
    Used only when Keepa does not provide monthlySold.
    """
    if bsr <= 100:
        return 8000
    elif bsr <= 500:
        return 4000
    elif bsr <= 1_000:
        return 2500
    elif bsr <= 3_000:
        return 1500
    elif bsr <= 5_000:
        return 1000
    elif bsr <= 10_000:
        return 600
    elif bsr <= 25_000:
        return 300
    elif bsr <= 50_000:
        return 150
    elif bsr <= 100_000:
        return 75
    elif bsr <= 250_000:
        return 30
    elif bsr <= 500_000:
        return 10
    else:
        return 3
