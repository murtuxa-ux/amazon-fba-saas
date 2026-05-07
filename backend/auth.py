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
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=expires_hours or settings.JWT_EXPIRY_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


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
    return user
