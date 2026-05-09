# Soft Launch Playbook — First 10 Customers

Reference for the founder-led onboarding calls during week 1 of soft launch.
Read top-to-bottom before the first call. Skim the relevant section before each subsequent call.

---

## Pre-call checklist (per customer)

- [ ] Confirmed their email + name + business name (matches what they used to sign up)
- [ ] Noted their primary use case: PL? Wholesale? Mixed?
- [ ] Laptop charged, screen-share enabled, audio tested
- [ ] `#soft-launch-customers` Slack channel open in another tab
- [ ] Sentry tab open (filter: `cohort:soft-launch`) so you see errors as they happen
- [ ] Latest `git log main` skimmed so you know what shipped that morning

## During the call (15–20 min)

### 1. Set the frame (1 min)

> "You're one of 10 founding customers. You're getting your first month for $1 so you can stress-test the product. In return, I want your honest feedback — what's broken, what's missing, what's confusing. I'd rather you tell me now than write a bad review later."

Don't oversell. Don't apologize for early-stage rough edges. Acknowledge them and move on.

### 2. Walk through signup (3 min)

- Send them to https://amazon-fba-saas.vercel.app/signup
- Watch them fill the form. Note hesitation points (which field made them pause).
- Watch them check email → click verification link.
- Note: trial starts here. From this moment they have 14 days.

### 3. Onboarding wizard (5 min)

- Watch them through all 4 steps. Don't drive — let them.
- Step 4 (demo scan): watch the page render. Note if they understand what they're seeing.
- If they get stuck on a step, write down the step number and the exact word that confused them.

### 4. Dashboard tour (5 min)

- Click each sidebar item with them.
- For each: "Tell me what you'd use this for." Listen. Don't pitch.
- Demo Product Radar with one of their actual ASINs (ask for one before the call).

### 5. Pricing conversation (3 min)

- Show /billing page.
- "After your $1 month, the tier you'd want is X — here's why based on what we just saw."
- Get a verbal: either "yes I'll upgrade" or an explicit "I'll think about it." Both are fine; ambiguity is not.

### 6. Feedback ask (2 min)

- "What's one thing you'd change before recommending this to a peer?"
- Write it down verbatim. Repeat it back to confirm you got it right.

## Post-call

- [ ] Add customer to `#soft-launch-customers` Slack with one-line intro
- [ ] Log feedback in `docs/customer-feedback-week1.md` (create file on first call, append per call)
- [ ] Send follow-up email within 24h: thank-you + the one feedback item you heard + ETA if a fix is queued
- [ ] Tag account in Sentry user metadata as `cohort:soft-launch`

## What to watch for during the week

For each onboarded account, by end of day 7:

- They logged in at least 3 times (Sentry shows daily active sessions)
- They ran a real scan (`audit_logs` shows `scout.run` events tied to their org)
- They completed onboarding (`user.onboarding_completed = true`)
- They did NOT churn (status stays `trialing` → `active`, not `cancelled`)

If any of those four are missing for any customer at end of week 1, send a personal "anything I can help with?" email. Don't templatize.

## Daily standup format (post in Slack each morning)

```
DAY N STATS
- Active customers: X / 10
- Trials in progress: X (days left for nearest expiry: X)
- Upgrades to paid: X
- Critical bugs reported: X (linked: #N, #M)
- Today's priority: <single most important thing>
```

Single sentence for "today's priority." If it doesn't fit on one line, you don't actually have a priority.

## When something breaks

1. Reproduce it yourself, on prod, with a fresh account (not your own org).
2. File a GitHub issue with: customer email, exact URL, exact error, screenshot, browser version.
3. If you can fix in <30 minutes, ship a hotfix on a `fix/<descriptor>` branch and merge same-day.
4. If you can't, hand to Stream A or Stream B for next-day work.
5. Email customer within 4 hours: "Saw your report. Issue tracked at #N. ETA: X."

## When something is missing (feature requests)

Don't promise to build it. Use this exact phrasing:

> "Logged that. We're tracking demand on it. I'll tell you in 2 weeks if it's prioritized."

Real demand patterns will emerge across the 10 customers. Don't pre-build for one voice. Wait for three.

## Common issues to expect

- **"I forgot to verify my email."** → resend verification link from the admin panel, or have them re-enter email on signup (idempotent).
- **"I clicked the Stripe link and came back to a broken page."** → check `success_url` config in `backend/stripe_billing.py`, verify the webhook fired in Stripe dashboard.
- **"I don't see my data."** → check RLS is enforcing for their org_id, check JWT contains the right org_id (decode at https://jwt.io).
- **"The dashboard is blank."** → likely a 500 in a downstream API call. Check Sentry filtered by their `organization_id` tag.
- **"Sign Out doesn't work."** → fixed in PR #32 on Day 6. If it recurs, hotfix is `Sidebar.handleSignOut` must call `useAuth().logout()`, not localStorage manipulation.

## Rollback flags (per CONVENTIONS.md §Rollback playbook)

Set in Railway env if any feature destabilizes during soft launch:

- `STRIPE_DISABLED=true` — billing routes return 503 cleanly
- `RATE_LIMIT_DISABLED=true` — slowapi middleware no-ops
- `SENTRY_DSN=` (empty) — SDK silently disables
- `EMAIL_DISABLED=true` — all sends become no-op + log
- `RLS_ENFORCED=false` — multi-tenancy reverts to app-layer filtering only

Each flag is honored by both streams' code; redeploy not required.

## Go / no-go decision (end of week 1)

Promote to wider rollout (50 customers) only if all four are true:

1. ≥7 of 10 customers logged in 3+ times
2. ≥5 of 10 ran at least one real scan
3. ≤2 critical bugs reported (P0/P1) AND each has a fix or workaround live
4. ≥3 verbal upgrade commitments

If any fail, stay in soft-launch mode for week 2. Don't rationalize.
