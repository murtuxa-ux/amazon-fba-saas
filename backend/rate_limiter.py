"""slowapi-based rate limiting + Keepa budget guard (§2.5). Stream B owns this."""

from fastapi import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import settings


def _get_user_or_ip(request: Request) -> str:
    """Key function: prefer authenticated user, fall back to IP."""
    user = getattr(request.state, "user", None)
    if user and getattr(user, "id", None):
        return f"user:{user.id}"
    return f"ip:{get_remote_address(request)}"


def _get_org_or_ip(request: Request) -> str:
    """Key function for org-level limits."""
    user = getattr(request.state, "user", None)
    if user and getattr(user, "org_id", None):
        return f"org:{user.org_id}"
    return f"ip:{get_remote_address(request)}"


class _NoOpLimiter:
    """Honors RATE_LIMIT_DISABLED — every decorator/method becomes a passthrough."""

    def limit(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator

    def __call__(self, *args, **kwargs):
        return self


if settings.RATE_LIMIT_DISABLED:
    limiter = _NoOpLimiter()
else:
    limiter = Limiter(
        key_func=_get_user_or_ip,
        default_limits=[
            f"{settings.RATE_LIMIT_PER_USER_PER_MIN}/minute",
        ],
        headers_enabled=True,
    )


def init_rate_limiter(app):
    """Wire limiter into FastAPI app. Call this from main.py."""
    if settings.RATE_LIMIT_DISABLED:
        return
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)


def auth_rate_limit():
    """Strict limit for login/signup/password-reset endpoints. 5/min per IP.

    No per-decorator key_func override: slowapi 0.1.9's __evaluate_limits
    (extension.py:496) uses inspect.signature(lim.key_func).parameters to
    decide whether to pass the Request — only the literal name "request"
    triggers the request-passing branch; any other name (or a zero-arg
    lambda) is called as `lim.key_func()` with zero args, which crashed
    every /auth/login attempt with TypeError. The Limiter's default
    key_func (_get_user_or_ip) is named correctly and falls through to IP
    keying when no user is on request.state — exactly what we want for
    unauthenticated auth endpoints.
    """
    if settings.RATE_LIMIT_DISABLED:
        def noop(func):
            return func
        return noop
    return limiter.limit(f"{settings.RATE_LIMIT_AUTH_PER_IP_PER_MIN}/minute")


def ip_rate_limit():
    """Default IP-level limit. 200/min.

    See auth_rate_limit() for why we don't pass a per-decorator key_func.
    """
    if settings.RATE_LIMIT_DISABLED:
        def noop(func):
            return func
        return noop
    return limiter.limit(f"{settings.RATE_LIMIT_PER_IP_PER_MIN}/minute")
