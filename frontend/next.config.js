/** @type {import('next').NextConfig} */
// Trigger Vercel rebuild
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
};

// withSentryConfig wraps the Next config so Sentry's webpack plugin can
// upload source maps and inject the SDK. `silent: true` suppresses noisy
// build-time logs; the wrapper is a no-op at runtime when SENTRY_DSN is empty
// (the SDK init in sentry.*.config.js silently skips), so this stays safe to
// keep on all envs.
module.exports = withSentryConfig(nextConfig, { silent: true });
