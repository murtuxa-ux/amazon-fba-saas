"""
Account Health Monitor Module - Ecom Era
Tracks seller account health, suspension risk, and policy violations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text, desc, and_, or_
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import List, Optional, Literal
from enum import Enum
import logging

from auth import get_current_user
from models import User, Organization, AccountHealthSnapshot, AccountViolation
from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/account-health", tags=["account-health"])

# ============================================================================
# ENUMS
# ============================================================================

class AccountStatus(str, Enum):
    HEALTHY = "healthy"
    AT_RISK = "at_risk"
    CRITICAL = "critical"
    SUSPENDED = "suspended"


class HealthTrend(str, Enum):
    IMPROVING = "improving"
    DECLINING = "declining"
    STABLE = "stable"


class ViolationSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class ViolationStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    APPEALED = "appealed"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MetricStatus(str, Enum):
    PASS = "pass"
    WARNING = "warning"
    FAIL = "fail"


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class CustomerServiceMetrics(BaseModel):
    order_defect_rate: float = Field(..., ge=0, le=100, description="ODR percentage")
    response_time_hours: float = Field(..., ge=0, description="Average response time")
    a_to_z_claims_rate: float = Field(..., ge=0, le=100, description="A-to-Z claims percentage")


class ShippingMetrics(BaseModel):
    late_shipment_rate: float = Field(..., ge=0, le=100, description="Late shipment percentage")
    pre_cancel_rate: float = Field(..., ge=0, le=100, description="Pre-fulfillment cancel percentage")
    valid_tracking_rate: float = Field(..., ge=0, le=100, description="Valid tracking percentage")


class PolicyCompliance(BaseModel):
    ip_complaints_count: int = Field(..., ge=0)
    listing_violations_count: int = Field(..., ge=0)
    product_authenticity_issues: int = Field(..., ge=0)


class InventoryHealth(BaseModel):
    stranded_count: int = Field(..., ge=0)
    excess_count: int = Field(..., ge=0)
    storage_utilization_pct: float = Field(..., ge=0, le=100)


class AccountHealthOverview(BaseModel):
    account_status: AccountStatus
    health_score: int = Field(..., ge=0, le=100)
    customer_service_metrics: CustomerServiceMetrics
    shipping_metrics: ShippingMetrics
    policy_compliance: PolicyCompliance
    inventory_health: InventoryHealth
    last_updated: datetime


class HealthScorePoint(BaseModel):
    date: str
    score: int = Field(..., ge=0, le=100)


class HealthScoreHistory(BaseModel):
    scores: List[HealthScorePoint]
    trend: HealthTrend
    average_score: float


class AccountViolationSchema(BaseModel):
    id: int
    violation_type: str
    severity: ViolationSeverity
    status: ViolationStatus
    description: str
    asin: Optional[str]
    action_required: str
    deadline: Optional[datetime]
    appeal_notes: Optional[str]
    resolved_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class CreateViolationRequest(BaseModel):
    violation_type: str
    severity: ViolationSeverity
    description: str
    asin: Optional[str] = None
    action_required: str
    deadline: Optional[datetime] = None


class UpdateViolationRequest(BaseModel):
    status: Optional[ViolationStatus] = None
    appeal_notes: Optional[str] = None


class ViolationListResponse(BaseModel):
    violations: List[AccountViolationSchema]
    total_count: int
    critical_count: int
    open_count: int


class RiskFactor(BaseModel):
    factor: str
    weight: float = Field(..., ge=0, le=100, description="Weight percentage")
    current_value: float
    threshold: float


class RiskAssessment(BaseModel):
    risk_level: RiskLevel
    risk_score: int = Field(..., ge=0, le=100)
    risk_factors: List[RiskFactor]
    recommendations: List[str]
    last_updated: datetime


class Alert(BaseModel):
    id: int
    message: str
    severity: ViolationSeverity
    alert_type: str
    created_at: datetime
    acknowledged: bool


class AlertResponse(BaseModel):
    alerts: List[Alert]
    total_count: int
    unacknowledged_count: int


class BenchmarkMetric(BaseModel):
    metric_name: str
    current_value: float
    target_threshold: float
    critical_threshold: float
    status: MetricStatus


class BenchmarkComparison(BaseModel):
    metrics: List[BenchmarkMetric]
    overall_status: AccountStatus


class SnapshotRequest(BaseModel):
    account_id: Optional[str] = None


class SnapshotResponse(BaseModel):
    snapshot_id: int
    snapshot_date: datetime
    health_score: int
    account_status: AccountStatus


# ============================================================================
# AMAZON PERFORMANCE THRESHOLDS
# ============================================================================

AMAZON_THRESHOLDS = {
    "odr_rate": {"target": 1.0, "critical": 2.5},
    "late_shipment_rate": {"target": 2.0, "critical": 4.0},
    "valid_tracking_rate": {"target": 95.0, "critical": 90.0},
    "pre_cancel_rate": {"target": 0.5, "critical": 1.5},
    "response_time_hours": {"target": 24.0, "critical": 48.0},
    "a_to_z_claims_rate": {"target": 0.3, "critical": 1.0},
    "ip_complaints": {"target": 0, "critical": 3},
    "listing_violations": {"target": 0, "critical": 5},
    "stranded_inventory": {"target": 0, "critical": 50},
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_health_score(
    odr_rate: float,
    late_shipment_rate: float,
    valid_tracking_rate: float,
    pre_cancel_rate: float,
    response_time_hours: float,
    a_to_z_claims_rate: float,
    ip_complaints_count: int,
    listing_violations_count: int,
    stranded_inventory_count: int,
) -> int:
    """
    Calculate overall account health score (0-100).
    Based on weighted metrics from Amazon's guidelines.
    """
    score = 100.0

    # Customer service metrics (30%)
    odr_penalty = min(odr_rate / 5.0, 1.0) * 20
    response_penalty = min(response_time_hours / 72.0, 1.0) * 5
    a_to_z_penalty = min(a_to_z_claims_rate / 2.0, 1.0) * 5

    # Shipping metrics (40%)
    late_penalty = min(late_shipment_rate / 8.0, 1.0) * 20
    pre_cancel_penalty = min(pre_cancel_rate / 3.0, 1.0) * 10
    tracking_penalty = max(0, (100 - valid_tracking_rate) / 10) * 10

    # Policy compliance (20%)
    ip_penalty = min(ip_complaints_count / 10.0, 1.0) * 10
    listing_penalty = min(listing_violations_count / 20.0, 1.0) * 10

    # Inventory health (10%)
    stranded_penalty = min(stranded_inventory_count / 500.0, 1.0) * 10

    total_penalty = (
        odr_penalty
        + response_penalty
        + a_to_z_penalty
        + late_penalty
        + pre_cancel_penalty
        + tracking_penalty
        + ip_penalty
        + listing_penalty
        + stranded_penalty
    )

    score = max(0, min(100, score - total_penalty))
    return int(score)


def determine_account_status(health_score: int, risk_level: RiskLevel) -> AccountStatus:
    """Determine account status based on health score and risk level."""
    if risk_level == RiskLevel.CRITICAL or health_score < 20:
        return AccountStatus.SUSPENDED
    elif risk_level == RiskLevel.HIGH or health_score < 40:
        return AccountStatus.CRITICAL
    elif risk_level == RiskLevel.MEDIUM or health_score < 60:
        return AccountStatus.AT_RISK
    return AccountStatus.HEALTHY


def calculate_risk_level(health_score: int, violation_count: int, critical_violations: int) -> RiskLevel:
    """Calculate suspension risk level."""
    if health_score < 20 or critical_violations >= 3:
        return RiskLevel.CRITICAL
    elif health_score < 40 or critical_violations >= 2 or violation_count >= 10:
        return RiskLevel.HIGH
    elif health_score < 60 or violation_count >= 5:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def determine_health_trend(scores: List[int]) -> HealthTrend:
    """Determine trend from score history."""
    if len(scores) < 2:
        return HealthTrend.STABLE

    recent = scores[-7:] if len(scores) >= 7 else scores
    older = scores[-14:-7] if len(scores) >= 14 else scores[:len(scores)//2]

    recent_avg = sum(recent) / len(recent) if recent else 0
    older_avg = sum(older) / len(older) if older else 0

    diff = recent_avg - older_avg
    if diff > 2:
        return HealthTrend.IMPROVING
    elif diff < -2:
        return HealthTrend.DECLINING
    return HealthTrend.STABLE


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/overview", response_model=AccountHealthOverview)
def get_account_health_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get overall account health dashboard with all key metrics.
    """
    try:
        # Get latest snapshot
        latest_snapshot = db.query(AccountHealthSnapshot).filter(
            AccountHealthSnapshot.org_id == current_user.org_id
        ).order_by(desc(AccountHealthSnapshot.created_at)).first()

        if not latest_snapshot:
            return {
                "account_status": "healthy",
                "health_score": 100,
                "customer_service_metrics": {"order_defect_rate": 0.0, "response_time_hours": 0.0, "a_to_z_claims_rate": 0.0},
                "shipping_metrics": {"late_shipment_rate": 0.0, "pre_cancel_rate": 0.0, "valid_tracking_rate": 100.0},
                "policy_compliance": {"ip_complaints_count": 0, "listing_violations_count": 0, "product_authenticity_issues": 0},
                "inventory_health": {"stranded_count": 0, "excess_count": 0, "storage_utilization_pct": 0.0},
                "last_updated": datetime.utcnow()
            }

        # Fetch metric data (would come from Amazon API in production)
        # For now, using snapshot data
        customer_service = CustomerServiceMetrics(
            order_defect_rate=latest_snapshot.odr_rate,
            response_time_hours=24.0,
            a_to_z_claims_rate=0.5,
        )

        shipping = ShippingMetrics(
            late_shipment_rate=latest_snapshot.late_shipment_rate,
            pre_cancel_rate=0.3,
            valid_tracking_rate=98.0,
        )

        policy = PolicyCompliance(
            ip_complaints_count=latest_snapshot.ip_complaints_count,
            listing_violations_count=latest_snapshot.listing_violations_count,
            product_authenticity_issues=0,
        )

        inventory = InventoryHealth(
            stranded_count=latest_snapshot.stranded_inventory_count,
            excess_count=0,
            storage_utilization_pct=75.0,
        )

        risk_level = calculate_risk_level(
            latest_snapshot.health_score,
            latest_snapshot.policy_violations_count,
            db.query(AccountViolation).filter(
                and_(
                    AccountViolation.org_id == current_user.org_id,
                    AccountViolation.severity == ViolationSeverity.CRITICAL,
                    AccountViolation.status == ViolationStatus.OPEN,
                )
            ).count(),
        )

        account_status = determine_account_status(latest_snapshot.health_score, risk_level)

        return AccountHealthOverview(
            account_status=account_status,
            health_score=latest_snapshot.health_score,
            customer_service_metrics=customer_service,
            shipping_metrics=shipping,
            policy_compliance=policy,
            inventory_health=inventory,
            last_updated=latest_snapshot.created_at,
        )

    except Exception as e:
        logger.error(f"Error getting account health overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve account health overview")


