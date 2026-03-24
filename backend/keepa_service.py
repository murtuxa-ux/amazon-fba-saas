import random

def get_keepa_data(asin: str) -> dict:
    random.seed(hash(asin) % 1000)
    return {
        "asin": asin,
        "monthly_sales": random.randint(200, 1500),
        "competition": random.randint(3, 25),
        "price_stability": round(random.uniform(0.3, 1.0), 2),
        "buybox_pct": round(random.uniform(40, 100), 1),
        "source": "mock",
    }
