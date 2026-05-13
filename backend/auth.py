"""
Ecom Era FBA SaaS v6.0 — Authentication & Authorization
JWT-based auth with multi-tenant RBAC
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from sqlalchemy import text
from sqlalchemy.orm import Session
import logging

from config import settings
from database import get_db
from models import User, Organization

logger = logging.getLogger(__name__)

# Role hierarchy: owner > admin > manager > viewer
ROLE_HIERARCHY = {"owner": 4, "admin": 3, "manager": 2, "viewer": 1}

# ── Password hashing with bcrypt compatibility fix ──────────────────────────
# passlib 1.7.4 + bcrypt >= 4.1 have a known incompatibility.
# We try passlib first; if it fails at runtime, fall back to bcrypt directly.

_use_passlib = True
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
    # Quick smoke test to confirm passlib+bcrypt actually works
    pwd_context.hash("test")
except Exception as e:
    logger.warning(f"passlib+bcrypt init failed ({e}), falling back to direct bcrypt")
    _use_passlib = False

if not _use_passlib:
    try:
        import bcrypt as _bcrypt
    except ImportError:
        raise RuntimeError("Neither passlib nor bcrypt is usable. Install bcrypt==4.0.1")


def _truncate_password(password: str) -> str:
    """Bcrypt only uses the first 72 bytes of a password. Truncate to avoid ValueError."""
    return password.encode("utf-8")[:72].decode("utf-8", errors="ignore")


# ── Password policy (SP-API attestation) ────────────────────────────────────
# Validation rules below run ONLY on password SET / CHANGE flows (signup,
# /auth/change-password, /auth/reset-password, admin user create / reset).
# /auth/login does NOT call validate_password — login is bcrypt match + 365d
# expiry only. This grandfathers existing weak passwords in (they keep working
# until the user rotates or the 365d window elapses, whichever comes first).
# Once a user rotates, the new password must satisfy these rules.

import os
from typing import Tuple

_COMMON_PASSWORDS: frozenset = frozenset()
try:
    _denylist_path = os.path.join(os.path.dirname(__file__), "data", "common_passwords.txt")
    with open(_denylist_path, "r", encoding="utf-8", errors="ignore") as _f:
        _COMMON_PASSWORDS = frozenset(line.strip().lower() for line in _f if line.strip())
    logger.info(f"password denylist loaded: {len(_COMMON_PASSWORDS)} entries")
except Exception as _e:
    logger.warning(f"password denylist load failed: {_e}; denylist check will pass everything")


def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """Return (ok, reason). Reason is None on success, otherwise a single
    user-safe sentence explaining the first failure. Order matters — we
    surface length first because it gates the others.
    """
    if not isinstance(password, str):
        return False, "Password must be a string."
    if len(password.encode("utf-8")) > 72:
        return False, "Password is too long (max 72 bytes — bcrypt limit)."
    if len(password) < 12:
        return False, "Password must be at least 12 characters."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit."
    if not any(not c.isalnum() for c in password):
        return False, "Password must contain at least one symbol."
    if password.lower() in _COMMON_PASSWORDS:
        return False, "Password is too common — pick something less guessable."
    return True, None


def hash_password(password: str) -> str:
    truncated = _truncate_password(password)
    if _use_passlib:
        return pwd_context.hash(truncated)
    else:
        salt = _bcrypt.gensalt(rounds=12)
        return _bcrypt.hashpw(truncated.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    truncated = _truncate_password(plain)
    if _use_passlib:
        try:
            return pwd_context.verify(truncated, hashed)
        except Exception:
            return False
    else:
        try:
            return _bcrypt.checkpw(truncated.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False


# ── JWT Token management ────────────────────────────────────────────────────

def create_access_token(data: dict, expires_hours: int = None) -> str:
    """Mint a short-lived access token. Default expiry from settings
    (post-Day-7: 24h). Used in every Authorization: Bearer header.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=expires_hours or settings.JWT_EXPIRY_HOURS)
    to_encode.update({"exp": expire, "token_type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict, expires_days: int = None) -> str:
    """Mint a long-lived refresh token. 30 days by default. Sent to
    /auth/refresh to obtain a fresh access token when the client's
    access token has expired. Carries a distinct `token_type` claim so
    a refresh token cannot accidentally be accepted on regular routes
    that expect an access token.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(
        days=expires_days or settings.JWT_REFRESH_EXPIRY_DAYS
    )
    to_encode.update({"exp": expire, "token_type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: str = "access") -> dict:
    """Decode a JWT and verify it's the expected type.

    `expected_type` defaults to "access" so existing callers (get_current_user,
    routes that check Authorization) continue to work unchanged. The
    /auth/refresh endpoint calls this with expected_type="refresh" so an
    access token cannot be used to refresh, and a refresh token cannot be
    used on regular routes.

    Tokens minted BEFORE this PR don't carry a token_type claim — they
    default to "access" so legacy clients keep working. Refresh-token
    rejection is strict: a token missing token_type is rejected from
    refresh.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    actual_type = payload.get("token_type", "access")
    if expected_type == "refresh" and actual_type != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token required.")
    if expected_type == "access" and actual_type != "access":
        # Access route was hit with a refresh token — treat as invalid.
        raise HTTPException(status_code=401, detail="Access token required.")
    return payload


# ── User extraction & role checking ─────────────────────────────────────────

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization[7:]
    payload = decode_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive.")
    return user


def require_role(minimum_role: str):
    """Dependency factory: ensures user has at least the specified role level.

    Uses tenant_session (defined below) so role-gated routes also prime
    `app.current_org_id` when settings.RLS_ENFORCED is true. When the flag
    is false, tenant_session is a passthrough — no behavior change.
    """
    min_level = ROLE_HIERARCHY.get(minimum_role, 0)

    def checker(user: User = Depends(tenant_session)):
        user_level = ROLE_HIERARCHY.get(user.role, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"Requires {minimum_role} role or higher. You have: {user.role}",
            )
        return user

    return checker


def get_org_scoped_query(db: Session, user: User, model_class):
    """Returns a query scoped to the user's organization"""
    return db.query(model_class).filter(model_class.org_id == user.org_id)


# ── Tenancy session — defined in PR C-1, plumbed in PR C-2 ──────────────────
#
# When `settings.RLS_ENFORCED` is False (the default in PR C-1 and on the
# first PR C-2 deploy), this dependency is a passthrough — it resolves
# `get_current_user` and returns the User. Behavior identical to
# `Depends(get_current_user)`. No `SET LOCAL`, no role switch, no DB-level
# tenancy enforcement.
#
# When `settings.RLS_ENFORCED` is True (flipped at runtime AFTER PR C-2 has
# soaked safely in prod), this dependency additionally runs:
#     SET LOCAL ROLE app_role
#     SET LOCAL app.current_org_id = <user.org_id>
# inside the request transaction. Combined with the RLS policies installed
# in PR C-2's migration, every customer-data query is then filtered at the
# Postgres level. A missed application-level `org_id` filter cannot leak
# data across tenants; raw `db.query(Foo).all()` returns only the caller's
# org's rows.
#
# This function is dead code on PR C-1 — no route uses it yet. The
# mechanical sweep (`Depends(get_current_user)` -> `Depends(tenant_session)`)
# happens in PR C-2. Shipped here so it can be reviewed in isolation, and so
# the PR C-2 diff is just route-decoration changes plus the migration.
#
# Why a separate dependency rather than modifying `get_current_user`:
# the public routes (signup, password reset, Stripe webhook) call
# `get_current_user` at most indirectly and never want a tenancy session
# var set. Keeping `tenant_session` separate means those routes are
# untouched by the C-2 sweep.

def tenant_session(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Authenticated dependency that also primes the request transaction
    with tenancy session state when RLS is enforced.

    Returns the same `User` as `get_current_user` so this is a drop-in
    replacement at every route that needs auth + tenancy.
    """
    if settings.RLS_ENFORCED:
        # SET LOCAL is transaction-scoped — clears at COMMIT/ROLLBACK,
        # so concurrent requests on different connections never bleed
        # session var into each other.
        db.execute(text("SET LOCAL ROLE app_role"))
        db.execute(
            text("SET LOCAL app.current_org_id = :oid"),
            {"oid": user.org_id},
        )
    # Observability (§2.8): tag Sentry events + structlog contextvars with
    # the authed user. No-ops when SENTRY_DSN is empty. Imported lazily so
    # auth.py keeps no top-level dependency on observability/sentry_sdk.
    try:
        from observability import tag_sentry_user
        tag_sentry_user(user.id, user.org_id, getattr(user, "username", None))
    except Exception:
        # Tagging must never break a request. Sentry's own SDK errors will
        # surface in Railway logs — the request still succeeds.
        logger.exception("tag_sentry_user failed")
    return user
