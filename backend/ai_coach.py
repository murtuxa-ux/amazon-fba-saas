"""AI Coach (§2.6 #4) — daily top-5 action surfacing across BuyBox + PPC.

Click-to-execute by design — every recommendation requires user action,
never auto-writes to Amazon. This is the foundation of the §3.1 SP-API
moat: until SP-API integration ships, Coach surfaces the action, the user
takes it on Seller Central.

Sources surveyed:
  - BuyBox alerts (BuyBoxAlert) — recently lost / suppressed listings
  - PPC campaigns (PPCCampaign)  — high-ACoS bleeding spend
  - Inventory reorder            — placeholder until Product gains
                                   on_hand/inbound (TODO §2.6 follow-up).
                                   Forecasting needs Keepa per call which
                                   is too expensive to fan out per org
                                   inside the daily cron.

Ranking: dollar_impact_est descending, take top 5. Persisted to
ai_coach_actions so /coach/feed reads are cached and the daily cron
controls regeneration cadence (force=True). On-demand /coach/feed
returns the day's existing pending rows; only regenerates if none exist.

Routes:
  GET  /coach/feed                  list today's actions + counters
  POST /coach/dismiss/{action_id}   user dismissed; not re-surfaced tomorrow
  POST /coach/complete/{action_id}  user took the action
  POST /coach/feedback              1-5 rating + notes per action
  POST /coach/regenerate            force regen (admin/owner only)
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from auth import require_role, tenant_session
from database import get_db
from models import (
    AiCoachAction,
    AiCoachFeedback,
    BuyBoxAlert,
    Organization,
    PPCCampaign,
    User,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coach", tags=["AI Coach"])


# ── Tunables ───────────────────────────────────────────────────────────────
TOP_N = 5
COACH_VALIDITY_HOURS = 24
BUYBOX_LOOKBACK_DAYS = 7
PPC_HIGH_ACOS_THRESHOLD = 50.0          # %
PPC_MIN_SPEND_FOR_REVIEW = 100.0        # $
PPC_TARGET_ACOS = 25.0                  # %; "wasted" spend = above this
BUYBOX_LOSS_DAILY_REVENUE_GUESS = 100.0 # $; conservative until SP-API ships
BUYBOX_LOSS_IMPACT_FACTOR = 0.30        # ~30% sales lost without buy box


# ── Schemas ────────────────────────────────────────────────────────────────
class CoachAction(BaseModel):
    id: int
    action_type: str
    asin: Optional[str] = None
    dollar_impact_est: float = 0.0
    urgency: str = "medium"
    suggested_action: str
    reasoning: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    status: str
    created_at: str
    valid_until: str


class FeedResponse(BaseModel):
    actions: List[CoachAction] = Field(default_factory=list)
    total_pending: int = 0
    total_dismissed_today: int = 0
    total_completed_today: int = 0


class FeedbackRequest(BaseModel):
    action_id: int
    rating: int = Field(..., ge=1, le=5)
    notes: Optional[str] = None


# ── Source-specific generators ─────────────────────────────────────────────
def _generate_buybox_actions(db: Session, org: Organization) -> List[dict]:
    """Pull recent unread BuyBox alerts (lost_buybox / suppressed)."""
    cutoff = datetime.utcnow() - timedelta(days=BUYBOX_LOOKBACK_DAYS)
    alerts = (
        db.query(BuyBoxAlert)
        .filter(
            BuyBoxAlert.org_id == org.id,
            BuyBoxAlert.alert_type.in_(("lost_buybox", "suppressed", "new_competitor")),
            BuyBoxAlert.created_at >= cutoff,
            BuyBoxAlert.is_read.is_(False),
        )
        .order_by(desc(BuyBoxAlert.created_at))
        .limit(TOP_N)
        .all()
    )

    actions: List[dict] = []
    for alert in alerts:
        impact = round(BUYBOX_LOSS_DAILY_REVENUE_GUESS * BUYBOX_LOSS_IMPACT_FACTOR * 7, 2)
        urgency = "critical" if alert.severity == "critical" else "high"
        if alert.alert_type == "lost_buybox":
            verb = "Win back the BuyBox on"
        elif alert.alert_type == "suppressed":
            verb = "Resolve listing suppression on"
        else:
            verb = "Review new competitor for"
        actions.append({
            "action_type": alert.alert_type,
            "asin": alert.asin,
            "dollar_impact_est": impact,
            "urgency": urgency,
            "suggested_action": f"{verb} {alert.asin}",
            "reasoning": (
                alert.message
                or "BuyBox lost in the last 7 days. Each day without it costs ~30% of sales."
            ),
            "metadata": {"alert_id": alert.id, "severity": alert.severity},
        })
    return actions


def _generate_ppc_actions(db: Session, org: Organization) -> List[dict]:
    """Pull high-ACoS / high-spend PPC campaigns leaking margin."""
    campaigns = (
        db.query(PPCCampaign)
        .filter(
            PPCCampaign.org_id == org.id,
            PPCCampaign.status == "active",
            PPCCampaign.acos > PPC_HIGH_ACOS_THRESHOLD,
            PPCCampaign.total_spend > PPC_MIN_SPEND_FOR_REVIEW,
        )
        .order_by(desc(PPCCampaign.total_spend))
        .limit(TOP_N)
        .all()
    )

    actions: List[dict] = []
    for c in campaigns:
        # Wasted-spend estimate = current_spend × (acos − target_acos) / acos.
        # Caps at total_spend so we never claim impact > what's being spent.
        excess_pct = max(0.0, (c.acos - PPC_TARGET_ACOS) / max(c.acos, 1.0))
        impact = round(min(c.total_spend, c.total_spend * excess_pct), 2)
        urgency = "high" if c.acos > 75 else "medium"
        actions.append({
            "action_type": "high_acos_keyword",
            "asin": None,
            "dollar_impact_est": impact,
            "urgency": urgency,
            "suggested_action": (
                f'Lower bids on campaign "{c.campaign_name}" — ACoS {c.acos:.1f}%'
            ),
            "reasoning": (
                f"Campaign is spending ${c.total_spend:.0f} at {c.acos:.1f}% ACoS. "
                f"Target ACoS for profitability is ~{PPC_TARGET_ACOS:.0f}%."
            ),
            "metadata": {
                "campaign_id": c.id,
                "campaign_name": c.campaign_name,
                "acos": float(c.acos or 0),
                "total_spend": float(c.total_spend or 0),
            },
        })
    return actions


def _generate_reorder_actions(db: Session, org: Organization) -> List[dict]:
    """Placeholder until Product gains on_hand / inbound columns.

    Forecasting from Day 3 needs a per-ASIN Keepa lookup which is too
    expensive to fan out across every org inside the daily cron. When an
    inventory module ships and Product carries on_hand/inbound, this can
    short-circuit on the cached values without hitting Keepa.
    """
    return []


# ── Ranking + persistence ──────────────────────────────────────────────────
def _rank_top_n(raw_actions: List[dict], n: int = TOP_N) -> List[dict]:
    """Sort by dollar_impact_est desc, take top n. Stable for equal impacts."""
    return sorted(raw_actions, key=lambda a: a.get("dollar_impact_est", 0), reverse=True)[:n]


def regenerate_coach_feed(
    db: Session,
    org: Organization,
    force: bool = False,
) -> List[AiCoachAction]:
    """Regenerate top-5 Coach actions for one org.

    On-demand callers (force=False): if any pending action already exists
    for today, return them as-is — keeps /coach/feed cheap and stable.
    Cron callers (force=True): mark today's pending rows as expired,
    then regenerate from sources.
    """
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    valid_until = now + timedelta(hours=COACH_VALIDITY_HOURS)

    if not force:
        existing = (
            db.query(AiCoachAction)
            .filter(
                AiCoachAction.org_id == org.id,
                AiCoachAction.status == "pending",
                AiCoachAction.created_at >= today_start,
            )
            .order_by(desc(AiCoachAction.dollar_impact_est))
            .all()
        )
        if existing:
            return existing

    # Expire stale pending rows (yesterday's, or today's if force=True).
    stale_filter = [
        AiCoachAction.org_id == org.id,
        AiCoachAction.status == "pending",
    ]
    if force:
        stale_filter.append(AiCoachAction.created_at < now)
    else:
        stale_filter.append(AiCoachAction.valid_until < now)
    db.query(AiCoachAction).filter(*stale_filter).update(
        {"status": "expired"}, synchronize_session=False
    )
    db.commit()

    raw: List[dict] = []
    for generator in (
        _generate_buybox_actions,
        _generate_ppc_actions,
        _generate_reorder_actions,
    ):
        try:
            raw.extend(generator(db, org))
        except Exception as e:
            logger.warning("Coach generator %s failed for org %d: %s", generator.__name__, org.id, e)
            continue

    top = _rank_top_n(raw, TOP_N)

    saved: List[AiCoachAction] = []
    for a in top:
        row = AiCoachAction(
            org_id=org.id,
            action_type=a["action_type"],
            asin=a.get("asin"),
            dollar_impact_est=a.get("dollar_impact_est", 0),
            urgency=a.get("urgency", "medium"),
            suggested_action=a["suggested_action"],
            reasoning=a.get("reasoning"),
            metadata_json=json.dumps(a.get("metadata", {}), default=str),
            status="pending",
            created_at=now,
            valid_until=valid_until,
        )
        db.add(row)
        saved.append(row)
    db.commit()
    for row in saved:
        db.refresh(row)
    saved.sort(key=lambda r: float(r.dollar_impact_est or 0), reverse=True)
    return saved


def _to_response(a: AiCoachAction) -> CoachAction:
    try:
        meta = json.loads(a.metadata_json) if a.metadata_json else {}
    except (ValueError, TypeError):
        meta = {}
    return CoachAction(
        id=a.id,
        action_type=a.action_type,
        asin=a.asin,
        dollar_impact_est=float(a.dollar_impact_est or 0),
        urgency=a.urgency,
        suggested_action=a.suggested_action,
        reasoning=a.reasoning,
        metadata=meta,
        status=a.status,
        created_at=a.created_at.isoformat() if a.created_at else "",
        valid_until=a.valid_until.isoformat() if a.valid_until else "",
    )


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/feed", response_model=FeedResponse)
def coach_feed(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Today's top-5 actions for the user's org. Auto-generates if none cached."""
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    actions = regenerate_coach_feed(db, org)

    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    pending_count = (
        db.query(AiCoachAction)
        .filter(
            AiCoachAction.org_id == org.id,
            AiCoachAction.status == "pending",
        )
        .count()
    )
    dismissed_today = (
        db.query(AiCoachAction)
        .filter(
            AiCoachAction.org_id == org.id,
            AiCoachAction.status == "dismissed",
            AiCoachAction.dismissed_at >= today_start,
        )
        .count()
    )
    completed_today = (
        db.query(AiCoachAction)
        .filter(
            AiCoachAction.org_id == org.id,
            AiCoachAction.status == "completed",
            AiCoachAction.completed_at >= today_start,
        )
        .count()
    )

    return FeedResponse(
        actions=[_to_response(a) for a in actions],
        total_pending=pending_count,
        total_dismissed_today=dismissed_today,
        total_completed_today=completed_today,
    )


