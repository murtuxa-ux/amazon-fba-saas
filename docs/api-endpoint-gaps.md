# API Endpoint Gap Inventory — Mock-Data Purge

**Generated:** 2026-05-12
**Source:** `docs/baseline-audit-2026-05-12/baseline_audit_summary.md`
**Backend route catalog:** 460 routes across `backend/*.py`

This doc drives the Tier 1-4 wiring work. For every page that the
baseline audit flagged as MOCK or SAME_BODY, it answers:
1. What data shape does the page need?
2. Does the backend already expose it?
3. If yes, why isn't the frontend using it?
4. If no, what's missing and what's the next step?

Status legend:
- ✅ READY — backend endpoint exists, frontend just needs wiring
- 🟡 SHAPE_MISMATCH — backend exists but returns a different shape than the frontend expects
- 🔴 MISSING — backend endpoint or module is missing entirely (file design question)
- ⚙️ SCHEMA_GAP — endpoint exists but lacks fields the page renders (auth, perf metrics, etc.)

---

## TIER 1 — Core daily-use

### `/` (index/dashboard) — SAME_BODY (Δ 7 B)
- **Needs:** KPI cards (active clients, products tracked, weekly revenue, alerts count), recent activity feed, top performers.
- **Backend:** `GET /clients`, `GET /products`, `GET /dwm/dashboard`, `GET /analytics/overview`, `GET /audit-logs` all exist ✅
- **Status:** READY. Index just renders static placeholder content; needs to compose 4-5 API calls into KPI widgets.
- **Next:** Replace hardcoded numbers/copy in `frontend/pages/index.js` with `Promise.all([...])` of the 5 endpoints above.

### `/clients` Overview tab — MOCK (16 sentinels)
- **Needs:** List of org's clients (id, name, contact, email, phone, status, created_at).
- **Backend:** `GET /clients` ✅ (returns org-scoped list per `main.py:736`)
- **Status:** READY.
- **Next:** Strip the hardcoded `HMS Group / Crescent / BrightPath …` array from `frontend/pages/clients.js`, fetch `/clients` on mount, render in a `<DataTable>`. Add `<AddClientModal>` for POST `/clients`.

### `/clients` Performance tab — MOCK (7 sentinels)
- **Needs:** Per-client performance metrics — revenue, products active, weekly trend, attainment vs target.
- **Backend:** `GET /clients/{id}/summary` exists in client_pnl.py:536 ✅; `GET /dwm/weekly` returns per-client breakdowns ✅
- **Status:** 🟡 SHAPE_MISMATCH — neither returns the exact "Performance tab" shape the page renders.
- **Next:** Add `GET /clients/{id}/performance` aggregation endpoint that joins ClientPnL + DWMDailyLogs + Products counts.

### `/clients` Communication tab — MOCK (8 sentinels)
- **Needs:** Per-client communication log — notes, calls, emails (type, body, author, created_at).
- **Backend:** `client_portal.py` has `/profiles/{id}/notes` ✅ but it's the EXTERNAL portal model, not the internal CRM notes.
- **Status:** 🔴 MISSING — no `client_communications` table for the internal-staff "log a call/note" workflow.
- **Next:** Design question — should we reuse `client_portal_users.notes` schema, or add a new `client_communications` table for internal staff use? (See `docs/design-questions.md`.)

### `/clients` Contracts & Billing tab — MOCK (7 sentinels)
- **Needs:** Per-client contract record (start, end, value, currency, renewal date, billing terms) + invoice history.
- **Backend:** `finance_pl.py` has invoices ✅ but they're not linked to clients table directly.
- **Status:** 🔴 MISSING — no `contracts` table. Invoices have org_id, not client_id.
- **Next:** Design question — add `client_contracts` table + FK on `invoices.client_id`?

### `/clients` Onboarding tab — MOCK (4 sentinels)
- **Needs:** Per-client onboarding step progress (steps array, current step, completion timestamps).
- **Backend:** `client_portal.py:468` has `GET /profiles/{id}/onboarding` ✅ but that's again the EXTERNAL portal.
- **Status:** 🟡 SHAPE_MISMATCH — internal-staff onboarding tracking (e.g., "Brand approval submitted", "First shipment sent") is different from external client portal onboarding.
- **Next:** Reuse the external portal endpoint with an `internal_view=true` flag, OR add a sibling `client_onboarding_steps` table.

