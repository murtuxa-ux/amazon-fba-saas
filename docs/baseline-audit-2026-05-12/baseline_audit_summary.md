# Baseline UI Audit — 2026-05-12

**Method:** Two accounts injected via localStorage JWT, visited every authenticated route.

- Account A: Murtaza (user_id=1, org_id=20, has real data)
- Account B: Audit Baseline (user_id=17, org_id=26, brand-new — zero rows in any table)

**Verdict legend:**
- **MOCK** — known mock-data sentinels (`HMS Group`, `Sarah Chen`, …) found in body. Page is hardcoded.
- **SAME_BODY** — HTML body length differs by < 100 bytes between two different orgs. Strong signal of hardcoded data (or a static page). Needs visual review.
- **MISSING_404** — page renders the 404 fallback (~3.7KB). Route is not built in the frontend.
- **REAL** — body differs substantially across accounts, no sentinels. Page is API-wired.
- **BROKEN** — page timed out or threw a navigation error.

## Verdict per route

| Route | Tab | A_len | B_len | Verdict | Note |
|-------|-----|------:|------:|---------|------|
| / | - | 39438 | 39445 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /clients | - | 36258 | 36265 | **MOCK** | 16 known sentinels |
| /clients | Client Overview | 36258 | 36265 | **MOCK** | 16 known sentinels |
| /clients | Performance | 36724 | 36731 | **MOCK** | 7 known sentinels |
| /clients | Communication | 29743 | 29750 | **MOCK** | 8 known sentinels |
| /clients | Contracts & Billing | 39287 | 39294 | **MOCK** | 7 known sentinels |
| /clients | Onboarding | 32629 | 32636 | **MOCK** | 4 known sentinels |
| /products | - | 27131 | 27138 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /scout | - | 26742 | 26749 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /suppliers | - | 60456 | 60463 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /weekly | - | 48237 | 48244 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /dwm | - | 31470 | 31477 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /reports | - | 32294 | 32301 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /reporting | - | 30079 | 30086 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /kpi | - | 56593 | 56600 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /leaderboard | - | 50941 | 50948 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /team | - | 36102 | 28167 | **REAL** |  |
| /user-management | - | 39071 | 32346 | **REAL** |  |
| /billing | - | 30176 | 30595 | **REAL** |  |
| /coach | - | 26615 | 26622 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /forecasting | - | 27516 | 27523 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /buybox | - | 27225 | 27232 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /product-radar | - | 48708 | 33199 | **REAL** |  |
| /recommendations | - | 38188 | 38195 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /intelligence | - | 28037 | 28044 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /brand-approvals | - | 24670 | 24677 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /fba-shipments | - | 0 | 0 | **BROKEN** | Page.goto: Timeout 20000ms exceeded.
Call log:
  - navigating to "https://amazon-fba-saas.vercel.app/fba-shipments", wai |
| /fbm-orders | - | 31672 | 31679 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /account-health | - | 34912 | 34919 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /notifications_page | - | 36849 | 36856 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /audit | - | 50019 | 50026 | **MOCK** | 1 known sentinels |
| /automations | - | 2892 | 2892 | **REAL** |  |
| /client-pnl | - | 27841 | 27848 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /purchase-orders | - | 31421 | 31341 | **SAME_BODY** | identical body across orgs (Δ 80 B) |
| /settings | - | 30956 | 30963 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /onboarding | - | 39561 | 39568 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /admin | - | 30547 | 30554 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /analyze | - | 28303 | 28310 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /ai-tools | - | 29668 | 29675 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /competitors | - | 33658 | 33665 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /inventory | - | 0 | 0 | **BROKEN** | Page.goto: Timeout 20000ms exceeded.
Call log:
  - navigating to "https://amazon-fba-saas.vercel.app/inventory", waiting |
| /market | - | 47041 | 47048 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /finance | - | 27919 | 27926 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /exports | - | 32992 | 32999 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /ppc | - | 25585 | 25592 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /ppc-advanced | - | 30295 | 30302 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /pricing | - | 39555 | 39562 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /private-label | - | 35587 | 35594 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /profit-calculator | - | 30046 | 30053 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /wholesale | - | 27588 | 27595 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /workflow | - | 33767 | 33774 | **MOCK** | 1 known sentinels |
| /portal-admin | - | 24368 | 24375 | **SAME_BODY** | identical body across orgs (Δ 7 B) |
| /client-portal-manage | - | 29852 | 29859 | **SAME_BODY** | identical body across orgs (Δ 7 B) |

## Totals

- REAL:        5
- MOCK:        8  (hardcoded mock data — top priority to fix)
- SAME_BODY:   38  (identical body across two orgs — strong mock signal, needs visual review)
- MISSING_404: 0  (frontend route not implemented — backend may have the API but no page)
- BROKEN:      2  (load timeout / nav error)
- UNKNOWN:     0

## Top mock offenders (most known sentinels under Account B)

