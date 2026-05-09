"""Tests for audit_logs.py + cron/audit_retention.py + cron/canceled_org_purge.py
— Sprint Day 6 (§3.4 + §2.2).

Coverage:
  - record_audit() persists a row scoped to the caller's org
  - record_audit() failure path is swallowed (no raise to caller)
  - GET /api/audit-logs returns 403 for manager/viewer
  - GET /api/audit-logs filters by org (cross-tenant data not visible)
  - audit_retention cron deletes scout-tier rows older than 7 days
  - audit_retention cron retains rows inside the window
  - canceled_org_purge cron skips entries whose purge_after is in the future
  - canceled_org_purge cron purges entries past their grace window

The cron tests use injected `now` so we don't have to mock datetime.
record_audit tests use a fake Request to avoid TestClient roundtrip
(record_audit is a library function, not a route).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

import models
from auth import hash_password


# ── Helpers ────────────────────────────────────────────────────────────────


def _make_org(db, *, plan="scout", status="active"):
    org = models.Organization(name=f"Audit Co {plan}", plan=plan, status=status)
    db.add(org)
    db.flush()
    return org


def _make_user(db, org, *, role="owner", username=None):
    u = models.User(
        org_id=org.id,
        username=username or f"u_{org.id}_{role}",
        email=f"{role}_{org.id}@audit-test.io",
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


def _fake_request(*, request_id="req-test-001", ip="10.0.0.1", ua="pytest"):
    """Minimal Request stand-in for record_audit() — only the attrs the
    helper reads (client.host, headers["user-agent"], state.request_id)."""
    return SimpleNamespace(
        client=SimpleNamespace(host=ip),
        headers={"user-agent": ua},
        state=SimpleNamespace(request_id=request_id),
    )


# ── record_audit() unit tests ──────────────────────────────────────────────


def test_record_audit_creates_entry(db_session):
    from audit_logs import record_audit

    org = _make_org(db_session)
    owner = _make_user(db_session, org)
    db_session.commit()

    record_audit(
        db_session,
        _fake_request(),
        owner,
        action="client.create",
        resource_type="client",
        resource_id="42",
        after={"name": "Acme"},
    )

    rows = (
        db_session.query(models.AuditLog)
        .filter(models.AuditLog.org_id == org.id)
        .all()
    )
    assert len(rows) == 1
    entry = rows[0]
    assert entry.action == "client.create"
    assert entry.resource_type == "client"
    assert entry.resource_id == "42"
    assert entry.user_id == owner.id
    assert entry.ip == "10.0.0.1"
    assert entry.request_id == "req-test-001"
    assert "Acme" in (entry.after_json or "")


def test_record_audit_swallows_failure(db_session):
    """A bad payload (non-serializable) should not raise to the caller —
    audit logging is best-effort."""
    from audit_logs import record_audit

    org = _make_org(db_session)
    owner = _make_user(db_session, org)
    db_session.commit()

    # SimpleNamespace is intentionally non-JSON-serializable in the
    # default encoder path; record_audit uses default=str so this still
    # works. Force a real failure by passing a bytes value the default
    # str() branch can encode but the JSON encoder rejects when it
    # encounters circular references.
    circular = {}
    circular["self"] = circular  # JSON cycle — json.dumps raises
    # Should not raise:
    record_audit(
        db_session,
        _fake_request(),
        owner,
        action="x.test",
        resource_type="x",
        after=circular,
    )


# ── Read endpoint role gating ──────────────────────────────────────────────


def test_audit_log_endpoint_requires_admin_role(client, db_session):
    """Manager-role caller hits /api/audit-logs → 403."""
    from main import app
    from auth import tenant_session

    org = _make_org(db_session)
    manager = _make_user(db_session, org, role="manager", username="mgr_audit")
    db_session.commit()

    app.dependency_overrides[tenant_session] = lambda: manager
    try:
        r = client.get("/api/audit-logs")
        assert r.status_code == 403
        assert "Owner or Admin" in r.json().get("detail", "")
    finally:
        app.dependency_overrides.pop(tenant_session, None)


def test_audit_log_endpoint_owner_can_read_own_org_only(client, db_session):
    """Owner sees their org's entries only — cross-tenant rows are filtered out."""
    from audit_logs import record_audit
    from main import app
    from auth import tenant_session

    org_a = _make_org(db_session)
    org_b = _make_org(db_session)
    owner_a = _make_user(db_session, org_a, username="owner_a")
    owner_b = _make_user(db_session, org_b, username="owner_b")
    db_session.commit()

    record_audit(
        db_session, _fake_request(), owner_a,
        action="client.create", resource_type="client", resource_id="1",
    )
    record_audit(
        db_session, _fake_request(), owner_b,
        action="client.create", resource_type="client", resource_id="99",
    )

    app.dependency_overrides[tenant_session] = lambda: owner_a
    try:
        r = client.get("/api/audit-logs")
        assert r.status_code == 200
        body = r.json()
        # Only org_a's row visible.
        assert body["total"] == 1
        assert body["entries"][0]["resource_id"] == "1"
    finally:
        app.dependency_overrides.pop(tenant_session, None)


