"""Edge-case tests for /auth/login.

The legacy route returned 500 on unknown usernames because the handler
accessed `user.password_hash` without an explicit `user is None` guard.
The audit script flagged it; this test pins the clean-401 contract so
the regression can't slip back in.

Coverage:
  - Unknown username → 401 (not 500)
  - Unknown email → 401
  - Existing user + wrong password → 401
  - Existing user + right password → 200 + JWT
  - Malformed payload (missing password) → 422
"""
from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def reset_limiter():
    """Wipe slowapi's per-IP bucket between tests so the 5/min auth limit
    from a prior test doesn't bleed into the next."""
    yield
    try:
        import rate_limiter
        storage = getattr(rate_limiter.limiter, "_storage", None)
        if storage is not None and hasattr(storage, "reset"):
            storage.reset()
    except Exception:
        pass


def _seed_user(db_session, username="loginedge", password="EdgePass123", email=None):
    """Insert one Organization + Owner User with a known bcrypt password."""
    import models
    from auth import hash_password
    from datetime import datetime, timedelta

    org = models.Organization(
        name="LoginEdge Co",
        plan="scout",
        status="trialing",
        trial_ends_at=datetime.utcnow() + timedelta(days=14),
    )
    db_session.add(org)
    db_session.flush()

    user = models.User(
        org_id=org.id,
        username=username,
        password_hash=hash_password(password),
        name="Login Edge",
        email=email or f"{username}@example.com",
        role="owner",
        avatar="L",
        is_active=True,
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_unknown_username_returns_401_not_500(client):
    resp = client.post(
        "/auth/login",
        json={"username": "definitely_not_a_user_xyz", "password": "anything"},
    )
    assert resp.status_code == 401, (
        f"Unknown username must return 401, got {resp.status_code}. "
        f"A 500 here means the None guard regressed. Body: {resp.text!r}"
    )
    assert "password" in resp.json().get("detail", "").lower()


def test_unknown_email_returns_401(client):
    resp = client.post(
        "/auth/login",
        json={"email": "ghost@nowhere.example.com", "password": "anything"},
    )
    assert resp.status_code == 401, resp.text


def test_existing_user_wrong_password_returns_401(client, db_session):
    _seed_user(db_session, username="alice_edge", password="CorrectHorse99")

    resp = client.post(
        "/auth/login",
        json={"username": "alice_edge", "password": "WrongHorse00"},
    )
    assert resp.status_code == 401, resp.text


def test_existing_user_right_password_returns_token(client, db_session):
    _seed_user(db_session, username="bob_edge", password="StaplerBattery42")

    resp = client.post(
        "/auth/login",
        json={"username": "bob_edge", "password": "StaplerBattery42"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("token"), "Login response must include a JWT"
    assert body.get("username") == "bob_edge"
    # Nested user object preserved for login.js consumers.
    assert body.get("user", {}).get("username") == "bob_edge"


def test_email_login_with_right_password_returns_token(client, db_session):
    _seed_user(
        db_session,
        username="carol_edge",
        password="EmailLogin01",
        email="carol_edge@example.com",
    )

    resp = client.post(
        "/auth/login",
        json={"email": "carol_edge@example.com", "password": "EmailLogin01"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json().get("token")


def test_malformed_payload_missing_password_returns_422(client):
    resp = client.post("/auth/login", json={"username": "anyone"})
    assert resp.status_code == 422, (
        f"Pydantic validation must reject missing password, got {resp.status_code}"
    )


def test_empty_identifier_returns_400(client):
    """Both username and email empty/missing — handler short-circuits with 400."""
    resp = client.post(
        "/auth/login",
        json={"username": "", "email": "", "password": "anything"},
    )
    assert resp.status_code == 400, resp.text
