"""
Tests for backend/stripe_billing.py — Sprint Day 1 (§2.2).

Scope:
  - STRIPE_DISABLED rollback flag returns 503 cleanly on /checkout, /portal,
    /webhook before doing any work.
  - Webhook 400 on bad signature.
  - Webhook idempotency: redelivered event id short-circuits with
    {"status": "duplicate"} and does not re-mutate org state.
  - Each handled event type writes the expected org.status transition:
      checkout.session.completed   -> active
      invoice.paid                 -> active
      invoice.payment_failed       -> past_due
      customer.subscription.deleted-> canceled

The webhook flow normally does Stripe.Webhook.construct_event() to verify
the signature; we monkey-patch that for the idempotency + state-transition
tests so the test doesn't need a real STRIPE_WEBHOOK_SECRET.
"""
from __future__ import annotations

import json
from unittest.mock import patch

import pytest


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def org_with_customer(db_session):
    """A single Organization with a known stripe_customer_id, status=trialing."""
    from models import Organization
    org = Organization(
        name="Test Org",
        plan="growth",
        stripe_customer_id="cus_test_abc123",
        stripe_subscription_id="",
        status="trialing",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


def _make_event(event_id: str, event_type: str, **data_overrides):
    """Build a minimal Stripe-shaped event dict for monkeypatching construct_event."""
    return {
        "id": event_id,
        "type": event_type,
        "data": {"object": {**data_overrides}},
    }


# ── STRIPE_DISABLED rollback ─────────────────────────────────────────────────

def test_webhook_returns_503_when_stripe_disabled(client, monkeypatch):
    """
    STRIPE_DISABLED=true short-circuits /webhook before signature verification.
    /webhook is the only endpoint this can be tested on without an auth token —
    /checkout and /portal have tenant_session dependencies that resolve before
    the function body runs. Both endpoints share the same `_ensure_stripe_enabled`
    helper, so this proves the contract for all three call sites.
    """
    from config import settings
    monkeypatch.setattr(settings, "STRIPE_DISABLED", True)

    r = client.post(
        "/billing/webhook",
        content=b"{}",
        headers={"stripe-signature": "ignored"},
    )
    assert r.status_code == 503


# ── Webhook signature verification ───────────────────────────────────────────

def test_webhook_invalid_signature_returns_400(client, monkeypatch):
    """A bad stripe-signature header yields 400, not a 500 or silent accept."""
    from config import settings
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_dummy")
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test_dummy")
    monkeypatch.setattr(settings, "STRIPE_DISABLED", False)

    r = client.post(
        "/billing/webhook",
        content=b'{"type":"checkout.session.completed"}',
        headers={"stripe-signature": "t=1,v1=invalid"},
    )
    assert r.status_code == 400


# ── Idempotency ──────────────────────────────────────────────────────────────

def test_webhook_idempotency_redelivery_is_noop(client, db_session, org_with_customer, monkeypatch):
    """
    Same stripe_event_id processed twice: second response is
    {"status": "duplicate"} and org state is unchanged after the second hit.
    """
    from config import settings
    from models import Organization, StripeWebhookEvent
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_dummy")
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test_dummy")
    monkeypatch.setattr(settings, "STRIPE_DISABLED", False)

    event = _make_event(
        "evt_idempo_1",
        "invoice.paid",
        customer=org_with_customer.stripe_customer_id,
    )

    with patch("stripe.Webhook.construct_event", return_value=event):
        r1 = client.post(
            "/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "valid"},
        )
        r2 = client.post(
            "/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "valid"},
        )

    assert r1.status_code == 200
    assert r1.json().get("status") == "processed"
    assert r2.status_code == 200
    assert r2.json().get("status") == "duplicate"

    # Exactly one webhook record persisted.
    db_session.expire_all()
    count = (
        db_session.query(StripeWebhookEvent)
        .filter(StripeWebhookEvent.stripe_event_id == "evt_idempo_1")
        .count()
    )
    assert count == 1


# ── Event-type state transitions ─────────────────────────────────────────────

def _post_event(client, event):
    with patch("stripe.Webhook.construct_event", return_value=event):
        return client.post(
            "/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "valid"},
        )


def _enable_stripe(monkeypatch):
    from config import settings
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_dummy")
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test_dummy")
    monkeypatch.setattr(settings, "STRIPE_DISABLED", False)


def test_invoice_paid_marks_org_active(client, db_session, org_with_customer, monkeypatch):
    _enable_stripe(monkeypatch)
    event = _make_event(
        "evt_paid_1",
        "invoice.paid",
        customer=org_with_customer.stripe_customer_id,
    )
    r = _post_event(client, event)
    assert r.status_code == 200

    db_session.expire_all()
    from models import Organization
    org = db_session.query(Organization).filter(Organization.id == org_with_customer.id).first()
    assert org.status == "active"


def test_invoice_payment_failed_marks_org_past_due(client, db_session, org_with_customer, monkeypatch):
    _enable_stripe(monkeypatch)
    event = _make_event(
        "evt_failed_1",
        "invoice.payment_failed",
        customer=org_with_customer.stripe_customer_id,
    )
    r = _post_event(client, event)
    assert r.status_code == 200

    db_session.expire_all()
    from models import Organization
    org = db_session.query(Organization).filter(Organization.id == org_with_customer.id).first()
    assert org.status == "past_due"


def test_subscription_deleted_marks_org_canceled(client, db_session, org_with_customer, monkeypatch):
    _enable_stripe(monkeypatch)
    event = _make_event(
        "evt_canceled_1",
        "customer.subscription.deleted",
        customer=org_with_customer.stripe_customer_id,
    )
    r = _post_event(client, event)
    assert r.status_code == 200

    db_session.expire_all()
    from models import Organization
    org = db_session.query(Organization).filter(Organization.id == org_with_customer.id).first()
    assert org.status == "canceled"
    assert org.plan == "scout"  # downgraded


# ── /billing/status — Day 5 extensions (§2.2 + §2.4) ─────────────────────────

def _seed_org_owner(db_session, *, plan="growth", status="active", trial_ends_at=None):
    """Helper: create Org + Owner User + JWT for /billing/status tests."""
    from models import Organization, User
    from auth import create_access_token, hash_password

    org = Organization(
        name=f"Status Org {plan}/{status}",
        plan=plan,
        status=status,
        trial_ends_at=trial_ends_at,
    )
    db_session.add(org)
    db_session.flush()
    owner = User(
        org_id=org.id,
        username=f"status_owner_{org.id}",
        email=f"status_owner_{org.id}@bill-test.io",
        name="Status Owner",
        password_hash=hash_password("x"),
        role="owner",
        avatar="S",
        is_active=True,
        email_verified=True,
    )
    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)
    tok = create_access_token({"user_id": owner.id, "org_id": org.id})
    return org, owner, tok


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_billing_status_returns_plan_and_usage(client, db_session):
    """Active org: /status returns plan, status, usage dict."""
    _, _, tok = _seed_org_owner(db_session, plan="growth", status="active")

    r = client.get("/billing/status", headers=_auth(tok))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["plan"] == "growth"
    assert data["plan_name"] == "Growth"
    assert data["status"] == "active"
    assert data["is_trialing"] is False
    assert data["is_past_due"] is False
    assert data["is_canceled"] is False
    # usage is a dict keyed by resource (users/clients/asins/ai_scans/keepa_lookups).
    assert isinstance(data["usage"], dict)
    assert "users" in data["usage"]
    assert "clients" in data["usage"]
    # Each entry has current/limit/unlimited.
    users_entry = data["usage"]["users"]
    assert "current" in users_entry
    assert "limit" in users_entry
    assert "unlimited" in users_entry


