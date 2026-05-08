"""Tests for backend/observability.py — request_id middleware behavior and
Sentry-disabled-when-empty rollback flag. Auth tagging is exercised
indirectly: tag_sentry_user is a no-op when SENTRY_DSN is empty (the test
env), but it still sets the contextvars so structlog log correlation works.
"""
from __future__ import annotations


def test_request_id_middleware_adds_header(client):
    """Every response carries an X-Request-ID header."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) >= 8


def test_request_id_middleware_respects_inbound(client):
    """An inbound X-Request-ID is echoed back so traces correlate end-to-end."""
    correlation = "test-correlation-id-123"
    response = client.get("/health", headers={"X-Request-ID": correlation})
    assert response.headers["X-Request-ID"] == correlation


def test_request_id_unique_per_request(client):
    """Without an inbound header, the middleware mints a new id each request."""
    r1 = client.get("/health")
    r2 = client.get("/health")
    assert r1.headers["X-Request-ID"] != r2.headers["X-Request-ID"]


def test_sentry_disabled_when_dsn_empty(monkeypatch):
    """init_sentry is a silent no-op when SENTRY_DSN is empty (rollback flag)."""
    monkeypatch.setattr("config.settings.SENTRY_DSN", "")
    from observability import init_sentry
    assert init_sentry() is False


def test_redact_sensitive_strips_passwords_and_tokens():
    """before_send hook scrubs sensitive keys recursively."""
    from observability import _redact_sensitive
    event = {
        "request": {
            "data": {
                "username": "alice",
                "password": "hunter2",
                "card": {"number": "4111111111111111", "cvv": "123"},
            },
            "headers": {
                "Authorization": "Bearer abc.def.ghi",
                "Content-Type": "application/json",
            },
            "cookies": {"authorization": "Bearer abc.def.ghi", "tracker": "ok"},
        }
    }
    cleaned = _redact_sensitive(event, hint=None)
    data = cleaned["request"]["data"]
    headers = cleaned["request"]["headers"]
    cookies = cleaned["request"]["cookies"]
    assert data["username"] == "alice"
    assert data["password"] == "[REDACTED]"
    assert data["card"] == "[REDACTED]"
    assert headers["Authorization"] == "[REDACTED]"
    assert headers["Content-Type"] == "application/json"
    assert cookies["authorization"] == "[REDACTED]"
    assert cookies["tracker"] == "ok"


def test_tag_sentry_user_sets_contextvars():
    """tag_sentry_user always populates contextvars even when Sentry is disabled."""
    from observability import tag_sentry_user, _org_id_var, _user_id_var
    tag_sentry_user(user_id=42, org_id=20, username="murtaza")
    assert _user_id_var.get() == 42
    assert _org_id_var.get() == 20