# ── Retention cron ─────────────────────────────────────────────────────────


def test_audit_retention_purges_expired_for_scout_tier(db_session):
    """Scout tier = 7-day retention; 8-day-old entry is deleted."""
    from cron.audit_retention import purge_expired_audit_logs

    org = _make_org(db_session, plan="scout")
    owner = _make_user(db_session, org)
    db_session.commit()

    now = datetime.utcnow()
    old_entry = models.AuditLog(
        org_id=org.id, user_id=owner.id,
        action="x.old", resource_type="x",
        created_at=now - timedelta(days=8),
    )
    fresh_entry = models.AuditLog(
        org_id=org.id, user_id=owner.id,
        action="x.fresh", resource_type="x",
        created_at=now - timedelta(days=2),
    )
    db_session.add_all([old_entry, fresh_entry])
    db_session.commit()

    summary = purge_expired_audit_logs(now=now)
    assert summary["deleted"] >= 1

    remaining = (
        db_session.query(models.AuditLog)
        .filter(models.AuditLog.org_id == org.id)
        .all()
    )
    actions = {r.action for r in remaining}
    assert "x.old" not in actions
    assert "x.fresh" in actions


def test_audit_retention_respects_enterprise_window(db_session):
    """Enterprise tier = 365 days; 90-day-old entry is retained."""
    from cron.audit_retention import purge_expired_audit_logs

    org = _make_org(db_session, plan="enterprise")
    owner = _make_user(db_session, org)
    db_session.commit()

    now = datetime.utcnow()
    entry = models.AuditLog(
        org_id=org.id, user_id=owner.id,
        action="x.90d", resource_type="x",
        created_at=now - timedelta(days=90),
    )
    db_session.add(entry)
    db_session.commit()

    purge_expired_audit_logs(now=now)
    remaining = (
        db_session.query(models.AuditLog)
        .filter(models.AuditLog.org_id == org.id)
        .all()
    )
    assert len(remaining) == 1


# ── Canceled-org purge cron ────────────────────────────────────────────────


def test_canceled_org_purge_skips_when_grace_not_elapsed(db_session):
    """purge_after in the future → org and queue row both untouched."""
    from cron.canceled_org_purge import purge_canceled_orgs

    org = _make_org(db_session, status="canceled")
    db_session.commit()

    now = datetime.utcnow()
    queue = models.CanceledOrgPurgeQueue(
        org_id=org.id,
        canceled_at=now - timedelta(days=5),
        purge_after=now + timedelta(days=25),
        purge_status="pending",
    )
    db_session.add(queue)
    db_session.commit()

    summary = purge_canceled_orgs(now=now)
    assert summary["purged"] == 0

    # Org still exists; queue row still pending.
    org_still = db_session.query(models.Organization).filter_by(id=org.id).first()
    assert org_still is not None
    queue_still = (
        db_session.query(models.CanceledOrgPurgeQueue)
        .filter_by(org_id=org.id)
        .first()
    )
    assert queue_still.purge_status == "pending"


def test_canceled_org_purge_deletes_after_grace(db_session):
    """purge_after in the past → org deleted; queue row marked purged."""
    from cron.canceled_org_purge import purge_canceled_orgs

    org = _make_org(db_session, status="canceled")
    target_id = org.id
    db_session.commit()

    now = datetime.utcnow()
    queue = models.CanceledOrgPurgeQueue(
        org_id=target_id,
        canceled_at=now - timedelta(days=31),
        purge_after=now - timedelta(days=1),
        purge_status="pending",
    )
    db_session.add(queue)
    db_session.commit()

    summary = purge_canceled_orgs(now=now)
    assert summary["purged"] == 1

    # Org gone.
    assert (
        db_session.query(models.Organization).filter_by(id=target_id).first()
        is None
    )
    # Queue row preserved with status=purged so the audit trail of the
    # purge stays even after the org is deleted (no FK).
    db_session.expire_all()
    queue_row = (
        db_session.query(models.CanceledOrgPurgeQueue)
        .filter_by(org_id=target_id)
        .first()
    )
    assert queue_row is not None
    assert queue_row.purge_status == "purged"
    assert queue_row.purged_at is not None
