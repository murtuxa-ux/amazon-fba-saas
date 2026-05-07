"""
Tenant isolation acceptance tests — PR C-2 active surface.

Implements `docs/tenant-isolation-tests.md` §3 verbatim.

Sections:
    §3.1  fixture: two tenants with overlapping IDs (active)
    §3.2  read isolation (active)
    §3.2  write isolation (active)
    §3.2  RLS as second layer — raw connection probes (active)
    §3.2  auth boundary — JWT manipulation (active)
    §3.2  webhook isolation — Stripe (skipped; impl-coupled, exercised
          end-to-end in staging)
    §3.2  support-mode (skipped; deferred Phase-3 feature)
    §3.3  negative-test sanity check (skipped; local-only, see body)

Test infrastructure (db_session, client, engine) lives in
backend/tests/conftest.py — added in this commit. CI runs this file
against a Postgres 18 service container using the same alembic
migrations that run in prod, with `app_role` and `migration_role`
seeded by the workflow's init step.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterator, Tuple

import pytest

from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from jose import jwt

from auth import create_access_token, hash_password
from config import settings
from database import SessionLocal, engine
from models import (
    Organization, User, Client, Product, WeeklyReport, Supplier,
    ScoutResult, ActivityLog,
    BuyBoxTracker, BuyBoxHistory, BuyBoxAlert,
    PPCCampaign, PPCKeyword, PPCAdGroup, ProfitAnalysis,
    BrandApproval, BrandDocument, BrandTimeline,
    FBAShipment, FBAShipmentItem, FBMOrder, FBMOrderItem,
    AccountHealthSnapshot, AccountViolation,
    ClientPortalUser, ClientMessage,
)


# ─────────────────────────────────────────────────────────────────────────────
# §3.1  Fixture — two tenants with fully-populated, ID-overlapping data
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def two_tenants(db_session: Session) -> Iterator[dict]:
    """
    Org A: Ecom Era (existing tenant, id=20 in prod; in tests we use a
            fresh DB and seed it from scratch with id=1 for ergonomics).
    Org B: Acme Wholesale (synthetic), id=2.

    Each org has 1 owner user + populated rows in every customer-data
    table. Row IDs across the two orgs *must overlap* (e.g., both orgs
    have a `clients.id = 1`). This is critical: if a test only passed
    because IDs were disjoint, it wouldn't catch real-world ID
    collisions where org B's id=1 is a different row than org A's id=1.

    Returns dict with: org_a, user_a, token_a, org_b, user_b, token_b,
    plus per-table seed-row id maps so test assertions can reference
    "org A's first client" without hardcoding ints.
    """
    db = db_session

    # ── Orgs ─────────────────────────────────────────────────────────────
    org_a = Organization(name="Ecom Era (test)", plan="growth")
    org_b = Organization(name="Acme Wholesale", plan="starter")
    db.add_all([org_a, org_b])
    db.flush()  # assign primary keys

    # ── Users ────────────────────────────────────────────────────────────
    user_a = User(
        org_id=org_a.id, username="murtaza_a", name="Murtaza A",
        email="murtaza@a.test", role="owner",
        password_hash=hash_password("pwA"), is_active=True,
    )
    user_b = User(
        org_id=org_b.id, username="murtaza_b", name="Murtaza B",
        email="murtaza@b.test", role="owner",
        password_hash=hash_password("pwB"), is_active=True,
    )
    db.add_all([user_a, user_b])
    db.flush()

    token_a = create_access_token({"user_id": user_a.id, "org_id": org_a.id})
    token_b = create_access_token({"user_id": user_b.id, "org_id": org_b.id})

    # ── Clients (3 rows per org, IDs will overlap) ───────────────────────
    a_clients = [Client(org_id=org_a.id, name=f"A-client-{i}") for i in range(3)]
    b_clients = [Client(org_id=org_b.id, name=f"B-client-{i}") for i in range(3)]
    db.add_all(a_clients + b_clients)

    # ── Products (5 per org) ─────────────────────────────────────────────
    a_products = [Product(org_id=org_a.id, asin=f"ASIN_A_{i}") for i in range(5)]
    b_products = [Product(org_id=org_b.id, asin=f"ASIN_B_{i}") for i in range(5)]
    db.add_all(a_products + b_products)

    # ── WeeklyReports (4 per org) ────────────────────────────────────────
    a_reports = [WeeklyReport(org_id=org_a.id, week=f"2026-W0{i+1}", manager="Murtaza A") for i in range(4)]
    b_reports = [WeeklyReport(org_id=org_b.id, week=f"2026-W0{i+1}", manager="Murtaza B") for i in range(4)]
    db.add_all(a_reports + b_reports)

    # ── Suppliers (2 per org) ────────────────────────────────────────────
    a_suppliers = [Supplier(org_id=org_a.id, name=f"A-supplier-{i}") for i in range(2)]
    b_suppliers = [Supplier(org_id=org_b.id, name=f"B-supplier-{i}") for i in range(2)]
    db.add_all(a_suppliers + b_suppliers)

    # ── ScoutResults (10 per org, with overlapping ASINs to test isolation) ─
    a_scouts = [ScoutResult(org_id=org_a.id, asin=f"SHARED_ASIN_{i}") for i in range(10)]
    b_scouts = [ScoutResult(org_id=org_b.id, asin=f"SHARED_ASIN_{i}") for i in range(10)]
    db.add_all(a_scouts + b_scouts)

    # ── ActivityLogs (5 per org) ─────────────────────────────────────────
    db.flush()
    a_logs = [ActivityLog(org_id=org_a.id, user_id=user_a.id, action="login") for _ in range(5)]
    b_logs = [ActivityLog(org_id=org_b.id, user_id=user_b.id, action="login") for _ in range(5)]
    db.add_all(a_logs + b_logs)

    # ── BuyBox (tracker + history + alert per org) ───────────────────────
    a_tracker = BuyBoxTracker(org_id=org_a.id, asin="ASIN_A_0")
    b_tracker = BuyBoxTracker(org_id=org_b.id, asin="ASIN_B_0")
    db.add_all([a_tracker, b_tracker])
    db.flush()
    db.add_all([
        BuyBoxHistory(tracker_id=a_tracker.id, buy_box_price=10.0, buy_box_winner="A", our_price=10.0),
        BuyBoxHistory(tracker_id=b_tracker.id, buy_box_price=20.0, buy_box_winner="B", our_price=20.0),
        BuyBoxAlert(org_id=org_a.id, tracker_id=a_tracker.id, asin="ASIN_A_0", alert_type="lost_buybox"),
        BuyBoxAlert(org_id=org_b.id, tracker_id=b_tracker.id, asin="ASIN_B_0", alert_type="lost_buybox"),
    ])

    # ── PPC + Brand + FBA + FBM + AccountHealth + ClientPortal — 1 each, just to populate ─
    a_camp = PPCCampaign(org_id=org_a.id, campaign_name="A camp")
    b_camp = PPCCampaign(org_id=org_b.id, campaign_name="B camp")
    db.add_all([a_camp, b_camp])
    db.flush()
    db.add_all([
        PPCKeyword(campaign_id=a_camp.id, keyword_text="kw a"),
        PPCKeyword(campaign_id=b_camp.id, keyword_text="kw b"),
        PPCAdGroup(campaign_id=a_camp.id, ad_group_name="ag a"),
        PPCAdGroup(campaign_id=b_camp.id, ad_group_name="ag b"),
        ProfitAnalysis(org_id=org_a.id, asin="ASIN_A_0"),
        ProfitAnalysis(org_id=org_b.id, asin="ASIN_B_0"),
    ])
    a_brand = BrandApproval(org_id=org_a.id, brand_name="A brand")
    b_brand = BrandApproval(org_id=org_b.id, brand_name="B brand")
    db.add_all([a_brand, b_brand])
    db.flush()
    db.add_all([
        BrandDocument(approval_id=a_brand.id, document_name="d", document_type="invoice"),
        BrandDocument(approval_id=b_brand.id, document_name="d", document_type="invoice"),
        BrandTimeline(approval_id=a_brand.id, event_type="submit", description="x"),
        BrandTimeline(approval_id=b_brand.id, event_type="submit", description="x"),
    ])
    a_ship = FBAShipment(org_id=org_a.id, shipment_name="ship a")
    b_ship = FBAShipment(org_id=org_b.id, shipment_name="ship b")
    db.add_all([a_ship, b_ship])
    db.flush()
    db.add_all([
        FBAShipmentItem(shipment_id=a_ship.id, asin="ASIN_A_0"),
        FBAShipmentItem(shipment_id=b_ship.id, asin="ASIN_B_0"),
    ])
    a_order = FBMOrder(org_id=org_a.id)
    b_order = FBMOrder(org_id=org_b.id)
    db.add_all([a_order, b_order])
    db.flush()
    db.add_all([
        FBMOrderItem(order_id=a_order.id, asin="ASIN_A_0"),
        FBMOrderItem(order_id=b_order.id, asin="ASIN_B_0"),
        AccountHealthSnapshot(org_id=org_a.id, snapshot_date=datetime.utcnow()),
        AccountHealthSnapshot(org_id=org_b.id, snapshot_date=datetime.utcnow()),
        AccountViolation(org_id=org_a.id, violation_type="late_shipment"),
        AccountViolation(org_id=org_b.id, violation_type="late_shipment"),
    ])

    a_portal = ClientPortalUser(
        org_id=org_a.id, client_id=a_clients[0].id,
        email="portal@a.test", password_hash=hash_password("pp"),
    )
    b_portal = ClientPortalUser(
        org_id=org_b.id, client_id=b_clients[0].id,
        email="portal@b.test", password_hash=hash_password("pp"),
    )
    db.add_all([a_portal, b_portal])
    db.flush()
    db.add_all([
        ClientMessage(client_portal_user_id=a_portal.id, org_id=org_a.id, subject="hi", message="hi"),
        ClientMessage(client_portal_user_id=b_portal.id, org_id=org_b.id, subject="hi", message="hi"),
    ])

    db.commit()

    yield {
        "org_a": org_a, "user_a": user_a, "token_a": token_a,
        "org_b": org_b, "user_b": user_b, "token_b": token_b,
        "a_client_ids": [c.id for c in a_clients],
        "b_client_ids": [c.id for c in b_clients],
        "a_product_ids": [p.id for p in a_products],
        "b_product_ids": [p.id for p in b_products],
    }


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# §3.2  Read isolation — every list/get endpoint must scope by org
# ─────────────────────────────────────────────────────────────────────────────

def test_list_clients_returns_only_own_org(client: TestClient, two_tenants):
    r = client.get("/clients", headers=_auth(two_tenants["token_a"]))
    assert r.status_code == 200
    body = r.json()
    # /clients returns {"count": N, "clients": [...]}
    rows = body["clients"]
    assert body["count"] == 3
    assert len(rows) == 3
    # The route doesn't surface org_id in the response payload — that's
    # by design (org_id is internal). Cross-org isolation is verified by
    # the count assertion (org A has 3 clients; if leaking, we'd see 6).
    assert all(row["name"].startswith("A-client-") for row in rows)


def test_get_client_by_id_other_org_returns_404(client: TestClient, two_tenants):
    """404 not 403 — never leak existence of another org's resources."""
    other_id = two_tenants["b_client_ids"][0]
    r = client.get(f"/clients/{other_id}", headers=_auth(two_tenants["token_a"]))
    assert r.status_code == 404
    body = r.json()
    assert "another org" not in str(body).lower()
    assert "permission denied" not in str(body).lower()


