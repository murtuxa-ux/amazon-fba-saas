"""Sentry SDK init + structured logging + request_id middleware (§2.8). Stream B owns this.

Three responsibilities:
1. `init_sentry()` — call once at process start. Empty SENTRY_DSN = no-op (rollback flag).
2. `setup_structlog()` — JSON output, auto-tags every log line with request_id/org_id/user_id
   pulled from contextvars set by the middleware and `tag_sentry_user()`.
3. `RequestIDMiddleware` — generates UUID per request, sets contextvar so logs and Sentry
   events correlate, exposes `X-Request-ID` response header for client-side correlation.

`tag_sentry_user(user_id, org_id, username)` is called from `tenant_session()` so every
authenticated request auto-tags Sentry events. Anonymous routes still emit events, just
without the user/org tags.
"""
import contextvars
import logging
import uuid
from typing import Callable, Optional

import sentry_sdk
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings


_request_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "request_id", default=None
)
_org_id_var: contextvars.ContextVar[Optional[int]] = contextvars.ContextVar(
    "org_id", default=None
)
_user_id_var: contextvars.ContextVar[Optional[int]] = contextvars.ContextVar(
    "user_id", default=None
)


# Keys we redact from any Sentry event payload we forward. Match is
# case-insensitive on the dict key.
_SENSITIVE_KEYS = {
    "password", "passwd", "pwd",
    "token", "access_token", "refresh_token", "id_token",
    "secret", "api_key", "apikey",
    "authorization", "cookie", "set-cookie",
    "card", "card_number", "cardnumber", "cvv", "cvc",
    "ssn",
    "stripe_signature", "stripe-signature",
}


def _scrub(obj):
    """Recursively replace values for any key matching _SENSITIVE_KEYS."""
    if isinstance(obj, dict):
        return {
            k: ("[REDACTED]" if isinstance(k, str) and k.lower() in _SENSITIVE_KEYS
                else _scrub(v))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_scrub(item) for item in obj]
    return obj


def _redact_sensitive(event, hint):
    """Sentry before_send hook. Strips sensitive keys from request data + headers."""
    request = event.get("request") or {}
    if "data" in request:
        request["data"] = _scrub(request["data"])
    if "headers" in request:
        request["headers"] = _scrub(request["headers"])
    if "cookies" in request:
        request["cookies"] = _scrub(request["cookies"])
    return event


def init_sentry() -> bool:
    """Initialize Sentry SDK. Returns True if active, False if disabled (no DSN).

    Empty SENTRY_DSN is the rollback flag — the SDK is silently skipped and the
    rest of the observability stack still works.
    """
    if not settings.SENTRY_DSN:
        logging.info("SENTRY_DSN empty — Sentry disabled (rollback flag).")
        return False

    # Integrations are imported lazily so a missing optional backing
    # library (e.g., sqlalchemy in a slim test env) doesn't hard-fail
    # observability.py at import time.
    integrations = []
    try:
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        integrations.append(FastApiIntegration())
    except Exception as e:
        logging.warning("Sentry FastApiIntegration unavailable: %s", e)
    try:
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        integrations.append(SqlalchemyIntegration())
    except Exception as e:
        logging.warning("Sentry SqlalchemyIntegration unavailable: %s", e)

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=integrations,
        before_send=_redact_sensitive,
        send_default_pii=False,
    )
    return True


def _add_context_tags(logger, method_name, event_dict):
    """structlog processor — copies contextvar tags onto every log event."""
    rid = _request_id_var.get()
    oid = _org_id_var.get()
    uid = _user_id_var.get()
    if rid:
        event_dict["request_id"] = rid
    if oid is not None:
        event_dict["org_id"] = oid
    if uid is not None:
        event_dict["user_id"] = uid
    return event_dict


def setup_structlog() -> None:
    """Configure structlog with JSON output and contextvar-based auto-tagging."""
    log_level = getattr(logging, str(settings.LOG_LEVEL).upper(), logging.INFO)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            _add_context_tags,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        cache_logger_on_first_use=True,
    )


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Generate or propagate `X-Request-ID` and bind it to a contextvar for the request.

    If the client supplies `X-Request-ID`, we honor it (so traces flowing through
    a frontend or upstream proxy correlate). Otherwise we mint a fresh UUID4.
    The same value is exposed back to the client on the response.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = _request_id_var.set(request_id)
        request.state.request_id = request_id
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            _request_id_var.reset(token)


def tag_sentry_user(user_id: int, org_id: int, username: Optional[str] = None) -> None:
    """Tag the current Sentry scope with the authed user's id, org, and username.

    Called from `tenant_session()` so every authed request auto-tags. No-ops when
    Sentry is disabled. Always sets the contextvars so structlog still picks
    them up for log correlation regardless of Sentry state.
    """
    _org_id_var.set(org_id)
    _user_id_var.set(user_id)
    if not settings.SENTRY_DSN:
        return
    sentry_sdk.set_tag("organization_id", org_id)
    sentry_sdk.set_user({"id": user_id, "username": username or f"user_{user_id}"})


def get_logger(name: Optional[str] = None):
    """Return a structlog-wrapped logger. Use anywhere log lines should carry the
    request_id / org_id / user_id tags automatically."""
    return structlog.get_logger(name)
