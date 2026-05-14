"""Tests for the supplier CRUD endpoints — L1 in the Sprint 3 late
additions. Before this PR the routes were GET + POST only and the GET
response omitted `id`. The frontend (suppliers.js since BUG-23 in
Sprint 1) was calling PUT and DELETE against URLs that returned 405.

Coverage:
- GET /suppliers includes the `id` field in every row
- POST /suppliers writes an audit_logs row with action=supplier.create
- PUT /suppliers/{id} performs a partial update, re-derives
  priority_score when either rate is changed, and audits with
  before/after snapshots
- DELETE /suppliers/{id} removes the row and writes an audit row with
  the before-state captured pre-delete
- Cross-tenant PUT and DELETE both 404 (RLS isolation — a user from
  org B cannot mutate org A's supplier even with a guessed id)
"""
from __future__ import annotations

import json

import pytest

import models
from auth import hash_password, create_access_token


# ── Helpers ────────────────────────────────────────────────────────────────


def _make_org(db, *, name="Sup CRUD Co", plan="scout"):
    org = models.Organization(name=name, plan=plan, status="active")
    db.add(org)
    db.flush()
    return org


def _make_user(db, org, *, role="owner", username=None):
    u = models.User(
        org_id=org.id,
        username=username or f"u_{org.id}_{role}",
        email=f"{role}_{org.id}@sup-test.io",
        name=f"{role.title()} {org.id}",
        password_hash=hash_password("x"),
        role=role,
        avatar=role[0].upper(),
        is_active=True,
        email_verified=True,
    )
    db.add(u)
    db.flush()
    return u


def _make_supplier(db, org, *, name="Acme Supplier", response_rate=80.0, approval_rate=60.0):
    s = models.Supplier(
        org_id=org.id,
        name=name,
        brand="Acme",
        contact="sales@acme.test",
        response_rate=response_rate,
        approval_rate=approval_rate,
        priority_score=round(response_rate * 0.5 + approval_rate * 0.5, 2),
        notes="",
    )
    db.add(s)
    db.flush()
    return s


def _bearer(user, org):
    token = create_access_token({"user_id": user.id, "org_id": org.id})
    return {"Authorization": f"Bearer {token}"}


# ── GET response shape ─────────────────────────────────────────────────────


def test_get_suppliers_includes_id(client, db_session):
    org = _make_org(db_session)
    user = _make_user(db_session, org)
    s = _make_supplier(db_session, org)
    db_session.commit()

    resp = client.get("/suppliers", headers=_bearer(user, org))
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 1
    assert isinstance(body["suppliers"], list)
    row = body["suppliers"][0]
    # The bug L1 fixes: `id` was missing, so the frontend couldn't
    # build /suppliers/{id} URLs.
    assert row["id"] == s.id
    assert row["name"] == s.name


# ── POST audit ──────────────────────────────────────────────────────────────


def test_post_supplier_creates_audit_row(client, db_session):
    org = _make_org(db_session, name="Sup POST Audit Co")
    user = _make_user(db_session, org)
    db_session.commit()

    payload = {
        "name": "Beta Distribution", "brand": "Beta", "contact": "buyer@beta.io",
        "response_rate": 70, "approval_rate": 50, "notes": "Trial batch",
    }
    resp = client.post("/suppliers", json=payload, headers=_bearer(user, org))
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "saved"
    assert "id" in body["supplier"]
    new_id = body["supplier"]["id"]

    audit = db_session.query(models.AuditLog).filter(
        models.AuditLog.action == "supplier.create",
        models.AuditLog.resource_id == str(new_id),
    ).first()
    assert audit is not None
    assert audit.org_id == org.id


# ── PUT (happy path + partial update) ──────────────────────────────────────


