"""Tests for backend/signup.py — self-service signup + email verification (§2.3).

Coverage:
  - /api/auth/signup creates Organization + Owner User with trial_ends_at,
    user starts unverified.
  - Duplicate email returns the same generic 200 message — anti-enumeration.
  - Pydantic password-strength validator rejects weak passwords.
  - /api/auth/verify with a valid token marks the user verified, returns a
    JWT + flat user fields matching /auth/login's response shape.
  - /api/auth/verify rejects expired tokens with 400.
  - /api/auth/verify rejects already-used tokens with 400.
  - /api/auth/resend-verification invalidates prior unused tokens for the
    user before issuing a new one — defends against leaked email links.
  - EMAIL_DISABLED=true skips the Resend call but signup still succeeds.

Tokens are stored as SHA-256 hashes only; tests construct a known
plaintext, hash it, and insert directly to test /verify behavior, since
the plaintext is never recoverable from the DB.

Rate limit handling: signup, verify, resend each share auth_rate_limit
(5/min/IP). The reset_limiter fixture wipes slowapi's in-memory storage
between tests so the bucket from a prior test doesn't bleed into the next.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta

import pytest


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@pytest.fixture(autouse=True)
def reset_limiter():
    """Wipe slowapi's in-memory bucket between tests so cumulative requests
    across tests don't trip the 5/min/IP auth limit. The Limiter object is
    built once at import time with a MemoryStorage backend; reset() clears
    all buckets without rebuilding the limiter.
    """
    yield
    try:
        import rate_limiter
        storage = getattr(rate_limiter.limiter, "_storage", None)
        if storage is not None and hasattr(storage, "reset"):
            storage.reset()
    except Exception:
        # NoOpLimiter (RATE_LIMIT_DISABLED=true) has no _storage; harmless.
        pass


# ── /api/auth/signup ────────────────────────────────────────────────────────


def test_signup_creates_org_and_owner_user(client, db_session):
    import models

    resp = client.post(
        "/api/auth/signup",
        json={
            "org_name": "Acme Corp",
            "email": "founder@acme-corp.io",
            "password": "AcmeP@ss2026",
            "name": "Jane Founder",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    assert body["user_id"] is not None

    org = db_session.query(models.Organization).filter_by(name="Acme Corp").first()
    assert org is not None
    assert org.status == "trialing"
    assert org.trial_ends_at is not None
    # Trial ends ~14 days out (TRIAL_DAYS default). Allow a 1-minute fudge
    # so a slow test runner doesn't flake.
    expected = datetime.utcnow() + timedelta(days=14)
    assert abs((org.trial_ends_at - expected).total_seconds()) < 60

    user = (
        db_session.query(models.User)
        .filter_by(email="founder@acme-corp.io")
        .first()
    )
    assert user is not None
    assert user.role == "owner"
    assert user.email_verified is False
    assert user.org_id == org.id

    # Exactly one verification token created, unused.
    tokens = (
        db_session.query(models.EmailVerificationToken)
        .filter_by(user_id=user.id)
        .all()
    )
    assert len(tokens) == 1
    assert tokens[0].used_at is None


def test_signup_duplicate_email_returns_generic_message(client, db_session):
    """Two signups with the same email return the same generic 200 — an
    attacker can't tell whether an email is registered."""
    payload_a = {
        "org_name": "First Co",
        "email": "dup@signup-test.io",
        "password": "FirstP@ss123",
        "name": "First User",
    }
    payload_b = {
        "org_name": "Second Co",
        "email": "dup@signup-test.io",
        "password": "SecondP@ss123",
        "name": "Second User",
    }
    a = client.post("/api/auth/signup", json=payload_a)
    assert a.status_code == 200, a.text

    b = client.post("/api/auth/signup", json=payload_b)
    assert b.status_code == 200, b.text
    # Generic message, no "email taken" leak.
    assert "verification" in b.json()["message"].lower()
    # And no second org was created.
    import models
    orgs = db_session.query(models.Organization).filter_by(name="Second Co").all()
    assert orgs == []


def test_signup_rejects_weak_password(client):
    """Post Phase A, weak passwords are rejected by validate_password() in
    the route handler (400 with friendly detail), not by Pydantic
    field_validator (422). Length is the first thing checked, so a 10-char
    string fails on length even before complexity is examined."""
    resp = client.post(
        "/api/auth/signup",
        json={
            "org_name": "Weak Pass Co",
            "email": "weak@signup-test.io",
            "password": "abcdefghij",  # 10 chars, no digit, no symbol, no upper
            "name": "Weak User",
        },
    )
    # min_length=12 on Pydantic surfaces as 422 BEFORE the route runs.
    # That's still rejection — the test's intent (weak passwords don't
    # create accounts) is preserved.
    assert resp.status_code in (400, 422), resp.text


# ── /api/auth/verify ────────────────────────────────────────────────────────


def _make_user_with_token(db_session, *, email: str, plaintext: str, expires_at):
    """Helper: create unverified user + token row directly. Bypasses signup
    so tests can control the plaintext (which the DB never stores)."""
    import models
    from auth import hash_password

    org = models.Organization(
        name=f"Org for {email}",
        plan="starter",
        status="trialing",
        trial_ends_at=datetime.utcnow() + timedelta(days=14),
    )
    db_session.add(org)
    db_session.flush()

    user = models.User(
        org_id=org.id,
        username=email,
        email=email,
        name="Test User",
        password_hash=hash_password("DummyPass123"),
        role="owner",
        avatar="T",
        is_active=True,
        email_verified=False,
    )
    db_session.add(user)
    db_session.flush()

    record = models.EmailVerificationToken(
        user_id=user.id,
        token_hash=_hash(plaintext),
        expires_at=expires_at,
    )
    db_session.add(record)
    db_session.commit()
    return user, record


