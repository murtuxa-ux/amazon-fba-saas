"""
AI Scoring Engine — Ecom Era FBA SaaS v6.0
Simple scoring model for product analysis decisions.
"""


def calculate_score(roi, monthly_sales, competition, price_stability, buybox_pct):
    """Calculate an AI product score from key metrics."""
    return (
        (roi * 100)
        + (monthly_sales / 10)
        - (competition * 2)
        + (price_stability * 20)
        + (buybox_pct / 5)
    )


def get_decision(score):
    """Return BUY / TEST / REJECT based on AI score."""
    if score > 70:
        return "BUY"
    elif score > 40:
        return "TEST"
    return "REJECT"


def get_risk_level(price_stability, buybox_pct):
    """Classify risk based on price stability and Buy Box share."""
    if price_stability < 0.3 or buybox_pct < 50:
        return "HIGH RISK"
    return "LOW RISK"