def test_billing_status_trialing_includes_days_remaining(client, db_session):
    """status=trialing + future trial_ends_at -> is_trialing + trial_days_remaining 0..14."""
    from datetime import datetime, timedelta
    _, _, tok = _seed_org_owner(
        db_session,
        plan="scout",
        status="trialing",
        trial_ends_at=datetime.utcnow() + timedelta(days=10),
    )

    r = client.get("/billing/status", headers=_auth(tok))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["is_trialing"] is True
    assert data["trial_ends_at"] is not None
    assert data["trial_days_remaining"] is not None
    assert 0 <= data["trial_days_remaining"] <= 14


def test_billing_status_past_due_flag(client, db_session):
    """status=past_due flips is_past_due, leaves is_trialing/is_canceled false."""
    _, _, tok = _seed_org_owner(db_session, plan="growth", status="past_due")
    r = client.get("/billing/status", headers=_auth(tok))
    assert r.status_code == 200
    data = r.json()
    assert data["is_past_due"] is True
    assert data["is_trialing"] is False
    assert data["is_canceled"] is False


def test_billing_status_canceled_flag(client, db_session):
    """status=canceled flips is_canceled."""
    _, _, tok = _seed_org_owner(db_session, plan="scout", status="canceled")
    r = client.get("/billing/status", headers=_auth(tok))
    assert r.status_code == 200
    data = r.json()
    assert data["is_canceled"] is True
    assert data["is_trialing"] is False
    assert data["is_past_due"] is False


def test_billing_portal_requires_billing_customer_id(client, db_session, monkeypatch):
    """No stripe_customer_id -> 400. Stripe must be enabled to reach this branch."""
    _enable_stripe(monkeypatch)
    _, _, tok = _seed_org_owner(db_session, plan="scout", status="trialing")
    # Owner has no stripe_customer_id by default.
    r = client.post(
        "/billing/portal",
        headers={**_auth(tok), "Content-Type": "application/json"},
        json={"return_url": "https://example.com"},
    )
    assert r.status_code == 400
    assert "billing account" in r.json()["detail"].lower()