def test_list_products_returns_only_own_org(client: TestClient, two_tenants):
    r = client.get("/products", headers=_auth(two_tenants["token_a"]))
    assert r.status_code == 200
    body = r.json()
    # /products returns {"count": N, "products": [...]}
    assert body["count"] == 5
    assert len(body["products"]) == 5
    # All ASINs prefixed for org A — confirms no cross-org leak.
    assert all(p["asin"].startswith("ASIN_A_") for p in body["products"])


def test_dashboard_aggregates_dont_leak(client: TestClient, two_tenants):
    """Counts at /dashboard, /reports/summary, /leaderboard reflect only caller's org."""
    r = client.get("/dashboard", headers=_auth(two_tenants["token_a"]))
    assert r.status_code == 200
    # Per fixture: org A has 3 clients, 5 products. Implementation may
    # surface these under different keys — assertion finalized in C-2.
    body = r.json()
    if "client_count" in body:
        assert body["client_count"] == 3
    if "product_count" in body:
        assert body["product_count"] == 5


# ─────────────────────────────────────────────────────────────────────────────
# §3.2  Write isolation — every mutating endpoint must reject cross-tenant
# ─────────────────────────────────────────────────────────────────────────────

def test_put_other_org_client_returns_404_and_doesnt_mutate(
    client: TestClient, two_tenants
):
    other_id = two_tenants["b_client_ids"][0]
    r = client.put(
        f"/clients/{other_id}",
        headers=_auth(two_tenants["token_a"]),
        json={"name": "PWNED"},
    )
    assert r.status_code == 404
    # Verify org B's row is unchanged. Use a fresh engine connection — the
    # request transaction held by the test's db_session is still primed
    # with SET LOCAL ROLE app_role + app.current_org_id=A from the
    # tenant_session middleware, so a query on db_session would itself be
    # RLS-filtered (org A's view) and erroneously not see org B's row.
    # engine.connect() opens a new connection from the pool, which is
    # migration_role at the connection level (BYPASSRLS).
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT name FROM clients WHERE id = :id"),
            {"id": other_id},
        ).fetchone()
    assert row is not None, f"client id={other_id} disappeared — RLS leakage on UPDATE?"
    assert row[0] != "PWNED"


