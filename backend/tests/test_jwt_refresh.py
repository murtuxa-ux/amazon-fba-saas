"""Tests for the /auth/refresh endpoint + access/refresh token typing.

Behavior pinned:
  - Login returns BOTH `token` (24h access) and `refresh_token` (30d).
  - /auth/refresh accepts a valid refresh token, returns a new access token.
  - /auth/refresh rejects an access token presented as a refresh token (401).
  - get_current_user rejects a refresh token presented as Bearer access (401).
  - /auth/refresh rejects a malformed / unsigned token (401).
"""
from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def reset_limiter():
    """Wipe slowapi's in-memory bucket between tests."""
    yield
    try:
        import rate_limiter
        storage = getattr(rate_limiter.limiter, "_storage", None)
        if storage is not None and hasattr(storage, "reset"):
            storage.reset()
    except Exception:
        pass


def _seed_user(db_session, username="refreshuser", password="RefreshPass123"):
    """Insert one Organization + Owner User."""
    import models
    from auth import hash_password
    from datetime import datetime, timedelta

    org = models.Organization(
        name="Refresh Test Co",
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
        name="Refresh Test",
        email=f"{username}@example.com",
        role="owner",
        avatar="R",
        is_active=True,
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_login_returns_both_access_and_refresh_token(client, db_session):
    _seed_user(db_session, username="alice_refresh", password="LoginPass123")
    resp = client.post(
        "/auth/login",
        json={"username": "alice_refresh", "password": "LoginPass123"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("token"), "Login must return an access token in `token`"
    assert body.get("refresh_token"), "Login must return a refresh token"
    assert body["token"] != body["refresh_token"], "Tokens must be distinct"


def test_refresh_token_exchange_returns_fresh_access_token(client, db_session):
    _seed_user(db_session, username="bob_refresh", password="RefreshLogin99")

    login = client.post(
        "/auth/login",
        json={"username": "bob_refresh", "password": "RefreshLogin99"},
    )
    assert login.status_code == 200
    refresh_token = login.json()["refresh_token"]

    refresh = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh.status_code == 200, refresh.text
    body = refresh.json()
    assert body.get("token"), "Refresh must return a new access token"


def test_refresh_rejects_access_token(client, db_session):
    """An access token presented to /auth/refresh must be rejected."""
    _seed_user(db_session, username="carol_refresh", password="AccessOnly42")

    login = client.post(
        "/auth/login",
        json={"username": "carol_refresh", "password": "AccessOnly42"},
    )
    assert login.status_code == 200
    access_token = login.json()["token"]

    refresh = client.post("/auth/refresh", json={"refresh_token": access_token})
    assert refresh.status_code == 401, (
        f"Access tokens must not be acceptable as refresh tokens. Got: {refresh.status_code} {refresh.text}"
    )


def test_get_current_user_rejects_refresh_token_as_bearer(client, db_session):
    """A refresh token presented as Authorization: Bearer must be rejected."""
    _seed_user(db_session, username="dave_refresh", password="BearerCheck77")

    login = client.post(
        "/auth/login",
        json={"username": "dave_refresh", "password": "BearerCheck77"},
    )
    assert login.status_code == 200
    refresh_token = login.json()["refresh_token"]

    resp = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert resp.status_code == 401, (
        f"Refresh tokens must not authenticate regular routes. Got: {resp.status_code} {resp.text}"
    )


def test_refresh_rejects_malformed_token(client):
    resp = client.post("/auth/refresh", json={"refresh_token": "not.a.valid.jwt"})
    assert resp.status_code in (401, 422)


def test_refresh_rejects_empty_token(client):
    resp = client.post("/auth/refresh", json={"refresh_token": ""})
    assert resp.status_code in (401, 422)
