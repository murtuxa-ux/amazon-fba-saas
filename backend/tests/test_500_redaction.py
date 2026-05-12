"""Tests for the production-mode redaction in `_global_exception_handler`.

Behavior contract:
  - In dev / staging (default), 500 responses include `exception_type`
    and `path` so developers can triage from the response body alone.
  - In production (APP_ENV=production OR RAILWAY_ENVIRONMENT=production),
    those keys are redacted. Only `detail: "Internal server error"`
    remains.

Tests force a 500 by hitting a route we register dynamically inside the
test app — main.py doesn't have a "/_test_boom" route by design. The
TestClient is built with `raise_server_exceptions=False` so the 500
response is returned as HTTP instead of bubbling out as a Python
exception (the default conftest client uses the opposite setting).
"""
from __future__ import annotations

import pytest


@pytest.fixture
def boom_client(db_session):
    """A TestClient with a /_test_boom route that always raises ValueError,
    configured to surface 500 responses as HTTP bodies (not Python
    exceptions). Test-only — the route is stripped after teardown."""
    from fastapi.testclient import TestClient
    from main import app
    from database import get_db

    def boom():
        raise ValueError("simulated upstream failure")

    app.add_api_route("/_test_boom", boom, methods=["GET"])

    def _override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    try:
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.router.routes = [
            r for r in app.router.routes
            if getattr(r, "path", None) != "/_test_boom"
        ]


def test_dev_500_includes_exception_type_and_path(boom_client, monkeypatch):
    """Default APP_ENV (development) → response body contains both."""
    monkeypatch.setattr("config.settings.APP_ENV", "development")
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)

    resp = boom_client.get("/_test_boom")
    assert resp.status_code == 500
    body = resp.json()
    assert body["detail"] == "Internal server error"
    assert body.get("exception_type") == "ValueError"
    assert body.get("path") == "/_test_boom"


def test_prod_500_redacts_exception_type_and_path(boom_client, monkeypatch):
    """APP_ENV=production → only `detail` remains."""
    monkeypatch.setattr("config.settings.APP_ENV", "production")
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)

    resp = boom_client.get("/_test_boom")
    assert resp.status_code == 500
    body = resp.json()
    assert body == {"detail": "Internal server error"}, (
        f"Production 500 body must not leak internals. Got: {body}"
    )


def test_railway_env_var_alone_triggers_redaction(boom_client, monkeypatch):
    """Belt-and-suspenders: even if APP_ENV isn't production, the
    Railway-injected RAILWAY_ENVIRONMENT=production triggers redaction."""
    monkeypatch.setattr("config.settings.APP_ENV", "development")
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")

    resp = boom_client.get("/_test_boom")
    assert resp.status_code == 500
    body = resp.json()
    assert body == {"detail": "Internal server error"}