def test_put_supplier_partial_update_audits_before_after(client, db_session):
    org = _make_org(db_session, name="Sup PUT Co")
    user = _make_user(db_session, org)
    s = _make_supplier(db_session, org, name="Initial Name", response_rate=80, approval_rate=60)
    db_session.commit()

    resp = client.put(
        f"/suppliers/{s.id}",
        json={"name": "Renamed Inc"},
        headers=_bearer(user, org),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "updated"
    assert body["supplier"]["id"] == s.id
    assert body["supplier"]["name"] == "Renamed Inc"
    # Untouched fields remain.
    assert body["supplier"]["brand"] == "Acme"
    assert body["supplier"]["response_rate"] == 80

    audit = db_session.query(models.AuditLog).filter(
        models.AuditLog.action == "supplier.update",
        models.AuditLog.resource_id == str(s.id),
    ).first()
    assert audit is not None
    before = json.loads(audit.before_json) if audit.before_json else {}
    after = json.loads(audit.after_json) if audit.after_json else {}
    assert before.get("name") == "Initial Name"
    assert after.get("name") == "Renamed Inc"


def test_put_supplier_rederives_priority_score(client, db_session):
    """priority_score = 0.5*response + 0.5*approval. Touching either
    rate must update the derived column."""
    org = _make_org(db_session, name="Sup PRIO Co")
    user = _make_user(db_session, org)
    s = _make_supplier(db_session, org, response_rate=80, approval_rate=60)
    # Initial: (80 + 60) / 2 = 70
    assert s.priority_score == 70
    db_session.commit()

    resp = client.put(
        f"/suppliers/{s.id}",
        json={"response_rate": 100, "approval_rate": 100},
        headers=_bearer(user, org),
    )
    assert resp.status_code == 200
    body = resp.json()
    # New: (100 + 100) / 2 = 100
    assert body["supplier"]["priority_score"] == 100


# ── DELETE ──────────────────────────────────────────────────────────────────


def test_delete_supplier_removes_row_and_audits(client, db_session):
    org = _make_org(db_session, name="Sup DELETE Co")
    user = _make_user(db_session, org)
    s = _make_supplier(db_session, org, name="Will Be Gone")
    db_session.commit()
    target_id = s.id

    resp = client.delete(f"/suppliers/{target_id}", headers=_bearer(user, org))
    assert resp.status_code == 200
    assert resp.json() == {"removed": 1}

    # Row is gone.
    still_there = db_session.query(models.Supplier).filter(models.Supplier.id == target_id).first()
    assert still_there is None

    # Audit row captured the before-state.
    audit = db_session.query(models.AuditLog).filter(
        models.AuditLog.action == "supplier.delete",
        models.AuditLog.resource_id == str(target_id),
    ).first()
    assert audit is not None
    before = json.loads(audit.before_json) if audit.before_json else {}
    assert before.get("name") == "Will Be Gone"


# ── Cross-tenant isolation ─────────────────────────────────────────────────


def test_put_other_orgs_supplier_returns_404(client, db_session):
    """RLS / tenant_session must block user-from-org-B from updating
    org-A's supplier — surface as 404, not 403, to avoid leaking
    existence."""
    org_a = _make_org(db_session, name="Org A — PUT iso")
    org_b = _make_org(db_session, name="Org B — PUT iso")
    user_b = _make_user(db_session, org_b, username="u_b_put_iso")
    s_a = _make_supplier(db_session, org_a, name="Org A secret supplier")
    db_session.commit()

    resp = client.put(
        f"/suppliers/{s_a.id}",
        json={"name": "Cross-tenant rename attempt"},
        headers=_bearer(user_b, org_b),
    )
    assert resp.status_code == 404

    # Verify org-A's row was untouched.
    db_session.refresh(s_a)
    assert s_a.name == "Org A secret supplier"


def test_delete_other_orgs_supplier_returns_404(client, db_session):
    org_a = _make_org(db_session, name="Org A — DEL iso")
    org_b = _make_org(db_session, name="Org B — DEL iso")
    user_b = _make_user(db_session, org_b, username="u_b_del_iso")
    s_a = _make_supplier(db_session, org_a, name="Org A — must survive")
    db_session.commit()

    resp = client.delete(f"/suppliers/{s_a.id}", headers=_bearer(user_b, org_b))
    assert resp.status_code == 404

    # Verify org-A's row still exists.
    still_there = db_session.query(models.Supplier).filter(models.Supplier.id == s_a.id).first()
    assert still_there is not None
