from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Boolean, ForeignKey, func
from sqlalchemy.orm import Session
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import json
import statistics
from auth import get_current_user
from database import get_db, Base, engine
from models import User

router = APIRouter(prefix="/reporting", tags=["Reporting"])

# ============================================================================
# SQLALCHEMY MODELS
# ============================================================================

class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True)
    org_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    report_type = Column(String, nullable=False)  # weekly, monthly, quarterly, custom
    sections = Column(JSON, nullable=False)  # List of section configs
    metrics = Column(JSON, nullable=False)  # Metric definitions
    filters = Column(JSON)  # Default filters
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("report_templates.id"))
    report_name = Column(String, nullable=False)
    report_type = Column(String, nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    status = Column(String, default="generating")  # generating, ready, sent, failed
    data = Column(JSON)  # Compiled report data
    file_url = Column(String)  # S3 or storage URL
    sent_to = Column(JSON)  # List of recipient emails
    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReportSchedule(Base):
    __tablename__ = "report_schedules"

    id = Column(Integer, primary_key=True)
    org_id = Column(String, nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("report_templates.id"), nullable=False)
    client_ids = Column(JSON, nullable=False)  # List of client IDs
    frequency = Column(String, nullable=False)  # weekly, biweekly, monthly, quarterly
    day_of_week = Column(Integer)  # 0-6 for Monday-Sunday
    day_of_month = Column(Integer)  # 1-31
    send_to = Column(JSON, nullable=False)  # List of recipient emails
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime)
    next_run = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class BenchmarkData(Base):
    __tablename__ = "benchmark_data"

    id = Column(Integer, primary_key=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    metric_name = Column(String, nullable=False)
    period = Column(String, nullable=False)  # YYYY-MM
    value = Column(Float, nullable=False)
    category_avg = Column(Float)
    percentile_rank = Column(Float)  # 0-100
    created_at = Column(DateTime, default=datetime.utcnow)


class AnomalyDetection(Base):
    __tablename__ = "anomaly_detection"

    id = Column(Integer, primary_key=True)
    org_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    metric_name = Column(String, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    expected_value = Column(Float, nullable=False)
    actual_value = Column(Float, nullable=False)
    deviation_pct = Column(Float, nullable=False)
    severity = Column(String, default="info")  # info, warning, critical
    is_acknowledged = Column(Boolean, default=False)
    notes = Column(String)


Base.metadata.create_all(bind=engine)

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ReportTemplateCreate(BaseModel):
    name: str
    description: Optional[str]
    report_type: str
    sections: List[Dict[str, Any]]
    metrics: List[Dict[str, Any]]
    filters: Optional[Dict[str, Any]] = None
    is_default: bool = False


class ReportTemplateResponse(BaseModel):
    id: int
    org_id: str
    name: str
    description: Optional[str]
    report_type: str
    sections: List[Dict[str, Any]]
    metrics: List[Dict[str, Any]]
    filters: Optional[Dict[str, Any]]
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


class GeneratedReportCreate(BaseModel):
    client_id: str
    template_id: int
    period_start: datetime
    period_end: datetime


class GeneratedReportResponse(BaseModel):
    id: int
    org_id: str
    client_id: str
    template_id: int
    report_name: str
    report_type: str
    period_start: datetime
    period_end: datetime
    status: str
    data: Optional[Dict[str, Any]]
    file_url: Optional[str]
    sent_to: Optional[List[str]]
    sent_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ReportScheduleCreate(BaseModel):
    template_id: int
    client_ids: List[str]
    frequency: str
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    send_to: List[str]


class ReportScheduleResponse(BaseModel):
    id: int
    org_id: str
    template_id: int
    client_ids: List[str]
    frequency: str
    day_of_week: Optional[int]
    day_of_month: Optional[int]
    send_to: List[str]
    is_active: bool
    last_run: Optional[datetime]
    next_run: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class BenchmarkDataResponse(BaseModel):
    id: int
    org_id: str
    client_id: str
    metric_name: str
    period: str
    value: float
    category_avg: Optional[float]
    percentile_rank: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class AnomalyDetectionResponse(BaseModel):
    id: int
    org_id: str
    client_id: str
    metric_name: str
    detected_at: datetime
    expected_value: float
    actual_value: float
    deviation_pct: float
    severity: str
    is_acknowledged: bool
    notes: Optional[str]

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    reports_generated_count: int
    pending_schedules_count: int
    active_anomalies_count: int
    benchmark_highlights: List[Dict[str, Any]]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_client_metrics(client_id: str, period_start: datetime, period_end: datetime) -> Dict[str, Any]:
    """Mock function to fetch client metrics from other services"""
    # In production, this would aggregate data from sales, PPC, inventory services
    return {
        "revenue": 45230.50,
        "acos": 0.28,
        "units_sold": 1250,
        "inventory_level": 8500,
        "inventory_health": "optimal",
        "top_products": [
            {"name": "Premium Widget", "revenue": 15000, "acos": 0.22},
            {"name": "Standard Widget", "revenue": 12500, "acos": 0.31},
            {"name": "Basic Widget", "revenue": 8000, "acos": 0.25}
        ],
        "profitability": {
            "gross_profit": 18500,
            "net_profit": 14200,
            "margin_pct": 31.4
        }
    }


def calculate_z_score(values: List[float], current_value: float) -> float:
    """Calculate z-score for anomaly detection"""
    if len(values) < 2:
        return 0.0
    mean = statistics.mean(values)
    stdev = statistics.stdev(values)
    if stdev == 0:
        return 0.0
    return abs((current_value - mean) / stdev)


def detect_anomalies(client_id: str, org_id: str, db: Session) -> List[Dict[str, Any]]:
    """Detect anomalies using z-score method on 30-day historical data"""
    anomalies = []

    # Mock metric collection for demo
    metrics = ["revenue", "acos", "units_sold", "inventory_level"]

    for metric in metrics:
        # In production, fetch last 30 days of data for this client
        mock_historical = [40000, 42000, 41500, 43000, 44000, 45000]
        current_value = 38500  # Simulated current metric

        z_score = calculate_z_score(mock_historical, current_value)

        if z_score > 2:  # Anomaly threshold
            mean = statistics.mean(mock_historical)
            deviation = ((current_value - mean) / mean) * 100

            severity = "critical" if abs(deviation) > 20 else "warning"

            anomalies.append({
                "metric_name": metric,
                "expected_value": round(mean, 2),
                "actual_value": current_value,
                "deviation_pct": round(deviation, 2),
                "severity": severity
            })

    return anomalies


def generate_report_data(template: ReportTemplate, client_id: str, period_start: datetime, period_end: datetime) -> Dict[str, Any]:
    """Compile report from template sections and client data"""
    client_metrics = get_client_metrics(client_id, period_start, period_end)

    report_sections = {}

    for section_config in template.sections:
        section_type = section_config.get("type", "")

        if section_type == "executive_summary":
            report_sections["executive_summary"] = {
                "period": f"{period_start.date()} - {period_end.date()}",
                "total_revenue": client_metrics.get("revenue", 0),
                "units_sold": client_metrics.get("units_sold", 0),
                "net_profit": client_metrics.get("profitability", {}).get("net_profit", 0),
                "margin_pct": client_metrics.get("profitability", {}).get("margin_pct", 0)
            }

        elif section_type == "revenue_metrics":
            report_sections["revenue_metrics"] = {
                "total_revenue": client_metrics.get("revenue", 0),
                "revenue_trend": "+5.2%",
                "top_products": client_metrics.get("top_products", []),
                "avg_order_value": round(client_metrics.get("revenue", 0) / max(client_metrics.get("units_sold", 1), 1), 2)
            }

        elif section_type == "ppc_performance":
            report_sections["ppc_performance"] = {
                "acos": client_metrics.get("acos", 0),
                "total_spend": round(client_metrics.get("revenue", 0) * client_metrics.get("acos", 0.3), 2),
                "roas": round(1 / client_metrics.get("acos", 0.3), 2),
                "clicks": 5200,
                "impressions": 145000,
                "ctr": 0.036
            }

        elif section_type == "inventory_health":
            report_sections["inventory_health"] = {
                "current_level": client_metrics.get("inventory_level", 0),
                "health_status": client_metrics.get("inventory_health", "optimal"),
                "days_of_inventory": 45,
                "stockouts": 2,
                "overstock_items": 1
            }

        elif section_type == "profitability":
            report_sections["profitability"] = {
                "gross_profit": client_metrics.get("profitability", {}).get("gross_profit", 0),
                "net_profit": client_metrics.get("profitability", {}).get("net_profit", 0),
                "margin_pct": client_metrics.get("profitability", {}).get("margin_pct", 0),
                "profit_trend": "+3.8%"
            }

        elif section_type == "recommendations":
            report_sections["recommendations"] = {
                "items": [
                    "Optimize PPC campaigns: Current ACOS is above target. Consider pausing low-performing keywords.",
                    "Restock fast-movers: Premium Widget inventory trending down. Recommend pre-ordering.",
                    "Launch seasonal promotion: Q2 typically sees +15% uplift. Plan inventory accordingly."
                ]
            }

    return {
        "report_sections": report_sections,
        "generated_at": datetime.utcnow().isoformat(),
        "client_metrics_snapshot": client_metrics
    }


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/templates", response_model=List[ReportTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all report templates for the user's organization"""
    templates = db.query(ReportTemplate).filter(
        ReportTemplate.org_id == current_user.org_id
    ).all()
    return templates


@router.post("/templates", response_model=ReportTemplateResponse)
def create_template(
    template: ReportTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new report template"""
    db_template = ReportTemplate(
        org_id=current_user.org_id,
        name=template.name,
        description=template.description,
        report_type=template.report_type,
        sections=template.sections,
        metrics=template.metrics,
        filters=template.filters,
        is_default=template.is_default
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.get("/templates/{template_id}", response_model=ReportTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific report template"""
    template = db.query(ReportTemplate).filter(
        ReportTemplate.id == template_id,
        ReportTemplate.org_id == current_user.org_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/templates/{template_id}", response_model=ReportTemplateResponse)
def update_template(
    template_id: int,
    template: ReportTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a report template"""
    db_template = db.query(ReportTemplate).filter(
        ReportTemplate.id == template_id,
        ReportTemplate.org_id == current_user.org_id
    ).first()

    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    db_template.name = template.name
    db_template.description = template.description
    db_template.report_type = template.report_type
    db_template.sections = template.sections
    db_template.metrics = template.metrics
    db_template.filters = template.filters
    db_template.is_default = template.is_default

    db.commit()
    db.refresh(db_template)
    return db_template


@router.post("/generate", response_model=GeneratedReportResponse)
def generate_report(
    report: GeneratedReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a new report from template and client data"""
    template = db.query(ReportTemplate).filter(
        ReportTemplate.id == report.template_id,
        ReportTemplate.org_id == current_user.org_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Generate report data
    report_data = generate_report_data(
        template, report.client_id, report.period_start, report.period_end
    )

    # Create report record
    db_report = GeneratedReport(
        org_id=current_user.org_id,
        client_id=report.client_id,
        template_id=report.template_id,
        report_name=f"{template.name} - {report.period_start.date()}",
        report_type=template.report_type,
        period_start=report.period_start,
        period_end=report.period_end,
        status="ready",
        data=report_data
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


@router.get("/reports", response_model=List[GeneratedReportResponse])
def list_reports(
    client_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List generated reports with optional filters"""
    query = db.query(GeneratedReport).filter(
        GeneratedReport.org_id == current_user.org_id
    )

    if client_id:
        query = query.filter(GeneratedReport.client_id == client_id)
    if status:
        query = query.filter(GeneratedReport.status == status)
    if report_type:
        query = query.filter(GeneratedReport.report_type == report_type)

    reports = query.order_by(GeneratedReport.created_at.desc()).all()
    return reports


@router.get("/reports/{report_id}", response_model=GeneratedReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific generated report"""
    report = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.org_id == current_user.org_id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/reports/{report_id}/send", response_model=GeneratedReportResponse)
def send_report(
    report_id: int,
    sent_to: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark report as sent to recipients"""
    report = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.org_id == current_user.org_id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = "sent"
    report.sent_to = sent_to
    report.sent_at = datetime.utcnow()

    db.commit()
    db.refresh(report)
    return report


@router.get("/schedules", response_model=List[ReportScheduleResponse])
def list_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all report schedules"""
    schedules = db.query(ReportSchedule).filter(
        ReportSchedule.org_id == current_user.org_id
    ).all()
    return schedules


@router.post("/schedules", response_model=ReportScheduleResponse)
def create_schedule(
    schedule: ReportScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new report schedule"""
    # Calculate next run
    next_run = datetime.utcnow() + timedelta(days=7)

    db_schedule = ReportSchedule(
        org_id=current_user.org_id,
        template_id=schedule.template_id,
        client_ids=schedule.client_ids,
        frequency=schedule.frequency,
        day_of_week=schedule.day_of_week,
        day_of_month=schedule.day_of_month,
        send_to=schedule.send_to,
        next_run=next_run
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@router.put("/schedules/{schedule_id}", response_model=ReportScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule: ReportScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a report schedule"""
    db_schedule = db.query(ReportSchedule).filter(
        ReportSchedule.id == schedule_id,
        ReportSchedule.org_id == current_user.org_id
    ).first()

    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db_schedule.template_id = schedule.template_id
    db_schedule.client_ids = schedule.client_ids
    db_schedule.frequency = schedule.frequency
    db_schedule.day_of_week = schedule.day_of_week
    db_schedule.day_of_month = schedule.day_of_month
    db_schedule.send_to = schedule.send_to

    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@router.get("/benchmarks", response_model=List[BenchmarkDataResponse])
def list_benchmarks(
    client_id: Optional[str] = Query(None),
    metric_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List benchmark data with optional filters"""
    query = db.query(BenchmarkData).filter(
        BenchmarkData.org_id == current_user.org_id
    )

    if client_id:
        query = query.filter(BenchmarkData.client_id == client_id)
    if metric_name:
        query = query.filter(BenchmarkData.metric_name == metric_name)

    benchmarks = query.order_by(BenchmarkData.created_at.desc()).all()
    return benchmarks


@router.post("/benchmarks/calculate")
def calculate_benchmarks(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate benchmarks for a client"""
    metrics = ["revenue", "acos", "units_sold", "margin_pct"]

    # Mock category averages
    category_averages = {
        "revenue": 42000,
        "acos": 0.32,
        "units_sold": 1100,
        "margin_pct": 28.5
    }

    # Mock client values
    client_values = {
        "revenue": 45230,
        "acos": 0.28,
        "units_sold": 1250,
        "margin_pct": 31.4
    }

    period = datetime.utcnow().strftime("%Y-%m")
    results = []

    for metric in metrics:
        client_val = client_values.get(metric, 0)
        category_avg = category_averages.get(metric, 0)

        # Calculate percentile rank (mock)
        percentile = round((client_val / category_avg) * 100, 2) if category_avg > 0 else 50
        percentile = min(100, max(0, percentile))

        benchmark = BenchmarkData(
            org_id=current_user.org_id,
            client_id=client_id,
            metric_name=metric,
            period=period,
            value=client_val,
            category_avg=category_avg,
            percentile_rank=percentile
        )
        db.add(benchmark)
        results.append(benchmark)

    db.commit()
    return {"message": "Benchmarks calculated", "count": len(results)}


@router.get("/anomalies", response_model=List[AnomalyDetectionResponse])
def list_anomalies(
    client_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List detected anomalies with optional filters"""
    query = db.query(AnomalyDetection).filter(
        AnomalyDetection.org_id == current_user.org_id,
        AnomalyDetection.is_acknowledged == False
    )

    if client_id:
        query = query.filter(AnomalyDetection.client_id == client_id)
    if severity:
        query = query.filter(AnomalyDetection.severity == severity)

    anomalies = query.order_by(AnomalyDetection.detected_at.desc()).all()
    return anomalies


@router.post("/anomalies/scan")
def scan_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scan for anomalies across all clients"""
    # Mock: Get all clients for org
    clients = ["client_001", "client_002", "client_003"]

    detected_count = 0
    for client_id in clients:
        anomalies = detect_anomalies(client_id, current_user.org_id, db)

        for anomaly in anomalies:
            existing = db.query(AnomalyDetection).filter(
                AnomalyDetection.client_id == client_id,
                AnomalyDetection.metric_name == anomaly["metric_name"],
                AnomalyDetection.detected_at >= datetime.utcnow() - timedelta(hours=1)
            ).first()

            if not existing:
                db_anomaly = AnomalyDetection(
                    org_id=current_user.org_id,
                    client_id=client_id,
                    metric_name=anomaly["metric_name"],
                    expected_value=anomaly["expected_value"],
                    actual_value=anomaly["actual_value"],
                    deviation_pct=anomaly["deviation_pct"],
                    severity=anomaly["severity"]
                )
                db.add(db_anomaly)
                detected_count += 1

    db.commit()
    return {"message": "Anomaly scan complete", "detected": detected_count}


@router.put("/anomalies/{anomaly_id}/acknowledge", response_model=AnomalyDetectionResponse)
def acknowledge_anomaly(
    anomaly_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge an anomaly"""
    anomaly = db.query(AnomalyDetection).filter(
        AnomalyDetection.id == anomaly_id,
        AnomalyDetection.org_id == current_user.org_id
    ).first()

    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    anomaly.is_acknowledged = True
    anomaly.notes = notes

    db.commit()
    db.refresh(anomaly)
    return anomaly


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard summary for reporting"""
    reports_count = db.query(func.count(GeneratedReport.id)).filter(
        GeneratedReport.org_id == current_user.org_id
    ).scalar() or 0

    pending_schedules = db.query(func.count(ReportSchedule.id)).filter(
        ReportSchedule.org_id == current_user.org_id,
        ReportSchedule.is_active == True
    ).scalar() or 0

    active_anomalies = db.query(func.count(AnomalyDetection.id)).filter(
        AnomalyDetection.org_id == current_user.org_id,
        AnomalyDetection.is_acknowledged == False
    ).scalar() or 0

    # Get top benchmark performers
    benchmarks = db.query(BenchmarkData).filter(
        BenchmarkData.org_id == current_user.org_id,
        BenchmarkData.percentile_rank > 75
    ).limit(5).all()

    highlights = [
        {
            "client_id": b.client_id,
            "metric": b.metric_name,
            "percentile": b.percentile_rank,
            "value": b.value
        }
        for b in benchmarks
    ]

    return DashboardResponse(
        reports_generated_count=reports_count,
        pending_schedules_count=pending_schedules,
        active_anomalies_count=active_anomalies,
        benchmark_highlights=highlights
    )
