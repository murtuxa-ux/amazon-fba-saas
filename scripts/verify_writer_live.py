"""Manual smoke test for the multi_user_access record_audit() writers.

Triggers PUT /user-management/profile against prod (same-name no-op so
nothing actually changes), then reads /api/audit-logs and confirms a
row landed with the expected action, user_id, resource_type, and
before_json / after_json populated.

NOT wired into CI — it requires real prod credentials and writes a
real (no-op) audit row. Run manually after any PR that touches:
  - backend/audit_logs.py (record_audit() signature/behavior)
  - the 7 user-management writers in backend/multi_user_access.py
    (create_user / update_user / deactivate_user / reset_user_password
     / update_profile / change_password / toggle_user_active)

Usage:
  python scripts/verify_writer_live.py

Override the default seed creds with env vars if rotated:
  AUDIT_USERNAME, AUDIT_PASSWORD (or AUDIT_JWT for a pre-minted token)
"""

import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE = "https://amazon-fba-saas-production.up.railway.app"
USERNAME = os.environ.get("AUDIT_USERNAME", "murtaza")
PASSWORD = os.environ.get("AUDIT_PASSWORD", "Admin@2024")
PRESET_JWT = os.environ.get("AUDIT_JWT", "").strip()


def request(method, path, token=None, body=None, form=False):
    url = BASE + path
    headers = {}
    data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        if form:
            data = urllib.parse.urlencode(body).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def main():
    if PRESET_JWT:
        print("[1/4] Using AUDIT_JWT from env (skipping login).")
        token = PRESET_JWT
    else:
        print(f"[1/4] Login as {USERNAME}…")
        s, body = request("POST", "/auth/login", body={"username": USERNAME, "password": PASSWORD})
        if s != 200:
            print(f"  ! login failed: HTTP {s} body={body[:200]}")
            sys.exit(1)
        parsed = json.loads(body)
        token = parsed.get("access_token") or parsed.get("token") or parsed.get("jwt")
        if not token:
            print(f"  ! login response had no token. keys={list(parsed.keys())} body={body[:300]}")
            sys.exit(1)
        print(f"  ok (token len={len(token)})")

    print("[2/4] GET /users/me to capture baseline profile…")
    s, body = request("GET", "/users/me", token=token)
    if s != 200:
        print(f"  ! /users/me failed: HTTP {s}"); sys.exit(1)
    me = json.loads(body)
    print(f"  user_id={me['id']} name={me['name']!r} email={me['email']!r}")

    trigger_started = datetime.now(timezone.utc).replace(microsecond=0)
    print(f"[3/4] PUT /user-management/profile (same name = no-op mutation, writer still fires)…")
    s, body = request("PUT", "/user-management/profile", token=token, body={"name": me["name"]})
    if s != 200:
        print(f"  ! PUT /profile failed: HTTP {s} body={body[:300]}"); sys.exit(1)
    print(f"  ok HTTP {s}")

    print("[4/4] GET /api/audit-logs?action=user.profile_update…")
    s, body = request("GET", "/api/audit-logs?action=user.profile_update&days=1&page_size=10", token=token)
    if s != 200:
        print(f"  ! /api/audit-logs failed: HTTP {s} body={body[:300]}"); sys.exit(1)
    data = json.loads(body)
    entries = data.get("entries", [])
    print(f"  total={data.get('total')} fetched={len(entries)}")

    # Pick the most-recent row whose created_at is at/after the trigger
    matching = []
    for e in entries:
        try:
            raw = e["created_at"].replace("Z", "+00:00")
            ts = datetime.fromisoformat(raw)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
        except Exception:
            ts = None
        if ts and ts >= trigger_started and e.get("user_id") == me["id"]:
            matching.append((ts, e))
    matching.sort(key=lambda x: x[0], reverse=True)
    if not matching:
        print("  ! no audit_logs row found that matches user_id + post-trigger timestamp")
        print(f"  most recent {min(3, len(entries))} entries returned:")
        for e in entries[:3]:
            print(f"    {json.dumps(e, indent=2)}")
        sys.exit(2)

    row = matching[0][1]
    print()
    print("=== AUDIT LOG ROW (most recent post-trigger match) ===")
    print(json.dumps(row, indent=2))
    print()

    # Field assertions
    checks = [
        ("action == 'user.profile_update'", row.get("action") == "user.profile_update"),
        ("user_id matches Murtaza", row.get("user_id") == me["id"]),
        ("resource_type == 'user'",   row.get("resource_type") == "user"),
        ("before_json populated",     bool(row.get("before_json"))),
        ("after_json populated",      bool(row.get("after_json"))),
    ]
    print("=== FIELD CHECKS ===")
    all_pass = True
    for label, ok in checks:
        mark = "PASS" if ok else "FAIL"
        all_pass = all_pass and ok
        print(f"  [{mark}] {label}")
    if not all_pass:
        sys.exit(3)

    # Decode before/after for human inspection
    print()
    print("=== DECODED SNAPSHOTS ===")
    try:
        print("  before:", json.loads(row["before_json"]))
        print("  after: ", json.loads(row["after_json"]))
    except Exception as e:
        print(f"  ! could not decode JSON: {e}")
        sys.exit(4)


if __name__ == "__main__":
    main()
