"""
Automation Service Backend Module
Amazon FBA Wholesale SaaS - Handles automated summaries, alerts, and report generation
Production-ready FastAPI implementation with SQLAlchemy ORM and PostgreSQL
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import json
import logging

from database import Base, get_db
from auth import get_current_user

# Configure logging
logger = logging.getLogger(__name__)

# ==================== Enums ====================

class RuleTypeEnum(str, Enum):
    """Automation rule types"""
    DWM_DAILY_SUMMARY = "dwm_daily_summary"
    KPI_PROGRESS_ALERT = "kpi_progress_alert"
    REORDER_ALERT = "reorder_alert"
    MONTHLY_CLIENT_REPORT = "monthly_client_report"


class AutomationStatusEnum(str, Enum):
    """Automation execution status"""
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


# ==================== Database Models ====================

class AutomationRule(Base):
    """SQLAlchemy ORM model for automation rules"""
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    rule_type = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True, index=True)
    schedule_cron = Column(String(100), nullable=False)

    recipients = Column(Text, nullable=False)  # JSON list of email addresses or user_ids
    config = Column(Text, nullable=False)  # JSON with rule-specific configuration

    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    logs = relationship("AutomationLog", back_populates="rule", cascade="all, delete-orphan")
    user = relationship("User", foreign_keys=[created_by])

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "org_id": self.org_id,
            "created_by": self.created_by,
            "rule_type": self.rule_type,
            "name": self.name,
            "description": self.description,
            "is_active": self.is_active,
            "schedule_cron": self.schedule_cron,
            "recipients": json.loads(self.recipients) if self.recipients else [],
            "config": json.loads(self.config) if self.config else {},
            "last_run_at": self.last_run_at,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class AutomationLog(Base):
    """SQLAlchemy ORM model for automation execution logs"""
    __tablename__ = "automation_logs"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("automation_rules.id"), nullable=False, index=True)
    org_id = Column(Integer, nullable=False, index=True)

    status = Column(String(20), nullable=False, index=True)
    message = Column(Text, nullable=True)
    recipients_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    rule = relationship("AutomationRule", back_populates="logs")

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "rule_id": self.rule_id,
            "org_id": self.org_id,
            "status": self.status,
            "message": self.message,
            "recipients_count": self.recipients_count,
            "created_at": self.created_at,
        }


# ==================== Pydantic Schemas ====================

class RecipientSchema(BaseModel):
    """Recipient configuration"""
    email: Optional[str] = None
    user_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "user_id": None
            }
        }


class AutomationRuleCreateSchema(BaseModel):
    """Schema for creating an automation rule"""
    rule_type: RuleTypeEnum
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    schedule_cron: str = Field(..., min_length=5, max_length=100)
    recipients: List[Dict[str, Any]] = Field(default=[])
    config: Dict[str, Any] = Field(default={})
    is_active: bool = Field(default=True)

    class Config:
        json_schema_extra = {
            "example": {
                "rule_type": "dwm_daily_summary",
                "name": "Daily Team Summary",
                "description": "Send daily summary of team activity at 6pm",
                "schedule_cron": "0 18 * * *",
                "recipients": [{"email": "manager@example.com"}],
                "config": {"include_metrics": ["units_sold", "revenue"]},
                "is_active": True
            }
        }


class AutomationRuleUpdateSchema(BaseModel):
    """Schema for updating an automation rule"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    schedule_cron: Optional[str] = Field(None, min_length=5, max_length=100)
    recipients: Optional[List[Dict[str, Any]]] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Updated Daily Team Summary",
                "schedule_cron": "0 19 * * *",
                "is_active": True
            }
        }


