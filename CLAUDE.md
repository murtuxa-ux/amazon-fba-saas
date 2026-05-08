# Amazon FBA SaaS — Project Context for Claude Code

**SPRINT MODE: 7-day soft launch (May 9-15, 2026).** Read CONVENTIONS.md before any PR.

> Internal wholesale management SaaS for Ecom Era (Murtaza, founder).
> Multi-tenant platform managing wholesale clients, account managers, products, suppliers, weekly reports, and AI-powered analytics for Amazon FBA wholesale operations.

---

## 1. Stack & Deployment

- Frontend: Next.js / React on Vercel (auto-deploy on push to main)
- Backend: Python / FastAPI on Railway (amazon-fba-saas-production.up.railway.app)
- Database: Postgres (Railway add-on)
- Email: Resend HTTP API (NOT SMTP — Railway blocks ports 25/465/587)
- Product data: Keepa API (rotate keys when token-low)

Deployment: push to main -> Vercel rebuilds frontend, Railway rebuilds backend.

---

## 2. Modules (15 sections)

1. Auth (login, forgot/reset password) - Live (email pending DNS)
2. Dashboard - Live
3. Clients - Live
4. Products - Live
5. FBA Scout (Keepa-powered) - Live
6. Weekly Reports (DWM) - Live
7. Suppliers - Live
8. Leaderboard - Live
9. Reports / KPIs - Live
10. AI Modules - ~10/24 files shipped, IN PROGRESS
11. Email - Live (UI; sending blocked on Resend DNS)
12. Settings - Live
13. Advanced Features - Live

---

## 3. Roles & Permissions

- Owner: full access (Murtaza only)
- Admin: everything except billing
- Manager: assigned clients, products, weekly reports
- Viewer: read-only on assigned clients

Default seed credentials (from seed.py):
- murtaza / Admin@2024 (Owner)
- bilal / Manager@123 (Admin)
- ali, sarah / Manager@123 (Manager)
- hamza / Manager@123 (Viewer)

---

## 4. AI Module Build — IN PROGRESS

Stalled at ~10/24 files in previous session.
Next 4 to build (in order):

1. ai_product_radar.py — opportunity scanner. Inputs: category + filters (BSR, price, reviews). Pulls Keepa, scores ASINs by velocity, competition, margin. Returns ranked list.
2. ai_buybox.py — BuyBox win-rate tracker. Per ASIN: win %, avg buy box price, competitor count, repricing alerts.
3. ai_forecasting.py — 30/60/90-day demand forecast using Keepa velocity + seasonality. Output: reorder qty + reorder date.
4. ai_coach.py — daily action surfacing across PPC, inventory, listings, BuyBox. Top 5 actions ranked by $ impact.

Pattern:
- Each AI module = one file in backend/
- Routes registered in main.py under /api/ai/<module>
- Frontend page at frontend/pages/ai/<module>.tsx
- Sidebar nav entry in AI submenu
- Role gate: Owner + Admin always; Manager scoped; Viewer read-only

---

## 5. Known Blockers

Email (Resend DNS):
- email_service.py uses Resend HTTP API
- RESEND_API_KEY set in Railway env
- Blocked on 403/1010 — needs ecomera.us verified in Resend
- Switch Namecheap nameservers from dns-parking.com to Namecheap BasicDNS, add Resend TXT records, set EMAIL_FROM=noreply@ecomera.us in Railway.

Pydantic Settings:
- config.py uses extra = "ignore" — only declared fields load from env. New env vars: declare them as fields OR read from os.environ directly.

---

## 6. Recent Bug Fixes (do not undo)

- frontend/pages/clients.tsx: Array.isArray(u) ? u : [] around /users API
- frontend/pages/reports.tsx: same Array.isArray guard for managers/clients state
- frontend/pages/reports.tsx: (value || 0).toLocaleString() on all 4 number fields

Rule: any .map() over an API response → guard with Array.isArray(). Any .toLocaleString() on a number field → default with || 0.

---

## 7. Brand Standards

Logo: wordmark "ecomera" lowercase, "e"s in golden-yellow circles, "oo" in "ecom" forms infinity symbol.

Colors:
- --brand-black: #1A1A1A — headers, primary text
- --brand-gold: #FFD000 — accents, CTAs, highlights
- --brand-white: #FFFFFF
- --brand-dark-gray: #32373C
- --brand-light-gray: #F5F5F5
- --brand-medium-gray: #E5E5E5

Typography: Sans-serif (Arial / Helvetica / Inter), lowercase-friendly.

Design rules:
- Black headers, white text, gold bottom border on card titles
- Total rows: black bg + gold text
- Input cells: light yellow #FFFDE7 bg + blue text
- Charts: black, gold, green, blue palette only

---

## 8. Working Conventions

- Branching: main for solo work; feat/<name> for risky changes
- Commits: present-tense, scoped ("ai: add product radar scoring service")
- Before commit: backend changes -> python -m pytest; frontend changes -> npm run build
- After deploy: verify Railway logs, check affected page on Vercel URL

---

## 9. First Steps in a Fresh Session

1. git pull
2. Read this file
3. Read backend/main.py to see current route surface
4. Read backend/ai_*.py to see which AI modules exist
5. Confirm with Murtaza: default is continue AI module build

---

## 10. Contact

- Website: www.ecomera.us
- Office: Office 510 Anum Empire, Shahrah e Faisal, Karachi
- Tagline: "Amazon success made simple"
- Founder: Murtaza (murtuxa@gmail.com)
