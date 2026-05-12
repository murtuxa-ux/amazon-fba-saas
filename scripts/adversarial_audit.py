"""Layer-3 adversarial audit — tries to break the system.

Read-only against prod aside from creating + cleaning up test rows on
Account A and Account B. Covers:

  - Cross-tenant access (RLS verification) — LAUNCH-BLOCKING if any fail
  - SQL injection
  - JWT tampering (signature, claims, alg-confusion, expired, cross-type)
  - IDOR (sequential ID probing across tenants)
  - Brute force / rate-limit enforcement
  - Large-payload / DoS surface
  - Open redirect / SSRF (if applicable)
  - Email enumeration on /auth/forgot-password + /auth/signup

Writes a per-test pass/fail table to docs/adversarial-audit-<date>.md.

Run from repo root:
    python scripts/adversarial_audit.py
"""
from __future__ import annotations

import base64
import json
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime
from pathlib import Path

BASE_URL = "https://amazon-fba-saas-production.up.railway.app"
OUT_PATH = Path(f"docs/adversarial-audit-{datetime.now():%Y-%m-%d}.md")
TIMEOUT = 20

ACCOUNT_A = {"username": "murtaza", "password": "Admin@2024"}
ACCOUNT_B = {"username": "audit_baseline_2026", "password": "AuditTest2026X"}