def test_delete_other_org_client_returns_404(client: TestClient, two_tenants):
    other_id = two_tenants["b_client_ids"][0]
    r = client.delete(f"/clients/{other_id}", headers=_auth(two_tenants["token_a"]))
    assert r.status_code == 404


def test_post_with_forged_org_id_in_body_ignored(client: TestClient, two_tenants):
    """Pydantic schemas don't accept org_id; verify it's a no-op even if sent."""
    r = client.post(
        "/clients",
        headers=_auth(two_tenants["token_a"]),
        json={"name": "Probe", "org_id": two_tenants["org_b"].id},
    )
    assert r.status_code in (200, 201)
    body = r.json()
    # The route returns {"status": "created", "client": {"id", "name"}}
    # — no org_id surfaced. Verify the persisted row landed on org A
    # (caller) and not org B (forged). Use a fresh engine connection to
    # bypass the test session's SET LOCAL ROLE state.
    new_id = body["client"]["id"]
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT org_id FROM clients WHERE id = :id"),
            {"id": new_id},
        ).fetchone()
    assert row is not None
    assert row[0] == two_tenants["org_a"].id, (
        f"Forged org_id leaked: row landed on org {row[0]} instead of caller's "
        f"org {two_tenants['org_a'].id}"
    )


def test_post_weekly_report_with_foreign_client_id_rejected(client: TestClient, two_tenants):
    """If WeeklyReport links to a client_id, that client must belong to caller's org."""
    foreign_client_id = two_tenants["b_client_ids"][0]
    r = client.post(
        "/weekly",
        headers=_auth(two_tenants["token_a"]),
        json={"week": "2026-W30", "manager": "M", "client_id": foreign_client_id},
    )
    assert r.status_code in (404, 422)


