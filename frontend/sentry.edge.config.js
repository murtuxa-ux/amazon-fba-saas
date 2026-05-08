// Sentry edge runtime init. Loaded by `@sentry/nextjs` for code that runs in
// the edge runtime (middleware, edge API routes). We don't ship any edge code
// today, but Sentry's webpack wrapper imports this file unconditionally — a
// missing module breaks the build, hence the placeholder init.
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || "production",
    tracesSampleRate: 0.1,
  });
}