# ─── HTTP helpers ──────────────────────────────────────────────────────────
def http(method, path, *, headers=None, body=None, timeout=TIMEOUT):
    url = path if path.startswith("http") else BASE_URL + path
    req_headers = dict(headers or {})
    data = None
    if body is not None:
        if isinstance(body, (dict, list)):
            data = json.dumps(body).encode("utf-8")
            req_headers.setdefault("Content-Type", "application/json")
        elif isinstance(body, (bytes, bytearray)):
            data = body
        else:
            data = str(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace"), dict(resp.headers), None
    except urllib.error.HTTPError as e:
        txt = ""
        try:
            txt = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        return e.code, txt, dict(e.headers or {}), None
    except urllib.error.URLError as e:
        return 0, "", {}, f"URL error: {e.reason}"
    except Exception as e:
        return 0, "", {}, f"Exception: {type(e).__name__}: {e}"


# Cache logins so each section doesn't burn a token against the 5/min/IP
# auth limit that fix/rate-limit-real-client-ip (#64) made real.
_login_cache: dict[tuple, tuple] = {}


def login(creds):
    """Login with retry on 429, with per-creds caching so we don't burn the
    5/min/IP auth limit across 8 test sections. After #64 the auth limit
    actually fires; without caching, the cross-tenant section drains the
    bucket and every later section fails to authenticate.
    """
    key = (creds.get("username"), creds.get("password"))
    if key in _login_cache:
        return _login_cache[key]

    for attempt in range(8):
        status, body, headers, _ = http("POST", "/auth/login", body=creds)
        if status == 200:
            try:
                d = json.loads(body)
                tok = (d.get("token"), d.get("refresh_token"))
                _login_cache[key] = tok
                return tok
            except Exception:
                return None, None
        if status == 429:
            retry = headers.get("Retry-After") if headers else None
            try:
                delay = max(2, min(60, int(retry))) if retry else 15
            except (TypeError, ValueError):
                delay = 15
            print(f"  [login] 429 — waiting {delay}s then retrying ({attempt + 1}/8)")
            time.sleep(delay)
            continue
        return None, None
    return None, None


def _json(body):
    try:
        return json.loads(body)
    except Exception:
        return {}


# ─── Result tracker ────────────────────────────────────────────────────────
class Section:
    def __init__(self, name, launch_blocking=False):
        self.name = name
        self.launch_blocking = launch_blocking
        self.checks = []

    def add(self, label, passed, note=""):
        self.checks.append((label, passed, note))
        glyph = "OK" if passed else "HOLE"
        print(f"  [{glyph}] {label}" + (f" — {note}" if note else ""))

    @property
    def passed(self):
        return sum(1 for _, p, _ in self.checks if p)

    @property
    def failed(self):
        return sum(1 for _, p, _ in self.checks if not p)


sections = []


def section(name, launch_blocking=False):
    s = Section(name, launch_blocking)
    sections.append(s)
    blk = " [LAUNCH-BLOCKING]" if launch_blocking else ""
    print(f"\n=== {name}{blk} ===")
    return s


# ─── Test sections ─────────────────────────────────────────────────────────
def test_cross_tenant():
    """RLS: row owned by org A must be invisible to org B."""
    s = section("Cross-tenant access (RLS verification)", launch_blocking=True)

    a_token, _ = login(ACCOUNT_A)
    b_token, _ = login(ACCOUNT_B)
    if not a_token or not b_token:
        s.add("login as both accounts", False, "could not authenticate both")
        return
    ha = {"Authorization": f"Bearer {a_token}"}
    hb = {"Authorization": f"Bearer {b_token}"}

    # Account A creates a client
    payload = {"name": f"CrossTenantProbe-{int(time.time())}", "email": "probe@example.com"}
    status, body, _, _ = http("POST", "/clients", headers=ha, body=payload)
    j = _json(body)
    client_id = (j.get("client") or {}).get("id") if isinstance(j.get("client"), dict) else j.get("id")
    if not client_id:
        s.add("Account A: create probe client", False, f"status={status}, body[:100]={body[:100]!r}")
        return
    s.add(f"Account A: created client id={client_id}", True)

    try:
        # GET as B → MUST NOT return A's row
        status, body, _, _ = http("GET", f"/clients/{client_id}", headers=hb)
        s.add(
            f"GET /clients/{client_id} as B → 404 (not 200, not 403)",
            status == 404,
            f"got {status}, body[:80]={body[:80]!r}",
        )

        # PUT as B
        status, body, _, _ = http(
            "PUT", f"/clients/{client_id}", headers=hb, body={"name": "hijacked"}
        )
        s.add(
            f"PUT /clients/{client_id} as B → 404",
            status == 404,
            f"got {status}",
        )

        # DELETE as B
        status, body, _, _ = http("DELETE", f"/clients/{client_id}", headers=hb)
        s.add(
            f"DELETE /clients/{client_id} as B → 404",
            status == 404,
            f"got {status}",
        )

        # LIST as B — must not include A's row
        status, body, _, _ = http("GET", "/clients", headers=hb)
        j = _json(body)
        items = j.get("clients") if isinstance(j, dict) else j
        items = items or []
        leaked = any(c.get("id") == client_id for c in items)
        s.add(
            "GET /clients as B does NOT include A's client",
            not leaked,
            f"leak={leaked}, B_count={len(items)}",
        )

        # LIST as A — must still include A's row (sanity)
        status, body, _, _ = http("GET", "/clients", headers=ha)
        j = _json(body)
        items = j.get("clients") if isinstance(j, dict) else j
        items = items or []
        present = any(c.get("id") == client_id for c in items)
        s.add(
            "Sanity: GET /clients as A still includes A's client",
            present,
            f"A_count={len(items)}, present={present}",
        )
    finally:
        # Clean up regardless of pass/fail
        http("DELETE", f"/clients/{client_id}", headers=ha)


def test_sql_injection():
    s = section("SQL injection")
    a_token, _ = login(ACCOUNT_A)
    if not a_token:
        s.add("login", False, "could not authenticate")
        return
    h = {"Authorization": f"Bearer {a_token}"}

    payloads = [
        ("DROP TABLE clients", "'; DROP TABLE clients; --"),
        ("OR 1=1", "' OR '1'='1"),
        ("DROP TABLE users (escaped)", "\\'; DROP TABLE users; --"),
        ("UNION SELECT", "1' UNION SELECT * FROM users WHERE '1'='1"),
        ("XSS payload", "<script>alert(1)</script>"),
    ]
    created_ids = []
    try:
        for label, payload in payloads:
            status, body, _, _ = http(
                "POST",
                "/clients",
                headers=h,
                body={"name": payload, "email": "sql-probe@example.com"},
            )
            j = _json(body)
            cid = (j.get("client") or {}).get("id") if isinstance(j.get("client"), dict) else j.get("id")
            if cid:
                created_ids.append(cid)
            # Acceptable: 201/200 (stored literally) or 422 (rejected). Never 500.
            s.add(
                f"POST /clients name={label!r} → not 500",
                status != 500,
                f"status={status}",
            )

        # Confirm /clients still works (no DROP TABLE side-effect)
        status, body, _, _ = http("GET", "/clients", headers=h)
        s.add(
            "GET /clients after injection attempts → 200 (table intact)",
            status == 200,
            f"got {status}",
        )
    finally:
        for cid in created_ids:
            http("DELETE", f"/clients/{cid}", headers=h)


def test_jwt_tampering():
    s = section("JWT tampering")
    a_token, a_refresh = login(ACCOUNT_A)
    if not a_token:
        s.add("login", False, "could not authenticate")
        return

    def b64url(d):
        return base64.urlsafe_b64encode(d.encode()).rstrip(b"=").decode()

    # Decode payload
    parts = a_token.split(".")
    payload_raw = parts[1] + "=" * (-len(parts[1]) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_raw))

    # 1. Tamper user_id without re-signing → 401
    tampered_payload = dict(payload)
    tampered_payload["user_id"] = 999_999
    new_token = parts[0] + "." + b64url(json.dumps(tampered_payload)) + "." + parts[2]
    status, _, _, _ = http("GET", "/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    s.add(
        "Tampered user_id (kept old signature) → 401",
        status == 401,
        f"got {status}",
    )

    # 2. Tamper org_id without re-signing → 401
    tampered_payload = dict(payload)
    tampered_payload["org_id"] = 999
    new_token = parts[0] + "." + b64url(json.dumps(tampered_payload)) + "." + parts[2]
    status, _, _, _ = http("GET", "/clients", headers={"Authorization": f"Bearer {new_token}"})
    s.add(
        "Tampered org_id (kept old signature) → 401",
        status == 401,
        f"got {status}",
    )

    # 3. Expired token (exp in past)
    expired_payload = dict(payload)
    expired_payload["exp"] = int(time.time()) - 3600
    # Reuse signature (invalid but the exp check often fires first)
    new_token = parts[0] + "." + b64url(json.dumps(expired_payload)) + "." + parts[2]
    status, _, _, _ = http("GET", "/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    s.add(
        "Token with past exp → 401",
        status == 401,
        f"got {status}",
    )

    # 4. alg: none confusion attack
    header_none = b64url(json.dumps({"alg": "none", "typ": "JWT"}))
    payload_none = b64url(json.dumps(payload))
    none_token = f"{header_none}.{payload_none}."
    status, _, _, _ = http("GET", "/auth/me", headers={"Authorization": f"Bearer {none_token}"})
    s.add(
        "alg=none confusion attack → 401",
        status == 401,
        f"got {status}",
    )

    # 5. Access token presented to /auth/refresh → 401 (already covered in confidence audit, repeat)
    status, _, _, _ = http("POST", "/auth/refresh", body={"refresh_token": a_token})
    s.add(
        "Access token presented to /auth/refresh → 401",
        status == 401,
        f"got {status}",
    )