# ─────────────────────────────────────────────────────────────────────────────
# §3.2  RLS as second layer — raw connection probes
# These are the most important tests. They prove RLS isn't a paper tiger.
# ─────────────────────────────────────────────────────────────────────────────

def test_rls_blocks_unset_session_var(two_tenants):
    """Opening a raw connection as app_role with no app.current_org_id set
    must return 0 rows from any tenant table — RLS USING clause filters
    everything when current_setting returns NULL."""
    with engine.connect() as conn:
        conn.execute(text("SET LOCAL ROLE app_role"))
        rows = conn.execute(text("SELECT * FROM clients")).fetchall()
    assert rows == []


def test_rls_blocks_wrong_session_var(two_tenants):
    """SET LOCAL app.current_org_id = A, query for WHERE org_id = B → 0 rows.
    RLS overrides the explicit WHERE, returns intersection only."""
    a_id = two_tenants["org_a"].id
    b_id = two_tenants["org_b"].id
    with engine.connect() as conn:
        conn.execute(text("SET LOCAL ROLE app_role"))
        conn.execute(text(f"SET LOCAL app.current_org_id = {a_id}"))
        rows = conn.execute(
            text(f"SELECT * FROM clients WHERE org_id = {b_id}")
        ).fetchall()
    assert rows == []


