"""
FBA Viability Scoring Engine
Scores products 0-100 across 5 dimensions matching Ecom Era's FBA Scout rubric.
"""

def score_bsr(bsr: int) -> tuple:
    """BSR score (0-30). Lower BSR = stronger rank = higher score."""
    if bsr <= 1000:    return 30, "STRONG"
    if bsr <= 5000:    return 25, "STRONG"
    if bsr <= 10000:   return 20, "GOOD"
    if bsr <= 25000:   return 15, "MODERATE"
    if bsr <= 50000:   return 10, "WEAK"
    return 5, "WEAK"


def score_sales_velocity(monthly_sales: int) -> tuple:
    """Sales velocity score (0-20). Based on estimated monthly units sold."""
    if monthly_sales >= 5000:  return 20, "STRONG"
    if monthly_sales >= 2000:  return 17, "STRONG"
    if monthly_sales >= 1000:  return 14, "GOOD"
    if monthly_sales >= 500:   return 10, "MODERATE"
    if monthly_sales >= 100:   return 6,  "WEAK"
    return 2, "WEAK"


def score_price_stability(volatility_pct: float) -> tuple:
    """Price stability score (0-20). Based on 90-day price volatility %."""
    if volatility_pct < 5:    return 20, "STRONG"
    if volatility_pct < 10:   return 15, "STRONG"
    if volatility_pct < 20:   return 10, "MODERATE"
    if volatility_pct < 30:   return 6,  "WEAK"
    return 2, "WEAK"


def score_competition(fba_sellers: int) -> tuple:
    """Competition score (0-20). Based on active FBA seller count."""
    if fba_sellers <= 1:    return 20, "STRONG"
    if fba_sellers <= 3:    return 17, "STRONG"
    if fba_sellers <= 7:    return 12, "MODERATE"
    if fba_sellers <= 15:   return 7,  "WEAK"
    return 3, "WEAK"


def score_price_point(price: float) -> tuple:
    """Price point score (0-10). Sweet spot is $15-$50."""
    if 15 <= price <= 50:     return 10, "STRONG"
    if 10 <= price < 15:      return 7,  "GOOD"
    if 50 < price <= 100:     return 7,  "GOOD"
    if price < 10:            return 3,  "WEAK"
    return 4, "WEAK"   # > $100


def compute_fba_score(
    bsr: int,
    monthly_sales: int,
    price_volatility_pct: float,
    fba_sellers: int,
    current_price: float,
) -> dict:
    """Returns full score breakdown and verdict."""
    bsr_pts,  bsr_sig  = score_bsr(bsr)
    vel_pts,  vel_sig  = score_sales_velocity(monthly_sales)
    stab_pts, stab_sig = score_price_stability(price_volatility_pct)
    comp_pts, comp_sig = score_competition(fba_sellers)
    pp_pts,   pp_sig   = score_price_point(current_price)

    total = bsr_pts + vel_pts + stab_pts + comp_pts + pp_pts

    if total >= 80:
        verdict = "Winner"
    elif total >= 60:
        verdict = "Maybe"
    else:
        verdict = "Skip"

    return {
        "fba_score": total,
        "verdict": verdict,
        "score_breakdown": {
            "bsr":             {"score": bsr_pts,  "max": 30, "signal": bsr_sig},
            "sales_velocity":  {"score": vel_pts,  "max": 20, "signal": vel_sig},
            "price_stability": {"score": stab_pts, "max": 20, "signal": stab_sig},
            "competition":     {"score": comp_pts, "max": 20, "signal": comp_sig},
            "price_point":     {"score": pp_pts,   "max": 10, "signal": pp_sig},
        }
    }


def compute_profit(
    price: float,
    cost: float,
    referral_pct: float = 0.15,
    fba_fee: float = 3.22,
    other_costs: float = 0.0,
) -> dict:
    """Return profit calculations at a given price point."""
    referral   = round(price * referral_pct, 2)
    total_fees = round(referral + fba_fee + other_costs, 2)
    total_cost = round(cost + total_fees, 2)
    net_profit = round(price - total_cost, 2)
    margin_pct = round((net_profit / price * 100) if price > 0 else 0, 1)
    roi_pct    = round((net_profit / cost * 100) if cost > 0 else 0, 1)
    return {
        "referral_fee": referral,
        "total_fees":   total_fees,
        "total_cost":   total_cost,
        "net_profit":   net_profit,
        "margin_pct":   margin_pct,
        "roi_pct":      roi_pct,
    }
