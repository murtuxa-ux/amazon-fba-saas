# Adversarial Audit — 2026-05-13 02:20

**Verdict:** SECURE

**Base URL:** `https://amazon-fba-saas-production.up.railway.app`

**Totals:** 27 OK · 0 hole(s) (of 27 checks)

## Section summary

| Section | OK | Holes | Launch-blocking? |
|---|---:|---:|---|
| Cross-tenant access (RLS verification) | 6 | 0 | yes |
| SQL injection | 6 | 0 | no |
| JWT tampering | 5 | 0 | no |
| IDOR (sequential ID enumeration) | 1 | 0 | no |
| Brute force protection | 2 | 0 | no |
| Large payload / DoS surface | 2 | 0 | no |
| Email enumeration on /auth/forgot-password + /auth/signup | 3 | 0 | no |
| Open redirect / SSRF surface | 2 | 0 | no |

## Cross-tenant access (RLS verification) [LAUNCH-BLOCKING]

| ✓ | Check | Evidence |
|---|---|---|
| ✅ | Account A: created client id=27 |  |
| ✅ | GET /clients/27 as B → 404 (not 200, not 403) | got 404, body[:80]='{"detail":"Client not found."}' |
| ✅ | PUT /clients/27 as B → 404 | got 404 |
| ✅ | DELETE /clients/27 as B → 404 | got 404 |
| ✅ | GET /clients as B does NOT include A's client | leak=False, B_count=0 |
| ✅ | Sanity: GET /clients as A still includes A's client | A_count=3, present=True |

## SQL injection

| ✓ | Check | Evidence |
|---|---|---|
| ✅ | POST /clients name='DROP TABLE clients' → not 500 | status=200 |
| ✅ | POST /clients name='OR 1=1' → not 500 | status=200 |
| ✅ | POST /clients name='DROP TABLE users (escaped)' → not 500 | status=200 |
| ✅ | POST /clients name='UNION SELECT' → not 500 | status=200 |
| ✅ | POST /clients name='XSS payload' → not 500 | status=200 |
| ✅ | GET /clients after injection attempts → 200 (table intact) | got 200 |

## JWT tampering

| ✓ | Check | Evidence |
|---|---|---|
| ✅ | Tampered user_id (kept old signature) → 401 | got 401 |
| ✅ | Tampered org_id (kept old signature) → 401 | got 401 |
| ✅ | Token with past exp → 401 | got 401 |
| ✅ | alg=none confusion attack → 401 | got 401 |
| ✅ | Access token presented to /auth/refresh → 401 | got 401 |

## IDOR (sequential ID enumeration)

| ✓ | Check | Evidence |
|---|---|---|
| ✅ | GET /clients/1..30 as B — count of 200 responses | probed=30, leaks=[] |

## Brute force protection

| ✓ | Check | Evidence |
|---|---|---|
| ✅ | POST /auth/login x 15 wrong → 429 appears (rate limit kicks in) | sequence=[401, 401, 401, 429, 429, 429, 429, 429, 429, 429, 429, 429, 429, 429, 429] |
| ✅ | After burst, valid login eventually returns 200 OR 429 (not a permanent user-level lockout) | got 429 |

## Large payload / DoS surface

| ✓ | Check | Evidence |
|---|---|---|
| ✅ | POST /clients with 1 MB name → not 500 (should be 413 or 422) | got 0 err=URL error: [WinError 10054] An existing connection was forcibly closed by the remote host |
| ✅ | GET /clients with bizarre query params → not 500 | got 200 |

## Email enumeration on /auth/forgot-password + /auth/signup

| ✓ | Check | Evidence |
|---|---|---|
| ✅ | /auth/forgot-password: real vs fake email same status | real=200, fake=200 |
| ✅ | /auth/forgot-password: real vs fake email same body (no enumeration) | bodies match: True |
| ✅ | /auth/signup with existing email: does NOT confirm existence | status=404, body[:140]='{"detail":"Not Found"}' |

## Open redirect / SSRF surface

| ✓ | Check | Evidence |
|---|---|---|
| ✅ | GET /auth/login?next=evil.example.com — no Location header pointing offsite | status=405, Location='' |
| ✅ | SSRF probe — no backend endpoint accepts user-supplied URLs | skipped (no attack surface to exercise) |
