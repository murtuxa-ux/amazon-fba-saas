# Mock-Data Audit — Progress Tracker

Tracks every page from `docs/baseline-audit-2026-05-12/baseline_audit_summary.md`
as wiring lands. Cross off as each page goes from MOCK/SAME_BODY → REAL or
EMPTY_STATE (different body across two accounts, no sentinels).

Verification: re-run `python scripts/baseline_ui_audit.py` after each PR
and check the diff.

---

## Pre-flight
- [x] PR #37: `/auth/login` 500 fix + slowapi `response: Response` (merged 2026-05-12)
- [x] PR #38 (draft): baseline UI audit deliverable
- [ ] PR #39: pre-flight bundle — `GET /inventory/` stub, audit script wait-strategy, endpoint gap docs

## Tier 1 — Core daily-use

- [ ] `/` (index/dashboard) — KPI cards from `/clients`+`/products`+`/dwm/dashboard`+`/analytics/overview`
- [ ] `/clients` Overview tab — strip HMS Group / Crescent / BrightPath hardcoded array, wire `GET /clients`
- [ ] `/clients` Performance tab — needs new `GET /clients/{id}/performance` aggregation
- [ ] `/clients` Communication tab — needs `client_communications` table (design question #1)
- [ ] `/clients` Contracts & Billing tab — needs `client_contracts` table (design question #2)
- [ ] `/clients` Onboarding tab — clarify internal-vs-external view (design question #5)
- [ ] `/products` — wire `GET /products`
- [ ] `/suppliers` — wire `GET /suppliers`
- [ ] `/scout` — wire `/product-radar/scan`
- [ ] `/weekly` — wire `dwm_reporting` endpoints
- [ ] `/dwm` — wire `dwm_reporting` full surface

## Tier 2 — Business intelligence

- [ ] `/reports` + `/reporting`
- [ ] `/kpi`
- [ ] `/leaderboard`
- [ ] `/client-pnl`
- [ ] `/purchase-orders`
- [ ] `/finance`
- [ ] `/profit-calculator`

## Tier 3 — AI + advanced

- [ ] `/coach`
- [ ] `/forecasting`
- [ ] `/buybox`
- [ ] `/recommendations`
- [ ] `/intelligence`
- [ ] `/competitors`
- [ ] `/market`
- [ ] `/ai-tools`, `/analyze`
- [ ] `/brand-approvals`
- [ ] `/account-health`
- [ ] `/private-label` (deferred — design question #6)

## Tier 4 — Operational / admin

- [ ] `/notifications_page`
- [ ] `/audit`
- [ ] `/settings` (all sub-tabs)
- [ ] `/onboarding`
- [ ] `/admin`
- [ ] `/portal-admin`, `/client-portal-manage`
- [ ] `/exports`
- [ ] `/workflow`
- [ ] `/ppc`, `/ppc-advanced`
- [ ] `/pricing`
- [ ] `/wholesale` (clarify scope — design question #7)
- [ ] `/fbm-orders`
- [ ] `/fba-shipments` (was BROKEN Playwright false-positive — verify renders)
- [ ] `/inventory` (was BROKEN Playwright false-positive — stays on empty state until SP-API ingest)

## Security PRs (interleaved)

- [x] PR #37: `/auth/login` 500 fix (merged)
- [ ] Security headers middleware
- [ ] Exception redaction in prod 500 responses
- [ ] `/auth/login` rate limit tightened to 10/min
- [ ] JWT 24h + refresh tokens
- [ ] `audit.py` in CI
- [ ] RLS self-heal at boot
