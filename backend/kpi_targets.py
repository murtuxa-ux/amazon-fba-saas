"""
Ecom Era FBA SaaS v6.0 — KPI Targets Module
CRUD for setting and retrieving KPI targets per team member.
Stores targets as JSON in the kpi_targets table.
"""

import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from pydantic import BaseModel
from typing import Optional, Dict, Any

from database import get_db, Base
from models import User, Organization
from auth import get_current_user, require_role, tenant_session

router = APIRouter(prefix="/kpi", tags=["kpi"])


# ── KPITarget Model ──────────────────────────────────────────────────────────
class KPITarget(Base):
    __tablename__ = "kpi_targets"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    name = Column(String(200), default="")
    role_type = Column(String(50), default="sourcing_expert")  # account_manager / sourcing_expert
    period = Column(String(20), default="monthly")  # weekly / monthly / quarterly / yearly
    metrics_json = Column(Text, default="{}")  # JSON blob of metric targets
    # Note: period_label was previously declared here but the matching
    # column was never added to the prod DB (schema drift). The
    # period_label field on the API surface is retained as a passthrough
    # — callers can still send/receive it — but it is not persisted or
    # filtered on. If period-level disambiguation becomes needed, add an
    # Alembic migration introducing the column and re-thread it through
    # the routes below.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


# ── Request / Response Models ─────────────────────────────────────────────────
class TargetInput(BaseModel):
    username: str
    name: Optional[str] = ""
    role_type: str = "sourcing_expert"
    period: str = "monthly"
    period_label: Optional[str] = ""
    metrics: Dict[str, Any] = {}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/targets")
def get_targets(
    period: Optional[str] = "monthly",
    period_label: Optional[str] = None,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Get all KPI targets for the organization, keyed by username."""
    q = db.query(KPITarget).filter(
        KPITarget.org_id == user.org_id,
        KPITarget.period == period,
    )
    # period_label filter was removed — column is not persisted (see
    # KPITarget docstring above). If supplied, accepted but ignored.
    rows = q.all()

    targets = {}
    for row in rows:
        try:
            metrics = json.loads(row.metrics_json) if row.metrics_json else {}
        except (json.JSONDecodeError, TypeError):
            metrics = {}

        targets[row.username] = {
            "name": row.name,
            "role_type": row.role_type,
            "period": row.period,
            "period_label": "",  # not persisted; see KPITarget docstring
            "metrics": metrics,
            "updated_at": str(row.updated_at) if row.updated_at else None,
        }

    return {"period": period, "period_label": period_label or "", "targets": targets}


@router.post("/targets")
def save_targets(
    data: TargetInput,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Save or update KPI targets for a team member."""
    # Check if target already exists for this user + period
    existing = (
        db.query(KPITarget)
        .filter(
            KPITarget.org_id == user.org_id,
            KPITarget.username == data.username,
            KPITarget.period == data.period,
        )
        .first()
    )

    metrics_str = json.dumps(data.metrics)

    if existing:
        existing.name = data.name or existing.name
        existing.role_type = data.role_type
        existing.metrics_json = metrics_str
        existing.updated_at = datetime.utcnow()
    else:
        new_target = KPITarget(
            org_id=user.org_id,
            username=data.username,
            name=data.name or data.username,
            role_type=data.role_type,
            period=data.period,
            metrics_json=metrics_str,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(new_target)

    db.commit()

    return {
        "status": "saved",
        "username": data.username,
        "period": data.period,
        "role_type": data.role_type,
    }


@router.delete("/targets/{username}")
def delete_targets(
    username: str,
    period: Optional[str] = "monthly",
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Delete KPI targets for a specific team member."""
    row = (
        db.query(KPITarget)
        .filter(
            KPITarget.org_id == user.org_id,
            KPITarget.username == username,
            KPITarget.period == period,
        )
        .first()
    )

    if row:
        db.delete(row)
        db.commit()
        return {"removed": 1}

    return {"removed": 0}
