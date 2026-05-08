"""Post-signup onboarding wizard backend (§2.3). Stream A owns this.

Five endpoints under /api/onboarding/*:

    GET  /progress                 — current step + completed flag for the
                                     authed user. Frontend uses this to
                                     redirect already-completed users to
                                     /dashboard unless ?force=1.
    PUT  /progress                 — advance the wizard. Idempotent on
                                     onboarding_step (max of stored vs.
                                     incoming+1). Step 4 sets
                                     onboarding_completed + completed_at.
    POST /skip-all                 — dismiss the wizard. Same effect as
                                     hitting Step 4 directly.
    POST /invite                   — Owner/Admin-only. tier_limits.enforce_limit
                                     on "users" fires 402 if the org is at
                                     its tier cap. Issues a SHA-256-hashed
                                     one-shot token + sends a Resend email.
    POST /accept-invite/{token}    — pre-auth. Looks up the invite by token
                                     hash, validates expires_at + used_at,
                                     returns email/role/org_name so a
                                     frontend signup form can pre-fill.
                                     Does NOT create the user — that
                                     happens in a separate signup flow.

User row gains onboarding_completed + onboarding_step + onboarding_completed_at
in migration 0007. Legacy users are backfilled to completed=True so the
wizard never appears for established accounts.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

import models
from auth import tenant_session
from config import settings
from database import get_db
from email_service import get_html_wrapper, send_email
from tier_limits import enforce_limit


logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ─────────────────────────────────────────────────────────────────

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> datetime:
    """Naive UTC — TeamInvite.expires_at is TIMESTAMP WITHOUT TIME ZONE."""
    return datetime.utcnow()


def _send_invite_email(to_email: str, inviter_name: str, org_name: str, token: str) -> None:
    """Best-effort invite email. Honors EMAIL_DISABLED rollback flag.

    Failures are logged, never raised — invite creation must not 500
    because Resend flapped or DNS hasn't propagated.
    """
    if settings.EMAIL_DISABLED:
        logger.info("EMAIL_DISABLED=true; not sending invite email to %s", to_email)
        return

    accept_link = f"{settings.APP_BASE_URL}/accept-invite/{token}"
    content = f"""
        <h2>You've been invited to {org_name}</h2>
        <p>{inviter_name} invited you to join <strong>{org_name}</strong> on Ecom Era.</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{accept_link}" class="button">Accept Invite</a>
        </p>
        <p style="font-size: 12px; color: #999;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="{accept_link}" style="color: #FFD700; word-break: break-all;">{accept_link}</a>
        </p>
        <p style="font-size: 12px; color: #999;">
            This invite expires in 7 days. If you weren't expecting this,
            you can safely ignore this email.
        </p>
    """
    try:
        send_email(
            to_email,
            f"You're invited to join {org_name} on Ecom Era",
            get_html_wrapper(content, "Team Invitation"),
        )
    except Exception:
        logger.exception("Failed to send invite email to %s", to_email)


# ── Schemas ─────────────────────────────────────────────────────────────────

class ProgressUpdate(BaseModel):
    step: int = Field(..., ge=1, le=4)


class ProgressResponse(BaseModel):
    current_step: int
    completed: bool
    completed_at: Optional[str] = None


class InviteRequest(BaseModel):
    email: EmailStr
    role: Literal["admin", "manager", "viewer"] = "manager"


class InviteResponse(BaseModel):
    success: bool
    message: str


class AcceptInviteResponse(BaseModel):
    success: bool
    email: str
    role: str
    org_id: int
    org_name: str


# ── Routes ──────────────────────────────────────────────────────────────────

@router.get("/progress", response_model=ProgressResponse)
def get_progress(user: models.User = Depends(tenant_session)):
    """Current onboarding state for the authed user."""
    return ProgressResponse(
        current_step=user.onboarding_step or 1,
        completed=bool(user.onboarding_completed),
        completed_at=user.onboarding_completed_at.isoformat()
        if user.onboarding_completed_at
        else None,
    )


@router.put("/progress", response_model=ProgressResponse)
def update_progress(
    body: ProgressUpdate,
    user: models.User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Advance the wizard. Idempotent: re-PUTting the same step is a no-op."""
    # Step N completed -> next step is N+1. max() so a stale client can't
    # rewind a user who's already past this step.
    next_step = min(max(user.onboarding_step or 1, body.step + 1), 4)
    user.onboarding_step = next_step
    if body.step >= 4:
        user.onboarding_completed = True
        user.onboarding_completed_at = _now()
    db.commit()
    db.refresh(user)
    return ProgressResponse(
        current_step=user.onboarding_step,
        completed=bool(user.onboarding_completed),
        completed_at=user.onboarding_completed_at.isoformat()
        if user.onboarding_completed_at
        else None,
    )


