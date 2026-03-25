"""
Ecom Era FBA SaaS v6.0 — Plan Enforcement Middleware
FastAPI dependencies that check plan limits before allowing actions.
"""
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models import Organization, User, Client, Supplier, ScoutResult
from auth import get_current_user
from stripe_billing import get_plan_limits


def enforce_user_limit(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check user count against plan limit (use when adding team members)"""
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    limits = get_plan_limits(org.plan)
    current = db.query(User).filter(User.org_id == org.id, User.is_active == True).count()
    if current >= limits["max_users"]:
        raise HTTPException(
            status_code=403,
            detail=f"User limit reached ({current}/{limits['max_users']}). Upgrade your plan."
        )
    return user


def enforce_client_limit(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check client count against plan limit"""
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    limits = get_plan_limits(org.plan)
    current = db.query(Client).filter(Client.org_id == org.id).count()
    if current >= limits["max_clients"]:
        raise HTTPException(
            status_code=403,
            detail=f"Client limit reached ({current}/{limits['max_clients']}). Upgrade your plan."
        )
    return user


def enforce_supplier_limit(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check supplier count against plan limit"""
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    limits = get_plan_limits(org.plan)
    current = db.query(Supplier).filter(Supplier.org_id == org.id).count()
    if current >= limits["max_suppliers"]:
        raise HTTPException(
            status_code=403,
            detail=f"Supplier limit reached ({current}/{limits['max_suppliers']}). Upgrade your plan."
        )
    return user


def enforce_scout_limit(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check monthly scout usage against plan limit"""
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    limits = get_plan_limits(org.plan)
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current = db.query(ScoutResult).filter(
        ScoutResult.org_id == org.id,
        ScoutResult.created_at >= month_start
    ).count()
    if current >= limits["max_scouts_per_month"]:
        raise HTTPException(
            status_code=403,
            detail=f"Monthly scout limit reached ({current}/{limits['max_scouts_per_month']}). Upgrade your plan."
        )
    return user


def require_feature(feature_name: str):
    """Dependency factory: ensures org has a feature enabled"""
    def checker(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        org = db.query(Organization).filter(Organization.id == user.org_id).first()
        limits = get_plan_limits(org.plan)
        if not limits.get(feature_name, False):
            raise HTTPException(
                status_code=403,
                detail=f"'{feature_name}' requires a higher plan. Current: {org.plan}."
            )
        return user
    return checker