### `/products` — SAME_BODY (Δ 7 B)
- **Needs:** Org's product list with ASIN, title, brand, category, status, BuyBox %.
- **Backend:** `GET /products` likely exists (main.py routes), plus `products_manager.py` has Phase 7-11 endpoints.
- **Status:** ✅ READY (need to verify shape).
- **Next:** Grep `GET /products` in main.py and confirm shape. If the frontend has hardcoded products array, swap to API.

### `/suppliers` — SAME_BODY (Δ 7 B)
- **Needs:** Supplier list (name, contact, products supplied, terms).
- **Backend:** `GET /suppliers` should exist.
- **Status:** ✅ READY (verify shape).
- **Next:** Verify and wire.

### `/scout` — SAME_BODY (Δ 7 B)
- **Needs:** Keepa-backed product search results.
- **Backend:** `ai_product_radar.py` has `/scan`, `/categories`, `/live-scan` ✅
- **Status:** READY but Keepa-token-dependent.
- **Next:** Wire to `/product-radar/scan`. If Keepa tokens are exhausted, show empty state with rate-limit message.

### `/weekly` + `/dwm` — SAME_BODY (Δ 7 B)
- **Needs:** Daily / weekly / monthly report submissions per team member.
- **Backend:** `dwm_reporting.py` has full CRUD: `/dwm/daily`, `/dwm/weekly`, `/dwm/monthly`, `/dwm/dashboard`, `/dwm/leaderboard`, `/dwm/team-members`, `/dwm/approvals` ✅
- **Status:** ✅ READY — comprehensive backend, frontend just isn't using it.
- **Next:** Big wiring job — `frontend/pages/weekly.js` and `frontend/pages/dwm.js` need full rewrite to call these endpoints.

---

## TIER 2 — Business intelligence

### `/reports` + `/reporting` — SAME_BODY
- **Needs:** Cross-module reports — revenue, products, clients, FBA performance.
- **Backend:** `report_generator.py` has `/reports/executive`, `/reports/manager/{id}`, `/reports/weekly-summary` ✅; analytics_engine has `/analytics/overview`, `/analytics/roi-analysis`, `/analytics/efficiency`, `/analytics/growth` ✅
- **Status:** ✅ READY.
- **Next:** Wire dropdown filters → API call → render charts/tables.

### `/kpi` — SAME_BODY (Δ 7 B)
- **Needs:** KPI targets vs actuals per period.
- **Backend:** `kpi_targets.py` exists with router ✅
- **Status:** ✅ READY (verify shape).
- **Next:** Wire.

### `/leaderboard` — SAME_BODY (Δ 7 B)
- **Needs:** Top performers by metric (products hunted, brands contacted, approvals, order value).
- **Backend:** `dwm_reporting.py:818` has `/dwm/leaderboard` ✅
- **Status:** ✅ READY.
- **Next:** Wire to `/dwm/leaderboard?metric=…&period=…`.

### `/client-pnl` — SAME_BODY (Δ 7 B)
- **Needs:** Per-client P&L statements, monthly overview, trends.
- **Backend:** `client_pnl.py` has full CRUD: GET/POST/PUT/DELETE `/client-pnl`, `/client-pnl/monthly-overview`, `/client-pnl/trends`, `/client-pnl/{id}/line-items` ✅
- **Status:** ✅ READY.
- **Next:** Wire.

### `/purchase-orders` — SAME_BODY (Δ 80 B)
- **Needs:** Open / completed POs per supplier, per client.
- **Backend:** `purchase_orders.py` is in `_dynamic_routers` — exists with router.
- **Status:** ✅ READY (verify shape).
- **Next:** Wire.

### `/finance` — SAME_BODY (Δ 7 B)
- **Needs:** P&L statements, cash flow, expenses, invoices.
- **Backend:** `finance_pl.py` has comprehensive endpoints ✅
- **Status:** ✅ READY.
- **Next:** Wire.

### `/profit-calculator` — SAME_BODY (Δ 7 B)
- **Needs:** Wholesale profit calculation per ASIN/scenario.
- **Backend:** `wholesale_profit_calculator.py` exists as dynamic router.
- **Status:** ✅ READY (verify shape).
- **Next:** Wire.

