"""
Backend health audit script for Ecom Era FBA SaaS.

Logs in as Murtaza (Owner), reads the OpenAPI spec from prod,
and hits every GET endpoint with safe defaults. Outputs a
color-coded report grouped by tag.

Usage:
    python audit.py

Output:
    - Console: live progress + summary table
    - audit_report_<timestamp>.txt: full report saved to disk
    - audit_report_<timestamp>.json: machine-readable for diffing across runs

Run this whenever you want a complete backend health map.
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from collections import defaultdict
from datetime import datetime

# ============================================================
# CONFIG
# ============================================================
BASE_URL = "https://amazon-fba-saas-production.up.railway.app"
USERNAME = "murtaza"
PASSWORD = "Admin@2024"
TIMEOUT = 15

# ANSI colors for terminal output (Windows 10+ supports these)
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
GRAY = "\033[90m"
BOLD = "\033[1m"
RESET = "\033[0m"


def banner(text):
    line = "=" * 70
    print(f"\n{CYAN}{BOLD}{line}\n{text}\n{line}{RESET}\n")


def http_request(method, url, headers=None, body=None, timeout=TIMEOUT):
    """Returns (status_code, body_text, error_str). Never raises."""
    req_headers = headers or {}
    data = None
    if body is not None:
        if isinstance(body, dict):
            data = urllib.parse.urlencode(body).encode("utf-8")
            req_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
        elif isinstance(body, (bytes, bytearray)):
            data = body
        else:
            data = str(body).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace"), None
    except urllib.error.HTTPError as e:
        body_text = ""
        try:
            body_text = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        return e.code, body_text, None
    except urllib.error.URLError as e:
        return 0, "", f"URL error: {e.reason}"
    except Exception as e:
        return 0, "", f"Exception: {type(e).__name__}: {e}"


def login():
    """Try common login endpoint shapes and return JWT token."""
    candidate_paths = ["/auth/login", "/login", "/api/auth/login", "/api/login", "/token"]
    for path in candidate_paths:
        url = BASE_URL + path
        # Try form-encoded (FastAPI OAuth2PasswordRequestForm style)
        status, body, err = http_request(
            "POST", url, body={"username": USERNAME, "password": PASSWORD}
        )
        if status == 200:
            try:
                data = json.loads(body)
                token = data.get("access_token") or data.get("token") or data.get("jwt")
                if token:
                    return token, path
            except Exception:
                pass
        # Try JSON body
        json_body = json.dumps({"username": USERNAME, "password": PASSWORD}).encode("utf-8")
        status, body, err = http_request(
            "POST",
            url,
            headers={"Content-Type": "application/json"},
            body=json_body,
        )
        if status == 200:
            try:
                data = json.loads(body)
                token = data.get("access_token") or data.get("token") or data.get("jwt")
                if token:
                    return token, path
            except Exception:
                pass
    return None, None


def fetch_openapi(token):
    """Fetch the OpenAPI spec from prod."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    status, body, err = http_request("GET", f"{BASE_URL}/openapi.json", headers=headers)
    if status != 200:
        print(f"{RED}Failed to fetch /openapi.json: status={status}, err={err}{RESET}")
        sys.exit(1)
    return json.loads(body)


def safe_default_value(param_schema):
    """Return a safe default for a query parameter based on its schema."""
    t = (param_schema or {}).get("type", "")
    if t == "integer":
        return "1"
    if t == "number":
        return "1"
    if t == "boolean":
        return "false"
    if t == "string":
        fmt = param_schema.get("format", "")
        if fmt == "date":
            return "2026-01-01"
        if fmt == "date-time":
            return "2026-01-01T00:00:00"
        if "enum" in param_schema and param_schema["enum"]:
            return str(param_schema["enum"][0])
        return "test"
    if t == "array":
        return ""
    return "1"


def build_url_with_params(base_path, parameters):
    """Build a URL substituting path params and adding required query params."""
    path = base_path
    query = []
    for p in parameters or []:
        loc = p.get("in")
        name = p.get("name")
        required = p.get("required", False)
        schema = p.get("schema") or {}
        # Inline schema sometimes nested under 'schema', sometimes flat
        if not schema and "type" in p:
            schema = {"type": p["type"]}
        default = safe_default_value(schema)
        if loc == "path":
            placeholder = "{" + name + "}"
            path = path.replace(placeholder, urllib.parse.quote(default))
        elif loc == "query" and required:
            query.append(f"{name}={urllib.parse.quote(default)}")
    if query:
        path = path + "?" + "&".join(query)
    return path


def categorize_status(status):
    if status == 200:
        return "ok"
    if status == 0:
        return "network"
    if 200 <= status < 300:
        return "ok"
    if status in (401, 403):
        return "auth"
    if status == 404:
        return "missing"
    if status == 422:
        return "schema"
    if 400 <= status < 500:
        return "client_error"
    if 500 <= status < 600:
        return "server_error"
    return "unknown"