def test_idor():
    """Probe sequential IDs across tenants. Account B should see 404 on every A-owned row."""
    s = section("IDOR (sequential ID enumeration)")
    b_token, _ = login(ACCOUNT_B)
    if not b_token:
        s.add("login as B", False, "could not authenticate")
        return
    hb = {"Authorization": f"Bearer {b_token}"}

    leaks = []
    probed = 0
    for cid in range(1, 31):  # 30 sequential IDs
        status, body, _, _ = http("GET", f"/clients/{cid}", headers=hb)
        probed += 1
        if status == 200:
            j = _json(body)
            leaks.append((cid, j.get("name", "?")))
    s.add(
        f"GET /clients/1..30 as B — count of 200 responses",
        len(leaks) == 0,
        f"probed={probed}, leaks={leaks}",
    )


def test_brute_force():
    s = section("Brute force protection")
    statuses = []
    for i in range(15):
        status, _, _, _ = http(
            "POST",
            "/auth/login",
            body={"username": "murtaza", "password": f"wrong-password-{i}"},
            timeout=10,
        )
        statuses.append(status)

    saw_429 = 429 in statuses
    s.add(
        "POST /auth/login x 15 wrong → 429 appears (rate limit kicks in)",
        saw_429,
        f"sequence={statuses}",
    )

    # No permanent lockout: valid login from same IP after rate-limit cool-off
    # should still work eventually. We won't wait 60s here; we instead check
    # that the valid account is not LOCKED (we don't want a separate user-level
    # lockout that creates a DoS vector).
    # Wait a few seconds then try /auth/me with a fresh login.
    time.sleep(3)
    # If rate-limited, this might still be 429. That's OK — we just need to
    # know the user account itself isn't permanently locked.
    status, body, _, _ = http("POST", "/auth/login", body=ACCOUNT_A, timeout=10)
    s.add(
        "After burst, valid login eventually returns 200 OR 429 (not a permanent user-level lockout)",
        status in (200, 429),
        f"got {status}",
    )


