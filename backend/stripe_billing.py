"""
Ecom Era FBA SaaS v6.0 — Stripe Billing Module
Handles subscriptions, checkout, portal, webhooks, and plan limits.
"""

import stripe
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
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


# ── Plan Configuration ──────────────────────────────────────────────────────────

PLANS = {
    "starter": {
        "name": "Starter",
        "price_monthly": 97,
        "stripe_price_id": getattr(settings, "STRIPE_STARTER_PRICE_ID", None),
        "max_users": 3,
        "max_clients": 10,
        "max_suppliers": 25,
        "max_scouts_per_month": 100,
        "features": {
            "ai_scoring": True,
            "bulk_scout": False,
            "advanced_reports": False,
            "api_access": False,
        },
    },
    "growth": {
        "name": "Growth",
        "price_monthly": 197,
        "stripe_price_id": getattr(settings, "STRIPE_GROWTH_PRICE_ID", None),
        "max_users": 10,
        "max_clients": 50,
        "max_suppliers": 100,
        "max_scouts_per_month": 500,
        "features": {
            "ai_scoring": True,
            "bulk_scout": True,
            "advanced_reports": True,
            "api_access": False,
        },
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": 497,
        "stripe_price_id": getattr(settings, "STRIPE_ENTERPRISE_PRICE_ID", None),
        "max_users": 50,
        "max_clients": 500,
        "max_suppliers": 500,
        "max_scouts_per_month": 5000,
        "features": {
            "ai_scoring": True,
            "bulk_scout": True,
            "advanced_reports": True,
            "api_access": True,
        },
    },
}


def get_plan_limits(plan_name: str) -> dict:
    """Return the limits and features for a given plan."""
    plan = PLANS.get(plan_name, PLANS["starter"])
    return {
        "max_users": plan["max_users"],
        "max_clients": plan["max_clients"],
        "max_suppliers": plan["max_suppliers"],
        "max_scouts_per_month": plan["max_scouts_per_month"],
        **plan["features"],
    }


# ── Request Models ──────────────────────────────────────────────────────────────

class CheckoutInput(BaseModel):
    plan: str  # starter / growth / enterprise


class PortalInput(BaseModel):
    return_url: Optional[str] = "https://amazon-fba-saas.vercel.app/billing"


# ── Routes ──────────────────────────────────────────────────────────────────────

@router.get("/plans")
def list_plans():
    """Return available subscription plans."""
    return {
        plan_key: {
            "name": plan["name"],
            "price_monthly": plan["price_monthly"],
            "max_users": plan["max_users"],
            "max_clients": plan["max_clients"],
            "max_suppliers": plan["max_suppliers"],
            "max_scouts_per_month": plan["max_scouts_per_month"],
            "features": plan["features"],
        }
        for plan_key, plan in PLANS.items()
    }


@router.get("/status")
def billing_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return current billing status for the organization."""
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    plan = PLANS.get(org.plan, PLANS["starter"])

    result = {
        "plan": org.plan,
        "plan_name": plan["name"],
        "price_monthly": plan["price_monthly"],
        "stripe_customer_id": org.stripe_customer_id or None,
        "stripe_subscription_id": org.stripe_subscription_id or None,
        "limits": get_plan_limits(org.plan),
    }

    # If Stripe is configured, fetch subscription details
    if settings.STRIPE_SECRET_KEY and org.stripe_subscription_id:
        try:
            sub = stripe.Subscription.retrieve(org.stripe_subscription_id)
            result["subscription_status"] = sub.status
            result["current_period_end"] = datetime.fromtimestamp(sub.current_period_end).isoformat()
            result["cancel_at_period_end"] = sub.cancel_at_period_end
        except Exception:
            result["subscription_status"] = "unknown"

    return result


@router.post("/checkout")
def create_checkout(
    data: CheckoutInput,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout session for subscription."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe billing is not configured.")

    plan = PLANS.get(data.plan)
    if not plan:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {data.plan}")
    if not plan["stripe_price_id"]:
        raise HTTPException(status_code=400, detail=f"Stripe price not configured for {data.plan}.")

    org = db.query(Organization).filter(Organization.id == user.org_id).first()

    # Create or get Stripe customer
    if not org.stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            name=org.name,
            metadata={"org_id": str(org.id)},
        )
        org.stripe_customer_id = customer.id
        db.commit()

    session = stripe.checkout.Session.create(
        customer=org.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": plan["stripe_price_id"], "quantity": 1}],
        mode="subscription",
        success_url="https://amazon-fba-saas.vercel.app/billing?success=true",
        cancel_url="https://amazon-fba-saas.vercel.app/billing?canceled=true",
        metadata={"org_id": str(org.id), "plan": data.plan},
    )

    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/portal")
def create_portal(
    data: PortalInput,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a Stripe Billing Portal session for managing subscription."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe billing is not configured.")

    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Subscribe first.")

    session = stripe.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=data.return_url or "https://amazon-fba-saas.vercel.app/billing",
    )

    return {"portal_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events."""
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhooks not configured.")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload.")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature.")

    # Handle subscription events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        org_id = session.get("metadata", {}).get("org_id")
        plan = session.get("metadata", {}).get("plan", "starter")
        subscription_id = session.get("subscription")

        if org_id:
            org = db.query(Organization).filter(Organization.id == int(org_id)).first()
            if org:
                org.plan = plan
                org.stripe_subscription_id = subscription_id
                if not org.stripe_customer_id:
                    org.stripe_customer_id = session.get("customer")
                db.commit()

    elif event["type"] == "customer.subscription.updated":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")
        org = db.query(Organization).filter(Organization.stripe_customer_id == customer_id).first()
        if org:
            org.stripe_subscription_id = sub.get("id")
            # Update plan if price changed
            items = sub.get("items", {}).get("data", [])
            if items:
                price_id = items[0].get("price", {}).get("id")
                for plan_key, plan_config in PLANS.items():
                    if plan_config["stripe_price_id"] == price_id:
                        org.plan = plan_key
                        break
            db.commit()

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")
        org = db.query(Organization).filter(Organization.stripe_customer_id == customer_id).first()
        if org:
            org.plan = "starter"
            org.stripe_subscription_id = ""
            db.commit()

    return {"received": True}