def color_for_category(cat):
    return {
        "ok": GREEN,
        "auth": YELLOW,
        "missing": RED,
        "schema": RED,
        "client_error": RED,
        "server_error": RED,
        "network": RED,
        "unknown": GRAY,
    }.get(cat, GRAY)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict",
        action="store_true",
        help=(
            "Exit 1 if any 5xx response is seen (default: exit 0 unless the "
            "audit cannot run at all). Used by the prod-smoke GitHub Action."
        ),
    )
    parser.add_argument(
        "--prod",
        action="store_true",
        help=(
            "Reserved flag — kept so CI can pass it explicitly even though "
            "audit.py already hits the production URL by default."
        ),
    )
    parser.add_argument(
        "--markdown",
        action="store_true",
        help=(
            "Write an extra audit_report_<timestamp>.md summary suitable for "
            "GitHub Actions step output (renders nicely as a job-summary table)."
        ),
    )
    args = parser.parse_args()

    banner("Ecom Era FBA SaaS - Backend Health Audit")
    start = time.time()

    # 1. Auth — either reuse AUDIT_JWT from env (CI) or log in (local dev).
    audit_jwt = os.environ.get("AUDIT_JWT", "").strip()
    if audit_jwt:
        print(f"{CYAN}1. Using AUDIT_JWT from env (skipping login).{RESET}")
        token = audit_jwt
        login_path = "<env AUDIT_JWT>"
    else:
        print(f"{CYAN}1. Logging in as {USERNAME}...{RESET}")
        token, login_path = login()
        if not token:
            print(f"{RED}LOGIN FAILED. Check credentials or endpoint paths.{RESET}")
            print(f"{GRAY}Tried: /auth/login, /login, /api/auth/login, /api/login, /token{RESET}")
            print(f"{GRAY}For CI: set AUDIT_JWT env var to a pre-minted prod token.{RESET}")
            sys.exit(1)
    print(f"{GREEN}   Authenticated via {login_path}{RESET}")
    print(f"{GRAY}   Token: {token[:30]}...{RESET}\n")

    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Fetch OpenAPI spec
    print(f"{CYAN}2. Fetching OpenAPI spec...{RESET}")
    spec = fetch_openapi(token)
    paths = spec.get("paths", {})
    print(f"{GREEN}   Spec loaded - {len(paths)} unique paths{RESET}\n")

    # 3. Walk every GET endpoint
    print(f"{CYAN}3. Probing every GET endpoint...{RESET}\n")
    results = []
    skipped = []
    by_tag = defaultdict(list)
    counter = 0
    total_get = sum(1 for p in paths.values() if "get" in p)

    for path, methods in paths.items():
        if "get" not in methods:
            continue
        op = methods["get"]
        op_id = op.get("operationId", "")
        tags = op.get("tags") or ["untagged"]
        params = op.get("parameters", [])

        # Skip endpoints requiring complex bodies / file uploads
        if "requestBody" in op:
            skipped.append((path, "requires request body"))
            continue

        full_path = build_url_with_params(path, params)
        url = BASE_URL + full_path
        status, body, err = http_request("GET", url, headers=auth_headers)
        cat = categorize_status(status)
        color = color_for_category(cat)
        snippet = ""
        if status == 422 or (status >= 400 and status < 500):
            try:
                detail = json.loads(body).get("detail")
                if isinstance(detail, list) and detail:
                    snippet = str(detail[0])[:120]
                elif isinstance(detail, str):
                    snippet = detail[:120]
            except Exception:
                snippet = body[:120] if body else ""

        record = {
            "path": path,
            "tested_url": full_path,
            "tag": tags[0],
            "operation_id": op_id,
            "status": status,
            "category": cat,
            "error": err,
            "snippet": snippet,
        }
        results.append(record)
        by_tag[tags[0]].append(record)

        counter += 1
        sigil = "OK" if cat == "ok" else "FAIL"
        status_str = str(status) if status > 0 else "ERR"
        print(f"   {color}[{counter:3d}/{total_get}] {sigil:4s} {status_str:>3} {path}{RESET}")
        if snippet and cat != "ok":
            print(f"        {GRAY}--> {snippet}{RESET}")

    # 4. Summary
    elapsed = time.time() - start
    banner("SUMMARY")

    counts = defaultdict(int)
    for r in results:
        counts[r["category"]] += 1

    total = len(results)
    print(f"  Total endpoints probed: {BOLD}{total}{RESET}")
    print(f"  Skipped (complex body): {len(skipped)}")
    print(f"  Time elapsed:           {elapsed:.1f}s\n")

    label_map = [
        ("ok",            "Working                 "),
        ("schema",        "422 Schema mismatch     "),
        ("missing",       "404 Not found           "),
        ("auth",          "401/403 Auth issue      "),
        ("client_error",  "4xx other client error  "),
        ("server_error",  "5xx server error        "),
        ("network",       "Network/timeout         "),
        ("unknown",       "Unknown status          "),
    ]
    for cat_key, label in label_map:
        c = counts.get(cat_key, 0)
        if c == 0:
            continue
        color = color_for_category(cat_key)
        pct = (c / total * 100) if total else 0
        print(f"  {color}{label}{RESET} {c:4d}  ({pct:5.1f}%)")

    # 5. Per-tag breakdown
    banner("BY TAG")
    for tag in sorted(by_tag.keys()):
        records = by_tag[tag]
        oks = sum(1 for r in records if r["category"] == "ok")
        bads = len(records) - oks
        bad_str = f"{RED}{bads} bad{RESET}" if bads else f"{GREEN}all good{RESET}"
        print(f"  {BOLD}{tag}{RESET}: {oks}/{len(records)} OK - {bad_str}")
        for r in records:
            if r["category"] != "ok":
                color = color_for_category(r["category"])
                print(f"     {color}--> [{r['status']}] {r['path']}{RESET}")

    # 6. Save reports
    banner("SAVING REPORTS")
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    txt_path = f"audit_report_{timestamp}.txt"
    json_path = f"audit_report_{timestamp}.json"

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(f"Ecom Era FBA SaaS - Backend Audit Report\n")
        f.write(f"Run: {datetime.now().isoformat()}\n")
        f.write(f"Base URL: {BASE_URL}\n")
        f.write(f"Total: {total} endpoints | Working: {counts.get('ok', 0)} | Broken: {total - counts.get('ok', 0)}\n")
        f.write("=" * 70 + "\n\n")
        for tag in sorted(by_tag.keys()):
            f.write(f"\n## {tag}\n")
            for r in by_tag[tag]:
                marker = "[OK]" if r["category"] == "ok" else f"[{r['status']}]"
                f.write(f"  {marker:7s} {r['path']}\n")
                if r["snippet"] and r["category"] != "ok":
                    f.write(f"           --> {r['snippet']}\n")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "totals": dict(counts),
            "results": results,
            "skipped": [{"path": p, "reason": r} for p, r in skipped],
        }, f, indent=2)

    print(f"  {GREEN}Text report:  {txt_path}{RESET}")
    print(f"  {GREEN}JSON report:  {json_path}{RESET}\n")

    # Optional Markdown summary (GitHub Actions renders this nicely as a
    # job-summary table when written to $GITHUB_STEP_SUMMARY).
    if args.markdown:
        md_path = f"audit_report_{timestamp}.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(f"# Audit — {datetime.now().isoformat()}\n\n")
            f.write(f"- Base URL: `{BASE_URL}`\n")
            f.write(f"- Total endpoints probed: **{total}**\n")
            f.write(f"- Working: **{counts.get('ok', 0)}**\n")
            f.write(f"- Broken: **{total - counts.get('ok', 0)}**\n\n")
            f.write("## Category breakdown\n\n")
            f.write("| Category | Count | % |\n")
            f.write("|---|---:|---:|\n")
            for cat_key, label in label_map:
                c = counts.get(cat_key, 0)
                if c == 0:
                    continue
                pct = (c / total * 100) if total else 0
                f.write(f"| {label.strip()} | {c} | {pct:.1f}% |\n")
            f.write("\n## Failures by tag\n\n")
            for tag in sorted(by_tag.keys()):
                records = by_tag[tag]
                bads = [r for r in records if r["category"] != "ok"]
                if not bads:
                    continue
                f.write(f"### {tag} ({len(bads)} bad)\n\n")
                for r in bads:
                    f.write(f"- `[{r['status']}]` `{r['path']}`")
                    if r.get("snippet"):
                        snip = r["snippet"][:200].replace("\n", " ")
                        f.write(f" — {snip}")
                    f.write("\n")
                f.write("\n")
        print(f"  {GREEN}Markdown:     {md_path}{RESET}")
        # Append to $GITHUB_STEP_SUMMARY if running under Actions, so the
        # summary table surfaces in the workflow run page automatically.
        gh_summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if gh_summary:
            try:
                with open(md_path, "r", encoding="utf-8") as src, \
                     open(gh_summary, "a", encoding="utf-8") as dst:
                    dst.write(src.read())
                    dst.write("\n")
            except Exception as e:
                print(f"  {YELLOW}(could not append to GITHUB_STEP_SUMMARY: {e}){RESET}")
        print()

    # 7. Exit code policy:
    #    - Default: always exit 0 (audit is informational).
    #    - --strict: exit 1 if any 5xx response is in the results. Used by
    #      the prod-smoke GitHub Action so a regression page on call.
    broken = total - counts.get("ok", 0)
    five_xx_count = counts.get("server_error", 0) + counts.get("network", 0)

    if broken == 0:
        print(f"{GREEN}{BOLD}All {total} endpoints healthy.{RESET}\n")
        sys.exit(0)

    pct = broken / total * 100 if total else 0
    print(f"{YELLOW}{BOLD}{broken} of {total} endpoints broken ({pct:.1f}%). See report files.{RESET}\n")

    if args.strict and five_xx_count > 0:
        print(
            f"{RED}{BOLD}--strict: {five_xx_count} 5xx / network errors — exiting 1.{RESET}\n"
        )
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    # Enable ANSI colors on Windows 10+
    if sys.platform == "win32":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except Exception:
            pass
    main()
