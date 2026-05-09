"""Audit log table + write helper + read endpoints (§3.4 P1 lite). Stream B owns this.

record_audit() is called from state-changing endpoints AFTER db.commit().
It runs in a try/except so a write failure (RLS denial, FK lookup miss,
etc.) never breaks the user's request — audit logging is best-effort,
not a critical-path dependency. The caller's commit has already landed
by the time we attempt the audit row.

Retention is tier-based: scout 7d / growth 30d / professional 180d /
enterprise 365d. Daily purge in cron/audit_retention.py honors these.

GET /api/audit-logs is Owner/Admin-only (Manager/Viewer get 403).
Filters: action, resource_type, user_id, days. Paginated.
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

import models
from auth import tenant_session
from database import get_db


router = APIRouter()
logger = logging.getLogger(__name__)


# Tier-based retention windows (days). Plan key matches Organization.plan
# (scout / growth / professional / enterprise). Unknown plans fall back
# to scout's 7-day window — the strictest default is the safest default.
RETENTION_DAYS = {
    "scout": 7,
    "growth": 30,
    "professional": 180,
    "enterprise": 365,
}


class AuditLogEntry(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    before_json: Optional[str] = None
    after_json: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    created_at: str


class AuditLogResponse(BaseModel):
    entries: List[AuditLogEntry] = Field(default_factory=list)
    total: int = Field(default=0)
    page: int = Field(default=1)
    page_size: int = Field(default=50)


def record_audit(
    db: Session,
    request: Optional[Request],
    user: models.User,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    before: Optional[dict] = None,
    after: Optional[dict] = None,
) -> None:
    """Record a state-changing event. Best-effort — failures are swallowed.

    Call AFTER the caller has committed the user-visible mutation. If the
    audit insert itself fails (DB hiccup, RLS denial, JSON-serialization
    bug), we log the exception and return None so the caller's response
    is unaffected. Audit gaps are preferable to user-facing 500s here.
    """
    try:
        ip = None
        user_agent = ""
        request_id = None
        if request is not None:
            ip = request.client.host if request.client else None
            user_agent = (request.headers.get("user-agent") or "")[:500]
            request_id = getattr(request.state, "request_id", None)

        entry = models.AuditLog(
            org_id=user.org_id,
            user_id=user.id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            before_json=json.dumps(before, default=str) if before else None,
            after_json=json.dumps(after, default=str) if after else None,
            ip=ip,
            user_agent=user_agent or None,
            request_id=request_id,
        )
        db.add(entry)
        db.commit()
    except Exception:
        logger.exception("record_audit failed for action=%s", action)
        try:
            db.rollback()
        except Exception:
            pass


@router.get("", response_model=AuditLogResponse)
def list_audit_logs(
    request: Request,
    user: models.User = Depends(tenant_session),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user_id_filter: Optional[int] = Query(None, alias="user_id"),
    days: int = Query(30, ge=1, le=365),
):
    """List audit logs for the caller's org. Owner/Admin only."""
    if user.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Audit log access requires Owner or Admin role.",
        )

    cutoff = datetime.utcnow() - timedelta(days=days)

    query = db.query(models.AuditLog).filter(
        models.AuditLog.org_id == user.org_id,
        models.AuditLog.created_at >= cutoff,
    )
    if action:
        query = query.filter(models.AuditLog.action == action)
    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type)
    if user_id_filter is not None:
        query = query.filter(models.AuditLog.user_id == user_id_filter)

    total = query.count()
    rows = (
        query.order_by(desc(models.AuditLog.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return AuditLogResponse(
        entries=[
            AuditLogEntry(
                id=e.id,
                user_id=e.user_id,
                action=e.action,
                resource_type=e.resource_type,
                resource_id=e.resource_id,
                before_json=e.before_json,
                after_json=e.after_json,
                ip=e.ip,
                user_agent=e.user_agent,
                request_id=e.request_id,
                created_at=e.created_at.isoformat() if e.created_at else "",
            )
            for e in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