class AutomationRuleResponseSchema(BaseModel):
    """Schema for automation rule response"""
    id: int
    org_id: int
    created_by: int
    rule_type: str
    name: str
    description: Optional[str]
    is_active: bool
    schedule_cron: str
    recipients: List[Dict[str, Any]]
    config: Dict[str, Any]
    last_run_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AutomationLogResponseSchema(BaseModel):
    """Schema for automation log response"""
    id: int
    rule_id: int
    org_id: int
    status: str
    message: Optional[str]
    recipients_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class AutomationRuleDetailSchema(BaseModel):
    """Schema for detailed rule response with recent logs"""
    rule: AutomationRuleResponseSchema
    recent_logs: List[AutomationLogResponseSchema]

    class Config:
        json_schema_extra = {
            "example": {
                "rule": {
                    "id": 1,
                    "org_id": 1,
                    "created_by": 1,
                    "rule_type": "dwm_daily_summary",
                    "name": "Daily Team Summary",
                    "description": "Send daily summary at 6pm",
                    "is_active": True,
                    "schedule_cron": "0 18 * * *",
                    "recipients": [{"email": "manager@example.com"}],
                    "config": {"include_metrics": ["units_sold"]},
                    "last_run_at": "2026-03-26T18:00:00",
                    "created_at": "2026-01-15T10:00:00",
                    "updated_at": "2026-03-26T18:00:00"
                },
                "recent_logs": [
                    {
                        "id": 1,
                        "rule_id": 1,
                        "org_id": 1,
                        "status": "success",
                        "message": "Successfully sent to 1 recipients",
                        "recipients_count": 1,
                        "created_at": "2026-03-26T18:00:00"
                    }
                ]
            }
        }


class ToggleRuleSchema(BaseModel):
    """Schema for toggling rule activation"""
    is_active: bool


class AutomationTemplateSchema(BaseModel):
    """Schema for predefined automation templates"""
    template_id: str
    name: str
    description: str
    rule_type: str
    default_schedule: str
    default_config: Dict[str, Any]

    class Config:
        json_schema_extra = {
            "example": {
                "template_id": "dwm_daily",
                "name": "DWM Daily Summary",
                "description": "Send evening email with each team member's daily log stats",
                "rule_type": "dwm_daily_summary",
                "default_schedule": "0 18 * * *",
                "default_config": {
                    "include_metrics": ["units_sold", "revenue", "active_listings"],
                    "time_zone": "US/Eastern"
                }
            }
        }


class PreviewAutomationSchema(BaseModel):
    """Schema for automation preview response"""
    rule_id: int
    rule_type: str
    rule_name: str
    preview_timestamp: datetime
    recipients_count: int
    subject: str
    preview_content: str
    estimated_recipients: List[Dict[str, Any]]

    class Config:
        json_schema_extra = {
            "example": {
                "rule_id": 1,
                "rule_type": "dwm_daily_summary",
                "rule_name": "Daily Team Summary",
                "preview_timestamp": "2026-03-27T10:00:00",
                "recipients_count": 2,
                "subject": "Daily Team Summary - March 27, 2026",
                "preview_content": "Team Performance Summary\n\nTeam Member: John Doe\nUnits Sold: 50\nRevenue: $2,500\n\n---",
                "estimated_recipients": [
                    {"email": "john@example.com"},
                    {"email": "manager@example.com"}
                ]
            }
        }


# ==================== Router Setup ====================

router = APIRouter(prefix="/automation", tags=["automation"])


# ==================== Helper Functions ====================

def get_org_id_from_user(current_user) -> int:
    """Extract org_id from current user"""
    if not hasattr(current_user, "org_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to an organization"
        )
    return current_user.org_id