---

## TIER 3 — AI + advanced

### `/coach` — SAME_BODY (Δ 7 B)
- **Needs:** Top-5 daily action feed.
- **Backend:** `ai_coach.py:305` has `/feed` ✅, plus dismiss/complete/feedback/regenerate.
- **Status:** ✅ READY.

### `/forecasting` — SAME_BODY (Δ 7 B)
- **Needs:** Per-ASIN 30/60/90-day demand forecast + dashboard.
- **Backend:** `ai_forecasting.py` has `/asin/{asin}`, `/dashboard` ✅
- **Status:** ✅ READY.

### `/buybox` — SAME_BODY (Δ 7 B)
- **Needs:** Tracked ASINs, BuyBox status, alerts, competitor analysis.
- **Backend:** `ai_buybox.py` has full surface: `/tracked`, `/track`, `/tracked/{asin}` delete, `/analytics`, `/alerts`, `/status/{asin}`, `/competitors/{asin}`, `/reprice-suggestion`, `/history/{asin}` ✅
- **Status:** ✅ READY.

### `/recommendations` — SAME_BODY (Δ 7 B)
- **Needs:** Recommended ASINs, similar products, trending.
- **Backend:** `ai_recommendations.py` has `/`, `/similar/{asin}`, `/trending` ✅
- **Status:** ✅ READY.

### `/intelligence` — SAME_BODY (Δ 7 B)
- **Needs:** Composite intelligence dashboard, alerts, scoring.
- **Backend:** `intelligence_hub.py` has `/dashboard`, `/alerts`, `/score/{asin}`, `/scores` ✅
- **Status:** ✅ READY.

### `/competitors` — SAME_BODY (Δ 7 B)
- **Needs:** Competitor tracker — overview, crowded categories, by-brand drill.
- **Backend:** `competitor_tracker.py` has `/overview`, `/crowded`, `/brand/{brand}` ✅
- **Status:** ✅ READY.

### `/market` — SAME_BODY (Δ 7 B)
- **Needs:** Market overview, trends, per-category.
- **Backend:** `market_analyzer.py` has `/market/overview`, `/market/trends`, `/market/category/{cat}` ✅
- **Status:** ✅ READY.

### `/ai-tools`, `/analyze` — SAME_BODY (Δ 7 B)
- **Needs:** Composite AI utilities page.
- **Backend:** Multiple endpoints exist across `ai_*.py` modules.
- **Status:** ✅ READY (consolidation).

### `/brand-approvals` — SAME_BODY (Δ 7 B)
- **Needs:** Brand approval submissions, documents, timeline, stats.
- **Backend:** `brand_approval_tracker.py` has full CRUD + documents + timeline + stats ✅
- **Status:** ✅ READY.

### `/account-health` — SAME_BODY (Δ 7 B)
- **Needs:** Account health overview, score history, violations, alerts, benchmarks.
- **Backend:** `account_health_monitor.py` has full surface ✅
- **Status:** ✅ READY.

### `/private-label` — SAME_BODY (Δ 7 B)
- **Needs:** Private-label product lifecycle tracking.
- **Backend:** No `private_label.py` exists.
- **Status:** 🔴 MISSING module.
- **Next:** Design question — is this a future module? Show "coming soon" state for now.

---

## TIER 4 — Operational / admin

### `/notifications_page` — SAME_BODY (Δ 7 B)
- **Needs:** Notification feed for the user.
- **Backend:** `notification_service.py` exists with router ✅
- **Status:** ✅ READY.

### `/audit` — MOCK (1 sentinel: Sarah Chen)
- **Needs:** Audit-log table for the org.
- **Backend:** `audit_logs.py:114` has `GET /api/audit-logs` ✅ (paginated, role-gated).
- **Status:** ✅ READY.

### `/settings` — SAME_BODY (Δ 7 B)
- **Needs:** User profile, password, notifications, team, Keepa key, Amazon SP-API creds.
- **Backend:** `/auth/me`, `/users/me`, `/auth/change-password`, `amazon_integration.py:/credentials` ✅
- **Status:** ✅ READY.

### `/onboarding` — SAME_BODY (Δ 7 B)
- **Needs:** 4-step internal user onboarding wizard.
- **Backend:** `backend/onboarding.py` has the sprint endpoint ✅
- **Status:** ✅ READY.

