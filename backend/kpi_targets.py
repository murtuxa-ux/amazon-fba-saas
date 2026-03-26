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
from auth import get_current_user, require_role

router = APIRouter(prefix="/kpi", tags=["kpi"])


# ── KPITarget Model ──────────────────────────────────────────────────────────
class KPITarget(Base):
    __tablename__ = "kpi_targets"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    name = Column(String(200), default="")
    role_type = Column(String(50), default="sourcing_expert")  # account_manager / sourcing_expert
    period = Column(String(20), default="monthly")  # weekly / monthly / quarterly
    metrics_json = Column(Text, default="{}")  # JSON blob of metric targets
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


# ── Request / Response Models ─────────────────────────────────────────────────
class TargetInput(BaseModel):
    username: str
    name: Optional[str] = ""
    role_type: str = "sourcing_expert"
    period: str = "monthly"
    metrics: Dict[str, Any] = {}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/targets")
def get_targets(
    period: Optional[str] = "monthly",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all KPI targets for the organization, keyed by username."""
    rows = (
        db.query(KPITarget)
        .filter(KPITarget.org_id == user.org_id, KPITarget.period == period)
        .all()
    )

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
            "metrics": metrics,
            "updated_at": str(row.updated_at) if row.updated_at else None,
        }

    return {"period": period, "targets": targets}


@router.post("/targets")
def save_targets(
    data: TargetInput,
    user: User = Depends(get_current_user),
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