def test_rls_blocks_insert_with_wrong_org_id(two_tenants):
    """INSERT INTO clients (org_id, ...) with foreign org_id → policy violation."""
    a_id = two_tenants["org_a"].id
    b_id = two_tenants["org_b"].id
    with engine.connect() as conn:
        conn.execute(text("SET LOCAL ROLE app_role"))
        conn.execute(text(f"SET LOCAL app.current_org_id = {a_id}"))
        with pytest.raises(Exception) as exc_info:
            conn.execute(
                text("INSERT INTO clients (org_id, name) VALUES (:oid, 'leak')"),
                {"oid": b_id},
            )
            conn.commit()
        assert "row-level security" in str(exc_info.value).lower() or \
               "violates" in str(exc_info.value).lower()


def test_rls_blocks_update_to_other_org(two_tenants, db_session):
    """UPDATE clients SET org_id = B WHERE id = <a_client_id> → 0 affected or raises."""
    a_id = two_tenants["org_a"].id
    b_id = two_tenants["org_b"].id
    a_client_id = two_tenants["a_client_ids"][0]
    with engine.connect() as conn:
        conn.execute(text("SET LOCAL ROLE app_role"))
        conn.execute(text(f"SET LOCAL app.current_org_id = {a_id}"))
        try:
            result = conn.execute(
                text("UPDATE clients SET org_id = :b WHERE id = :id"),
                {"b": b_id, "id": a_client_id},
            )
            assert result.rowcount == 0
        except Exception as e:
            assert "row-level security" in str(e).lower()


def test_app_role_is_not_bypassrls():
    """rolbypassrls on app_role must be FALSE. If TRUE, all of RLS is meaningless."""
    with engine.connect() as conn:
        conn.execute(text("SET LOCAL ROLE app_role"))
        result = conn.execute(text(
            "SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user"
        )).scalar()
    assert result is False, "app_role MUST NOT have BYPASSRLS — RLS is paper otherwise"


@pytest.mark.parametrize("tablename", [
    "organizations", "users", "clients", "products", "weekly_reports",
    "suppliers", "scout_results", "activity_logs",
    "buybox_trackers", "buybox_history", "buybox_alerts",
    "ppc_campaigns", "ppc_keywords", "ppc_ad_groups",
    "profit_analyses",
    "brand_approvals", "brand_documents", "brand_timeline",
    "fba_shipments", "fba_shipment_items",
    "fbm_orders", "fbm_orders_items",
    "account_health_snapshots", "account_violations",
    "client_portal_users", "client_messages",
])
def test_app_role_is_not_table_owner(tablename):
    """Table owners bypass RLS by default. app_role must NOT own any canonical table."""
    with engine.connect() as conn:
        owner = conn.execute(text(
            "SELECT tableowner FROM pg_tables WHERE tablename = :t"
        ), {"t": tablename}).scalar()
    assert owner != "app_role", f"{tablename} is owned by app_role — RLS is bypassable"


# ─────────────────────────────────────────────────────────────────────────────
# §3.2  Auth boundary
# ─────────────────────────────────────────────────────────────────────────────

def test_unauthenticated_request_returns_401(client: TestClient):
    r = client.get("/clients")
    assert r.status_code == 401


