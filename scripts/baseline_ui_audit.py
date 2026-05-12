"""Baseline UI audit — visits every authenticated route as 2 different users
and screenshots each tab. Outputs side-by-side comparison so it's obvious
which pages render identical fake data across both accounts (= mock data).

Why JWT injection instead of UI login: /auth/login is currently 500-ing in
prod for all valid credentials (PR #37 in flight to fix it). We bypass the
login form by writing the JWT + user blob directly to localStorage under
the keys the frontend reads (ecomera_token, ecomera_user) before navigating
to a protected route.

Run from repo root:
    python scripts/baseline_ui_audit.py

Output:
    docs/baseline-audit-2026-05-12/
      A_murtaza_<route>.png
      B_audit_baseline_<route>.png
      audit_log.json
      baseline_audit_summary.md
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


FRONTEND = "https://amazon-fba-saas.vercel.app"
OUT_DIR = Path("docs/baseline-audit-2026-05-12")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Account A — Murtaza's existing user (org_id=20). Token from dispatch +
# audit.py prod JWT. Exp 2026 (see decoded payload).
ACCT_A = {
    "label": "A_murtaza",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJvcmdfaWQiOjIwLCJleHAiOjE3Nzg4MzgxNTF9.G2NxXDc_PxlX1ykuituH54g-IoRqJtF8543Gti0fNmU",
    "user": {
        "username": "murtaza",
        "name": "Murtaza",
        "role": "owner",
        "email": "murtaza@ecomera.io",
        "avatar": "M",
        "org_id": 20,
        "org_name": "Ecom Era",
    },
}

# Account B — Brand new "Baseline Audit Org", zero rows in any table.
# Created via POST /auth/signup at audit start. If this token expires,
# re-sign-up a fresh user (the comparison only matters within a single run).
ACCT_B = {
    "label": "B_audit_baseline",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNywib3JnX2lkIjoyNiwiZXhwIjoxNzc4ODQzMzc5fQ.seuSQRFYHffIuePHUFiTxjWExlJbJfyTaQMRhgSI7cw",
    "user": {
        "username": "audit_baseline_2026",
        "name": "Audit Baseline",
        "role": "owner",
        "email": "audit_baseline_2026@example.com",
        "avatar": "A",
        "org_id": 26,
        "org_name": "Baseline Audit Org",
    },
}

# Routes to audit. The list mirrors the actual flat page files in
# frontend/pages/, not the nested URL fantasy in the dispatch. Many "nested"
# routes from the dispatch (/dwm/daily, /reports/summary, /billing/status,
# etc.) don't exist as frontend pages — those would render Next.js's 404.
# tabs is a list of clickable tab labels inside the page.
ROUTES = [
    ("/", []),
    ("/clients", [
        "Client Overview", "Performance", "Communication",
        "Contracts & Billing", "Onboarding",
    ]),
    ("/products", []),
    ("/scout", []),
    ("/suppliers", []),
    ("/weekly", []),
    ("/dwm", []),
    ("/reports", []),
    ("/reporting", []),
    ("/kpi", []),
    ("/leaderboard", []),
    ("/team", []),
    ("/user-management", []),
    ("/billing", []),
    ("/coach", []),
    ("/forecasting", []),
    ("/buybox", []),
    ("/product-radar", []),
    ("/recommendations", []),
    ("/intelligence", []),
    ("/brand-approvals", []),
    ("/fba-shipments", []),
    ("/fbm-orders", []),
    ("/account-health", []),
    ("/notifications_page", []),
    ("/audit", []),
    ("/automations", []),
    ("/client-pnl", []),
    ("/purchase-orders", []),
    ("/settings", []),
    ("/onboarding", []),
    ("/admin", []),
    ("/analyze", []),
    ("/ai-tools", []),
    ("/competitors", []),
    ("/inventory", []),
    ("/market", []),
    ("/finance", []),
    ("/exports", []),
    ("/ppc", []),
    ("/ppc-advanced", []),
    ("/pricing", []),
    ("/private-label", []),
    ("/profit-calculator", []),
    ("/wholesale", []),
    ("/workflow", []),
    ("/portal-admin", []),
    ("/client-portal-manage", []),
]

# Sentinels — strings that appear in the known hardcoded mock data Murtaza
# identified on /clients. If any of these show up under Account B (which
# has ZERO rows in the DB), the page is rendering fake constants instead
# of API data.
MOCK_SENTINELS = [
    "HMS Group",
    "Crescent Innovations", "Crescent",
    "BrightPath Solutions", "BrightPath",
    "Red Peacock",
    "Wise Buys",
    "Sarah Chen",
    "Emily Watson",
    "David Park",
    "John Mitchell",
    "Maria Rodriguez",
    "Alex Thompson",
    "john@hmsgroup",
    "maria@crescent",
    "alex@brightpath",
]


def slugify(path: str) -> str:
    s = path.strip("/").replace("/", "_") or "root"
    return re.sub(r"[^a-zA-Z0-9_]+", "_", s)


def inject_auth(context, account):
    """Write the JWT + user blob to localStorage under the keys the
    frontend reads. Done via init_script so it runs BEFORE every page
    load — including the very first navigation. The frontend's
    AuthContext hydrates from these keys on mount."""
    token = account["token"]
    user = json.dumps(account["user"])
    script = f"""
        window.localStorage.setItem('ecomera_token', {json.dumps(token)});
        window.localStorage.setItem('ecomera_user', {user!r});
    """
    context.add_init_script(script)


def text_summary(page) -> str:
    """Return the visible text content of the page for sentinel matching.
    Falls back to page.content() (full HTML) so attributes don't hide
    a string match."""
    try:
        return page.locator("body").inner_text(timeout=2000)
    except Exception:
        return page.content()


def audit_account(browser, account):
    print(f"\n=== Auditing {account['label']} ({account['user']['org_name']}) ===")
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    inject_auth(context, account)
    page = context.new_page()
    log = []

    # Prime the origin so localStorage init runs against the right host.
    page.goto(FRONTEND, wait_until="domcontentloaded", timeout=20000)

    for route, tabs in ROUTES:
        slug = slugify(route)
        try:
            # Try networkidle first; fall back to domcontentloaded when the
            # page has open WS / Vercel speed-insights pings / Sentry beacons
            # that never let the network reach idle. Pages render fine well
            # before networkidle settles — falling back here avoids false
            # BROKEN verdicts for healthy pages.
            try:
                page.goto(f"{FRONTEND}{route}", wait_until="networkidle", timeout=12000)
            except Exception:
                page.goto(f"{FRONTEND}{route}", wait_until="domcontentloaded", timeout=15000)
                time.sleep(2.0)  # give SPA fetches a chance after DOM ready
            time.sleep(1.0)  # let lazy data fetches resolve
            screenshot = OUT_DIR / f"{account['label']}_{slug}.png"
            page.screenshot(path=str(screenshot), full_page=True)
            text = text_summary(page)
            html = page.content()
            entry = {
                "account": account["label"],
                "route": route,
                "tab": None,
                "status": "ok",
                "url_after_load": page.url,
                "screenshot": str(screenshot),
                "text_len": len(text),
                "html_len": len(html),
                "sentinels": [s for s in MOCK_SENTINELS if s in html],
            }
            log.append(entry)
            print(f"  {route:35s} OK  sentinels={entry['sentinels']}".encode("ascii", "replace").decode("ascii"))

            for tab_label in tabs:
                tab_slug = re.sub(r"[^a-z0-9]+", "_", tab_label.lower())
                try:
                    page.get_by_text(tab_label, exact=False).first.click(timeout=4000)
                    time.sleep(1.2)
                    tab_screenshot = OUT_DIR / f"{account['label']}_{slug}__{tab_slug}.png"
                    page.screenshot(path=str(tab_screenshot), full_page=True)
                    html = page.content()
                    log.append({
                        "account": account["label"],
                        "route": route,
                        "tab": tab_label,
                        "status": "ok",
                        "screenshot": str(tab_screenshot),
                        "html_len": len(html),
                        "sentinels": [s for s in MOCK_SENTINELS if s in html],
                    })
                    print(f"    > tab '{tab_label}' OK".encode("ascii", "replace").decode("ascii"))
                except Exception as e:
                    log.append({
                        "account": account["label"],
                        "route": route,
                        "tab": tab_label,
                        "status": "tab_err",
                        "error": str(e)[:200],
                    })
                    print(f"    > tab '{tab_label}' FAIL {str(e)[:80]}".encode("ascii", "replace").decode("ascii"))
        except Exception as e:
            log.append({
                "account": account["label"],
                "route": route,
                "tab": None,
                "status": "route_err",
                "error": str(e)[:300],
            })
            print(f"  {route:35s} ERR {str(e)[:80]}".encode("ascii", "replace").decode("ascii"))

    context.close()
    return log


# Routes that are intentionally static — no backend fetch is needed and a
# SAME_BODY verdict on these is not a regression. Documented per entry so
# the next reviewer doesn't try to "fix" them.
STATIC_BY_DESIGN = {
    "/pricing": "marketing page; pricing tiers are global config, not per-org",
    "/profit-calculator": "local arithmetic only; no backend needed",
    "/private-label": "pending design-question #6 — no backend module yet",
    "/ai-tools": "calculator + alerts for un-wired tools; per-tool wiring tracked in api-endpoint-gaps.md",
    "/reports": "templates + builder form; the list endpoints (/reports/saved, /reports/scheduled) ship in a follow-up",
    "/reporting": "subscriptions + chart; usage-trend endpoint ships in a follow-up",
}


def _route_has_fetch(route):
    """Best-effort: does the frontend page file for this route contain a
    fetch() call to BASE_URL? Used to disambiguate "wired but empty" from
    "actually static" when both accounts' HTML bodies are identical.

    Maps the dispatch's route paths to the flat frontend/pages filenames
    (no /coach/feed → coach.js, /reports/summary → reports.js, etc.).
    """
    import os
    import re

    # Strip query/hash, then /-prefix.
    path = route.split("?", 1)[0].split("#", 1)[0].strip("/")
    if not path:
        candidates = ["index"]
    else:
        # /coach/feed → try coach first
        head = path.split("/")[0]
        candidates = [path.replace("/", "-"), head, path]

    pages_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "pages")
    pages_dir = os.path.normpath(pages_dir)
    for name in candidates:
        for ext in (".js", ".tsx", ".jsx", ".ts"):
            p = os.path.join(pages_dir, name + ext)
            if os.path.isfile(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        src = f.read()
                except Exception:
                    continue
                if re.search(r"\bfetch\s*\(\s*[`\"']\s*\$?\{?\s*(?:BASE_URL|API|api)", src) or \
                   re.search(r"api\.(get|post|put|delete|patch)\s*\(", src):
                    return True, p
                return False, p
    return False, None


def build_verdict_markdown(all_logs):
    md = [
        "# Baseline UI Audit — 2026-05-13",
        "",
        "**Method:** Two accounts injected via localStorage JWT, visited every authenticated route.",
        "",
        f"- Account A: Murtaza (user_id=1, org_id=20, has real data)",
        f"- Account B: Audit Baseline (user_id=17, org_id=26, brand-new — zero rows in any table)",
        "",
        "**Verdict legend:**",
        "- **MOCK** — known mock-data sentinels (`HMS Group`, `Sarah Chen`, …) found in body. Page is hardcoded.",
        "- **SAME_BODY** — HTML bodies match within < 100 B AND the page source has no `fetch(BASE_URL/...)` call. Genuinely static (or still using hardcoded data).",
        "- **REAL_EMPTY** — HTML bodies match within < 100 B BUT the page source has a real fetch call. Both test accounts have empty data; the page is wired correctly and just has nothing to show.",
        "- **MISSING_404** — page renders the 404 fallback (~3.7KB). Route is not built in the frontend.",
        "- **REAL** — body differs substantially across accounts. Page is API-wired AND at least one account has data.",
        "- **BROKEN** — page timed out or threw a navigation error.",
        "",
        "## Verdict per route",
        "",
        "| Route | Tab | A_len | B_len | Verdict | Note |",
        "|-------|-----|------:|------:|---------|------|",
    ]

    counts = {
        "REAL": 0, "MOCK": 0, "SAME_BODY": 0, "REAL_EMPTY": 0,
        "STATIC_OK": 0, "MISSING_404": 0, "BROKEN": 0, "UNKNOWN": 0,
    }
    rows_for_top = []

    def _index(entries):
        idx = {}
        for r in entries:
            k = (r.get("route"), r.get("tab"))
            existing = idx.get(k)
            if existing is None:
                idx[k] = r
            elif existing.get("status") != "ok" and r.get("status") == "ok":
                idx[k] = r
        return idx

    a_log = _index(all_logs.get("A_murtaza", []))
    b_log = _index(all_logs.get("B_audit_baseline", []))
    keys = list(a_log.keys()) + [k for k in b_log if k not in a_log]

    # Page-not-found size: Next.js 404 page renders to ~3.7KB when hydrated.
    # Allow a small tolerance.
    PAGE_404_MIN, PAGE_404_MAX = 3500, 4000

    for key in keys:
        a = a_log.get(key, {})
        b = b_log.get(key, {})
        a_sents = a.get("sentinels", []) if a else []
        b_sents = b.get("sentinels", []) if b else []
        a_status = (a.get("status") if a else "missing") or "missing"
        b_status = (b.get("status") if b else "missing") or "missing"
        a_len = a.get("html_len", 0) if a else 0
        b_len = b.get("html_len", 0) if b else 0
        diff = abs(a_len - b_len)
        note = ""

        if a_status != "ok" or b_status != "ok":
            verdict = "BROKEN"
            note = (a.get("error") or b.get("error") or "")[:120]
        elif b_sents:
            verdict = "MOCK"
            note = f"{len(b_sents)} known sentinels"
        elif (PAGE_404_MIN <= a_len <= PAGE_404_MAX and
              PAGE_404_MIN <= b_len <= PAGE_404_MAX):
            verdict = "MISSING_404"
            note = "renders Next.js 404 page"
        elif a_len > 5000 and b_len > 5000 and diff < 100:
            # Tight-diff classification depends on whether the page is
            # actually wired to a backend fetch:
            #   has fetch + identical body = both accounts empty (REAL_EMPTY)
            #   no fetch + identical body  = genuinely static / mock (SAME_BODY)
            # …unless the route is on the STATIC_BY_DESIGN allowlist, in
            # which case the page is supposed to be identical across orgs.
            has_fetch, _src_path = _route_has_fetch(key[0])
            if has_fetch:
                verdict = "REAL_EMPTY"
                note = f"empty for both orgs (Δ {diff} B), page has API fetch"
            elif key[0] in STATIC_BY_DESIGN:
                verdict = "STATIC_OK"
                note = f"intentionally static: {STATIC_BY_DESIGN[key[0]]}"
            else:
                verdict = "SAME_BODY"
                note = f"identical body, no fetch in source (Δ {diff} B)"
        elif a_status == "ok" and b_status == "ok":
            verdict = "REAL"
        else:
            verdict = "UNKNOWN"

        counts[verdict] = counts.get(verdict, 0) + 1
        rows_for_top.append((verdict, key, a_len, b_len, b_sents, note))

        tab_str = key[1] or "-"
        md.append(
            f"| {key[0]} | {tab_str} | {a_len} | {b_len} | **{verdict}** | {note} |"
        )

    md.extend([
        "",
        "## Totals",
        "",
        f"- REAL:        {counts.get('REAL', 0)}",
        f"- REAL_EMPTY:  {counts.get('REAL_EMPTY', 0)}  (wired but no data on either test account — acceptable)",
        f"- STATIC_OK:   {counts.get('STATIC_OK', 0)}  (intentionally static — marketing / calculators / pending modules)",
        f"- MOCK:        {counts.get('MOCK', 0)}  (hardcoded mock data — top priority to fix)",
        f"- SAME_BODY:   {counts.get('SAME_BODY', 0)}  (identical body AND no fetch in source — needs wiring)",
        f"- MISSING_404: {counts.get('MISSING_404', 0)}  (frontend route not implemented — backend may have the API but no page)",
        f"- BROKEN:      {counts.get('BROKEN', 0)}  (load timeout / nav error)",
        f"- UNKNOWN:     {counts.get('UNKNOWN', 0)}",
        "",
        "## Top mock offenders (most known sentinels under Account B)",
        "",
    ])
    mocks = [
        r for r in rows_for_top
        if r[0] == "MOCK"
    ]
    mocks.sort(key=lambda r: -len(r[4]))
    if not mocks:
        md.append("_(none — every B page either rendered real/empty or errored)_")
    else:
        for verdict, key, a_len, b_len, sentinels, _ in mocks[:10]:
            tab_str = f" / {key[1]}" if key[1] else ""
            md.append(f"- `{key[0]}{tab_str}` — {len(sentinels)} sentinels: {', '.join(sentinels[:5])}")

    md.extend([
        "",
        "## SAME_BODY routes (identical across orgs, needs visual review)",
        "",
    ])
    same_body = [r for r in rows_for_top if r[0] == "SAME_BODY"]
    if not same_body:
        md.append("_(none)_")
    else:
        for verdict, key, a_len, b_len, _, note in same_body:
            tab_str = f" / {key[1]}" if key[1] else ""
            md.append(f"- `{key[0]}{tab_str}` — A={a_len} B={b_len} ({note})")

    md.extend([
        "",
        "## MISSING_404 routes (frontend page not implemented)",
        "",
    ])
    miss = [r for r in rows_for_top if r[0] == "MISSING_404"]
    if not miss:
        md.append("_(none)_")
    else:
        for verdict, key, a_len, b_len, _, _ in miss:
            tab_str = f" / {key[1]}" if key[1] else ""
            md.append(f"- `{key[0]}{tab_str}`")

    md.extend([
        "",
        "## BROKEN routes",
        "",
    ])
    broken = [r for r in rows_for_top if r[0] == "BROKEN"]
    if not broken:
        md.append("_(none)_")
    else:
        for verdict, key, a_len, b_len, _, note in broken:
            tab_str = f" / {key[1]}" if key[1] else ""
            md.append(f"- `{key[0]}{tab_str}` — {note}")

    return "\n".join(md) + "\n"


def main():
    with sync_playwright() as p:
        # Headless to avoid focus-stealing; switch to headless=False to watch.
        browser = p.chromium.launch(headless=True)
        all_logs = {}
        for account in (ACCT_A, ACCT_B):
            all_logs[account["label"]] = audit_account(browser, account)
        browser.close()

    (OUT_DIR / "audit_log.json").write_text(
        json.dumps(all_logs, indent=2), encoding="utf-8"
    )
    md = build_verdict_markdown(all_logs)
    (OUT_DIR / "baseline_audit_summary.md").write_text(md, encoding="utf-8")
    print(f"\n[done] wrote {OUT_DIR}/baseline_audit_summary.md")


if __name__ == "__main__":
    main()
