"""
Ecom Era FBA SaaS v6.0 — Stripe Billing Module
Handles subscriptions, checkout with 14-day free trial, portal, webhooks, and plan limits.

Sprint Day 1 additions (§2.2):
- STRIPE_DISABLED rollback flag honored on every endpoint.
- Webhook idempotency via stripe_webhook_events table — redelivered events
  return {"status": "duplicate"} rather than re-mutating org state.
- Org status transitions on invoice.paid / invoice.payment_failed in addition
  to subscription lifecycle events.
- trial_ends_at populated from Stripe trial_end on checkout completion.
"""

import json
import stripe
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from config import settings
from database import get_db
from models import (
    CanceledOrgPurgeQueue,
    Organization,
    StripeWebhookEvent,
    User,
)
from auth import get_current_user, tenant_session, require_role
from audit_logs import record_audit
from tier_limits import get_usage_summary

router = APIRouter(prefix="/billing", tags=["billing"])

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


def _ensure_stripe_enabled() -> None:
    """503 if billing is rolled back via env flag or unconfigured.

    STRIPE_DISABLED is the rollback lever from CONVENTIONS.md — operators
    can flip it in Railway without redeploying to take billing offline
    cleanly (no half-broken state where checkouts succeed but webhooks
    can't authenticate).
    """
    if settings.STRIPE_DISABLED:
        raise HTTPException(503, detail="Billing is currently disabled.")
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(503, detail="Stripe billing is not configured.")

# ── Plan Configuration (matches landing page 4-tier pricing) ──────────────────
PLANS = {
    "scout": {
        "name": "Scout",
        "price_monthly": 29,
        "price_annual": 23,
        "stripe_price_id_monthly": getattr(settings, "STRIPE_SCOUT_PRICE_ID", None),
        "stripe_price_id_annual": getattr(settings, "STRIPE_SCOUT_ANNUAL_PRICE_ID", None),
        "max_users": 1,
        "max_clients": 5,
        "max_suppliers": 10,
        "max_scouts_per_month": 50,
        "features": {
            "ai_scoring": True,
            "bulk_scout": False,
            "advanced_reports": False,
            "api_access": False,
            "supplier_management": False,
            "team_collaboration": False,
            "custom_reports": False,
            "white_label": False,
            "dedicated_manager": False,
        },
    },
    "growth": {
        "name": "Growth",
        "price_monthly": 79,
        "price_annual": 63,
        "stripe_price_id_monthly": getattr(settings, "STRIPE_GROWTH_PRICE_ID", None),
        "stripe_price_id_annual": getattr(settings, "STRIPE_GROWTH_ANNUAL_PRICE_ID", None),
        "max_users": 5,
        "max_clients": 25,
        "max_suppliers": 50,
        "max_scouts_per_month": 250,
        "features": {
            "ai_scoring": True,
            "bulk_scout": True,
            "advanced_reports": False,
            "api_access": False,
            "supplier_management": True,
            "team_collaboration": True,
            "custom_reports": False,
            "white_label": False,
            "dedicated_manager": False,
        },
    },
    "professional": {
        "name": "Professional",
        "price_monthly": 149,
        "price_annual": 119,
        "stripe_price_id_monthly": getattr(settings, "STRIPE_PRO_PRICE_ID", None),
        "stripe_price_id_annual": getattr(settings, "STRIPE_PRO_ANNUAL_PRICE_ID", None),
        "max_users": 15,
        "max_clients": 100,
        "max_suppliers": 200,
        "max_scouts_per_month": 1000,
        "features": {
            "ai_scoring": True,
            "bulk_scout": True,
            "advanced_reports": True,
            "api_access": False,
            "supplier_management": True,
            "team_collaboration": True,
            "custom_reports": True,
            "white_label": False,
            "dedicated_manager": False,
        },
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": 299,
        "price_annual": 239,
        "stripe_price_id_monthly": getattr(settings, "STRIPE_ENTERPRISE_PRICE_ID", None),
        "stripe_price_id_annual": getattr(settings, "STRIPE_ENTERPRISE_ANNUAL_PRICE_ID", None),
        "max_users": 999,
        "max_clients": 999,
        "max_suppliers": 999,
        "max_scouts_per_month": 99999,
        "features": {
            "ai_scoring": True,
            "bulk_scout": True,
            "advanced_reports": True,
            "api_access": True,
            "supplier_management": True,
            "team_collaboration": True,
            "custom_reports": True,
            "white_label": True,
            "dedicated_manager": True,
        },
    },
}

