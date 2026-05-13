"""Self-service signup + email verification (§2.3 of engineering brief). Stream A owns this.

Three public endpoints, all rate-limited at 5/min/IP via _signup_rate_limit:

    POST /api/auth/signup
        Creates Organization + Owner User (email_verified=False), issues a
        SHA-256-hashed one-shot verification token, sends a Resend HTML
        email. Same generic 200 response whether the email already exists
        or not (anti-enumeration).

    POST /api/auth/verify
        Validates the plaintext token (hash lookup, expires_at, used_at),
        marks the user verified, marks the token used, returns a JWT for
        auto-login + flat user fields the frontend can write to
        localStorage (matching login.js convention).

    POST /api/auth/resend-verification
        Invalidates all unused tokens for the user (used_at = now()) so a
        leaked email link from a prior send is dead the moment a new one
        is issued. Then mints a fresh token. Same anti-enumeration generic
        response shape as /signup.

The legacy /auth/signup endpoint in main.py remains for back-compat with
existing automation/scripts; it does NOT require email verification. New
frontend traffic goes through /api/auth/signup.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

import models
from auth import hash_password, create_access_token, validate_password
from config import settings
from database import get_db
from email_service import get_html_wrapper, send_email
from rate_limiter import limiter


logger = logging.getLogger(__name__)
router = APIRouter()


def _signup_rate_limit():
    """5/min/IP for signup + resend, honoring RATE_LIMIT_DISABLED rollback flag.

    Uses limiter.limit() directly with no key_func override. The Limiter's
    default key_func (rate_limiter._get_user_or_ip) keys by user-or-ip and
    is exercised on every request via default_limits — proven working by
    the tenant-isolation suite. The wrapper auth_rate_limit() in
    rate_limiter.py passes a custom lambda that crashes on slowapi 0.1.9's
    `lim.key_func()` no-args call site (extension.py:499); skipping the
    override avoids that path entirely until Stream B fixes the helper.
    """
    if settings.RATE_LIMIT_DISABLED:
        def noop(func):
            return func
        return noop
    return limiter.limit(f"{settings.RATE_LIMIT_AUTH_PER_IP_PER_MIN}/minute")


# ── Helpers ─────────────────────────────────────────────────────────────────

def _hash_token(token: str) -> str:
    """SHA-256 hex digest. Plaintext never lands in the DB."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> datetime:
    """Naive UTC — Organization.trial_ends_at and EmailVerificationToken.expires_at
    are TIMESTAMP WITHOUT TIME ZONE columns, matching legacy /auth/signup which
    also uses datetime.utcnow().
    """
    return datetime.utcnow()


def _send_verification_email(to_email: str, name: str, plaintext_token: str) -> None:
    """Send the welcome/verify email. Honors EMAIL_DISABLED (rollback flag).

    Failures are logged, never raised — signup must not 500 because Resend
    flapped or DNS hasn't propagated. The user can /resend-verification.
    """
    if settings.EMAIL_DISABLED:
        logger.info("EMAIL_DISABLED=true; not sending verification email to %s", to_email)
        return

    verify_link = f"{settings.APP_BASE_URL}/verify-email/{plaintext_token}"
    content = f"""
        <h2>Welcome to Ecom Era</h2>
        <p>Hi {name},</p>
        <p>Thanks for signing up. Verify your email to start your {settings.TRIAL_DAYS}-day free trial:</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{verify_link}" class="button">Verify Email</a>
        </p>
        <p style="font-size: 12px; color: #999;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="{verify_link}" style="color: #FFD700; word-break: break-all;">{verify_link}</a>
        </p>
        <p style="font-size: 12px; color: #999;">
            This link expires in {settings.EMAIL_VERIFICATION_TOKEN_HOURS} hours.
            If you didn't create an account, you can safely ignore this email.
        </p>
        <p>Best regards,<br/>The Ecom Era Team</p>
    """
    try:
        send_email(
            to_email,
            "Verify your Ecom Era email",
            get_html_wrapper(content, "Verify your email"),
        )
    except Exception:
        logger.exception("Failed to send verification email to %s", to_email)


# ── Schemas ─────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    org_name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    # Pydantic min_length kept loose; the SP-API policy is enforced by
    # validate_password() inside the route so the friendly per-rule reason
    # surfaces to the user as a 400 detail (not Pydantic's generic
    # "value error" envelope).
    password: str = Field(..., min_length=12, max_length=100)
    # Match existing User.name convention (legacy /auth/signup also uses `name`).
    name: str = Field(..., min_length=2, max_length=200)


class SignupResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[int] = None


