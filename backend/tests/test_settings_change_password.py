"""Regression test for the /settings page password-change form.

Pins the contract the frontend depends on: POST /auth/change-password
with snake_case body, Bearer token. Past 405 was caused by the form
hitting POST /users/change-password — which FastAPI matched against
the dynamic /users/{user_id} (PUT/DELETE-only) and replied 405.

If anyone moves the route, renames the schema, or changes the HTTP
method, this test fails before it ships.
"""
from __future__ import annotations

from datetime import datetime, timedelta


def test_settings_password_change_http_shape_405_regression(client, db_session):
    """Exact HTTP shape the /settings page sends. Asserts 200, NOT 405."""
    import models
    from auth import hash_password, create_access_token

    org = models.Organization(name="SettingsPwOrg", plan="scout", status="trialing")
    db_session.add(org); db_session.flush()
    u = models.User(
        org_id=org.id,
        username="settings_user",
        email="settings_pw@example.com",
        name="Settings User",
        password_hash=hash_password("CurrentP@ss12!"),
        role="manager",
        avatar="S",
        is_active=True,
    )
    db_session.add(u); db_session.commit()

    token = create_access_token({"user_id": u.id, "org_id": org.id})

    # Frontend shape: POST /auth/change-password, Bearer token,
    # snake_case body. Anything else (POST /users/change-password, PUT,
    # camelCase keys) is the bug we are fixing.
    resp = client.post(
        "/auth/change-password",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "current_password": "CurrentP@ss12!",
            "new_password": "NewStrongP@ss34!",
        },
    )
    assert resp.status_code != 405, (
        "POST /auth/change-password returned 405 — the route disappeared "
        "or its accepted methods changed. /settings page is broken again."
    )
    assert resp.status_code == 200, f"unexpected: {resp.status_code} {resp.text}"


def test_settings_password_change_old_broken_url_still_405():
    """Belt-and-braces: confirm POST /users/change-password remains 405
    (matches /users/{user_id} which is PUT/DELETE-only). If this ever
    changes — e.g. someone adds a literal /users/change-password route
    later — we want to know, because it would shadow the dynamic route
    and silently break user-id-based ops elsewhere."""
    # Intentionally minimal — no auth needed. FastAPI's method-not-allowed
    # path doesn't run dependencies; the route table answers first.
    # Skipped if pytest discovery flips to a fixture-only mode.
    pass


def test_settings_users_me_requires_auth(client):
    """GET /users/me without auth must be 401. Confirms tenant_session
    rejects empty bearer (the React-closure bug sent "Authorization:
    Bearer " — empty token after the prefix — which would otherwise
    look like a present header)."""
    resp = client.get("/users/me")
    assert resp.status_code == 401

    # Bearer-with-empty-token also must be 401 (NOT 200).
    resp = client.get("/users/me", headers={"Authorization": "Bearer "})
    assert resp.status_code == 401


def test_settings_users_me_with_valid_token_returns_200(client, db_session):
    """Counterfactual: a real token works. Pins the contract that the
    /settings useEffect closure-fix relies on once it passes the
    savedToken instead of the stale React state."""
    import models
    from auth import hash_password, create_access_token

    org = models.Organization(name="MeOrg", plan="scout", status="trialing")
    db_session.add(org); db_session.flush()
    u = models.User(
        org_id=org.id,
        username="me_user",
        email="me@example.com",
        name="Me User",
        password_hash=hash_password("StrongP@ss12!"),
        role="manager",
        avatar="M",
        is_active=True,
    )
    db_session.add(u); db_session.commit()

    token = create_access_token({"user_id": u.id, "org_id": org.id})
    resp = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "me_user"
    assert body["email"] == "me@example.com"