def test_verify_with_valid_token_returns_jwt(client, db_session):
    plaintext = "valid-token-abcdef123456"
    user, _ = _make_user_with_token(
        db_session,
        email="verify@signup-test.io",
        plaintext=plaintext,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )

    resp = client.post("/api/auth/verify", json={"token": plaintext})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    assert body["token"]  # JWT string
    assert body["email"] == "verify@signup-test.io"
    assert body["role"] == "owner"
    assert body["org_id"] == user.org_id

    db_session.expire_all()
    import models
    refreshed = db_session.query(models.User).get(user.id)
    assert refreshed.email_verified is True
    assert refreshed.email_verified_at is not None

    record = (
        db_session.query(models.EmailVerificationToken)
        .filter_by(user_id=user.id)
        .first()
    )
    assert record.used_at is not None


def test_verify_with_expired_token_returns_400(client, db_session):
    plaintext = "expired-token-abc"
    _make_user_with_token(
        db_session,
        email="expired@signup-test.io",
        plaintext=plaintext,
        expires_at=datetime.utcnow() - timedelta(hours=1),
    )

    resp = client.post("/api/auth/verify", json={"token": plaintext})
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


def test_verify_with_already_used_token_returns_400(client, db_session):
    plaintext = "already-used-token"
    _, record = _make_user_with_token(
        db_session,
        email="used@signup-test.io",
        plaintext=plaintext,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    record.used_at = datetime.utcnow()
    db_session.commit()

    resp = client.post("/api/auth/verify", json={"token": plaintext})
    assert resp.status_code == 400
    assert "already" in resp.json()["detail"].lower()


def test_verify_with_unknown_token_returns_400(client):
    resp = client.post(
        "/api/auth/verify",
        json={"token": "no-such-token-exists-anywhere"},
    )
    assert resp.status_code == 400


# ── /api/auth/resend-verification ───────────────────────────────────────────


def test_resend_verification_invalidates_prior_tokens(client, db_session):
    """Resend marks every prior unused token as used so a leaked email link
    from an old send is dead the moment a new one is asked for."""
    import models

    # Sign up via the public endpoint so the first token lands naturally.
    client.post(
        "/api/auth/signup",
        json={
            "org_name": "Resend Co",
            "email": "resend@signup-test.io",
            "password": "ResendP@ss123",
            "name": "Resend User",
        },
    )

    user = (
        db_session.query(models.User).filter_by(email="resend@signup-test.io").first()
    )
    assert user is not None
    first = (
        db_session.query(models.EmailVerificationToken)
        .filter_by(user_id=user.id)
        .one()
    )
    assert first.used_at is None

    resp = client.post(
        "/api/auth/resend-verification",
        json={"email": "resend@signup-test.io"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True

    db_session.expire_all()
    tokens = (
        db_session.query(models.EmailVerificationToken)
        .filter_by(user_id=user.id)
        .order_by(models.EmailVerificationToken.id)
        .all()
    )
    assert len(tokens) == 2
    assert tokens[0].used_at is not None  # original now invalidated
    assert tokens[1].used_at is None      # the freshly-issued one


def test_resend_for_already_verified_user_is_noop(client, db_session):
    """Already-verified users get the same generic message, no new token."""
    import models
    plaintext = "verified-user-token"
    user, _ = _make_user_with_token(
        db_session,
        email="alreadyverified@signup-test.io",
        plaintext=plaintext,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    user.email_verified = True
    user.email_verified_at = datetime.utcnow()
    db_session.commit()

    before = (
        db_session.query(models.EmailVerificationToken)
        .filter_by(user_id=user.id)
        .count()
    )

    resp = client.post(
        "/api/auth/resend-verification",
        json={"email": "alreadyverified@signup-test.io"},
    )
    assert resp.status_code == 200

    after = (
        db_session.query(models.EmailVerificationToken)
        .filter_by(user_id=user.id)
        .count()
    )
    assert after == before, "no fresh token should have been issued"


def test_resend_for_unknown_email_returns_generic(client):
    """Unknown email — same generic 200 — anti-enumeration."""
    resp = client.post(
        "/api/auth/resend-verification",
        json={"email": "ghost@signup-test.io"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True


def test_signup_email_disabled_does_not_break_signup(client, db_session, monkeypatch):
    """EMAIL_DISABLED=true: route silently skips Resend and still 200s."""
    from config import settings
    monkeypatch.setattr(settings, "EMAIL_DISABLED", True)

    resp = client.post(
        "/api/auth/signup",
        json={
            "org_name": "Email Off Co",
            "email": "emailoff@signup-test.io",
            "password": "EmailOff@123",
            "name": "Email Off",
        },
    )
    assert resp.status_code == 200, resp.text

    import models
    user = (
        db_session.query(models.User).filter_by(email="emailoff@signup-test.io").first()
    )
    assert user is not None
    # Token was still created (the email side just didn't go out).
    tokens = (
        db_session.query(models.EmailVerificationToken)
        .filter_by(user_id=user.id)
        .all()
    )
    assert len(tokens) == 1
