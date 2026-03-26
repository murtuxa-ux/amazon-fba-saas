"""
Ecom Era FBA SaaS v6.0 — Authentication & Authorization
JWT-based auth with multi-tenant RBAC
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
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
    """Dependency factory: ensures user has at least the specified role level"""
    min_level = ROLE_HIERARCHY.get(minimum_role, 0)

    def checker(user: User = Depends(get_current_user)):
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
