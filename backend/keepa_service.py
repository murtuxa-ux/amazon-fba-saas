"""
Keepa API Integration — Ecom Era FBA SaaS v6.0
Fetches product data and price history from Keepa API.
Uses httpx for async-compatible HTTP requests.

Keepa CSV Type indices (stats arrays use these):
  0  = Amazon price (cents)
  1  = New 3rd-party price (cents)
  2  = Used price (cents)
  3  = Sales rank (BSR)
  7  = New offer count
  11 = Rating (x10, e.g., 45 = 4.5)
  16 = Review count
  18 = Buy Box price (cents)
-1 means "no data available" in Keepa.

Sprint Day 2 (§2.5): the org-scoped path `get_keepa_data_for_org()` is
the central entry point for AI modules — it tier-gates via
tier_limits.enforce_limit('keepa_lookups') and records real
tokens_consumed into org_keepa_usage so admins can monitor monthly burn.
"""

import logging
import os
from datetime import date
from typing import Optional, Tuple

import httpx
from fastapi import HTTPException
from sqlalchemy import extract, func
from sqlalchemy.orm import Session


KEEPA_API_URL = "https://api.keepa.com"

logger = logging.getLogger(__name__)


def _safe_idx(arr, idx, default=None):
    """Safely get an index from a list, returning default if out of range or -1."""
    if not arr or not isinstance(arr, list):
        return default
    if idx >= len(arr):
        return default
    val = arr[idx]
    if val is None or val == -1:
        return default
    return val


def _cents_to_dollars(val):
    """Convert Keepa price (cents) to dollars. Returns 0.0 if invalid."""
    if val is None or val <= 0:
        return 0.0
    return round(val / 100, 2)


