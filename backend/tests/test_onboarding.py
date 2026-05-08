"""Tests for backend/onboarding.py — post-signup wizard (§2.3).

Coverage:
  - GET /progress returns current_step=1, completed=False for fresh users.
  - PUT /progress advances step idempotently. step=4 sets completed_at.
  - POST /skip-all marks completed and jumps step to 4.
  - POST /invite (Owner) creates a TeamInvite row + returns success.
  - POST /invite (Manager) returns 403 — role-gated to Owner/Admin.
  - POST /invite returns 402 when org is at scout-tier user cap (3 users).
  - POST /invite is idempotent on (org, email) for pending invites.
  - POST /invite rejects emails that match an existing User globally.
  - POST /accept-invite/{token} returns invite metadata pre-auth.
  - POST /accept-invite rejects expired and used tokens with 400.
  - POST /accept-invite is idempotent — same token can be looked up twice
    without burning it (frontend may refresh the accept page).

Auth strategy: tests build a User+Org directly via db_session, mint a JWT
via auth.create_access_token, and call the route with Authorization
header. Same pattern test_tenant_isolation.py uses.

Email side-effects: every test sets EMAIL_DISABLED=true via monkeypatch
so the route's _send_invite_email() is a no-op. We're testing wiring, not
Resend.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta

import pytest


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@pytest.fixture(autouse=True)
def _disable_email(monkeypatch):
    """Skip every Resend call in onboarding.py during these tests."""
    from config import settings
    monkeypatch.setattr(settings, "EMAIL_DISABLED", True)


def _make_org_owner(db_session, *, plan: str = "growth", username: str = "owner1"):
    """Seed Org + Owner user. Returns (org, user, token)."""
    import models
    from auth import hash_password, create_access_token

    org = models.Organization(
        name=f"Org for {username}",
        plan=plan,
        status="trialing",
    )
    db_session.add(org)
    db_session.flush()

    user = models.User(
        org_id=org.id,
        username=username,
        email=f"{username}@onboard-test.io",
        name=username.title(),
        password_hash=hash_password("TestPass123"),
        role="owner",
        avatar=username[0].upper(),
        is_active=True,
        email_verified=True,
        onboarding_completed=False,
        onboarding_step=1,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token({"user_id": user.id, "org_id": org.id})
    return org, user, token


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── /progress ────────────────────────────────────────────────────────────────


def test_progress_starts_at_step_1(client, db_session):
    _, _, tok = _make_org_owner(db_session)
    resp = client.get("/api/onboarding/progress", headers=_auth(tok))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["current_step"] == 1
    assert body["completed"] is False
    assert body["completed_at"] is None


def test_advance_step_increments_progress(client, db_session):
    _, _, tok = _make_org_owner(db_session)
    resp = client.put(
        "/api/onboarding/progress",
        headers=_auth(tok),
        json={"step": 1},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["current_step"] == 2
    assert resp.json()["completed"] is False


def test_completing_step_4_marks_completed(client, db_session):
    _, _, tok = _make_org_owner(db_session)
    resp = client.put(
        "/api/onboarding/progress",
        headers=_auth(tok),
        json={"step": 4},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["completed"] is True
    assert body["completed_at"] is not None
    assert body["current_step"] == 4


def test_advance_step_does_not_rewind(client, db_session):
    """Re-PUTting an earlier step doesn't rewind a user already past it."""
    _, _, tok = _make_org_owner(db_session)
    client.put("/api/onboarding/progress", headers=_auth(tok), json={"step": 3})
    resp = client.put(
        "/api/onboarding/progress",
        headers=_auth(tok),
        json={"step": 1},
    )
    # step was 4 (after 3+1); a stale PUT step=1 must NOT drop us back to 2
    assert resp.json()["current_step"] == 4


def test_skip_all_marks_completed(client, db_session):
    _, _, tok = _make_org_owner(db_session)
    resp = client.post("/api/onboarding/skip-all", headers=_auth(tok))
    assert resp.status_code == 200
    progress = client.get("/api/onboarding/progress", headers=_auth(tok)).json()
    assert progress["completed"] is True
    assert progress["current_step"] == 4


# ── /invite ──────────────────────────────────────────────────────────────────


