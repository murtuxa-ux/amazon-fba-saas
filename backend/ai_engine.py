def calculate_score(roi, monthly_sales, competition, price_stability, buybox_pct):
    return (roi * 100) + (monthly_sales / 10) - (competition * 2) + (price_stability * 20) + (buybox_pct / 5)

def get_decision(score):
    if score > 70:
        return "BUY"
    elif score > 40:
        return "TEST"
    return "REJECT"

def get_risk_level(price_stability, buybox_pct):
    if price_stability < 0.3 or buybox_pct < 50:
        return "HIGH RISK"
    return "LOW RISK"
