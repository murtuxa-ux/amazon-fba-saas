# Overnight Blockers — 2026-05-14 Night

Items where I could not finish or chose not to ship without more info.

## Workstream A — Sprint 2

### A4 — BUG-08 (/clients 7s skeleton)

**Status:** Not reproducible from code inspection.

`frontend/pages/clients.js` `refetch` is a single `api.get('/clients')` —
no sequential awaits, no hardcoded `setTimeout`, no re-render storm.
`lib/api.js` interceptors are: (1) request → attach token, (2) response →
camelCase transform, (3) response → 401 refresh-and-retry. None take 7s.

Most likely external cause: Railway cold-start latency. Backend `/clients`
returned in 303 ms when probed directly per the findings doc, but that
was on a warm pool. Cold restart adds 5-8 s. Front-load the AuthContext
`/auth/me` validation on mount and you've consumed the user's perceived
window on the first navigation after a long idle.

**Recommendation for Murtaza:** instrument with `console.time('clients-load')`
around the `useEffect` in a quick follow-up session, compare against a
warm-pool baseline. If the time is in the `api.get` await, lazily-fetched
KPI panels can render an "appearing soon" placeholder so the table can
paint earlier; if the time is in network, this is a Railway plan upgrade
question, not a frontend bug.

No code change shipped for this item.
