"""
Ecom Era FBA SaaS v6.0 — Stripe Billing Module
Handles subscriptions, checkout, portal, webhooks, and usage metering.
"""
import stripe
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from config import settings
from database import get_db
from models import Organization, User, ActivityLog
from auth import get_current_user, require_role

router = APIRouter(prefix="/billing", tags=["billing"])

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

# ── Plan Configuration ────────────────────────────────────────────────────────

PLANS = {
    "starter": {
        "name": "Starter",
        "price_monthly": 97,
        "stripe_price_id": settings.STRIPE_STARTER_PRICE_ID if hasattr(settings, 'STRIPE_STARTER