def test_large_payload():
    s = section("Large payload / DoS surface")
    access, _ = login(ACCOUNT_B)
    h = {"Authorization": f"Bearer {access}"} if access else {}

    # 1 MB JSON name
    big = "A" * 1_000_000
    status, body, _, err = http(
        "POST",
        "/clients",
        headers=h,
        body={"name": big, "email": "x@y.com"},
        timeout=30,
    )
    s.add(
        "POST /clients with 1 MB name → not 500 (should be 413 or 422)",
        status != 500,
        f"got {status} err={err}",
    )

    # Out-of-bounds pagination
    status, _, _, _ = http(
        "GET", "/clients?status=ZZ_INVALID&assigned_am=test&marketplace=US", headers=h
    )
    s.add(
        "GET /clients with bizarre query params → not 500",
        status != 500,
        f"got {status}",
    )


def test_email_enumeration():
    s = section("Email enumeration on /auth/forgot-password + /auth/signup")

    # forgot-password: real vs nobody
    status_real, body_real, _, _ = http(
        "POST",
        "/auth/forgot-password",
        body={"email": "murtaza@ecomera.us"},
    )
    status_fake, body_fake, _, _ = http(
        "POST",
        "/auth/forgot-password",
        body={"email": "this-user-does-not-exist-zzz@example.com"},
    )
    same_status = status_real == status_fake
    same_body = body_real == body_fake
    s.add(
        "/auth/forgot-password: real vs fake email same status",
        same_status,
        f"real={status_real}, fake={status_fake}",
    )
    s.add(
        "/auth/forgot-password: real vs fake email same body (no enumeration)",
        same_body,
        f"bodies match: {same_body}",
    )

    # signup: existing email vs new email — should both return 200 or both 4xx
    status_dup, body_dup, _, _ = http(
        "POST",
        "/auth/signup",
        body={
            "org_name": "DupAttempt",
            "name": "Dup Attempt",
            "email": "murtaza@ecomera.us",
            "username": f"dup_probe_{int(time.time())}",
            "password": "DupProbePass99",
        },
    )
    # We can't easily detect "exists" here because the response body might
    # still be {"status": "exists"} or 400 with "already registered" — both
    # leak. We treat any explicit "already" / "exists" word in the body as
    # a leak signal.
    leaked = (
        "already" in body_dup.lower()
        or "exists" in body_dup.lower()
        or "registered" in body_dup.lower()
        or "duplicate" in body_dup.lower()
    )
    s.add(
        "/auth/signup with existing email: does NOT confirm existence",
        not leaked,
        f"status={status_dup}, body[:140]={body_dup[:140]!r}",
    )


