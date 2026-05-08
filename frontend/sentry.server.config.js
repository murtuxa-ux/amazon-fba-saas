// Sentry Node SDK init. Loaded by `@sentry/nextjs` for server-side code paths
// (API routes, getServerSideProps). DSN is read without the NEXT_PUBLIC_ prefix
// so it stays out of the client bundle. Empty DSN = silently disabled.
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

const SENSITIVE_KEY_HINTS = ["password", "token", "card", "cvv", "ssn", "secret", "authorization"];

function scrub(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrub);
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEY_HINTS.some((h) => lower.includes(h))) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = scrub(value);
    }
  }
  return out;
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || "production",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request) {
        if (event.request.data) event.request.data = scrub(event.request.data);
        if (event.request.headers) event.request.headers = scrub(event.request.headers);
        if (event.request.cookies) event.request.cookies = scrub(event.request.cookies);
      }
      return event;
    },
  });
}
