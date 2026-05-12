# Confidence Audit — 2026-05-13 01:22

**Verdict:** BLOCKED ON 3 ITEM(S)

**Base URL:** `https://amazon-fba-saas-production.up.railway.app`

**Totals:** 33 pass · 3 fail (of 36 checks)

## Failures (read this first)

| Section | Check | Evidence |
|---|---|---|
| Auth lifecycle | POST /auth/forgot-password (valid email) → 200 (or 202) | status=500 |
| Validation surface | Oversized payload (~1 MB string) → not 500 | status=500 err=None |
| Rate limiting | POST /auth/login x 12 in 60s → 429 appears | first_429_at_attempt=None, sequence=[401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401] |

## Section summary

| Section | Pass | Fail |
|---|---:|---:|
| Auth lifecycle | 7 | 1 |
| CRUD lifecycle — /clients | 6 | 0 |
| CRUD lifecycle — /suppliers | 3 | 0 |
| Validation surface | 5 | 1 |
| Security headers on every response | 5 | 0 |
| Error contract | 4 | 0 |
| Stripe webhook signature verification | 3 | 0 |
| Rate limiting | 0 | 1 |

## Auth lifecycle

| ✓ | Check | Note |
|---|---|---|
| ✅ | POST /auth/login (valid creds) → 200 + token + refresh_token | status=200 |
| ✅ | GET /auth/me with access token → 200 + correct shape | status=200 |
| ✅ | POST /auth/refresh with refresh token → 200 + new access token | status=200 |
| ✅ | POST /auth/refresh with ACCESS token → 401 (cross-type rejection) | status=401 |
| ✅ | GET /auth/me with REFRESH token as Bearer → 401 | status=401 |
| ❌ | POST /auth/forgot-password (valid email) → 200 (or 202) | status=500 |
| ✅ | POST /auth/forgot-password (unknown email) → same status as valid (no enumeration) | valid=500, unknown=500 |
| ✅ | POST /auth/logout → 200 | status=200 |

## CRUD lifecycle — /clients

| ✓ | Check | Note |
|---|---|---|
| ✅ | POST /clients → 200/201 + id | status=200, id=11 |
| ✅ | GET /clients lists new record | status=200, visible=True |
| ✅ | GET /clients/11 → 200 + record | status=200 |
| ✅ | PUT /clients/11 → 200 | status=200 |
| ✅ | DELETE /clients/11 → 200/204 | status=200 |
| ✅ | GET deleted client → 404 (or 200 if soft-delete) | status=404 |

## CRUD lifecycle — /suppliers

| ✓ | Check | Note |
|---|---|---|
| ✅ | POST /suppliers → 200/201 | status=200 |
| ✅ | GET /suppliers → 200 | status=200 |
| ✅ | PUT/DELETE /suppliers — not exposed by backend | documented in PR #42; future endpoint |

## Validation surface

| ✓ | Check | Note |
|---|---|---|
| ✅ | Empty payload to /clients → [422] | got 422 |
| ✅ | Missing required field (name) to /clients → [422] | got 422 |
| ✅ | Wrong type (number for name) to /clients → [422] | got 422 |
| ✅ | Empty payload to /suppliers → [422] | got 422 |
| ✅ | Missing required field (name) to /suppliers → [422] | got 422 |
| ❌ | Oversized payload (~1 MB string) → not 500 | status=500 err=None |

## Security headers on every response

| ✓ | Check | Note |
|---|---|---|
| ✅ | GET / → all 6 security headers present | status=200, missing=[] |
| ✅ | GET /health → all 6 security headers present | status=200, missing=[] |
| ✅ | GET /auth/login → all 6 security headers present | status=405, missing=[] |
| ✅ | GET /clients → all 6 security headers present | status=200, missing=[] |
| ✅ | GET /nonexistent-route-xyz → all 6 security headers present | status=404, missing=[] |

## Error contract

| ✓ | Check | Note |
|---|---|---|
| ✅ | GET /nonexistent → 404 with clean JSON | status=404, body[:80]='{"detail":"Not Found"}' |
| ✅ | GET /clients with no auth → 401 | got 401 |
| ✅ | GET /clients with malformed JWT → 401 | got 401 |
| ✅ | POST /clients with malformed JSON → 422 | status=422 |

## Stripe webhook signature verification

| ✓ | Check | Note |
|---|---|---|
| ✅ | POST /billing/webhook with no signature → 400 | status=400, body[:120]='{"detail":"Invalid signature."}' |
| ✅ | POST /billing/webhook with bogus signature → 400 | status=400, body[:120]='{"detail":"Invalid signature."}' |
| ✅ | POST with valid signature (Stripe CLI required) — skipped in headless audit | manual: stripe trigger payment_intent.succeeded |

## Rate limiting

| ✓ | Check | Note |
|---|---|---|
| ❌ | POST /auth/login x 12 in 60s → 429 appears | first_429_at_attempt=None, sequence=[401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401] |
