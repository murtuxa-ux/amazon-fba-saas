"""
Keepa Service — Amazon FBA Wholesale
======================================
Fetches real product intelligence from the Keepa API.
Keepa API docs: https://keepa.com/#!api

Keepa CSV type index reference (used in stats.current/avg/avg90/min/max arrays):
  0  = AMAZON        Amazon price (Keepa cents)
  1  = NEW           Marketplace new lowest price (Keepa cents)
  2  = USED          Marketplace used lowest price (Keepa cents)
  3  = SALES         Sales Rank / BSR  ← integer, NO divisor
  4  = LIST          List price (Keepa cents)
  9  = WAREHOUSE     Amazon Warehouse price (Keepa cents)
  10 = NEW_FBA       New FBA 3rd-party price (Keepa cents)
  11 = COUNT_NEW     Count of new FBA + FBM offers
  12 = COUNT_USED    Count of used offers
  16 = RATING        Avg rating × 10  (e.g. 45 = 4.5 ★)
  17 = COUNT_REVIEWS Review count

Domain codes: 1=US, 2=UK, 3=DE, 4=FR, 5=JP, 8=IT, 9=ES, 10=IN, 11=CA, 13=AU
"""

import requests


KEEPA_API_BASE = "https://api.keepa.com"


def get_keepa_data(asin: str, api_key: str, domain: int = 1) -> dict:
    """
    Fetch product intelligence for an ASIN from the Keepa API.
    Returns normalised product data ready for FBA scoring.

    Raises:
        ValueError: if ASIN not found or API call fails
    """
    url = f"{KEEPA_API_BASE}/product"
    params = {
        "key":     api_key,
        "domain":  domain,
        "asin":    asin,
        "stats":   90,   # include 90-day aggregated stats
        "history": 1,    # include price history
    }

    try:
        resp = requests.get(url, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.Timeout:
        raise ValueError(f"Keepa API timed out for ASIN {asin}")
    except requests.exceptions.HTTPError as e:
        code = getattr(resp, "status_code", 0)
        if code in (400, 401, 403):
            raise ValueError(f"Invalid Keepa API key or bad request for ASIN {asin}")
        raise ValueError(f"Keepa API HTTP error for ASIN {asin}: {e}")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Keepa API request failed for ASIN {asin}: {e}")

    products = data.get("products")
    if not products:
        raise ValueError(f"No Keepa data found for ASIN {asin}")

    return _parse_keepa_product(products[0], asin)


def _safe(lst, idx, divisor=1, default=None):
    """
    Safely extract a value from a Keepa stats array.
    Returns default if index is out of range or value is -1 (Keepa's no data).
    Divides by divisor before returning (used to convert Keepa cents to USD).
    """
    try:
        val = lst[idx]
        # Keepa uses -1 (or -2 for some types) to indicate no data
        if val is None or val < 0:
            return default
        return round(val / divisor, 2) if divisor != 1 else val
    except (IndexError, TypeError):
        return default


def _parse_keepa_product(product: dict, asin: str) -> dict:
    """Parse a raw Keepa product object into a normalised FBA-scoring dict."""

    stats   = product.get("stats") or {}

    # stats arrays — each position maps to a CSV type (see index reference above)
    current  = stats.get("current")  or []
    avg90    = stats.get("avg90")    or []   # 90-day averages
    min_vals = stats.get("min")      or []   # min in requested interval
    max_vals = stats.get("max")      or []   # max in requested interval

    # BSR (index 3 = SALES, raw integer — no divisor)
    bsr = _safe(current, 3)
    if bsr is None or bsr <= 0:
        bsr = 999_999

    # Prices (Keepa cents divided by 100 = USD)
    # Best price hierarchy: NEW_FBA (10) -> NEW Marketplace (1) -> AMAZON (0)
    def best_price(arr):
        return (
            _safe(arr, 10, divisor=100) or
            _safe(arr, 1,  divisor=100) or
            _safe(arr,  0,  divisor=100)
        )

    current_price = best_price(current) or 0.0
    avg_price_90d = best_price(avg90)
    min_price_90d = best_price(min_vals)
    max_price_90d = best_price(max_vals)

    # Price Volatility (90-day)
    price_volatility_pct = 0.0
    if avg_price_90d and min_price_90d is not None and max_price_90d is not None and avg_price_90d > 0:
        price_volatility_pct = round(
            (max_price_90d - min_price_90d) / avg_price_90d * 100, 1
        )

    # Seller Counts (index 11 = COUNT_NEW, index 12 = COUNT_USED)
    count_new  = int(_safe(current, 11) or 0)
    count_used = int(_safe(current, 12) or 0)

    # COUNT_NEW includes FBA + FBM sellers; approximate FBA sellers
    fba_sellers   = count_new
    total_sellers = count_new + count_used

    # Monthly Sales
    monthly_sales = int(product.get("monthlySold") or 0)
    if monthly_sales == 0 and bsr < 999_999:
        monthly_sales = _estimate_sales_from_bsr(int(bsr))

    # Reviews & Rating
    # index 17 = COUNT_REVIEWS; index 16 = RATING (stored as integer x 10)
    # stats.current may be -1 for newer ASINs — fall back to CSV time series last value
    csv_arrays = product.get("csv") or []

    def _last_csv_val(type_idx):
        """Return the last non-negative value from a Keepa CSV time series."""
        try:
            series = csv_arrays[type_idx] if type_idx < len(csv_arrays) else None
            if not series:
                return None
            # Format: [timestamp, value, timestamp, value, ...]; last element = last value
            last = series[-1]
            return last if last >= 0 else None
        except (IndexError, TypeError):
            return None

    reviews = int(
        _safe(current, 17) or
        product.get("reviewCount") or
        _last_csv_val(17) or
        0
    )
    rating_raw = _safe(current, 16) or _last_csv_val(16) or 0
    rating     = round(rating_raw / 10, 1) if rating_raw > 0 else 0.0

    # Product Info
    title = product.get("title") or ""
    brand = product.get("brand") or ""

    category = ""
    category_tree = product.get("categoryTree") or []
    if category_tree and isinstance(category_tree, list):
        try:
            category = category_tree[-1].get("name", "")
        except (AttributeError, KeyError):
            pass

    return {
        "asin":                 asin,
        "title":                title,
        "brand":                brand,
        "category":             category,
        "bsr":                  int(bsr),
        "monthly_sales":        monthly_sales,
        "current_price":        float(current_price),
        "avg_price_90d":        avg_price_90d,
        "min_price_90d":        min_price_90d,
        "max_price_90d":        max_price_90d,
        "price_volatility_pct": price_volatility_pct,
        "fba_sellers":          fba_sellers,
        "total_sellers":        total_sellers,
        "reviews":              reviews,
        "rating":               rating,
        "source":               "keepa",
    }


def _estimate_sales_from_bsr(bsr: int) -> int:
    """
    Rough BSR to monthly sales heuristic for US Amazon.
    Used only when Keepa does not provide monthlySold.
    """
    if bsr <= 100:       return 8000
    elif bsr <= 500:     return 4000
    elif bsr <= 1_000:   return 2500
    elif bsr <= 3_000:   return 1500
    elif bsr <= 5_000:   return 1000
    elif bsr <= 10_000:  return 600
    elif bsr <= 25_000:  return 300
    elif bsr <= 50_000:  return 150
    elif bsr <= 100_000: return 75
    elif bsr <= 250_000: return 30
    elif bsr <= 500_000: return 10
    else:                return 3
