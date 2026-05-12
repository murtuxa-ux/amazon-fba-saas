"""Tests for backend/security_middleware.py.

Pins the contract that every response (including 404s, 422s, 500s, and
the actual route success path) carries the six baseline security headers.
"""
from __future__ import annotations

import pytest


REQUIRED_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
}


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


def test_health_response_has_security_headers(client):
    """GET /health is the simplest 200 path."""
    resp = client.get("/health")
    assert resp.status_code == 200
    for name, value in REQUIRED_HEADERS.items():
        assert resp.headers.get(name) == value, (
            f"Header {name!r} missing or wrong on /health. "
            f"Expected {value!r}, got {resp.headers.get(name)!r}"
        )


def test_404_response_has_security_headers(client):
    """A path the app doesn't define still gets the headers — important
    because Starlette default 404s would otherwise bypass middleware."""
    resp = client.get("/this-route-definitely-does-not-exist")
    assert resp.status_code == 404
    for name, value in REQUIRED_HEADERS.items():
        assert resp.headers.get(name) == value, (
            f"Header {name!r} missing on 404 response. "
            f"Got {resp.headers.get(name)!r}"
        )


def test_401_response_has_security_headers(client):
    """Hitting a protected route without auth → 401. Headers still set."""
    resp = client.get("/clients")
    # The route raises 401 because no Authorization header. Some routes
    # may 403; either way must be < 500 AND carry the headers.
    assert resp.status_code in (401, 403)
    for name, value in REQUIRED_HEADERS.items():
        assert resp.headers.get(name) == value


def test_login_401_response_has_security_headers(client):
    """The auth/login route's bogus-credential 401 must also carry headers."""
    resp = client.post(
        "/auth/login",
        json={"username": "nope_security_test", "password": "nope"},
    )
    assert resp.status_code in (401, 429)  # 429 if a prior test tripped the limit
    for name, value in REQUIRED_HEADERS.items():
        assert resp.headers.get(name) == value
