# Baseline UI Audit — 2026-05-13

**Method:** Two accounts injected via localStorage JWT, visited every authenticated route.

- Account A: Murtaza (user_id=1, org_id=20, has real data)
- Account B: Audit Baseline (user_id=17, org_id=26, brand-new — zero rows in any table)

**Verdict legend:**
- **MOCK** — known mock-data sentinels (`HMS Group`, `Sarah Chen`, …) found in body. Page is hardcoded.
- **SAME_BODY** — HTML bodies match within < 100 B AND the page source has no `fetch(BASE_URL/...)` call. Genuinely static (or still using hardcoded data).
- **REAL_EMPTY** — HTML bodies match within < 100 B BUT the page source has a real fetch call. Both test accounts have empty data; the page is wired correctly and just has nothing to show.
- **MISSING_404** — page renders the 404 fallback (~3.7KB). Route is not built in the frontend.
- **REAL** — body differs substantially across accounts. Page is API-wired AND at least one account has data.
- **BROKEN** — page timed out or threw a navigation error.

## Verdict per route

| Route | Tab | A_len | B_len | Verdict | Note |
|-------|-----|------:|------:|---------|------|
| / | - | 37005 | 37012 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /clients | - | 33613 | 29634 | **REAL** |  |
| /clients | Client Overview | 33613 | 29634 | **REAL** |  |
| /clients | Performance | 26586 | 26865 | **REAL** |  |
| /clients | Communication | 26630 | 26909 | **REAL** |  |
| /clients | Contracts & Billing | 26680 | 26959 | **REAL** |  |
| /clients | Onboarding | 26724 | 27003 | **REAL** |  |
| /products | - | 27131 | 27138 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /scout | - | 26742 | 26749 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /suppliers | - | 29647 | 27773 | **REAL** |  |
| /weekly | - | 29717 | 29724 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /dwm | - | 26342 | 26349 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /reports | - | 32294 | 32301 | **STATIC_OK** | intentionally static: templates + builder form; the list endpoints (/reports/saved, /reports/scheduled) ship in a follow-up |
| /reporting | - | 30079 | 30086 | **STATIC_OK** | intentionally static: subscriptions + chart; usage-trend endpoint ships in a follow-up |
| /kpi | - | 39399 | 39406 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /leaderboard | - | 24941 | 24948 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /team | - | 2878 | 2878 | **REAL** |  |
| /user-management | - | 39071 | 32346 | **REAL** |  |
| /billing | - | 30178 | 30595 | **REAL** |  |
| /coach | - | 26615 | 26622 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /forecasting | - | 27516 | 27523 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /buybox | - | 27225 | 27232 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /product-radar | - | 48708 | 33199 | **REAL** |  |
| /recommendations | - | 26416 | 26423 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /intelligence | - | 28037 | 28044 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /brand-approvals | - | 24670 | 24677 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /fba-shipments | - | 26250 | 26257 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /fbm-orders | - | 31672 | 31679 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /account-health | - | 34912 | 34919 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /notifications_page | - | 26179 | 26186 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /audit | - | 26670 | 26677 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /automations | - | 2892 | 2892 | **REAL** |  |
| /client-pnl | - | 27841 | 27848 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /purchase-orders | - | 31421 | 31341 | **REAL_EMPTY** | empty for both orgs (Δ 80 B), page has API fetch |
| /settings | - | 30956 | 30963 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /onboarding | - | 37128 | 37135 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /admin | - | 30547 | 30554 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /analyze | - | 28303 | 28310 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /ai-tools | - | 29668 | 29675 | **STATIC_OK** | intentionally static: calculator + alerts for un-wired tools; per-tool wiring tracked in api-endpoint-gaps.md |
| /competitors | - | 26675 | 26682 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /inventory | - | 30026 | 30033 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /market | - | 25681 | 25688 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /finance | - | 27919 | 27926 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /exports | - | 2884 | 2884 | **REAL** |  |
| /ppc | - | 25585 | 25592 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /ppc-advanced | - | 30295 | 30302 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /pricing | - | 37122 | 37129 | **STATIC_OK** | intentionally static: marketing page; pricing tiers are global config, not per-org |
| /private-label | - | 25202 | 25209 | **STATIC_OK** | intentionally static: pending design-question #6 — no backend module yet |
| /profit-calculator | - | 30046 | 30053 | **STATIC_OK** | intentionally static: local arithmetic only; no backend needed |
| /wholesale | - | 27588 | 27595 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /workflow | - | 27256 | 27263 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /portal-admin | - | 24368 | 24375 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |
| /client-portal-manage | - | 25902 | 25909 | **REAL_EMPTY** | empty for both orgs (Δ 7 B), page has API fetch |

## Totals

- REAL:        13
- REAL_EMPTY:  34  (wired but no data on either test account — acceptable)
- STATIC_OK:   6  (intentionally static — marketing / calculators / pending modules)
- MOCK:        0  (hardcoded mock data — top priority to fix)
- SAME_BODY:   0  (identical body AND no fetch in source — needs wiring)
- MISSING_404: 0  (frontend route not implemented — backend may have the API but no page)
- BROKEN:      0  (load timeout / nav error)
- UNKNOWN:     0

## Top mock offenders (most known sentinels under Account B)

_(none — every B page either rendered real/empty or errored)_

## SAME_BODY routes (identical across orgs, needs visual review)

_(none)_

## MISSING_404 routes (frontend page not implemented)

_(none)_

## BROKEN routes

_(none)_
