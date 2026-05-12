# Design Questions — Mock-Data Purge

Filed as blockers come up. Each item describes the missing schema /
endpoint and asks for Murtaza's call before proceeding.

---

## 1. `client_communications` table

**Trigger:** `/clients` Communication tab is fully hardcoded (HMS Group / Sarah Chen).

**Need:** A log of internal-staff communications with a client — notes,
phone calls, emails — visible only to internal users (not to the client
themselves via the external portal).

**Existing schema that's close-but-not-right:**
`client_portal.py` has `/profiles/{profile_id}/notes` writing to
`client_portal_notes`. That table is for the **external** portal (the
client-facing UI), so re-using it would expose internal notes to
clients.

**Proposed schema:**
```sql
CREATE TABLE client_communications (
  id           SERIAL PRIMARY KEY,
  org_id       INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id    INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type         VARCHAR(20) NOT NULL,  -- 'note' | 'call' | 'email' | 'meeting'
  subject      VARCHAR(200),
  body         TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);
-- RLS: tenant_isolation policy on org_id, like every customer-data table.
```

**Question for Murtaza:** Confirm this schema + name. Or reuse
`client_portal_notes` with an `internal_only` boolean flag (cheaper,
less duplication)?

**Status:** Pending Murtaza decision.

---

## 2. `client_contracts` table

**Trigger:** `/clients` Contracts & Billing tab.

**Need:** A per-client contract record with start/end dates, contract
value, currency, billing cadence, auto-renew flag. Also: tie invoices
to a specific client (currently `invoices.org_id` only).

**Proposed schema:**
```sql
CREATE TABLE client_contracts (
  id              SERIAL PRIMARY KEY,
  org_id          INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_value  NUMERIC(12,2),
  currency        VARCHAR(8) DEFAULT 'USD',
  start_date      DATE NOT NULL,
  end_date        DATE,
  billing_cycle   VARCHAR(20),  -- 'monthly' | 'quarterly' | 'annual' | 'one-time'
  auto_renew      BOOLEAN DEFAULT false,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active' | 'ended' | 'cancelled'
  notes           TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE invoices ADD COLUMN client_id INTEGER REFERENCES clients(id);
```

**Question:** Confirm schema; also confirm we want to backfill
`invoices.client_id` for existing rows (manual mapping) or leave as
null for pre-purge invoices.

**Status:** Pending.

---

## 3. `client_performance` aggregation endpoint

**Trigger:** `/clients` Performance tab.

**Need:** Per-client metrics — weekly revenue, products active, weekly
trend %, attainment vs target. Pulls from ClientPnL + DWMDailyLogs +
products counts.

**Proposed endpoint:**
```
GET /clients/{client_id}/performance?period=week|month|quarter

Returns:
{
  "revenue_current": 12500.00,
  "revenue_prior": 11200.00,
  "trend_pct": 11.6,
  "products_active": 47,
  "weekly_attainment_pct": 92.0,
  "weekly_target": 14000.00,
  ...
}
```

**Question:** What's the exact list of metrics + which target source
(KPI targets module? hard-coded "weekly revenue × N" formula?)?

**Status:** Pending.

---

## 4. Amazon SP-API live-inventory ingest

**Trigger:** `/inventory` page.

**Need:** Live inventory state per ASIN — `fulfillable`, `inbound`,
`reserved`, `unfulfillable` counts pulled from Amazon's
`/fba/inventory/v1/summaries` endpoint.

**Status:** No SP-API ingest module currently exists. Frontend renders
empty state via the stub `GET /inventory/` endpoint added in this PR.

**Question:** When does SP-API ingest module ship? Is it a Q2 thing,
or a Day 8+ scope-add?

**Status:** Pending. Frontend will stay on empty state until decided.

---

## 5. Internal-staff view of external client onboarding

**Trigger:** `/clients` Onboarding tab.

**Need:** Internal staff want to see (and update) onboarding step
progress for each client. The external portal has its own onboarding
flow (`client_portal.py:/profiles/{id}/onboarding`).

**Two options:**

**A.** Reuse the external portal endpoint with an `internal_view=true`
flag so internal-staff calls return the same checklist but with the
ability to also see internal-only steps.

**B.** Add a sibling `client_onboarding_steps` table specifically for
the internal-staff view of "Brand approval submitted", "First shipment
sent", "Keepa account linked" etc.

**Question:** Which option? Option A is cheaper; Option B keeps
internal vs external concerns clean.

**Status:** Pending.

---

## 6. `private_label` module

**Trigger:** `/private-label` page.

**Need:** Private-label product lifecycle tracking — product idea →
manufacturer outreach → samples → branding → launch → reorder cadence.

**Status:** No module exists. Page currently SAME_BODY (static
placeholder).

**Question:** Is this in scope for soft-launch or deferred?

**Status:** Pending.

---

## 7. Weekly executive-summary schema (`/weekly`)

**Trigger:** `/weekly` page is fully hardcoded — fake KPIs ($52,340 revenue,
$21,840 profit, 1,820 orders, 41.7% ROI), fake department updates
(Wholesale / Private Label / PPC / Operations cards each with hardcoded
highlights / blockers / next-steps), fake action items list (John/Sarah/
Mike/Alex/Jessica).

**Need:** A weekly executive summary covering:
- **Top-line KPIs** (revenue, profit, orders, ROI, new SKUs, active
  promos) — partly available via `/client-pnl/monthly-overview` +
  `/products` count, but summed across the wrong period; need a weekly
  aggregation endpoint.
- **Department updates** with highlights / blockers / next-steps per
  department (Wholesale, PL, PPC, Operations). No backend support — this
  is a structured stand-up record per week.
- **Action items** with assignee, priority, due date, status. Distinct
  from DWMDailyLogs (daily check-ins) and audit_logs (system events).

**Two options:**

**A.** Single `weekly_summaries` table with JSONB columns for `kpis`,
   `department_updates`, `action_items`. Simpler to wire, less normalized.

**B.** Three separate tables: `weekly_action_items`,
   `weekly_department_updates`, and rely on existing P&L data for KPIs.
   More normalized, more endpoints to wire.

**Question:** Which option, and should the page be a dedicated route
versus a tab inside `/reports`?

**Status:** Pending. Until decided, `/weekly` ships a minimal weekly
summary using only KPIs that exist (revenue/profit from
`/client-pnl/trends`, leaderboard from `/dwm/leaderboard`) and a
placeholder for department updates + action items.

---

## 8. `/wholesale` page scope vs `/profit-calculator`

**Trigger:** Both pages exist but only `wholesale_profit_calculator.py`
backend.

**Need:** Clarify whether `/wholesale` is a broader wholesale deal
pipeline (similar to a CRM Kanban board) or just a synonym for
`/profit-calculator`.

**Status:** Pending Murtaza decision.

---

## How this file is used

Every time the Tier 1-4 wiring work hits a question that needs
Murtaza's design call, a new section gets added here. Wiring of the
affected page stops; the next page is started.

Once Murtaza answers, the relevant entry is removed and the wiring
continues.