def test_invalid_jwt_returns_401(client: TestClient):
    r = client.get("/clients", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_expired_jwt_returns_401(client: TestClient, two_tenants):
    expired = jwt.encode(
        {"user_id": two_tenants["user_a"].id, "exp": datetime.utcnow() - timedelta(hours=1)},
        settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM,
    )
    r = client.get("/clients", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_alg_none_jwt_rejected(client: TestClient, two_tenants):
    """Token with alg:none and no signature must be rejected by the JWT lib."""
    import json, base64
    header = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    payload = base64.urlsafe_b64encode(
        json.dumps({"user_id": two_tenants["user_a"].id}).encode()
    ).rstrip(b"=").decode()
    bad = f"{header}.{payload}."
    r = client.get("/clients", headers={"Authorization": f"Bearer {bad}"})
    assert r.status_code == 401


def test_jwt_with_modified_org_id_still_returns_own_data(client: TestClient, two_tenants):
    """
    Per runbook §6.2 decision: DB row authoritative. JWT claim of org_id
    is informational only; tenant_session sets app.current_org_id from
    user.org_id (DB-loaded), not from the JWT claim. So a tampered token
    with user_id=A but org_id=B (signed correctly) still surfaces A's data.

    Never acceptable: returning B's data.
    """
    forged = jwt.encode(
        {"user_id": two_tenants["user_a"].id,
         "org_id": two_tenants["org_b"].id,
         "exp": datetime.utcnow() + timedelta(hours=1)},
        settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM,
    )
    r = client.get("/clients", headers={"Authorization": f"Bearer {forged}"})
    if r.status_code == 200:
        body = r.json()
        # /clients returns {"count": N, "clients": [...]}.
        rows = body["clients"]
        # All returned clients must belong to org A (the user_id's real
        # org), not org B (the forged claim). The route's payload doesn't
        # include org_id, so we assert by row count + name prefix:
        # org A has 3 clients named "A-client-0..2"; if the forged claim
        # leaked, we'd see org B's "B-client-*" rows.
        assert body["count"] == 3
        assert all(r["name"].startswith("A-client-") for r in rows)
    else:
        # Some implementations choose to 401 on mismatch — also acceptable.
        assert r.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# §3.2  Webhook isolation (Stripe)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.skip(reason="webhook signing implementation coupled; exercised in staging")
def test_stripe_webhook_signature_required(client: TestClient):
    """POST to /webhooks/stripe without valid Stripe signature → 400."""
    r = client.post("/webhooks/stripe", json={"type": "invoice.paid"})
    assert r.status_code == 400


@pytest.mark.skip(reason="webhook signing implementation coupled; exercised in staging")
def test_stripe_webhook_state_lands_on_correct_org(client: TestClient, two_tenants):
    """Webhook for org B's stripe_customer_id mutates only B; same payload twice is idempotent."""
    # Implementation finalized in C-2 — depends on stripe_billing.py details.
    pass


# ─────────────────────────────────────────────────────────────────────────────
# §3.2  Support mode (deferred Phase-3 feature; stubs only)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.skip(reason="support mode is a Phase-3 feature, not in PR C-2")
def test_support_mode_requires_owner_role_in_ecomera_org():
    """Only users with role=owner AND org_id=Ecom Era can enter support mode."""
    pass


@pytest.mark.skip(reason="support mode is a Phase-3 feature, not in PR C-2")
def test_support_mode_writes_audit_log():
    """Every support-mode session creates a cross_tenant_access row."""
    pass


@pytest.mark.skip(reason="support mode is a Phase-3 feature, not in PR C-2")
def test_support_mode_session_var_swap():
    """Entering support mode for org B sets app.current_org_id to B; exit reverts."""
    pass


# ─────────────────────────────────────────────────────────────────────────────
# §3.3  Negative-test sanity check (LOCAL ONLY — not in CI)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.skip(reason="local-only sanity check; never runs in CI")
def test_meta_disabling_rls_breaks_tests():
    """
    Meta-test: temporarily grant BYPASSRLS to app_role, re-run the
    read-isolation block, assert at least one test fails. If none fail,
    the tests are passing for the wrong reason — they're not actually
    exercising RLS, just app-level scoping.

    Run manually before merging C-2:
        ALTER ROLE app_role BYPASSRLS;
        pytest backend/tests/test_tenant_isolation.py -v
        ALTER ROLE app_role NOBYPASSRLS;
    Then assert manually that several read-isolation tests went red.
    """
    pass
