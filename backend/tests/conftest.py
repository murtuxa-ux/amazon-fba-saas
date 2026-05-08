"""
pytest fixtures for the tenant isolation test suite.

The CI workflow (`.github/workflows/tenant-isolation.yml`) provisions
a Postgres 18 service container, creates the `migration_role` and
`app_role` roles to mirror prod, runs `alembic upgrade head` to install
the baseline schema and the RLS policies, and then invokes pytest with
`DATABASE_URL` pointed at the test DB as `migration_role`.

Two key principles drive the fixture shape:

  1. Setup runs as `migration_role` (BYPASSRLS, owner of the tables).
     The fixture seeds the two_tenants data unimpeded by RLS.

  2. Tests probing RLS-as-second-layer (raw connection probes in
     test_tenant_isolation.py §3.2) explicitly `SET LOCAL ROLE app_role`
     at the top of each `with engine.connect() as conn:` block. Those
     blocks must always issue this SWITCH inside their own transaction,
     never rely on the default connection role.

  3. TestClient(app) routes flow through Depends(tenant_session). With
     `RLS_ENFORCED=true` set at the start of the session, every
     authenticated request additionally runs `SET LOCAL ROLE app_role`
     and `SET LOCAL app.current_org_id = <user.org_id>` inside the
     request transaction. The test thereby exercises the same code
     path prod will when the env var is flipped.
"""
from __future__ import annotations

import os
import pytest
from sqlalchemy.orm import Session


# Force RLS_ENFORCED on for the entire test session BEFORE any backend
# module is imported — settings is read at import time.
os.environ["RLS_ENFORCED"] = "true"


@pytest.fixture(scope="session", autouse=True)
def _verify_rls_enforced():
    """Sanity-check: tests are pointless if the flag isn't set."""
    from config import settings
    assert settings.RLS_ENFORCED is True, (
        "RLS_ENFORCED must be true for tenant isolation tests. "
        "Set RLS_ENFORCED=true in the environment before running pytest."
    )


@pytest.fixture
def db_session() -> Session:
    """
    A SQLAlchemy session bound to the test database, used by fixtures
    and tests that need direct ORM access. Each test gets a fresh
    session; the session commits its work (the two_tenants fixture
    needs the data visible to TestClient HTTP requests, which use a
    separate Session via FastAPI's dependency).

    Cleanup happens at module level via TRUNCATE in _truncate_after_test.
    """
    from database import SessionLocal
    sess = SessionLocal()
    try:
        yield sess
    finally:
        sess.close()


@pytest.fixture(autouse=True)
def _truncate_after_test():
    """
    Wipe all tenant data after each test. The two_tenants fixture commits
    rows to the DB so TestClient requests can see them; we therefore
    can't rely on a transaction rollback between tests. Truncate is
    fast on the small per-test row counts and keeps tests independent.

    Runs `TRUNCATE … RESTART IDENTITY CASCADE` against every customer
    table. Order doesn't matter with CASCADE.

    Connects as migration_role (the DATABASE_URL credential), which has
    BYPASSRLS, so TRUNCATE works without app.current_org_id set.
    """
    yield
    from sqlalchemy import text
    from database import engine
    # Reset id sequences too, so two_tenants fixtures get the same id
    # space across tests (org_a is always id 1, org_b is always id 2).
    tables = [
        # organizations LAST in the truncate list to satisfy CASCADE order
        # (everything FK's to it). With CASCADE it doesn't matter, but
        # putting it last is clearer for the reader.
        "buybox_history", "buybox_alerts", "buybox_trackers",
        "ppc_keywords", "ppc_ad_groups", "ppc_campaigns",
        "brand_documents", "brand_timeline", "brand_approvals",
        "fba_shipment_items", "fba_shipments",
        "fbm_orders_items", "fbm_orders",
        "client_messages", "client_portal_users",
        "activity_logs", "scout_results", "weekly_reports",
        "suppliers", "products", "clients", "usage_counters",
        "profit_analyses", "account_health_snapshots", "account_violations",
        # Sprint Day 2 tier-gating + Keepa-cost tables. usage_counters is
        # owned by Stream A (tier_limits); org_keepa_usage by Stream B
        # (keepa_service). Both tests write rows that leak across runs
        # without explicit truncation.
        "usage_counters", "org_keepa_usage",
        # stripe_webhook_events is system-wide (no org_id) but tests rely on
        # a clean idempotency log across runs.
        "stripe_webhook_events",
        # Sprint Day 3 + Day 4 (Stream A) — email verification + onboarding
        # invites both have FK chains to users; truncate before users.
        "email_verification_tokens", "team_invites",
        "users", "organizations",
    ]
    with engine.connect() as conn:
        for t in tables:
            conn.execute(text(f"TRUNCATE TABLE public.{t} RESTART IDENTITY CASCADE;"))
        conn.commit()


@pytest.fixture
def client(db_session):
    """
    FastAPI TestClient with `get_db` overridden so route handlers see
    the same DB connection the tests prepared via two_tenants. Without
    the override, FastAPI would open a fresh SessionLocal per request
    and the test fixture's data — committed but on a different session
    — would still be visible (Postgres makes committed rows visible to
    every session); the override is mainly so tests can inspect the
    same in-flight transaction state if they need to.
    """
    from main import app
    from database import get_db

    def _override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    try:
        from fastapi.testclient import TestClient
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)