@router.get("/score-history", response_model=HealthScoreHistory)
def get_health_score_history(
    days: int = Query(90, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get health score history for the last N days.
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        snapshots = db.query(AccountHealthSnapshot).filter(
            and_(
                AccountHealthSnapshot.org_id == current_user.org_id,
                AccountHealthSnapshot.created_at >= cutoff_date,
            )
        ).order_by(AccountHealthSnapshot.snapshot_date).all()

        if not snapshots:
            raise HTTPException(status_code=404, detail="No score history available")

        scores = [HealthScorePoint(date=s.snapshot_date.strftime("%Y-%m-%d"), score=s.health_score) for s in snapshots]
        score_values = [s.score for s in scores]
        trend = determine_health_trend(score_values)
        avg_score = sum(score_values) / len(score_values) if score_values else 0

        return HealthScoreHistory(
            scores=scores,
            trend=trend,
            average_score=round(avg_score, 2),
        )

    except Exception as e:
        logger.error(f"Error getting health score history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve score history")


@router.get("/violations", response_model=ViolationListResponse)
def get_violations(
    severity: Optional[ViolationSeverity] = None,
    status: Optional[ViolationStatus] = None,
    violation_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List policy violations with optional filters.
    """
    try:
        query = db.query(AccountViolation).filter(AccountViolation.org_id == current_user.org_id)

        if severity:
            query = query.filter(AccountViolation.severity == severity)
        if status:
            query = query.filter(AccountViolation.status == status)
        if violation_type:
            query = query.filter(AccountViolation.violation_type == violation_type)

        violations = query.order_by(desc(AccountViolation.created_at)).all()

        critical_count = db.query(AccountViolation).filter(
            and_(
                AccountViolation.org_id == current_user.org_id,
                AccountViolation.severity == ViolationSeverity.CRITICAL,
            )
        ).count()

        open_count = db.query(AccountViolation).filter(
            and_(
                AccountViolation.org_id == current_user.org_id,
                AccountViolation.status == ViolationStatus.OPEN,
            )
        ).count()

        violation_schemas = [
            AccountViolationSchema(
                id=v.id,
                violation_type=v.violation_type,
                severity=v.severity,
                status=v.status,
                description=v.description,
                asin=v.asin,
                action_required=v.action_required,
                deadline=v.deadline,
                appeal_notes=v.appeal_notes,
                resolved_date=v.resolved_date,
                created_at=v.created_at,
                updated_at=v.updated_at,
            )
            for v in violations
        ]

        return ViolationListResponse(
            violations=violation_schemas,
            total_count=len(violations),
            critical_count=critical_count,
            open_count=open_count,
        )

    except Exception as e:
        logger.error(f"Error getting violations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve violations")


@router.post("/violations", response_model=AccountViolationSchema)
def create_violation(
    request: CreateViolationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Log a new policy violation.
    """
    try:
        violation = AccountViolation(
            org_id=current_user.org_id,
            violation_type=request.violation_type,
            severity=request.severity,
            status=ViolationStatus.OPEN,
            description=request.description,
            asin=request.asin,
            action_required=request.action_required,
            deadline=request.deadline,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(violation)
        db.commit()
        db.refresh(violation)

        logger.info(f"Created violation {violation.id} for org {current_user.org_id}")

        return AccountViolationSchema(
            id=violation.id,
            violation_type=violation.violation_type,
            severity=violation.severity,
            status=violation.status,
            description=violation.description,
            asin=violation.asin,
            action_required=violation.action_required,
            deadline=violation.deadline,
            appeal_notes=violation.appeal_notes,
            resolved_date=violation.resolved_date,
            created_at=violation.created_at,
            updated_at=violation.updated_at,
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating violation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create violation")


@router.put("/violations/{violation_id}", response_model=AccountViolationSchema)
def update_violation(
    violation_id: int,
    request: UpdateViolationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a violation's status or appeal notes.
    """
    try:
        violation = db.query(AccountViolation).filter(
            and_(
                AccountViolation.id == violation_id,
                AccountViolation.org_id == current_user.org_id,
            )
        ).first()

        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        if request.status:
            violation.status = request.status
            if request.status == ViolationStatus.RESOLVED:
                violation.resolved_date = datetime.utcnow()

        if request.appeal_notes is not None:
            violation.appeal_notes = request.appeal_notes
            if violation.status != ViolationStatus.APPEALED:
                violation.status = ViolationStatus.APPEALED

        violation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(violation)

        logger.info(f"Updated violation {violation_id} for org {current_user.org_id}")

        return AccountViolationSchema(
            id=violation.id,
            violation_type=violation.violation_type,
            severity=violation.severity,
            status=violation.status,
            description=violation.description,
            asin=violation.asin,
            action_required=violation.action_required,
            deadline=violation.deadline,
            appeal_notes=violation.appeal_notes,
            resolved_date=violation.resolved_date,
            created_at=violation.created_at,
            updated_at=violation.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating violation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update violation")


@router.get("/risk-assessment", response_model=RiskAssessment)
def get_risk_assessment(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get suspension risk assessment with risk factors and recommendations.
    """
    try:
        latest_snapshot = db.query(AccountHealthSnapshot).filter(
            AccountHealthSnapshot.org_id == current_user.org_id
        ).order_by(desc(AccountHealthSnapshot.created_at)).first()

        if not latest_snapshot:
            raise HTTPException(status_code=404, detail="No risk assessment data available")

        critical_violations = db.query(AccountViolation).filter(
            and_(
                AccountViolation.org_id == current_user.org_id,
                AccountViolation.severity == ViolationSeverity.CRITICAL,
                AccountViolation.status == ViolationStatus.OPEN,
            )
        ).count()

        risk_level = calculate_risk_level(
            latest_snapshot.health_score,
            latest_snapshot.policy_violations_count,
            critical_violations,
        )

        # Calculate risk score (0-100)
        risk_score = 100 - latest_snapshot.health_score

        # Build risk factors
        risk_factors = []

        if latest_snapshot.odr_rate > AMAZON_THRESHOLDS["odr_rate"]["critical"]:
            risk_factors.append(
                RiskFactor(
                    factor="High Order Defect Rate",
                    weight=20.0,
                    current_value=latest_snapshot.odr_rate,
                    threshold=AMAZON_THRESHOLDS["odr_rate"]["critical"],
                )
            )

        if latest_snapshot.late_shipment_rate > AMAZON_THRESHOLDS["late_shipment_rate"]["critical"]:
            risk_factors.append(
                RiskFactor(
                    factor="High Late Shipment Rate",
                    weight=20.0,
                    current_value=latest_snapshot.late_shipment_rate,
                    threshold=AMAZON_THRESHOLDS["late_shipment_rate"]["critical"],
                )
            )

        if latest_snapshot.ip_complaints_count >= AMAZON_THRESHOLDS["ip_complaints"]["critical"]:
            risk_factors.append(
                RiskFactor(
                    factor="Intellectual Property Complaints",
                    weight=25.0,
                    current_value=latest_snapshot.ip_complaints_count,
                    threshold=AMAZON_THRESHOLDS["ip_complaints"]["critical"],
                )
            )

        if latest_snapshot.listing_violations_count >= AMAZON_THRESHOLDS["listing_violations"]["critical"]:
            risk_factors.append(
                RiskFactor(
                    factor="Listing Policy Violations",
                    weight=15.0,
                    current_value=latest_snapshot.listing_violations_count,
                    threshold=AMAZON_THRESHOLDS["listing_violations"]["critical"],
                )
            )

        if critical_violations >= 2:
            risk_factors.append(
                RiskFactor(
                    factor="Critical Unresolved Violations",
                    weight=20.0,
                    current_value=critical_violations,
                    threshold=2.0,
                )
            )

        # Generate recommendations
        recommendations = []
        if latest_snapshot.odr_rate > AMAZON_THRESHOLDS["odr_rate"]["target"]:
            recommendations.append(
                f"Reduce order defect rate: Currently {latest_snapshot.odr_rate:.1f}%, target {AMAZON_THRESHOLDS['odr_rate']['target']}%"
            )
        if latest_snapshot.late_shipment_rate > AMAZON_THRESHOLDS["late_shipment_rate"]["target"]:
            recommendations.append(
                f"Improve shipping speed: Currently {latest_snapshot.late_shipment_rate:.1f}%, target {AMAZON_THRESHOLDS['late_shipment_rate']['target']}%"
            )
        if latest_snapshot.ip_complaints_count > 0:
            recommendations.append(
                f"Address IP complaints ({latest_snapshot.ip_complaints_count}): Verify product authenticity and sourcing"
            )
        if critical_violations > 0:
            recommendations.append(
                f"Resolve {critical_violations} critical violation(s) immediately to prevent suspension"
            )
        if latest_snapshot.stranded_inventory_count > 100:
            recommendations.append(
                f"Clear {latest_snapshot.stranded_inventory_count} stranded items to improve inventory health"
            )

        if not recommendations:
            recommendations.append("Maintain current performance levels and monitor metrics regularly")

        return RiskAssessment(
            risk_level=risk_level,
            risk_score=risk_score,
            risk_factors=risk_factors,
            recommendations=recommendations,
            last_updated=latest_snapshot.created_at,
        )

    except Exception as e:
        logger.error(f"Error getting risk assessment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve risk assessment")


@router.get("/alerts", response_model=AlertResponse)
def get_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get urgent account health alerts.
    """
    try:
        alerts = []

        # Check for critical violations
        critical_violations = db.query(AccountViolation).filter(
            and_(
                AccountViolation.org_id == current_user.org_id,
                AccountViolation.severity == ViolationSeverity.CRITICAL,
                AccountViolation.status == ViolationStatus.OPEN,
            )
        ).all()

        for violation in critical_violations:
            alerts.append(
                Alert(
                    id=violation.id,
                    message=f"Critical violation: {violation.violation_type}",
                    severity=ViolationSeverity.CRITICAL,
                    alert_type="violation",
                    created_at=violation.created_at,
                    acknowledged=False,
                )
            )

        # Check for upcoming deadlines
        upcoming_deadline = datetime.utcnow() + timedelta(days=7)
        violations_with_deadline = db.query(AccountViolation).filter(
            and_(
                AccountViolation.org_id == current_user.org_id,
                AccountViolation.deadline.isnot(None),
                AccountViolation.deadline <= upcoming_deadline,
                AccountViolation.status == ViolationStatus.OPEN,
            )
        ).all()

        for violation in violations_with_deadline:
            days_left = (violation.deadline - datetime.utcnow()).days
            alerts.append(
                Alert(
                    id=violation.id,
                    message=f"Appeal deadline approaching in {days_left} days: {violation.violation_type}",
                    severity=ViolationSeverity.WARNING,
                    alert_type="deadline",
                    created_at=violation.created_at,
                    acknowledged=False,
                )
            )

        # Check for metric thresholds
        latest_snapshot = db.query(AccountHealthSnapshot).filter(
            AccountHealthSnapshot.org_id == current_user.org_id
        ).order_by(desc(AccountHealthSnapshot.created_at)).first()

        if latest_snapshot:
            if latest_snapshot.health_score < 40:
                alerts.append(
                    Alert(
                        id=latest_snapshot.id,
                        message=f"Account health critical: Score {latest_snapshot.health_score}/100",
                        severity=ViolationSeverity.CRITICAL,
                        alert_type="health_score",
                        created_at=latest_snapshot.created_at,
                        acknowledged=False,
                    )
                )
            elif latest_snapshot.health_score < 60:
                alerts.append(
                    Alert(
                        id=latest_snapshot.id,
                        message=f"Account health at risk: Score {latest_snapshot.health_score}/100",
                        severity=ViolationSeverity.WARNING,
                        alert_type="health_score",
                        created_at=latest_snapshot.created_at,
                        acknowledged=False,
                    )
                )

        return AlertResponse(
            alerts=alerts,
            total_count=len(alerts),
            unacknowledged_count=len(alerts),
        )

    except Exception as e:
        logger.error(f"Error getting alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Acknowledge an alert (mark as read).
    """
    try:
        # In a real implementation, you would have an Alert model
        # For now, just return success
        logger.info(f"Alert {alert_id} acknowledged by user {current_user.id}")
        return {"message": "Alert acknowledged successfully"}

    except Exception as e:
        logger.error(f"Error acknowledging alert: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


@router.get("/benchmarks", response_model=BenchmarkComparison)
def get_benchmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compare account metrics against Amazon's thresholds.
    """
    try:
        latest_snapshot = db.query(AccountHealthSnapshot).filter(
            AccountHealthSnapshot.org_id == current_user.org_id
        ).order_by(desc(AccountHealthSnapshot.created_at)).first()

        if not latest_snapshot:
            raise HTTPException(status_code=404, detail="No benchmark data available")

        metrics = []

        # ODR Benchmark
        odr_status = MetricStatus.PASS
        if latest_snapshot.odr_rate > AMAZON_THRESHOLDS["odr_rate"]["critical"]:
            odr_status = MetricStatus.FAIL
        elif latest_snapshot.odr_rate > AMAZON_THRESHOLDS["odr_rate"]["target"]:
            odr_status = MetricStatus.WARNING

        metrics.append(
            BenchmarkMetric(
                metric_name="Order Defect Rate (%)",
                current_value=latest_snapshot.odr_rate,
                target_threshold=AMAZON_THRESHOLDS["odr_rate"]["target"],
                critical_threshold=AMAZON_THRESHOLDS["odr_rate"]["critical"],
                status=odr_status,
            )
        )

        # Late Shipment Rate Benchmark
        late_status = MetricStatus.PASS
        if latest_snapshot.late_shipment_rate > AMAZON_THRESHOLDS["late_shipment_rate"]["critical"]:
            late_status = MetricStatus.FAIL
        elif latest_snapshot.late_shipment_rate > AMAZON_THRESHOLDS["late_shipment_rate"]["target"]:
            late_status = MetricStatus.WARNING

        metrics.append(
            BenchmarkMetric(
                metric_name="Late Shipment Rate (%)",
                current_value=latest_snapshot.late_shipment_rate,
                target_threshold=AMAZON_THRESHOLDS["late_shipment_rate"]["target"],
                critical_threshold=AMAZON_THRESHOLDS["late_shipment_rate"]["critical"],
                status=late_status,
            )
        )

        # IP Complaints Benchmark
        ip_status = MetricStatus.PASS
        if latest_snapshot.ip_complaints_count >= AMAZON_THRESHOLDS["ip_complaints"]["critical"]:
            ip_status = MetricStatus.FAIL
        elif latest_snapshot.ip_complaints_count > AMAZON_THRESHOLDS["ip_complaints"]["target"]:
            ip_status = MetricStatus.WARNING

        metrics.append(
            BenchmarkMetric(
                metric_name="IP Complaints Count",
                current_value=latest_snapshot.ip_complaints_count,
                target_threshold=AMAZON_THRESHOLDS["ip_complaints"]["target"],
                critical_threshold=AMAZON_THRESHOLDS["ip_complaints"]["critical"],
                status=ip_status,
            )
        )

        # Listing Violations Benchmark
        listing_status = MetricStatus.PASS
        if latest_snapshot.listing_violations_count >= AMAZON_THRESHOLDS["listing_violations"]["critical"]:
            listing_status = MetricStatus.FAIL
        elif latest_snapshot.listing_violations_count > AMAZON_THRESHOLDS["listing_violations"]["target"]:
            listing_status = MetricStatus.WARNING

        metrics.append(
            BenchmarkMetric(
                metric_name="Listing Violations Count",
                current_value=latest_snapshot.listing_violations_count,
                target_threshold=AMAZON_THRESHOLDS["listing_violations"]["target"],
                critical_threshold=AMAZON_THRESHOLDS["listing_violations"]["critical"],
                status=listing_status,
            )
        )

        # Determine overall status
        fail_count = sum(1 for m in metrics if m.status == MetricStatus.FAIL)
        warning_count = sum(1 for m in metrics if m.status == MetricStatus.WARNING)

        if fail_count > 0:
            overall_status = AccountStatus.CRITICAL
        elif warning_count > 0:
            overall_status = AccountStatus.AT_RISK
        else:
            overall_status = AccountStatus.HEALTHY

        return BenchmarkComparison(metrics=metrics, overall_status=overall_status)

    except Exception as e:
        logger.error(f"Error getting benchmarks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve benchmarks")


@router.post("/snapshot", response_model=SnapshotResponse)
def take_snapshot(
    request: SnapshotRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Take a point-in-time snapshot of account health for historical tracking.
    """
    try:
        # In production, fetch real metrics from Amazon API
        # For now, creating a snapshot with default values
        health_score = 85  # Would be calculated from real metrics
        risk_level = RiskLevel.LOW
        account_status = determine_account_status(health_score, risk_level)

        snapshot = AccountHealthSnapshot(
            org_id=current_user.org_id,
            account_id=request.account_id,
            health_score=health_score,
            odr_rate=0.8,
            late_shipment_rate=1.2,
            valid_tracking_rate=98.5,
            policy_violations_count=0,
            ip_complaints_count=0,
            listing_violations_count=0,
            stranded_inventory_count=5,
            risk_level=risk_level,
            snapshot_date=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )

        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        logger.info(f"Created snapshot {snapshot.id} for org {current_user.org_id}")

        return SnapshotResponse(
            snapshot_id=snapshot.id,
            snapshot_date=snapshot.snapshot_date,
            health_score=snapshot.health_score,
            account_status=account_status,
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error taking snapshot: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to take snapshot")