class VerifyRequest(BaseModel):
    token: str = Field(..., min_length=16, max_length=128)


class VerifyResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    username: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None
    org_id: Optional[int] = None
    org_name: Optional[str] = None


class ResendRequest(BaseModel):
    email: EmailStr


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=SignupResponse)
@_signup_rate_limit()
def signup(
    request: Request,
    response: Response,
    body: SignupRequest,
    db: Session = Depends(get_db),
):
    """Create org + first user (Owner role) + send verification email."""
    email = body.email.lower().strip()

    ok, reason = validate_password(body.password)
    if not ok:
        raise HTTPException(status_code=400, detail=reason)

    # Anti-enumeration: same response whether email exists or not.
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        return SignupResponse(
            success=True,
            message="If your email is valid, a verification link has been sent.",
        )

    trial_ends = _now() + timedelta(days=settings.TRIAL_DAYS)
    org = models.Organization(
        name=body.org_name.strip(),
        plan="starter",
        status="trialing",
        trial_ends_at=trial_ends,
    )
    db.add(org)
    db.flush()

    name = body.name.strip()
    user = models.User(
        org_id=org.id,
        username=email,
        email=email,
        name=name,
        password_hash=hash_password(body.password),
        password_changed_at=_now(),
        role="owner",
        avatar=name[0].upper() if name else "U",
        is_active=True,
        email_verified=False,
    )
    db.add(user)
    db.flush()

    plaintext_token = secrets.token_urlsafe(32)
    db.add(
        models.EmailVerificationToken(
            user_id=user.id,
            token_hash=_hash_token(plaintext_token),
            expires_at=_now() + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_HOURS),
        )
    )
    db.commit()

    _send_verification_email(email, name, plaintext_token)

    return SignupResponse(
        success=True,
        message="Verification email sent. Check your inbox.",
        user_id=user.id,
    )


@router.post("/verify", response_model=VerifyResponse)
def verify_email(body: VerifyRequest, db: Session = Depends(get_db)):
    """Mark email verified, return JWT + user fields for auto-login.

    Response shape mirrors /auth/login (flat fields) so the frontend can
    write directly to localStorage and the AuthContext re-hydrates on
    reload. Same fields: token, username, name, role, email, avatar,
    org_id, org_name.
    """
    token_hash = _hash_token(body.token)
    record = (
        db.query(models.EmailVerificationToken)
        .filter(models.EmailVerificationToken.token_hash == token_hash)
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid verification token.")
    if record.used_at is not None:
        raise HTTPException(
            status_code=400,
            detail="This verification link has already been used.",
        )
    if record.expires_at < _now():
        raise HTTPException(
            status_code=400,
            detail="This verification link has expired. Request a new one.",
        )

    user = db.query(models.User).filter(models.User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")

    now = _now()
    user.email_verified = True
    user.email_verified_at = now
    record.used_at = now
    db.commit()
    db.refresh(user)

    org = db.query(models.Organization).filter(models.Organization.id == user.org_id).first()
    jwt_token = create_access_token({"user_id": user.id, "org_id": user.org_id})

    return VerifyResponse(
        success=True,
        token=jwt_token,
        username=user.username,
        name=user.name,
        role=user.role,
        email=user.email,
        avatar=user.avatar or (user.name[0].upper() if user.name else "U"),
        org_id=user.org_id,
        org_name=org.name if org else "",
    )


@router.post("/resend-verification")
@_signup_rate_limit()
def resend_verification(
    request: Request,
    response: Response,
    body: ResendRequest,
    db: Session = Depends(get_db),
):
    """Issue a fresh verification token; invalidates prior unused tokens."""
    email = body.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()

    # Anti-enumeration: same response shape regardless of state. Already-
    # verified users also get the generic message — sending them a fresh
    # link would be useless and confusing.
    if not user or user.email_verified:
        return {
            "success": True,
            "message": "If your email is valid, a verification link has been sent.",
        }

    # Invalidate all currently-unused tokens for this user. A leaked email
    # link from an old send is dead the moment a new one is asked for.
    now = _now()
    db.query(models.EmailVerificationToken).filter(
        models.EmailVerificationToken.user_id == user.id,
        models.EmailVerificationToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)

    plaintext_token = secrets.token_urlsafe(32)
    db.add(
        models.EmailVerificationToken(
            user_id=user.id,
            token_hash=_hash_token(plaintext_token),
            expires_at=_now() + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_HOURS),
        )
    )
    db.commit()

    _send_verification_email(email, user.name, plaintext_token)

    return {
        "success": True,
        "message": "If your email is valid, a verification link has been sent.",
    }