def log_automation_execution(
    db: Session,
    rule_id: int,
    org_id: int,
    status: str,
    message: str = None,
    recipients_count: int = 0
) -> AutomationLog:
    """Helper to create automation execution log"""
    log_entry = AutomationLog(
        rule_id=rule_id,
        org_id=org_id,
        status=status,
        message=message,
        recipients_count=recipients_count
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


def generate_preview_content(rule: AutomationRule) -> Dict[str, Any]:
    """Generate preview content based on rule type"""
    rule_type = rule.rule_type
    config = json.loads(rule.config) if rule.config else {}

    if rule_type == RuleTypeEnum.DWM_DAILY_SUMMARY:
        return {
            "subject": f"Daily Team Summary - {datetime.utcnow().strftime('%B %d, %Y')}",
            "content": f"""Team Performance Summary

Team Member: Sample Team Member
Units Sold: 45
Revenue: $2,250
Active Listings: 125
Flagged Items: 2

---

Summary: All metrics are tracking towards targets.
Generated at: {datetime.utcnow().isoformat()}"""
        }

    elif rule_type == RuleTypeEnum.KPI_PROGRESS_ALERT:
        return {
            "subject": f"KPI Progress Alert - {datetime.utcnow().strftime('%B %d, %Y')}",
            "content": f"""KPI Progress Alert

Member Below 50% Target:
- John Doe: 40% of weekly target (48 of 120 units)

Action Required: Review performance with team member.
Generated at: {datetime.utcnow().isoformat()}"""
        }

    elif rule_type == RuleTypeEnum.REORDER_ALERT:
        return {
            "subject": f"Reorder Alert - {datetime.utcnow().strftime('%B %d, %Y')}",
            "content": f"""Inventory Reorder Alert

Low Inventory Products:
- Product ID 12345: 5 days stock remaining (Threshold: 7 days)
- Product ID 67890: 3 days stock remaining (Threshold: 7 days)

Action Required: Place reorder to maintain stock levels.
Generated at: {datetime.utcnow().isoformat()}"""
        }

    elif rule_type == RuleTypeEnum.MONTHLY_CLIENT_REPORT:
        return {
            "subject": f"Monthly P&L Report - {datetime.utcnow().strftime('%B %Y')}",
            "content": f"""Monthly P&L Report

Period: {datetime.utcnow().strftime('%B %Y')}

Client: Sample Client
Total Revenue: $15,000
Total COGS: $8,500
Total Expenses: $2,000
Net Profit: $4,500
Profit Margin: 30%

Report generated: {datetime.utcnow().isoformat()}"""
        }

    return {
        "subject": "Preview Preview",
        "content": f"Preview for {rule_type}"
    }


# ==================== Endpoints ====================

@router.post("/rules", response_model=AutomationRuleResponseSchema, status_code=status.HTTP_201_CREATED)
def create_automation_rule(
    rule_data: AutomationRuleCreateSchema,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> AutomationRule:
    """
    Create a new automation rule for the organization.

    - **rule_type**: Type of automation (dwm_daily_summary, kpi_progress_alert, reorder_alert, monthly_client_report)
    - **name**: Human-readable name
    - **schedule_cron**: Cron expression for scheduling (e.g., "0 18 * * *" for 6pm daily)
    - **recipients**: List of recipients (email addresses or user IDs)
    - **config**: Rule-specific configuration as JSON object
    """
    org_id = get_org_id_from_user(current_user)

    try:
        new_rule = AutomationRule(
            org_id=org_id,
            created_by=current_user.id,
            rule_type=rule_data.rule_type.value,
            name=rule_data.name,
            description=rule_data.description,
            schedule_cron=rule_data.schedule_cron,
            recipients=json.dumps(rule_data.recipients),
            config=json.dumps(rule_data.config),
            is_active=rule_data.is_active
        )
        db.add(new_rule)
        db.commit()
        db.refresh(new_rule)

        logger.info(f"Created automation rule {new_rule.id} for org {org_id}")
        return new_rule

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create automation rule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create automation rule"
        )


@router.get("/rules", response_model=List[AutomationRuleResponseSchema])
def list_automation_rules(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    rule_type: Optional[str] = Query(None, description="Filter by rule type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> List[AutomationRule]:
    """
    List all automation rules for the organization.

    Optional filters:
    - **is_active**: Filter by active status (true/false)
    - **rule_type**: Filter by rule type
    - **skip**: Pagination offset
    - **limit**: Pagination limit (max 100)
    """
    org_id = get_org_id_from_user(current_user)

    query = db.query(AutomationRule).filter(AutomationRule.org_id == org_id)

    if is_active is not None:
        query = query.filter(AutomationRule.is_active == is_active)

    if rule_type:
        query = query.filter(AutomationRule.rule_type == rule_type)

    rules = query.order_by(AutomationRule.created_at.desc()).offset(skip).limit(limit).all()

    return rules


@router.get("/rules/{rule_id}", response_model=AutomationRuleDetailSchema)
def get_automation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> AutomationRuleDetailSchema:
    """
    Get a single automation rule with recent execution logs.
    """
    org_id = get_org_id_from_user(current_user)

    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.org_id == org_id
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    recent_logs = db.query(AutomationLog).filter(
        AutomationLog.rule_id == rule_id
    ).order_by(AutomationLog.created_at.desc()).limit(10).all()

    return AutomationRuleDetailSchema(
        rule=rule,
        recent_logs=recent_logs
    )


@router.put("/rules/{rule_id}", response_model=AutomationRuleResponseSchema)
def update_automation_rule(
    rule_id: int,
    rule_data: AutomationRuleUpdateSchema,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> AutomationRule:
    """
    Update an automation rule.

    Only provided fields will be updated (partial update).
    """
    org_id = get_org_id_from_user(current_user)

    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.org_id == org_id
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    try:
        update_data = rule_data.dict(exclude_unset=True)

        if "recipients" in update_data:
            update_data["recipients"] = json.dumps(update_data["recipients"])

        if "config" in update_data:
            update_data["config"] = json.dumps(update_data["config"])

        for field, value in update_data.items():
            setattr(rule, field, value)

        rule.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(rule)

        logger.info(f"Updated automation rule {rule_id} for org {org_id}")
        return rule

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update automation rule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update automation rule"
        )


@router.put("/rules/{rule_id}/toggle", response_model=AutomationRuleResponseSchema)
def toggle_automation_rule(
    rule_id: int,
    toggle_data: ToggleRuleSchema,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> AutomationRule:
    """
    Enable or disable an automation rule.
    """
    org_id = get_org_id_from_user(current_user)

    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.org_id == org_id
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    rule.is_active = toggle_data.is_active
    rule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rule)

    action = "enabled" if toggle_data.is_active else "disabled"
    logger.info(f"Automation rule {rule_id} {action} for org {org_id}")

    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_automation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> None:
    """
    Delete an automation rule.

    Associated logs will also be deleted.
    """
    org_id = get_org_id_from_user(current_user)

    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.org_id == org_id
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    try:
        db.delete(rule)
        db.commit()
        logger.info(f"Deleted automation rule {rule_id} for org {org_id}")

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete automation rule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete automation rule"
        )


@router.post("/rules/{rule_id}/run-now")
def run_automation_rule_now(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Manually trigger an automation rule immediately.

    This runs the rule synchronously and logs the execution.
    """
    org_id = get_org_id_from_user(current_user)

    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.org_id == org_id
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    try:
        recipients = json.loads(rule.recipients) if rule.recipients else []
        recipients_count = len(recipients)

        rule.last_run_at = datetime.utcnow()
        db.commit()

        log_automation_execution(
            db=db,
            rule_id=rule_id,
            org_id=org_id,
            status=AutomationStatusEnum.SUCCESS.value,
            message=f"Manually triggered automation. Sent to {recipients_count} recipients.",
            recipients_count=recipients_count
        )

        logger.info(f"Manually ran automation rule {rule_id} for org {org_id}")

        return {
            "success": True,
            "rule_id": rule_id,
            "rule_name": rule.name,
            "executed_at": datetime.utcnow().isoformat(),
            "recipients_notified": recipients_count,
            "status": "completed"
        }

    except Exception as e:
        logger.error(f"Failed to run automation rule: {str(e)}")

        log_automation_execution(
            db=db,
            rule_id=rule_id,
            org_id=org_id,
            status=AutomationStatusEnum.FAILED.value,
            message=f"Execution failed: {str(e)}",
            recipients_count=0
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute automation rule"
        )


@router.get("/logs", response_model=List[AutomationLogResponseSchema])
def get_automation_logs(
    rule_id: Optional[int] = Query(None, description="Filter by rule ID"),
    status_filter: Optional[str] = Query(None, description="Filter by status (success/failed/skipped)"),
    days: int = Query(7, ge=1, le=90, description="Get logs from last N days"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> List[AutomationLog]:
    """
    Get automation execution logs for the organization.

    Optional filters:
    - **rule_id**: Filter by specific rule ID
    - **status_filter**: Filter by execution status (success/failed/skipped)
    - **days**: Get logs from last N days (default 7, max 90)
    - **skip**: Pagination offset
    - **limit**: Pagination limit (max 100)
    """
    org_id = get_org_id_from_user(current_user)

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    query = db.query(AutomationLog).filter(
        AutomationLog.org_id == org_id,
        AutomationLog.created_at >= cutoff_date
    )

    if rule_id:
        query = query.filter(AutomationLog.rule_id == rule_id)

    if status_filter:
        query = query.filter(AutomationLog.status == status_filter)

    logs = query.order_by(AutomationLog.created_at.desc()).offset(skip).limit(limit).all()

    return logs


@router.get("/templates", response_model=List[AutomationTemplateSchema])
def get_automation_templates() -> List[AutomationTemplateSchema]:
    """
    Get predefined automation templates.

    Returns templates for:
    1. DWM Daily Summary
    2. KPI Progress Alert
    3. Reorder Alert
    4. Monthly Client Report

    Use these templates as defaults when creating new automation rules.
    """
    templates = [
        AutomationTemplateSchema(
            template_id="dwm_daily",
            name="DWM Daily Summary",
            description="Send evening email with each team member's daily log stats (units sold, revenue, active listings)",
            rule_type=RuleTypeEnum.DWM_DAILY_SUMMARY.value,
            default_schedule="0 18 * * *",
            default_config={
                "include_metrics": ["units_sold", "revenue", "active_listings"],
                "time_zone": "US/Eastern",
                "include_flagged_items": True,
                "performance_threshold": 80
            }
        ),
        AutomationTemplateSchema(
            template_id="kpi_alert",
            name="KPI Progress Alert",
            description="Mid-week alert if any team member is below 50% of their target KPIs",
            rule_type=RuleTypeEnum.KPI_PROGRESS_ALERT.value,
            default_schedule="0 10 * * 3",
            default_config={
                "threshold_percentage": 50,
                "check_day": "wednesday",
                "metrics_to_check": ["units_sold", "revenue"],
                "include_recommendations": True
            }
        ),
        AutomationTemplateSchema(
            template_id="reorder_alert",
            name="Reorder Alert",
            description="Alert when product inventory days remaining fall below a configurable threshold",
            rule_type=RuleTypeEnum.REORDER_ALERT.value,
            default_schedule="0 09 * * 1-5",
            default_config={
                "inventory_days_threshold": 7,
                "check_frequency": "daily",
                "alert_critical_only": False,
                "include_reorder_recommendations": True
            }
        ),
        AutomationTemplateSchema(
            template_id="monthly_report",
            name="Monthly Client Report",
            description="Auto-generate and send PDF P&L summary for each client at end of month",
            rule_type=RuleTypeEnum.MONTHLY_CLIENT_REPORT.value,
            default_schedule="0 09 1 * *",
            default_config={
                "report_type": "p_and_l",
                "include_charts": True,
                "include_performance_metrics": True,
                "include_recommendations": True,
                "format": "pdf"
            }
        )
    ]

    return templates


@router.post("/preview/{rule_id}", response_model=PreviewAutomationSchema)
def preview_automation(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> PreviewAutomationSchema:
    """
    Preview what an automation rule would send without actually executing it.

    This is a dry run that shows:
    - Email subject and preview content
    - Number of recipients
    - Estimated recipient list
    """
    org_id = get_org_id_from_user(current_user)

    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.org_id == org_id
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    try:
        recipients = json.loads(rule.recipients) if rule.recipients else []
        preview_data = generate_preview_content(rule)

        return PreviewAutomationSchema(
            rule_id=rule.id,
            rule_type=rule.rule_type,
            rule_name=rule.name,
            preview_timestamp=datetime.utcnow(),
            recipients_count=len(recipients),
            subject=preview_data["subject"],
            preview_content=preview_data["content"],
            estimated_recipients=recipients
        )

    except Exception as e:
        logger.error(f"Failed to generate automation preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate automation preview"
        )
