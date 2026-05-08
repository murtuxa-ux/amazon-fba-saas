# 7-Day Sprint Conventions

These conventions are binding for both streams. Read before opening any PR.

## Branch naming
- Stream A: `feat/A-<descriptor>` (e.g., `feat/A-stripe-checkout`)
- Stream B: `feat/B-<descriptor>` (e.g., `feat/B-rate-limiter`)
- Bug fix: `fix/<descriptor>`

## File ownership during sprint
| Owner | Files |
|---|---|
| Stream A | `backend/signup.py`, `backend/stripe_billing.py`, `backend/onboarding.py`, `frontend/pages/signup.js`, `frontend/pages/billing.js`, `frontend/pages/onboarding.js`, `frontend/components/SignupForm.*`, `frontend/components/OnboardingWizard.*` |
| Stream B | `backend/rate_limiter.py`, `backend/observability.py`, `backend/audit_logs.py`, `backend/keepa_service.py`, `backend/ai_forecasting.py`, `backend/ai_coach.py`, `frontend/components/Sentry*` |
| Shared (require coordination) | `backend/main.py`, `backend/auth.py`, `backend/models.py`, `backend/schemas.py`, `backend/config.py`, `frontend/lib/api.js`, `frontend/lib/auth.js` |

When touching shared files, comment in the PR description: "Touched shared file X — ping other stream before review."

## Tier limit enforcement
A single helper lives at `backend/tier_limits.py` (Stream A creates it during the Stripe work). Signature:

```python
async def enforce_limit(
    db: Session,
    org: Organization,
    resource: Literal['users', 'clients', 'asins', 'ai_scans', 'keepa_lookups'],
    increment: int = 1,
) -> None:
    """Raise HTTPException(402) if org would exceed tier limit. Otherwise record usage."""
```

Tier table is hard-coded in `tier_limits.py` for v1. Don't put it in DB. Streams A and B both call this helper.

## Stripe webhook signature verification
Stream A's stripe_billing.py uses Stripe's official sig verification:
```python
sig_header = request.headers["stripe-signature"]
event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
```
Never trust a webhook without verifying the signature. STRIPE_WEBHOOK_SECRET is set via Railway env.

## Sentry tagging
All Sentry events tagged with:
```python
sentry_sdk.set_tag("organization_id", current_user.org_id)
sentry_sdk.set_user({"id": current_user.id, "username": current_user.username})
```
Stream B sets this in `tenant_session()` middleware so every authed request auto-tags.

## Pydantic schema rules (sprint-wide)
- All list response models return `[]` not `null`. Use `Field(default_factory=list)`.
- All optional numeric fields default to `0`. Use `Field(default=0)`.
- All response models inherit from `OrgScopedResponse` if they include any tenant data — Stream A creates this base class in schemas.py during signup work.

## Rate limit defaults (Stream B sets)
- Default: 60 req/min per user, 200 req/min per IP
- Auth endpoints: 5 req/min per IP (login, signup, password reset) — anti-brute-force
- AI scan endpoints: tier-gated via tier_limits.enforce_limit
- Keepa-backed lookups: tier-gated + global daily cap

## Email sending
Stream A's signup uses email_service.py (already migrated to Resend HTTP API). Templates are HTML strings inline in email_service for v1 — no template engine. 3 templates ship in sprint:
- `welcome_verify(user, link)` — verify your email, link expires 24h
- `trial_ending(user, days_remaining)` — 3 days left, add card link
- `payment_failed(user)` — payment failed, account paused in 3 days, update card link

## Pre-merge checklist (every PR)
- [ ] CI green (`pytest` required check)
- [ ] If touched a shared file, pinged other stream
- [ ] If added new endpoint, ran audit.py against branch deploy and pasted summary in PR description
- [ ] If touched models.py, generated Alembic migration (`alembic revision --autogenerate -m "..."`)
- [ ] No secrets in code (use Railway env vars)
- [ ] No new entries to org_filter_allowlist.txt without justification

## Daily merge cadence
- Day 1-6: each stream lands 1-2 PRs/day, merged into main same-day
- Day 7: integration testing only, no new PRs
- If a PR is incomplete at end of day, push WIP to branch and pick up tomorrow

## Rollback playbook
- Stripe issue: set `STRIPE_DISABLED=true` in Railway env, billing routes return 503 cleanly
- Rate limit issue: set `RATE_LIMIT_DISABLED=true`, slowapi middleware no-ops
- Sentry issue: set `SENTRY_DSN=` (empty), SDK silently disables
- Email issue: set `EMAIL_DISABLED=true`, all sends become no-op + log
- RLS issue: set `RLS_ENFORCED=false` (already in place from PR #14)

Each stream MUST honor these flags so we can rollback features without redeploying.

## End-of-day standup format
At end of each day, paste in chat:

```
DAY N STATUS
Stream A: [yesterday's PR(s) merged] + [today's WIP] + [blockers]
Stream B: [same]
Cross-stream: [shared file conflicts, decisions needed]
Murtaza tasks: [DNS status, Stripe account, copy writing, etc.]
Tomorrow: [highest-priority work for each stream]
```