@router.post("/skip-all")
def skip_all(
    user: models.User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Dismiss the wizard entirely. Equivalent to PUT step=4."""
    user.onboarding_completed = True
    user.onboarding_completed_at = _now()
    user.onboarding_step = 4
    db.commit()
    return {"success": True}


@router.post("/invite", response_model=InviteResponse)
def invite_team_member(
    body: InviteRequest,
    user: models.User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Send an email invite to a teammate. Tier-gated on `users`."""
    if user.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Only Owner or Admin can invite team members.",
        )

    org = db.query(models.Organization).filter(
        models.Organization.id == user.org_id
    ).first()
    if not org:
        raise HTTPException(status_code=400, detail="Organization not found.")

    # Tier check — a Scout-tier org with 3 users (the cap) can't issue a 4th.
    enforce_limit(db, org, "users")

    email = body.email.lower().strip()

    # Don't re-invite an existing user (UNIQUE on User.email — global).
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(
            status_code=400,
            detail="A user with that email already exists.",
        )

    # Coalesce to existing pending invite for this org+email — same response
    # so the caller doesn't see an error, and the recipient can keep using
    # whichever email they got first (until expiry).
    pending = (
        db.query(models.TeamInvite)
        .filter(
            models.TeamInvite.org_id == user.org_id,
            models.TeamInvite.email == email,
            models.TeamInvite.used_at.is_(None),
            models.TeamInvite.expires_at > _now(),
        )
        .first()
    )
    if pending:
        return InviteResponse(success=True, message="Invite already pending.")

    plaintext_token = secrets.token_urlsafe(32)
    invite = models.TeamInvite(
        org_id=user.org_id,
        inviter_user_id=user.id,
        email=email,
        role=body.role,
        token_hash=_hash_token(plaintext_token),
        expires_at=_now() + timedelta(days=7),
    )
    db.add(invite)
    db.commit()

    _send_invite_email(email, user.name, org.name, plaintext_token)

    return InviteResponse(success=True, message=f"Invite sent to {email}")


@router.post("/accept-invite/{token}", response_model=AcceptInviteResponse)
def accept_invite(token: str, db: Session = Depends(get_db)):
    """Pre-auth invite lookup. Returns metadata so a signup form can pre-fill.

    Does NOT consume the invite (used_at stays NULL) — the actual
    new-user signup flow consumes it once the recipient submits the
    pre-filled form. That keeps the lookup idempotent: a recipient can
    refresh the accept page without burning the token.
    """
    record = (
        db.query(models.TeamInvite)
        .filter(models.TeamInvite.token_hash == _hash_token(token))
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid invite token.")
    if record.used_at is not None:
        raise HTTPException(
            status_code=400,
            detail="This invite has already been used.",
        )
    if record.expires_at < _now():
        raise HTTPException(status_code=400, detail="This invite has expired.")

    org = (
        db.query(models.Organization)
        .filter(models.Organization.id == record.org_id)
        .first()
    )
    return AcceptInviteResponse(
        success=True,
        email=record.email,
        role=record.role,
        org_id=record.org_id,
        org_name=org.name if org else "",
    )