@router.post("/dismiss/{action_id}")
def dismiss_action(
    action_id: int,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Dismiss an action; not re-surfaced on next regen."""
    action = (
        db.query(AiCoachAction)
        .filter(
            AiCoachAction.org_id == user.org_id,
            AiCoachAction.id == action_id,
        )
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = "dismissed"
    action.dismissed_at = datetime.utcnow()
    db.commit()
    return {"success": True, "id": action_id}


@router.post("/complete/{action_id}")
def complete_action(
    action_id: int,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Mark an action as completed (user took it on Seller Central)."""
    action = (
        db.query(AiCoachAction)
        .filter(
            AiCoachAction.org_id == user.org_id,
            AiCoachAction.id == action_id,
        )
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = "completed"
    action.completed_at = datetime.utcnow()
    db.commit()
    return {"success": True, "id": action_id}


@router.post("/feedback")
def submit_feedback(
    body: FeedbackRequest,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Capture 1-5 rating + free-text notes against an action.

    Feeds future ranking improvements; not consumed by the current
    heuristic generators yet.
    """
    action = (
        db.query(AiCoachAction)
        .filter(
            AiCoachAction.org_id == user.org_id,
            AiCoachAction.id == body.action_id,
        )
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    feedback = AiCoachFeedback(
        org_id=user.org_id,
        action_id=body.action_id,
        user_id=user.id,
        rating=body.rating,
        notes=body.notes,
    )
    db.add(feedback)
    db.commit()
    return {"success": True, "feedback_id": feedback.id}


@router.post("/regenerate")
def force_regenerate(
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Force-regenerate today's feed. Owner/Admin only — useful after
    importing a chunk of new data mid-day."""
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    actions = regenerate_coach_feed(db, org, force=True)
    return {"regenerated": len(actions)}
