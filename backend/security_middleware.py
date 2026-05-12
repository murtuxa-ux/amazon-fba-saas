"""Security response headers (PR §day7 dispatch item 2).

Adds defensive HTTP headers to every response so the API surface declares
its security posture explicitly. No behavioral change to the routes
themselves — purely additive headers on the way out.

Headers added (with rationale):

  X-Content-Type-Options: nosniff
      Tells browsers not to MIME-sniff. If a route accidentally returns a
      JSON body with the wrong Content-Type, the browser won't decide it's
      executable HTML/JS.

  X-Frame-Options: DENY
      Defense-in-depth against clickjacking. The API is consumed by the
      Vercel SPA over CORS, never inside an iframe; this is purely a
      kill-switch if a sub-page is ever embedded somewhere we don't expect.
      Stronger than CSP frame-ancestors alone because some older browsers
      ignore CSP.

  Referrer-Policy: strict-origin-when-cross-origin
      Limits the Referer header to the origin (no path) when navigating
      cross-origin — prevents leaking authenticated paths to third parties.

  Strict-Transport-Security: max-age=31536000; includeSubDomains
      1 year. Railway terminates TLS upstream; this header tells browsers
      to refuse plain-HTTP fetches to the API for a year after the first
      successful HTTPS hit.

  Permissions-Policy: geolocation=(), microphone=(), camera=()
      Browsers won't ask the user for these permissions when a page on
      this origin tries to use the corresponding API. The API doesn't
      need any of these; opt out explicitly.

  Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
      The API never serves HTML/JS that should be executable in a browser.
      `default-src 'none'` blocks ALL resource fetches from any browser
      that does load the response. `frame-ancestors 'none'` mirrors
      X-Frame-Options: DENY for CSP-only browsers.

Rollback: if a downstream consumer relies on framing or HTTP, remove the
relevant header here — no env-var flag is wired because these headers
should never need to flip at runtime.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds the six baseline security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none'"
        )
        return response