- `/clients` — 16 sentinels: HMS Group, Crescent Innovations, Crescent, BrightPath Solutions, BrightPath
- `/clients / Client Overview` — 16 sentinels: HMS Group, Crescent Innovations, Crescent, BrightPath Solutions, BrightPath
- `/clients / Communication` — 8 sentinels: HMS Group, Crescent Innovations, Crescent, BrightPath Solutions, BrightPath
- `/clients / Performance` — 7 sentinels: HMS Group, Crescent Innovations, Crescent, BrightPath Solutions, BrightPath
- `/clients / Contracts & Billing` — 7 sentinels: HMS Group, Crescent Innovations, Crescent, BrightPath Solutions, BrightPath
- `/clients / Onboarding` — 4 sentinels: HMS Group, BrightPath Solutions, BrightPath, Emily Watson
- `/audit` — 1 sentinels: Sarah Chen
- `/workflow` — 1 sentinels: Sarah Chen

## SAME_BODY routes (identical across orgs, needs visual review)

- `/` — A=39438 B=39445 (identical body across orgs (Δ 7 B))
- `/products` — A=27131 B=27138 (identical body across orgs (Δ 7 B))
- `/scout` — A=26742 B=26749 (identical body across orgs (Δ 7 B))
- `/suppliers` — A=60456 B=60463 (identical body across orgs (Δ 7 B))
- `/weekly` — A=48237 B=48244 (identical body across orgs (Δ 7 B))
- `/dwm` — A=31470 B=31477 (identical body across orgs (Δ 7 B))
- `/reports` — A=32294 B=32301 (identical body across orgs (Δ 7 B))
- `/reporting` — A=30079 B=30086 (identical body across orgs (Δ 7 B))
- `/kpi` — A=56593 B=56600 (identical body across orgs (Δ 7 B))
- `/leaderboard` — A=50941 B=50948 (identical body across orgs (Δ 7 B))
- `/coach` — A=26615 B=26622 (identical body across orgs (Δ 7 B))
- `/forecasting` — A=27516 B=27523 (identical body across orgs (Δ 7 B))
- `/buybox` — A=27225 B=27232 (identical body across orgs (Δ 7 B))
- `/recommendations` — A=38188 B=38195 (identical body across orgs (Δ 7 B))
- `/intelligence` — A=28037 B=28044 (identical body across orgs (Δ 7 B))
- `/brand-approvals` — A=24670 B=24677 (identical body across orgs (Δ 7 B))
- `/fbm-orders` — A=31672 B=31679 (identical body across orgs (Δ 7 B))
- `/account-health` — A=34912 B=34919 (identical body across orgs (Δ 7 B))
- `/notifications_page` — A=36849 B=36856 (identical body across orgs (Δ 7 B))
- `/client-pnl` — A=27841 B=27848 (identical body across orgs (Δ 7 B))
- `/purchase-orders` — A=31421 B=31341 (identical body across orgs (Δ 80 B))
- `/settings` — A=30956 B=30963 (identical body across orgs (Δ 7 B))
- `/onboarding` — A=39561 B=39568 (identical body across orgs (Δ 7 B))
- `/admin` — A=30547 B=30554 (identical body across orgs (Δ 7 B))
- `/analyze` — A=28303 B=28310 (identical body across orgs (Δ 7 B))
- `/ai-tools` — A=29668 B=29675 (identical body across orgs (Δ 7 B))
- `/competitors` — A=33658 B=33665 (identical body across orgs (Δ 7 B))
- `/market` — A=47041 B=47048 (identical body across orgs (Δ 7 B))
- `/finance` — A=27919 B=27926 (identical body across orgs (Δ 7 B))
- `/exports` — A=32992 B=32999 (identical body across orgs (Δ 7 B))
- `/ppc` — A=25585 B=25592 (identical body across orgs (Δ 7 B))
- `/ppc-advanced` — A=30295 B=30302 (identical body across orgs (Δ 7 B))
- `/pricing` — A=39555 B=39562 (identical body across orgs (Δ 7 B))
- `/private-label` — A=35587 B=35594 (identical body across orgs (Δ 7 B))
- `/profit-calculator` — A=30046 B=30053 (identical body across orgs (Δ 7 B))
- `/wholesale` — A=27588 B=27595 (identical body across orgs (Δ 7 B))
- `/portal-admin` — A=24368 B=24375 (identical body across orgs (Δ 7 B))
- `/client-portal-manage` — A=29852 B=29859 (identical body across orgs (Δ 7 B))

## MISSING_404 routes (frontend page not implemented)

_(none)_

## BROKEN routes

- `/fba-shipments` — Page.goto: Timeout 20000ms exceeded.
Call log:
  - navigating to "https://amazon-fba-saas.vercel.app/fba-shipments", wai
- `/inventory` — Page.goto: Timeout 20000ms exceeded.
Call log:
  - navigating to "https://amazon-fba-saas.vercel.app/inventory", waiting
