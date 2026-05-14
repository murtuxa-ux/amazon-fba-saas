"""TOTP MFA (Phase B / SP-API attestation).

Endpoints (all prefixed /auth/mfa via router mount in main.py):

  POST /auth/mfa/enroll/start     — generate + return secret/QR/otpauth URL.
                                    DOES NOT enable MFA yet. Idempotent —
                                    a re-call replaces the unconfirmed
                                    secret so a user who lost their QR can
                                    start over.
  POST /auth/mfa/enroll/confirm   — submit a 6-digit code generated from
                                    the secret. On valid code: set
                                    mfa_enrolled_at = NOW(), generate 10
                                    plaintext recovery codes, return them
                                    ONCE. Audit user.mfa.enroll_complete.
  POST /auth/mfa/disable          — body {password, code}. Requires both
                                    factors. Clears mfa_secret +
                                    mfa_recovery_codes + mfa_enrolled_at.
                                    Audit user.mfa.disable.
  POST /auth/mfa/regenerate-codes — body {password, code}. Replaces the
                                    recovery code array.
  GET  /auth/mfa/status           — {enrolled, last_used_at,
                                    recovery_codes_remaining}.

The companion login flow lives in main.py:
  POST /auth/login                — if mfa_enrolled_at IS NOT NULL,
                                    returns {requires_mfa: true,
                                    mfa_challenge_token}. No session JWT yet.
  POST /auth/login/mfa-verify     — body {mfa_challenge_token, code}.
                                    Verifies TOTP OR a recovery code.
                                    Returns the normal /auth/login envelope.

The challenge token is a separate short-lived JWT (token_type=mfa_challenge,
5 min, contains user_id). It is NOT an access_token. Verified with the
same JWT_SECRET.

Storage:
- mfa_secret is base32 plaintext in v1 (matches the dispatch's String(64)
  schema). v2 wraps in SecretsVault Fernet once that module ships. Log
  calls in this module redact the secret.
- Recovery codes are bcrypt-hashed in mfa_recovery_codes_json as a JSON
  array of strings. Plaintext is shown ONCE at enrollment/regeneration.

Audit logging via the §3.4 record_audit helper (PR #69 pattern).
"""
from __future__ import annotations

import base64
import io
import json
import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional

import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from audit_logs import record_audit
from auth import hash_password, tenant_session, verify_password
from config import settings
from database import get_db
from models import User

_log = logging.getLogger("mfa")

router = APIRouter(prefix="/auth/mfa", tags=["mfa"])


# ── Schemas ────────────────────────────────────────────────────────────────

class EnrollStartResponse(BaseModel):
    secret: str                  # base32, shown once for manual entry
    qr_code_data_uri: str        # data:image/png;base64,…
    otpauth_url: str             # otpauth://totp/...


class CodeOnly(BaseModel):
    code: str


class PasswordPlusCode(BaseModel):
    password: str
    code: str


class EnrollConfirmResponse(BaseModel):
    enrolled: bool
    recovery_codes: List[str]    # plaintext — show ONCE


class StatusResponse(BaseModel):
    enrolled: bool
    last_used_at: Optional[str] = None
    recovery_codes_remaining: int = 0


# ── Helpers ────────────────────────────────────────────────────────────────

def _generate_recovery_codes(n: int = 10) -> List[str]:
    """Mixed-case alphanumeric, 8 chars, no ambiguous glyphs (no 0/O/1/I/l).
    secrets.choice for crypto-grade randomness — recovery codes are direct
    auth bypasses so they need to be unguessable.
    """
    alphabet = string.ascii_uppercase.replace("O", "").replace("I", "") + \
               string.ascii_lowercase.replace("l", "").replace("o", "") + \
               "23456789"
    return ["".join(secrets.choice(alphabet) for _ in range(8)) for _ in range(n)]


def _hash_recovery_codes(plain_codes: List[str]) -> str:
    """Bcrypt-hash each code, return as a JSON array string suitable for
    storage in mfa_recovery_codes_json."""
    return json.dumps([hash_password(c) for c in plain_codes])