def test_invite_creates_pending_team_invite(client, db_session):
    import models
    org, _, tok = _make_org_owner(db_session, plan="growth")
    resp = client.post(
        "/api/onboarding/invite",
        headers=_auth(tok),
        json={"email": "newmate@onboard-test.io", "role": "manager"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True

    invite = (
        db_session.query(models.TeamInvite)
        .filter_by(email="newmate@onboard-test.io")
        .first()
    )
    assert invite is not None
    assert invite.org_id == org.id
    assert invite.role == "manager"
    assert invite.token_hash  # not the plaintext
    assert invite.used_at is None


def test_invite_blocked_for_manager_role(client, db_session):
    """role-gated to Owner/Admin: a Manager invite call is 403."""
    import models
    from auth import create_access_token

    org = models.Organization(name="Mgr Org", plan="growth", status="trialing")
    db_session.add(org)
    db_session.flush()
    mgr = models.User(
        org_id=org.id,
        username="mgr1",
        email="mgr1@onboard-test.io",
        name="Manager One",
        password_hash="x",
        role="manager",
        is_active=True,
        email_verified=True,
    )
    db_session.add(mgr)
    db_session.commit()
    tok = create_access_token({"user_id": mgr.id, "org_id": org.id})

    resp = client.post(
        "/api/onboarding/invite",
        headers=_auth(tok),
        json={"email": "noone@onboard-test.io", "role": "viewer"},
    )
    assert resp.status_code == 403


def test_invite_blocked_at_scout_user_cap(client, db_session):
    """Scout tier max_users=3: with 3 users seeded, the 4th invite is 402."""
    import models
    from auth import create_access_token, hash_password

    org = models.Organization(name="Capped Co", plan="scout", status="active")
    db_session.add(org)
    db_session.flush()
    owner = models.User(
        org_id=org.id, username="capowner", email="cap@onboard-test.io",
        name="Cap Owner", password_hash=hash_password("x"), role="owner",
        is_active=True, email_verified=True,
    )
    db_session.add(owner)
    # Seed 2 more users so the org is at the 3-user cap.
    db_session.add_all([
        models.User(
            org_id=org.id, username=f"u{i}", email=f"u{i}@cap-test.io",
            name=f"U{i}", password_hash="x", role="manager",
            is_active=True, email_verified=True,
        )
        for i in range(2)
    ])
    db_session.commit()
    tok = create_access_token({"user_id": owner.id, "org_id": org.id})

    resp = client.post(
        "/api/onboarding/invite",
        headers=_auth(tok),
        json={"email": "fourth@cap-test.io", "role": "manager"},
    )
    assert resp.status_code == 402
    assert "Tier limit" in resp.json()["detail"]


def test_invite_rejects_existing_email(client, db_session):
    """User.email is globally UNIQUE — invite to an existing user is 400."""
    import models
    org, owner, tok = _make_org_owner(db_session, plan="growth")
    db_session.add(models.User(
        org_id=org.id, username="existing",
        email="existing@onboard-test.io",
        name="Existing", password_hash="x", role="manager",
        is_active=True, email_verified=True,
    ))
    db_session.commit()

    resp = client.post(
        "/api/onboarding/invite",
        headers=_auth(tok),
        json={"email": "existing@onboard-test.io", "role": "manager"},
    )
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"].lower()


def test_invite_is_idempotent_for_pending_email(client, db_session):
    """Two invites to the same email coalesce — only one TeamInvite row."""
    import models
    _, _, tok = _make_org_owner(db_session, plan="growth")

    a = client.post(
        "/api/onboarding/invite",
        headers=_auth(tok),
        json={"email": "twice@onboard-test.io", "role": "manager"},
    )
    b = client.post(
        "/api/onboarding/invite",
        headers=_auth(tok),
        json={"email": "twice@onboard-test.io", "role": "manager"},
    )
    assert a.status_code == 200
    assert b.status_code == 200

    rows = (
        db_session.query(models.TeamInvite)
        .filter_by(email="twice@onboard-test.io")
        .all()
    )
    assert len(rows) == 1


# ── /accept-invite ───────────────────────────────────────────────────────────


def _seed_invite(db_session, *, plaintext: str, expires_at, used_at=None):
    """Helper: create an Org + a TeamInvite with a known plaintext token."""
    import models

    org = models.Organization(name="Invite Org", plan="growth", status="trialing")
    db_session.add(org)
    db_session.flush()

    invite = models.TeamInvite(
        org_id=org.id,
        inviter_user_id=None,
        email="invitee@onboard-test.io",
        role="manager",
        token_hash=_hash(plaintext),
        expires_at=expires_at,
        used_at=used_at,
    )
    db_session.add(invite)
    db_session.commit()
    return org, invite


def test_accept_invite_returns_metadata_pre_auth(client, db_session):
    plaintext = "valid-invite-token-1234567890"
    org, _ = _seed_invite(
        db_session,
        plaintext=plaintext,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    resp = client.post(f"/api/onboarding/accept-invite/{plaintext}")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    assert body["email"] == "invitee@onboard-test.io"
    assert body["role"] == "manager"
    assert body["org_id"] == org.id
    assert body["org_name"] == "Invite Org"


def test_accept_invite_rejects_expired_token(client, db_session):
    plaintext = "expired-invite-token-abc"
    _seed_invite(
        db_session,
        plaintext=plaintext,
        expires_at=datetime.utcnow() - timedelta(hours=1),
    )
    resp = client.post(f"/api/onboarding/accept-invite/{plaintext}")
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


def test_accept_invite_rejects_used_token(client, db_session):
    plaintext = "used-invite-token-xyz"
    _seed_invite(
        db_session,
        plaintext=plaintext,
        expires_at=datetime.utcnow() + timedelta(days=7),
        used_at=datetime.utcnow(),
    )
    resp = client.post(f"/api/onboarding/accept-invite/{plaintext}")
    assert resp.status_code == 400
    assert "already" in resp.json()["detail"].lower()


def test_accept_invite_unknown_token_returns_400(client):
    resp = client.post("/api/onboarding/accept-invite/no-such-token-anywhere")
    assert resp.status_code == 400


def test_accept_invite_is_idempotent(client, db_session):
    """Refreshing the accept page must NOT consume the token."""
    import models
    plaintext = "refresh-safe-token-9999"
    _, _ = _seed_invite(
        db_session,
        plaintext=plaintext,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    a = client.post(f"/api/onboarding/accept-invite/{plaintext}")
    b = client.post(f"/api/onboarding/accept-invite/{plaintext}")
    assert a.status_code == 200
    assert b.status_code == 200
    # used_at still NULL — actual consumption happens in the signup-from-invite
    # flow, not on accept-invite.
    invite = (
        db_session.query(models.TeamInvite)
        .filter_by(token_hash=_hash(plaintext))
        .first()
    )
    assert invite.used_at is None