# Backward compatibility — map old plan names to new ones
PLAN_ALIASES = {
    "starter": "scout",
}


def get_plan_limits(plan_name: str) -> dict:
    """Return the limits and features for a given plan."""
    resolved = PLAN_ALIASES.get(plan_name, plan_name)
    plan = PLANS.get(resolved, PLANS["scout"])
    return {
        "max_users": plan["max_users"],
        "max_clients": plan["max_clients"],
        "max_suppliers": plan["max_suppliers"],
        "max_scouts_per_month": plan["max_scouts_per_month"],
        **plan["features"],
    }


# ── Request Models ────────────────────────────────────────────────────────────
class CheckoutInput(BaseModel):
    plan: str  # scout / growth / professional / enterprise
    billing_cycle: Optional[str] = "monthly"  # monthly / annual


class PortalInput(BaseModel):
    return_url: Optional[str] = "https://amazon-fba-saas.vercel.app/billing"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/plans")
def list_plans():
    """Return available subscription plans."""
    return {
        plan_key: {
            "name": plan["name"],
            "price_monthly": plan["price_monthly"],
            "price_annual": plan["price_annual"],
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
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Return current billing status + trial countdown + tier usage for the org.

    Single endpoint the /billing UI consumes. Org.status is the source of
    truth (kept in sync by /billing/webhook on subscription lifecycle
    events) — Stripe API calls below only enrich, they don't drive state.
    """
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    resolved_plan = PLAN_ALIASES.get(org.plan, org.plan)
    plan = PLANS.get(resolved_plan, PLANS["scout"])

    # Org.status is naive UTC (`DateTime` column, not timezone=True). Use a
    # naive utcnow() to match — same convention as signup.py and onboarding.py.
    org_status = org.status or "active"
    trial_days_remaining = None
    if org.trial_ends_at:
        delta = (org.trial_ends_at - datetime.utcnow()).days
        trial_days_remaining = max(0, delta)

    result = {
        "plan": resolved_plan,
        "plan_name": plan["name"],
        "price_monthly": plan["price_monthly"],
        "stripe_customer_id": org.stripe_customer_id or None,
        "stripe_subscription_id": org.stripe_subscription_id or None,
        "has_payment_method": bool(org.stripe_subscription_id),
        "limits": get_plan_limits(resolved_plan),
        # Org-status surface for the Billing page banner logic.
        "status": org_status,
        "is_trialing": org_status == "trialing",
        "is_past_due": org_status == "past_due",
        "is_canceled": org_status == "canceled",
        "trial_ends_at": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
        "trial_days_remaining": trial_days_remaining,
        "usage": get_usage_summary(db, org),
    }

    # If Stripe is configured, fetch subscription details
    if settings.STRIPE_SECRET_KEY and org.stripe_subscription_id:
        try:
            sub = stripe.Subscription.retrieve(org.stripe_subscription_id)
            result["subscription_status"] = sub.status
            result["current_period_end"] = datetime.fromtimestamp(
                sub.current_period_end
            ).isoformat()
            result["cancel_at_period_end"] = sub.cancel_at_period_end
            result["trial_end"] = (
                datetime.fromtimestamp(sub.trial_end).isoformat()
                if sub.trial_end
                else None
            )
        except Exception:
            result["subscription_status"] = "unknown"

    return result


@router.get("/usage")
def get_usage(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Current tier usage for the org's billing dashboard.

    Returns one entry per resource (users/clients/asins/ai_scans/keepa_lookups)
    with `current`, `limit`, and `unlimited` fields. Reads only — no side effects.
    """
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    return {"plan": org.plan or "scout", "usage": get_usage_summary(db, org)}


@router.post("/checkout")
def create_checkout(
    data: CheckoutInput,
    request: Request,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout session for subscription with 14-day free trial."""
    _ensure_stripe_enabled()

    resolved = PLAN_ALIASES.get(data.plan, data.plan)
    plan = PLANS.get(resolved)
    if not plan:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {data.plan}")

    # Select price ID based on billing cycle
    if data.billing_cycle == "annual":
        price_id = plan.get("stripe_price_id_annual")
    else:
        price_id = plan.get("stripe_price_id_monthly")

    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"Stripe price not configured for {resolved} ({data.billing_cycle}).",
        )

    org = db.query(Organization).filter(Organization.id == user.org_id).first()

    # Create or get Stripe customer
    if not org.stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            name=org.name,
            metadata={"org_id": str(org.id), "user_id": str(user.id)},
        )
        org.stripe_customer_id = customer.id
        db.commit()

    # Create checkout session with 14-day free trial
    session = stripe.checkout.Session.create(
        customer=org.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        subscription_data={
            "trial_period_days": 14,
            "metadata": {"org_id": str(org.id), "plan": resolved},
        },
        success_url="https://amazon-fba-saas.vercel.app/?checkout=success",
        cancel_url="https://amazon-fba-saas.vercel.app/payment?canceled=true",
        metadata={"org_id": str(org.id), "plan": resolved},
        allow_promotion_codes=True,
    )

    record_audit(
        db, request, user,
        action="billing.checkout_started", resource_type="billing",
        resource_id=session.id,
        after={"plan": resolved, "billing_cycle": data.billing_cycle or "monthly"},
    )
    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/portal")
def create_portal(
    data: PortalInput,
    request: Request,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a Stripe Billing Portal session for managing subscription."""
    _ensure_stripe_enabled()

    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org.stripe_customer_id:
        raise HTTPException(
            status_code=400, detail="No billing account found. Subscribe first."
        )

    session = stripe.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=data.return_url
        or "https://amazon-fba-saas.vercel.app/billing",
    )

    record_audit(
        db, request, user,
        action="billing.portal_accessed", resource_type="billing",
        after={"return_url": data.return_url or ""},
    )
    return {"portal_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events with signature verification + idempotency."""
    _ensure_stripe_enabled()
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(503, detail="Stripe webhook secret not configured.")

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

    # Idempotency: Stripe will redeliver an event if our 200 response is lost.
    # The unique index on stripe_event_id makes this a single keyed lookup; if
    # we've already processed this event, return early without re-mutating
    # any org state.
    event_id = event["id"]
    existing = (
        db.query(StripeWebhookEvent)
        .filter(StripeWebhookEvent.stripe_event_id == event_id)
        .first()
    )
    if existing:
        return {"status": "duplicate", "event_id": event_id}

    # Record the event BEFORE handler logic so a partial-failure replay still
    # short-circuits as a duplicate. The unique index would also catch this on
    # commit, but recording up front keeps the contract simple.
    db.add(
        StripeWebhookEvent(
            stripe_event_id=event_id,
            event_type=event["type"],
            payload=json.dumps(event, default=str),
        )
    )
    db.commit()

    # The webhook has no JWT'd user, so it can't go through tenant_session
    # at the dependency layer. Instead: derive org_id from the Stripe event
    # (either via metadata or by looking up Organization.stripe_customer_id),
    # then explicitly prime the tenancy session inside this handler before
    # touching tenant data. The initial Organization lookup runs as
    # migration_role (BYPASSRLS, our DATABASE_URL role) — that's intentional
    # and bounded: a single keyed query on stripe_customer_id, not a tenant
    # data read.
    def _prime_tenant_session(oid: int) -> None:
        if settings.RLS_ENFORCED:
            db.execute(text("SET LOCAL ROLE app_role"))
            db.execute(text("SET LOCAL app.current_org_id = :oid"), {"oid": int(oid)})

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        org_id = data.get("metadata", {}).get("org_id")
        plan = data.get("metadata", {}).get("plan", "scout")
        subscription_id = data.get("subscription")

        if org_id:
            org = (
                db.query(Organization)
                .filter(Organization.id == int(org_id))
                .first()
            )
            if org:
                _prime_tenant_session(org.id)
                org.plan = plan
                org.stripe_subscription_id = subscription_id
                if not org.stripe_customer_id:
                    org.stripe_customer_id = data.get("customer")
                org.status = "active"
                # Capture trial_end on the subscription if present so we can
                # surface "X days remaining" in-app without re-querying Stripe.
                if subscription_id:
                    try:
                        sub = stripe.Subscription.retrieve(subscription_id)
                        if sub.trial_end:
                            org.trial_ends_at = datetime.fromtimestamp(
                                sub.trial_end, tz=timezone.utc
                            )
                    except Exception:
                        # Don't fail the webhook over a metadata enrichment.
                        pass
                db.commit()

    elif event_type == "invoice.paid":
        customer_id = data.get("customer")
        org = (
            db.query(Organization)
            .filter(Organization.stripe_customer_id == customer_id)
            .first()
        )
        if org:
            _prime_tenant_session(org.id)
            org.status = "active"
            db.commit()

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        org = (
            db.query(Organization)
            .filter(Organization.stripe_customer_id == customer_id)
            .first()
        )
        if org:
            _prime_tenant_session(org.id)
            org.status = "past_due"
            db.commit()

    elif event_type == "customer.subscription.updated":
        customer_id = data.get("customer")
        org = (
            db.query(Organization)
            .filter(Organization.stripe_customer_id == customer_id)
            .first()
        )
        if org:
            _prime_tenant_session(org.id)
            org.stripe_subscription_id = data.get("id")
            # Update plan if price changed
            items = data.get("items", {}).get("data", [])
            if items:
                price_id = items[0].get("price", {}).get("id")
                for plan_key, plan_config in PLANS.items():
                    if price_id in (
                        plan_config.get("stripe_price_id_monthly"),
                        plan_config.get("stripe_price_id_annual"),
                    ):
                        org.plan = plan_key
                        break
            db.commit()

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        org = (
            db.query(Organization)
            .filter(Organization.stripe_customer_id == customer_id)
            .first()
        )
        if org:
            _prime_tenant_session(org.id)
            org.plan = "scout"
            org.stripe_subscription_id = ""
            org.status = "canceled"

            # Schedule a 30-day grace period before hard-deleting the
            # org's data (§2.2 + §3.4). Re-cancellation on a row already
            # queued is a no-op so a redelivered webhook (idempotency
            # already prevents that, but defense in depth) won't reset
            # the timer or queue duplicates.
            existing_queue = (
                db.query(CanceledOrgPurgeQueue)
                .filter(CanceledOrgPurgeQueue.org_id == org.id)
                .first()
            )
            if not existing_queue:
                now_naive = datetime.utcnow()
                db.add(
                    CanceledOrgPurgeQueue(
                        org_id=org.id,
                        canceled_at=now_naive,
                        purge_after=now_naive + timedelta(days=30),
                    )
                )

            db.commit()

    elif event_type == "customer.subscription.trial_will_end":
        # Trial ending in 3 days — Stream A's email work hooks the
        # trial_ending(user, days_remaining) template here in a follow-up.
        pass

    return {"status": "processed", "event_type": event_type, "event_id": event_id}
