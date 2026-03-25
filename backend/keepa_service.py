"""
Keepa API Integration — Ecom Era FBA Saas v6.0
Fetches product data and Price History from Keepa Commerce API.
"""
import requests
import time
from typing import Optional
from datetime import datetime, timedelta
from config import settings


def fetch_keepa_data(domain: str, key: str) -> dict:
    """Fetch product data from Keepa API."""
    headers = {"X-AMZA-Check": key}
    params = {"domain": domain, "isAsin": 1, "type": 20}
    resp = requests.get(f"https://asins.keepaapi.com/", headers=headers, params=params, timeout=10)
    return resp.json()

