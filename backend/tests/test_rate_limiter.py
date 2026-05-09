"""Tests for backend/rate_limiter.py — slowapi config and the
RATE_LIMIT_DISABLED rollback flag.

Coverage:
  - auth_rate_limit() returns 429 after RATE_LIMIT_AUTH_PER_IP_PER_MIN attempts
  - When the flag is set, no 429s are returned regardless of attempt count
  - The X-RateLimit-* response headers are present on rate-limited routes

Tests use the unauthenticated /auth/login endpoint with bogus credentials —
the route always returns 401 below the limit, 429 above it. We do NOT need
real users in the DB; slowapi runs before the route handler.
"""
from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def reset_limiter():
    """Wipe slowapi's in-memory bucket between tests so requests in one test
    don't push the 5/min/IP bucket past the threshold in the next.
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


def _bogus_login(client):
    return client.post(
        "/auth/login", json={"username": "nope", "password": "nope"}
    )


def test_login_rate_limit_does_not_500(client):
    """Regression for the auth_rate_limit key_func bug.

    The decorator used to pass `key_func=lambda req: ...` to limiter.limit().
    slowapi 0.1.9 (extension.py:496) inspects parameter names to decide
    whether to pass the Request — only the literal name "request" triggers
    that branch; everything else is called as `lim.key_func()` with zero
    args, which raised TypeError and surfaced as a 500 on every /auth/login
    attempt in production. The pre-existing rate-limit tests asserted
    `!= 429` and so were silently happy with a 500.

    This test asserts the route reaches the handler and returns 401 for
    bogus creds — proving the slowapi runtime path executed cleanly.
    """
    from config import settings

    if settings.RATE_LIMIT_DISABLED:
        pytest.skip("RATE_LIMIT_DISABLED is set — slowapi runtime path not exercised.")

    resp = _bogus_login(client)
    assert resp.status_code == 401, (
        f"Expected 401 (bogus credentials), got {resp.status_code}. "
        f"A 500 here means slowapi crashed inside the auth_rate_limit "
        f"decorator. Body: {resp.text!r}"
    )


def test_login_rate_limit_returns_429_after_threshold(client):
    """Default RATE_LIMIT_AUTH_PER_IP_PER_MIN=5; 6th hit should be rate-limited."""
    from config import settings

    threshold = settings.RATE_LIMIT_AUTH_PER_IP_PER_MIN
    if settings.RATE_LIMIT_DISABLED:
        pytest.skip("RATE_LIMIT_DISABLED is set — limiter test would be a no-op.")

    # First N attempts should be 401 (bogus creds, below the limit).
    # Asserting 401 specifically — not just `!= 429` — so a 500 from a
    # broken decorator can't hide here either.
    for i in range(threshold):
        resp = _bogus_login(client)
        assert resp.status_code == 401, (
            f"Attempt {i + 1}/{threshold} expected 401, got {resp.status_code} "
            f"body={resp.text!r}"
        )

    # The (threshold+1)-th attempt should be 429.
    resp = _bogus_login(client)
    assert resp.status_code == 429, (
        f"Expected 429 on attempt {threshold + 1}, got {resp.status_code} "
        f"body={resp.text!r}"
    )


def test_login_includes_ratelimit_headers(client):
    """slowapi adds X-RateLimit-* response headers when headers_enabled=True."""
    from config import settings

    if settings.RATE_LIMIT_DISABLED:
        pytest.skip("RATE_LIMIT_DISABLED is set — no headers will be emitted.")

    resp = _bogus_login(client)
    # slowapi emits at least one of these standard headers when limits apply
    has_header = any(
        h.lower().startswith("x-ratelimit") for h in resp.headers.keys()
    )
    assert has_header, (
        f"No X-RateLimit-* headers on rate-limited route. "
        f"Headers: {dict(resp.headers)}"
    )


def test_rate_limit_disabled_flag_makes_decorators_noop(monkeypatch):
    """Importing rate_limiter with RATE_LIMIT_DISABLED=True yields no-op decorators.

    We can't toggle the flag mid-process (the limiter is built at import time),
    so we simulate by monkeypatching the settings object the module already
    imported and asserting the public helpers honor the flag at call time.
    """
    import rate_limiter

    # The flag-checked branch in auth_rate_limit / ip_rate_limit reads
    # settings.RATE_LIMIT_DISABLED dynamically — patch it and confirm.
    monkeypatch.setattr(rate_limiter.settings, "RATE_LIMIT_DISABLED", True)

    # Re-grab the decorators after patching; both should yield bare passthroughs.
    decorator = rate_limiter.auth_rate_limit()

    @decorator
    def handler():
        return "ok"

    # If the decorator were a slowapi limiter, calling handler() outside a
    # FastAPI request context would error. Bare passthrough returns "ok".
    assert handler() == "ok"