def _consume_recovery_code(user: User, db: Session, candidate: str) -> bool:
    """If `candidate` matches any unused recovery code, remove it from the
    stored array and return True. Otherwise return False (does not raise)."""
    if not user.mfa_recovery_codes_json:
        return False
    try:
        hashes = json.loads(user.mfa_recovery_codes_json)
    except Exception:
        return False
    matching_idx = None
    for i, h in enumerate(hashes):
        if verify_password(candidate, h):
            matching_idx = i
            break
    if matching_idx is None:
        return False
    hashes.pop(matching_idx)
    user.mfa_recovery_codes_json = json.dumps(hashes)
    db.commit()
    return True


def _verify_totp_or_recovery(user: User, db: Session, code: str) -> bool:
    """Verify a 6-digit TOTP first, then fall back to recovery code. Each
    branch is independent — the caller doesn't need to know which factor
    succeeded. On TOTP success we also update mfa_last_used_at."""
    code = (code or "").strip().replace(" ", "")
    if not user.mfa_secret:
        return False
    # TOTP: 6-digit, +/- 1 step window (30s before/after) for clock skew.
    if len(code) == 6 and code.isdigit():
        try:
            ok = pyotp.TOTP(user.mfa_secret).verify(code, valid_window=1)
        except Exception:
            ok = False
        if ok:
            user.mfa_last_used_at = datetime.utcnow()
            db.commit()
            return True
    # Recovery code fallback. Always try this even if TOTP matched first
    # (no — we returned True above). Codes are single-use.
    if _consume_recovery_code(user, db, code):
        user.mfa_last_used_at = datetime.utcnow()
        db.commit()
        return True
    return False


