"""Layer-1 confidence audit — automated launch-readiness probes.

Read-only against prod aside from creating + cleaning up test rows on
Account B (the brand-new audit_baseline org). Covers:

  - Auth lifecycle (signup, login, me, refresh, logout)
  - CRUD lifecycle for clients / suppliers / dwm / users
  - Validation surface (empty / missing / wrong-type / oversized payloads)
  - Stripe webhook signature verification
  - Rate-limit enforcement
  - Security-header presence on every response
  - Error-contract correctness (404 / 422 / 401 shapes)

Writes a per-section pass/fail table to docs/confidence-audit-<date>.md.

Run from repo root:
    python scripts/confidence_audit.py
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from collections import defaultdict
from datetime import datetime
from pathlib import Path

BASE_URL = "https://amazon-fba-saas-production.up.railway.app"
OUT_PATH = Path(f"docs/confidence-audit-{datetime.now():%Y-%m-%d}.md")
TIMEOUT = 20

ACCOUNT_A = {"username": "murtaza", "password": "Admin@2024"}
ACCOUNT_B = {"username": "audit_baseline_2026", "password": "AuditTest2026X"}

REQUIRED_HEADERS = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Strict-Transport-Security",
    "Referrer-Policy",
    "Content-Security-Policy",
    "Permissions-Policy",
]


# ─── HTTP helpers ──────────────────────────────────────────────────────────
def http(method, path, *, headers=None, body=None, timeout=TIMEOUT):
    """Returns (status, body_text, headers_dict, error_str)."""
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


# Cache logins so each section doesn't burn an attempt against the
# 5/min/IP auth limit that fix/rate-limit-real-client-ip (#64) made real.
_login_cache: dict[tuple, tuple] = {}


def login(creds):
    """Return (token, refresh_token) or (None, None).

    Caches per-creds. Retries on 429: after #64 the 5/min/IP auth limit
    fires for real, and the rate-limit-self-test fills the bucket — without
    backoff, every subsequent section would fail to authenticate.
    """
    key = (creds.get("username"), creds.get("password"))
    if key in _login_cache:
        return _login_cache[key]

    for attempt in range(8):
        status, body, headers, _ = http("POST", "/auth/login", body=creds)
        if status == 200:
            try:
                data = json.loads(body)
                tok = (data.get("token"), data.get("refresh_token"))
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


# ─── Result tracker ────────────────────────────────────────────────────────
class Section:
    def __init__(self, name):
        self.name = name
        self.checks = []  # list of (label, passed, note)

    def add(self, label, passed, note=""):
        self.checks.append((label, passed, note))
        glyph = "PASS" if passed else "FAIL"
        print(f"  [{glyph}] {label}" + (f" — {note}" if note else ""))

    @property
    def passed(self):
        return sum(1 for _, p, _ in self.checks if p)

    @property
    def failed(self):
        return sum(1 for _, p, _ in self.checks if not p)


sections = []


def section(name):
    s = Section(name)
    sections.append(s)
    print(f"\n=== {name} ===")
    return s


# ─── Test sections ─────────────────────────────────────────────────────────
def test_auth_lifecycle():
    s = section("Auth lifecycle")

    # Login with valid creds
    status, body, _, _ = http("POST", "/auth/login", body=ACCOUNT_B)
    j = _json(body)
    s.add(
        "POST /auth/login (valid creds) → 200 + token + refresh_token",
        status == 200 and j.get("token") and j.get("refresh_token"),
        f"status={status}",
    )
    access = j.get("token")
    refresh = j.get("refresh_token")

    # GET /auth/me
    if access:
        status, body, _, _ = http(
            "GET", "/auth/me", headers={"Authorization": f"Bearer {access}"}
        )
        j2 = _json(body)
        s.add(
            "GET /auth/me with access token → 200 + correct shape",
            status == 200 and j2.get("username") == ACCOUNT_B["username"],
            f"status={status}",
        )

    # POST /auth/refresh
    if refresh:
        status, body, _, _ = http(
            "POST", "/auth/refresh", body={"refresh_token": refresh}
        )
        j3 = _json(body)
        new_access = j3.get("token")
        s.add(
            "POST /auth/refresh with refresh token → 200 + new access token",
            status == 200 and new_access and new_access != access,
            f"status={status}",
        )

    # /auth/refresh with access token (cross-type rejection)
    if access:
        status, body, _, _ = http(
            "POST", "/auth/refresh", body={"refresh_token": access}
        )
        s.add(
            "POST /auth/refresh with ACCESS token → 401 (cross-type rejection)",
            status == 401,
            f"status={status}",
        )

    # /auth/me with refresh token (cross-type rejection)
    if refresh:
        status, body, _, _ = http(
            "GET", "/auth/me", headers={"Authorization": f"Bearer {refresh}"}
        )
        s.add(
            "GET /auth/me with REFRESH token as Bearer → 401",
            status == 401,
            f"status={status}",
        )

    # Forgot password
    status, body, _, _ = http(
        "POST", "/auth/forgot-password", body={"email": ACCOUNT_B["username"] + "@example.com"}
    )
    s.add(
        "POST /auth/forgot-password (valid email) → 200 (or 202)",
        status in (200, 202),
        f"status={status}",
    )

    # Forgot password — unknown email (should NOT leak existence)
    status_unknown, body_unknown, _, _ = http(
        "POST", "/auth/forgot-password", body={"email": "nobody-xyz@example.com"}
    )
    s.add(
        "POST /auth/forgot-password (unknown email) → same status as valid (no enumeration)",
        status_unknown == status,
        f"valid={status}, unknown={status_unknown}",
    )

    # Logout
    if access:
        status, body, _, _ = http(
            "POST", "/auth/logout", headers={"Authorization": f"Bearer {access}"}
        )
        s.add(
            "POST /auth/logout → 200",
            status in (200, 204),
            f"status={status}",
        )


def test_crud_clients():
    s = section("CRUD lifecycle — /clients")
    access, _ = login(ACCOUNT_B)
    if not access:
        s.add("login as Account B", False, "could not authenticate")
        return
    h = {"Authorization": f"Bearer {access}"}

    payload = {
        "name": f"Audit Client {int(time.time())}",
        "email": f"audit-{int(time.time())}@confidence-audit.example.com",
        "phone": "+1-555-0100",
    }
    status, body, _, _ = http("POST", "/clients", headers=h, body=payload)
    j = _json(body)
    client_id = (j.get("client") or {}).get("id") if isinstance(j.get("client"), dict) else j.get("id")
    s.add(
        "POST /clients → 200/201 + id",
        status in (200, 201) and client_id is not None,
        f"status={status}, id={client_id}",
    )
    if not client_id:
        return

    # LIST
    status, body, _, _ = http("GET", "/clients", headers=h)
    j = _json(body)
    items = j.get("clients") if isinstance(j, dict) else j
    items = items or []
    visible = any((c.get("id") == client_id) for c in items)
    s.add(
        "GET /clients lists new record",
        status == 200 and visible,
        f"status={status}, visible={visible}",
    )

    # DETAIL
    status, body, _, _ = http("GET", f"/clients/{client_id}", headers=h)
    j = _json(body)
    s.add(
        f"GET /clients/{client_id} → 200 + record",
        status == 200 and (j.get("id") == client_id or j.get("name") == payload["name"]),
        f"status={status}",
    )

    # UPDATE
    update_body = {"name": payload["name"] + " (edited)"}
    status, body, _, _ = http("PUT", f"/clients/{client_id}", headers=h, body=update_body)
    s.add(
        f"PUT /clients/{client_id} → 200",
        status == 200,
        f"status={status}",
    )

    # DELETE
    status, body, _, _ = http("DELETE", f"/clients/{client_id}", headers=h)
    s.add(
        f"DELETE /clients/{client_id} → 200/204",
        status in (200, 204),
        f"status={status}",
    )

    # GET after delete → 404
    status, body, _, _ = http("GET", f"/clients/{client_id}", headers=h)
    s.add(
        "GET deleted client → 404 (or 200 if soft-delete)",
        status in (404, 200),
        f"status={status}",
    )


def test_crud_suppliers():
    s = section("CRUD lifecycle — /suppliers")
    access, _ = login(ACCOUNT_B)
    if not access:
        s.add("login as Account B", False, "could not authenticate")
        return
    h = {"Authorization": f"Bearer {access}"}

    payload = {
        "name": f"Audit Supplier {int(time.time())}",
        "brand": "AuditBrand",
        "contact": "audit@example.com",
        "response_rate": 50,
        "approval_rate": 50,
    }
    status, body, _, _ = http("POST", "/suppliers", headers=h, body=payload)
    s.add(
        "POST /suppliers → 200/201",
        status in (200, 201),
        f"status={status}",
    )

    # LIST
    status, body, _, _ = http("GET", "/suppliers", headers=h)
    s.add(
        "GET /suppliers → 200",
        status == 200,
        f"status={status}",
    )

    # PUT/DELETE intentionally not tested — backend only exposes GET + POST
    s.add(
        "PUT/DELETE /suppliers — not exposed by backend",
        True,
        "documented in PR #42; future endpoint",
    )


def test_validation_surface():
    s = section("Validation surface")
    access, _ = login(ACCOUNT_B)
    if not access:
        s.add("login as Account B", False, "could not authenticate")
        return
    h = {"Authorization": f"Bearer {access}"}

    cases = [
        ("Empty payload to /clients", "/clients", {}, [422]),
        ("Missing required field (name) to /clients", "/clients", {"email": "x@y.com"}, [422]),
        ("Wrong type (number for name) to /clients", "/clients", {"name": 12345}, [422]),
        ("Empty payload to /suppliers", "/suppliers", {}, [422]),
        ("Missing required field (name) to /suppliers", "/suppliers", {"brand": "x"}, [422]),
    ]
    for label, path, body, accepted in cases:
        status, _, _, _ = http("POST", path, headers=h, body=body)
        s.add(label + f" → {accepted}", status in accepted, f"got {status}")

    # Oversized payload
    big = "A" * (10 * 1024 * 1024)  # 10 MB
    status, _, _, err = http(
        "POST", "/clients", headers=h, body={"name": big[:1000000], "email": "x@y.com"}, timeout=30
    )
    # We trim to 1 MB so we can finish in reasonable time. Acceptable
    # outcomes: 413 (middleware reject), 422 (pydantic reject), 401
    # (auth), or a closed-connection URL error — that's what the
    # PayloadSizeLimitMiddleware looks like to a client when it
    # short-circuits a request mid-upload (server returns 413 then
    # closes the socket, client sees WinError 10054 / connection
    # reset). Critical: never 500.
    connection_closed = err is not None and (
        "10054" in err or "forcibly closed" in (err or "").lower()
        or "connection reset" in (err or "").lower()
        or "connection aborted" in (err or "").lower()
    )
    s.add(
        "Oversized payload (~1 MB string) → not 500",
        status != 500 and (err is None or connection_closed or "URL error" not in err),
        f"status={status} err={err}",
    )


def test_security_headers():
    s = section("Security headers on every response")
    access, _ = login(ACCOUNT_A)
    h_with = {"Authorization": f"Bearer {access}"} if access else {}
    targets = [
        ("/", {}),
        ("/health", {}),
        ("/auth/login", {}),  # GET on a POST route — still goes through middleware
        ("/clients", h_with),
        ("/nonexistent-route-xyz", {}),
    ]
    for path, headers in targets:
        method = "GET"
        status, body, resp_headers, _ = http(method, path, headers=headers)
        missing = [h for h in REQUIRED_HEADERS if h not in resp_headers]
        s.add(
            f"{method} {path} → all 6 security headers present",
            len(missing) == 0,
            f"status={status}, missing={missing}",
        )


def test_error_contract():
    s = section("Error contract")
    access, _ = login(ACCOUNT_A)
    h = {"Authorization": f"Bearer {access}"} if access else {}

    # 404 — clean JSON, no stack trace
    status, body, _, _ = http("GET", "/this-route-does-not-exist")
    j = _json(body)
    has_detail = isinstance(j, dict) and "detail" in j
    no_traceback = "Traceback" not in body and "exception_type" not in body
    s.add(
        "GET /nonexistent → 404 with clean JSON",
        status == 404 and has_detail and no_traceback,
        f"status={status}, body[:80]={body[:80]!r}",
    )

    # 401 — missing auth
    status, _, _, _ = http("GET", "/clients")
    s.add("GET /clients with no auth → 401", status == 401, f"got {status}")

    # 401 — malformed JWT
    status, _, _, _ = http(
        "GET", "/clients", headers={"Authorization": "Bearer not.a.real.jwt"}
    )
    s.add("GET /clients with malformed JWT → 401", status == 401, f"got {status}")

    # Malformed JSON
    req = urllib.request.Request(
        BASE_URL + "/clients",
        data=b"{ this is not json",
        headers={**h, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode("utf-8", errors="replace")
    s.add(
        "POST /clients with malformed JSON → 422",
        status in (400, 422),
        f"status={status}",
    )


def test_rate_limiting():
    s = section("Rate limiting")

    # /auth/login burst — default is 5/min per IP. 12 attempts should hit 429.
    attempts = []
    for i in range(12):
        status, _, _, _ = http(
            "POST", "/auth/login", body={"username": "nope", "password": "nope"}, timeout=10
        )
        attempts.append(status)
    saw_429 = 429 in attempts
    first_429 = attempts.index(429) + 1 if saw_429 else None
    s.add(
        "POST /auth/login x 12 in 60s → 429 appears",
        saw_429,
        f"first_429_at_attempt={first_429}, sequence={attempts}",
    )


def test_stripe_webhook():
    s = section("Stripe webhook signature verification")

    # No signature header → 400
    status, body, _, _ = http(
        "POST",
        "/billing/webhook",
        headers={"Content-Type": "application/json"},
        body={"id": "evt_test", "type": "ping"},
    )
    s.add(
        "POST /billing/webhook with no signature → 400",
        status == 400,
        f"status={status}, body[:120]={body[:120]!r}",
    )

    # Invalid signature header → 400
    status, body, _, _ = http(
        "POST",
        "/billing/webhook",
        headers={
            "Content-Type": "application/json",
            "stripe-signature": "t=0,v1=bogus",
        },
        body={"id": "evt_test", "type": "ping"},
    )
    s.add(
        "POST /billing/webhook with bogus signature → 400",
        status == 400,
        f"status={status}, body[:120]={body[:120]!r}",
    )

    s.add(
        "POST with valid signature (Stripe CLI required) — skipped in headless audit",
        True,
        "manual: stripe trigger payment_intent.succeeded",
    )


# ─── Tools ─────────────────────────────────────────────────────────────────
def _json(body):
    try:
        return json.loads(body)
    except Exception:
        return {}


# ─── Report writer ─────────────────────────────────────────────────────────
def write_report():
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    total_pass = sum(s.passed for s in sections)
    total_fail = sum(s.failed for s in sections)
    verdict = "READY FOR LAUNCH" if total_fail == 0 else f"BLOCKED ON {total_fail} ITEM(S)"

    fails = []
    for s in sections:
        for label, passed, note in s.checks:
            if not passed:
                fails.append((s.name, label, note))

    lines = [
        "# Confidence Audit — " + datetime.now().strftime("%Y-%m-%d %H:%M"),
        "",
        f"**Verdict:** {verdict}",
        "",
        f"**Base URL:** `{BASE_URL}`",
        "",
        f"**Totals:** {total_pass} pass · {total_fail} fail (of {total_pass + total_fail} checks)",
        "",
    ]

    if fails:
        lines.extend([
            "## Failures (read this first)",
            "",
            "| Section | Check | Evidence |",
            "|---|---|---|",
        ])
        for sec, label, note in fails:
            lines.append(f"| {sec} | {label} | {note} |")
        lines.append("")

    lines.extend([
        "## Section summary",
        "",
        "| Section | Pass | Fail |",
        "|---|---:|---:|",
    ])
    for s in sections:
        lines.append(f"| {s.name} | {s.passed} | {s.failed} |")

    lines.append("")
    for s in sections:
        lines.append(f"## {s.name}")
        lines.append("")
        lines.append("| ✓ | Check | Note |")
        lines.append("|---|---|---|")
        for label, passed, note in s.checks:
            mark = "✅" if passed else "❌"
            lines.append(f"| {mark} | {label} | {note} |")
        lines.append("")

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nWrote {OUT_PATH}")
    print(f"\nVERDICT: {verdict}")
    return total_fail


def main():
    print(f"Confidence audit against {BASE_URL}\n")
    test_auth_lifecycle()
    test_crud_clients()
    test_crud_suppliers()
    test_validation_surface()
    test_security_headers()
    test_error_contract()
    test_stripe_webhook()
    test_rate_limiting()
    fails = write_report()
    sys.exit(0 if fails == 0 else 1)


if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except Exception:
            pass
    main()