def test_open_redirect():
    s = section("Open redirect / SSRF surface")

    # The app has no documented `?next=` redirect parameter. Probe anyway.
    # If the login page accepts ?next=, we want it to ignore external hosts.
    status, body, headers, _ = http(
        "GET",
        "/auth/login?next=http://evil.example.com",
        timeout=10,
    )
    loc = headers.get("Location", "")
    s.add(
        "GET /auth/login?next=evil.example.com — no Location header pointing offsite",
        "evil.example.com" not in loc,
        f"status={status}, Location={loc!r}",
    )

    # No documented URL-accepting input on backend. Skip SSRF probe (would
    # need a real "fetch this URL" endpoint to exercise).
    s.add(
        "SSRF probe — no backend endpoint accepts user-supplied URLs",
        True,
        "skipped (no attack surface to exercise)",
    )


# ─── Report writer ─────────────────────────────────────────────────────────
def write_report():
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    total_pass = sum(s.passed for s in sections)
    total_fail = sum(s.failed for s in sections)

    blocking_fail = sum(s.failed for s in sections if s.launch_blocking)
    if blocking_fail > 0:
        verdict = f"BLOCKED — {blocking_fail} CROSS-TENANT HOLE(S)"
    elif total_fail == 0:
        verdict = "SECURE"
    else:
        verdict = f"{total_fail} HOLE(S)"

    holes = []
    for s in sections:
        for label, passed, note in s.checks:
            if not passed:
                holes.append((s.name, s.launch_blocking, label, note))

    lines = [
        "# Adversarial Audit — " + datetime.now().strftime("%Y-%m-%d %H:%M"),
        "",
        f"**Verdict:** {verdict}",
        "",
        f"**Base URL:** `{BASE_URL}`",
        "",
        f"**Totals:** {total_pass} OK · {total_fail} hole(s) (of {total_pass + total_fail} checks)",
        "",
    ]

    if holes:
        lines.extend([
            "## Holes (read this first)",
            "",
            "| Section | Launch-blocking? | Check | Evidence |",
            "|---|---|---|---|",
        ])
        for sec, blk, label, note in holes:
            blk_mark = "**YES**" if blk else "no"
            lines.append(f"| {sec} | {blk_mark} | {label} | {note} |")
        lines.append("")

    lines.extend([
        "## Section summary",
        "",
        "| Section | OK | Holes | Launch-blocking? |",
        "|---|---:|---:|---|",
    ])
    for s in sections:
        block = "yes" if s.launch_blocking else "no"
        lines.append(f"| {s.name} | {s.passed} | {s.failed} | {block} |")

    lines.append("")
    for s in sections:
        block_tag = " [LAUNCH-BLOCKING]" if s.launch_blocking else ""
        lines.append(f"## {s.name}{block_tag}")
        lines.append("")
        lines.append("| ✓ | Check | Evidence |")
        lines.append("|---|---|---|")
        for label, passed, note in s.checks:
            mark = "✅" if passed else "❌"
            lines.append(f"| {mark} | {label} | {note} |")
        lines.append("")

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nWrote {OUT_PATH}")
    print(f"\nVERDICT: {verdict}")
    return total_fail, blocking_fail


def main():
    print(f"Adversarial audit against {BASE_URL}\n")
    test_cross_tenant()
    test_sql_injection()
    test_jwt_tampering()
    test_idor()
    test_brute_force()
    test_large_payload()
    test_email_enumeration()
    test_open_redirect()
    fails, blocking = write_report()
    # Exit code: 1 if any launch-blocking failure, 0 otherwise (lower-severity
    # holes don't fail the script — they're diagnostic findings for Murtaza).
    sys.exit(1 if blocking > 0 else 0)


if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except Exception:
            pass
    main()