def _make_qr_data_uri(otpauth_url: str) -> str:
    img = qrcode.make(otpauth_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def _redacted_secret_log(action: str, user: User) -> None:
    """Never log mfa_secret. Identify by user id only."""
    _log.info("mfa.%s user_id=%s enrolled=%s", action, user.id, bool(user.mfa_enrolled_at))


# ── MFA challenge token (login step 2) ─────────────────────────────────────

CHALLENGE_TYPE = "mfa_challenge"


def issue_mfa_challenge_token(user_id: int) -> str:
    """Short-lived JWT used between password-step-success and
    /auth/login/mfa-verify. NOT an access token."""
    payload = {
        "user_id": user_id,
        "token_type": CHALLENGE_TYPE,
        "exp": datetime.utcnow() + timedelta(minutes=settings.MFA_CHALLENGE_TOKEN_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_mfa_challenge_token(token: str) -> int:
    """Returns user_id on success; raises HTTPException(401) on any
    failure mode (expired, wrong type, malformed, bad signature)."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired MFA challenge token.")
    if payload.get("token_type") != CHALLENGE_TYPE:
        raise HTTPException(status_code=401, detail="Not an MFA challenge token.")
    user_id = payload.get("user_id")
    if not isinstance(user_id, int):
        raise HTTPException(status_code=401, detail="Invalid MFA challenge payload.")
    return user_id


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/enroll/start", response_model=EnrollStartResponse)
def enroll_start(
    request: Request,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Generate (or replace) the unconfirmed mfa_secret and return the
    artifacts the frontend needs to show the QR code."""
    if user.mfa_enrolled_at is not None:
        raise HTTPException(
            status_code=400,
            detail="MFA is already enrolled. Disable it first to re-enroll.",
        )
    secret = pyotp.random_base32()
    user.mfa_secret = secret
    db.commit()
    otpauth_url = pyotp.TOTP(secret).provisioning_uri(
        name=user.email,
        issuer_name=settings.MFA_ISSUER_NAME,
    )
    qr = _make_qr_data_uri(otpauth_url)
    _redacted_secret_log("enroll_start", user)
    record_audit(
        db, request, user,
        action="user.mfa.enroll_start", resource_type="user",
        resource_id=user.id,
    )
    return EnrollStartResponse(
        secret=secret,
        qr_code_data_uri=qr,
        otpauth_url=otpauth_url,
    )


@router.post("/enroll/confirm", response_model=EnrollConfirmResponse)
def enroll_confirm(
    body: CodeOnly,
    request: Request,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Validate the user's first 6-digit code against the secret returned
    by /enroll/start, then flip mfa_enrolled_at and return the 10 recovery
    codes ONCE in plaintext."""
    if user.mfa_enrolled_at is not None:
        raise HTTPException(status_code=400, detail="MFA is already enrolled.")
    if not user.mfa_secret:
        raise HTTPException(status_code=400, detail="Call /enroll/start first to get a secret.")
    code = (body.code or "").strip().replace(" ", "")
    if not (len(code) == 6 and code.isdigit()):
        raise HTTPException(status_code=400, detail="Code must be 6 digits.")
    if not pyotp.TOTP(user.mfa_secret).verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code. Make sure your authenticator clock is correct and try the next 6 digits.")

    plain_codes = _generate_recovery_codes(10)
    user.mfa_recovery_codes_json = _hash_recovery_codes(plain_codes)
    user.mfa_enrolled_at = datetime.utcnow()
    user.mfa_last_used_at = datetime.utcnow()
    db.commit()
    _redacted_secret_log("enroll_complete", user)
    record_audit(
        db, request, user,
        action="user.mfa.enroll_complete", resource_type="user",
        resource_id=user.id,
    )
    return EnrollConfirmResponse(enrolled=True, recovery_codes=plain_codes)


@router.post("/disable")
def disable(
    body: PasswordPlusCode,
    request: Request,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Two-factor confirmation: current password AND a valid TOTP/recovery
    code. Both must succeed to clear MFA state. Owner role disables their
    OWN MFA only — admin force-reset for OTHER users is a separate
    endpoint (out of scope for v1)."""
    if user.mfa_enrolled_at is None:
        raise HTTPException(status_code=400, detail="MFA is not enabled.")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Password is incorrect.")
    if not _verify_totp_or_recovery(user, db, body.code):
        raise HTTPException(status_code=400, detail="MFA code is invalid.")
    user.mfa_secret = None
    user.mfa_enrolled_at = None
    user.mfa_recovery_codes_json = None
    user.mfa_last_used_at = None
    db.commit()
    _redacted_secret_log("disable", user)
    record_audit(
        db, request, user,
        action="user.mfa.disable", resource_type="user",
        resource_id=user.id,
    )
    return {"disabled": True}


@router.post("/regenerate-codes")
def regenerate_codes(
    body: PasswordPlusCode,
    request: Request,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Replace the recovery code array. Two-factor (password + code)."""
    if user.mfa_enrolled_at is None:
        raise HTTPException(status_code=400, detail="MFA is not enabled.")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Password is incorrect.")
    if not _verify_totp_or_recovery(user, db, body.code):
        raise HTTPException(status_code=400, detail="MFA code is invalid.")
    plain_codes = _generate_recovery_codes(10)
    user.mfa_recovery_codes_json = _hash_recovery_codes(plain_codes)
    db.commit()
    record_audit(
        db, request, user,
        action="user.mfa.regenerate_codes", resource_type="user",
        resource_id=user.id,
    )
    return {"recovery_codes": plain_codes}


@router.get("/status", response_model=StatusResponse)
def mfa_status(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Lightweight read used by the settings UI badge."""
    codes_remaining = 0
    if user.mfa_recovery_codes_json:
        try:
            codes_remaining = len(json.loads(user.mfa_recovery_codes_json))
        except Exception:
            codes_remaining = 0
    return StatusResponse(
        enrolled=user.mfa_enrolled_at is not None,
        last_used_at=str(user.mfa_last_used_at) if user.mfa_last_used_at else None,
        recovery_codes_remaining=codes_remaining,
    )