def _fetch_raw_keepa(asin: str, api_key: str, domain: int = 1) -> Tuple[dict, int]:
    """Single Keepa /product call. Returns (raw_response_json, tokens_consumed).

    Extracted from get_keepa_data so org-scoped callers can record real
    token usage without re-running the request. Keepa surfaces
    `tokensConsumed` in the response; we fall back to a conservative 1
    when absent so usage never silently records zero.
    """
    params = {
        "key": api_key,
        "domain": domain,
        "asin": asin,
        "stats": 90,
        "offers": 20,
    }
    try:
        resp = httpx.get(f"{KEEPA_API_URL}/product", params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as e:
        raise Exception(f"Keepa API error ({e.response.status_code}): {e.response.text}")
    except httpx.RequestError as e:
        raise Exception(f"Keepa API connection error: {str(e)}")

    tokens = data.get("tokensConsumed") or data.get("tokens_consumed") or 1
    return data, int(tokens)


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
    data, _tokens = _fetch_raw_keepa(asin, api_key, domain)
    return _parse_keepa_product(data, asin)


def _parse_keepa_product(data: dict, asin: str) -> dict:
    """Parse a Keepa /product response into the canonical product dict."""
    products = data.get("products", [])
    if not products:
        raise Exception(f"No Keepa data found for ASIN {asin}")

    product = products[0]
    stats = product.get("stats", {}) or {}
    current_arr = stats.get("current", []) or []
    avg90_arr = stats.get("avg90", []) or []
    min90_arr = stats.get("min90", []) or []
    max90_arr = stats.get("max90", []) or []

    # ── Extract core fields ──────────────────────────────────────────────
    title = product.get("title") or ""
    brand = product.get("brand") or ""

    category_tree = product.get("categoryTree") or []
    category = category_tree[-1].get("name", "") if category_tree else ""

    # ── BSR (Best Sellers Rank) ──────────────────────────────────────────
    # Type 3 = Sales rank in current stats
    bsr = _safe_idx(current_arr, 3, 0)
    if bsr < 0:
        bsr = 0

    # Also try from product-level fields
    if bsr == 0:
        bsr_list = product.get("salesRanks", {})
        if bsr_list:
            # Get the first category's BSR
            for cat_id, rank_history in bsr_list.items():
                if rank_history and len(rank_history) >= 2:
                    # Last value in the time series
                    bsr = rank_history[-1] if rank_history[-1] > 0 else 0
                    break

    # ── Monthly Sales ────────────────────────────────────────────────────
    monthly_sales = 0

    # Try monthlySold first (Keepa's estimate)
    ms = stats.get("monthlySold")
    if ms is not None and ms > 0:
        monthly_sales = ms

    # Try monthlySoldHistory
    if monthly_sales == 0:
        msh = product.get("monthlySoldHistory") or []
        if msh and len(msh) >= 2:
            # Last value
            last_val = msh[-1]
            if last_val and last_val > 0:
                monthly_sales = last_val

    # Fallback: estimate from BSR
    if monthly_sales == 0 and bsr > 0:
        monthly_sales = _estimate_sales_from_bsr(bsr)

    # ── Price data ───────────────────────────────────────────────────────
    # Try multiple price sources in priority order:
    # 1. Buy Box price (type 18)
    # 2. Amazon price (type 0)
    # 3. New 3rd-party price (type 1)
    current_price = 0.0

    buybox_raw = _safe_idx(current_arr, 18)
    amazon_raw = _safe_idx(current_arr, 0)
    new_raw = _safe_idx(current_arr, 1)

    if buybox_raw and buybox_raw > 0:
        current_price = _cents_to_dollars(buybox_raw)
    elif amazon_raw and amazon_raw > 0:
        current_price = _cents_to_dollars(amazon_raw)
    elif new_raw and new_raw > 0:
        current_price = _cents_to_dollars(new_raw)

    # ── 90-day price stats ───────────────────────────────────────────────
    # Try Buy Box (18), then Amazon (0), then New (1)
    def _get_price_stat(arr, fallback=0.0):
        """Get best price from stat array, trying multiple types."""
        for idx in [18, 0, 1]:
            val = _safe_idx(arr, idx)
            if val and val > 0:
                return _cents_to_dollars(val)
        return fallback

    avg_price_90d = _get_price_stat(avg90_arr, current_price)
    min_price_90d = _get_price_stat(min90_arr, current_price)
    max_price_90d = _get_price_stat(max90_arr, current_price)

    # Price volatility = (max - min) / avg * 100
    if avg_price_90d > 0:
        price_volatility_pct = round(
            (max_price_90d - min_price_90d) / avg_price_90d * 100, 1
        )
    else:
        price_volatility_pct = 0.0

    # ── Seller / competition data ────────────────────────────────────────
    offers = product.get("offers") or []
    fba_sellers = sum(1 for o in offers if o.get("isFBA", False))
    total_sellers = len(offers)

    # If offers are empty, try offer count from stats
    if total_sellers == 0:
        new_offer_count = _safe_idx(current_arr, 7, 0)
        if new_offer_count and new_offer_count > 0:
            total_sellers = new_offer_count
            # Rough estimate: ~60% are FBA for popular products
            fba_sellers = max(1, int(new_offer_count * 0.6))

    # Also try offerCountFBA from product
    if fba_sellers == 0:
        fba_count = product.get("fbaFees", {})
        offer_count_fba = _safe_idx(current_arr, 10)  # type 10 = count of new FBA offers
        if offer_count_fba and offer_count_fba > 0:
            fba_sellers = offer_count_fba

    # ── Reviews and Rating ───────────────────────────────────────────────
    reviews = _safe_idx(current_arr, 16, 0)
    if reviews and reviews < 0:
        reviews = 0

    # Rating from product-level field (x10, e.g., 45 = 4.5 stars)
    rating_raw = product.get("rating")
    if rating_raw and rating_raw > 0:
        rating = round(rating_raw / 10, 1) if rating_raw > 5 else rating_raw
    else:
        # Try from stats (type 11 = rating x10)
        rating_stat = _safe_idx(current_arr, 11)
        rating = round(rating_stat / 10, 1) if rating_stat and rating_stat > 0 else 0

    return {
        "asin": asin,
        "title": title if title else None,
        "brand": brand if brand else None,
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


# ── Org-scoped central guard (§2.5) ─────────────────────────────────────────
# Every Keepa call originating from a tenant request must flow through
# get_keepa_data_for_org(): it tier-gates BEFORE spending tokens, then
# records real Keepa-reported `tokensConsumed` into org_keepa_usage so the
# /api/system/keepa-budget admin endpoint can show monthly burn.
def _resolve_api_key(org, api_key: Optional[str]) -> str:
    """Pick api_key in precedence: explicit arg > org-attached key > env."""
    candidate = api_key or getattr(org, "keepa_api_key", None) or os.environ.get("KEEPA_API_KEY")
    if not candidate:
        raise HTTPException(
            status_code=400,
            detail="Keepa API key not configured.",
        )
    return candidate


def _record_org_keepa_usage(
    db: Session,
    org_id: int,
    tokens_consumed: int,
    request_count: int = 1,
) -> None:
    """Upsert today's row in org_keepa_usage for `org_id`."""
    from models import OrgKeepaUsage

    today = date.today()
    usage = (
        db.query(OrgKeepaUsage)
        .filter(
            OrgKeepaUsage.org_id == org_id,
            OrgKeepaUsage.date == today,
        )
        .first()
    )
    if usage:
        usage.tokens_consumed = (usage.tokens_consumed or 0) + tokens_consumed
        usage.request_count = (usage.request_count or 0) + request_count
    else:
        usage = OrgKeepaUsage(
            org_id=org_id,
            date=today,
            tokens_consumed=tokens_consumed,
            request_count=request_count,
        )
        db.add(usage)
    db.commit()


def get_keepa_data_for_org(
    db: Session,
    org,
    asin: str,
    api_key: Optional[str] = None,
    domain: int = 1,
) -> dict:
    """Tier-gated, usage-recorded Keepa lookup for org-context callers.

    Use this from every AI module that touches Keepa. It enforces the
    daily `keepa_lookups` quota via tier_limits.enforce_limit (raises 402
    on over-limit) and records the real `tokensConsumed` reported by
    Keepa so the central monthly budget guard can alert at 80%.
    """
    # Tier gate FIRST — counts the lookup against the daily quota even
    # if the request later fails. If we gated AFTER the request, a flood
    # of failing lookups would burn tokens past the cap before tripping it.
    from tier_limits import enforce_limit
    enforce_limit(db, org, "keepa_lookups")

    resolved_key = _resolve_api_key(org, api_key)
    try:
        raw, tokens = _fetch_raw_keepa(asin, resolved_key, domain)
    except Exception as exc:
        logger.error("Keepa request failed for ASIN %s: %s", asin, exc)
        raise

    _record_org_keepa_usage(db, org.id, tokens_consumed=tokens)
    return _parse_keepa_product(raw, asin)


def get_monthly_keepa_burn(db: Session, monthly_budget: int) -> dict:
    """Aggregate token burn across all orgs for the current calendar month.

    Used by the admin /api/system/keepa-budget endpoint. Returns the
    month-to-date total, the configured monthly budget, and the percent
    used so the dashboard can flag at 80%.

    NOTE: This is a system-wide aggregation, intentionally cross-org —
    it powers Owner+Admin reporting only. Callers must role-gate.
    """
    from models import OrgKeepaUsage

    today = date.today()
    total = (
        db.query(func.coalesce(func.sum(OrgKeepaUsage.tokens_consumed), 0))
        .filter(
            extract("year", OrgKeepaUsage.date) == today.year,
            extract("month", OrgKeepaUsage.date) == today.month,
        )
        .scalar()
        or 0
    )
    pct = round((total / monthly_budget) * 100, 1) if monthly_budget else 0.0
    return {
        "month_to_date_tokens": int(total),
        "monthly_budget": monthly_budget,
        "percent_used": pct,
    }