### `/admin` — SAME_BODY (Δ 7 B)
- **Needs:** Admin dashboard — system health, user mgmt.
- **Backend:** Several admin endpoints across modules.
- **Status:** ✅ READY (consolidation page).

### `/portal-admin`, `/client-portal-manage` — SAME_BODY
- **Needs:** External portal admin — manage portal users, profiles, magic links.
- **Backend:** `client_portal.py` and `client_portal_external.py` exist ✅
- **Status:** ✅ READY.

### `/exports` — SAME_BODY (Δ 7 B)
- **Needs:** PDF/CSV export queue + history.
- **Backend:** `pdf_exporter.py` exists with router ✅
- **Status:** ✅ READY.

### `/workflow` — MOCK (1 sentinel: Sarah Chen)
- **Needs:** Internal workflow/automation rules.
- **Backend:** `automation_service.py` has `/rules`, `/logs`, `/templates`, `/preview/{id}` ✅
- **Status:** ✅ READY.

### `/ppc`, `/ppc-advanced` — SAME_BODY (Δ 7 B)
- **Needs:** PPC campaign management.
- **Backend:** `ppc_manager.py` (dynamic), `ppc_advanced.py` exist.
- **Status:** ✅ READY (verify shape).

### `/pricing` — SAME_BODY (Δ 7 B)
- **Needs:** Pricing optimization recommendations.
- **Backend:** `pricing_optimizer.py` exists with router ✅
- **Status:** ✅ READY.

### `/wholesale` — SAME_BODY (Δ 7 B)
- **Needs:** Wholesale-specific deal flow.
- **Backend:** `wholesale_profit_calculator.py` is the only wholesale module.
- **Status:** 🟡 SHAPE_MISMATCH — the page likely wants a broader wholesale deal pipeline UI.
- **Next:** Clarify scope with Murtaza — is this the same as `/profit-calculator`?

### `/fbm-orders` — SAME_BODY (Δ 7 B)
- **Needs:** FBM order list, pending, returns, dashboard metrics.
- **Backend:** `fbm_order_manager.py` has comprehensive CRUD + ship/deliver/return + dashboard ✅
- **Status:** ✅ READY.

### `/fba-shipments` — was BROKEN
- **Needs:** FBA shipment list + create + items + packing + tracking.
- **Backend:** `fba_shipment_planner.py` has full CRUD + items + packing + ship + tracking + dashboard metrics + cost estimate ✅
- **Status:** ✅ READY. The Phase-0 "BROKEN" was a Playwright `networkidle` artifact, not a real page bug.

### `/inventory` — was BROKEN
- **Needs:** Product-level inventory state (sku, asin, title, fulfillable, inbound, dailyVelocity, daysOfStock, reorderPoint).
- **Backend:** `inventory_forecaster.py` has `/forecast`, `/reorder`, `/seasonal` but NO list endpoint. Stubbed `GET /inventory/` in this PR returning empty list so the page renders empty state.
- **Status:** 🔴 MISSING — proper data requires Amazon SP-API live ingest. The frontend's shape is SP-API-shaped, not ScoutResult-shaped.
- **Next:** Design question — when does Amazon SP-API ingest module ship? Until then, page stays on empty state.

---

## Cross-cutting backend gaps

1. **No `client_communications` table** — needed for `/clients` Communication tab.
2. **No `client_contracts` table** — needed for `/clients` Contracts & Billing tab.
3. **No `client_performance` aggregation endpoint** — needed for `/clients` Performance tab.
4. **No SP-API live-inventory ingest** — needed for `/inventory` and parts of `/fba-shipments`.
5. **No "internal-staff" onboarding view of external clients** — `/clients` Onboarding tab needs a sibling endpoint to `client_portal.py:/profiles/{id}/onboarding`.

Each of the above is a separate design question to file in `docs/design-questions.md` before Tier 1 work proceeds.

---

## How to use this doc

For each page you wire:
1. Check the page's section above.
2. If ✅ READY — just wire frontend → API.
3. If 🟡 SHAPE_MISMATCH — fix the backend response shape first (with a migration if needed).
4. If 🔴 MISSING — stop, file design question, skip page, move on.

Audit progress after each wiring goes into `docs/mock-data-audit-progress.md`.
