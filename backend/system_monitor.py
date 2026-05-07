"""
Health Monitoring & System Status for Amazon FBA Wholesale SaaS
Stage 6 Module - Comprehensive system health and business metrics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
import resource
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, text
from auth import get_current_user, require_role, tenant_session
from models import User, Organization, Product, Client, WeeklyReport
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["system"])

# Application start time (tracks uptime)
APP_START_TIME = datetime.utcnow()

# In-memory log buffer
app_logs: List[Dict[str, Any]] = []
MAX_LOG_SIZE = 500


def log_event(level: str, message: str, category: str = "general", details: Dict[str, Any] = None):
    """Log application event to in-memory buffer"""
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "level": level,
        "category": category,
        "message": message,
        "details": details or {}
    }
    app_logs.append(entry)

    # Keep log size manageable
    if len(app_logs) > MAX_LOG_SIZE:
        app_logs.pop(0)

    # Also log to standard logger
    if level == "error":
        logger.error(f"[{category}] {message}")
    elif level == "warning":
        logger.warning(f"[{category}] {message}")
    else:
        logger.info(f"[{category}] {message}")


def get_memory_info() -> Dict[str, Any]:
    """Get memory usage information without psutil dependency"""
    try:
        usage = resource.getrusage(resource.RUSAGE_SELF)
        return {
            "rss_mb": usage.ru_maxrss / 1024,
            "user_time_seconds": usage.ru_utime,
            "system_time_seconds": usage.ru_stime,
        }
    except Exception as e:
        logger.warning(f"Could not get memory info: {str(e)}")
        return {
            "rss_mb": 0,
            "user_time_seconds": 0,
            "system_time_seconds": 0,
        }


def get_uptime() -> Dict[str, Any]:
    """Calculate application uptime"""
    now = datetime.utcnow()
    uptime_delta = now - APP_START_TIME
    days = uptime_delta.days
    seconds = uptime_delta.seconds
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60

    return {
        "started_at": APP_START_TIME.isoformat(),
        "uptime_seconds": int(uptime_delta.total_seconds()),
        "uptime_formatted": f"{days}d {hours}h {minutes}m"
    }


def check_database_connection(db: Session) -> Dict[str, Any]:
    """Check database connection status"""
    try:
        # Simple query to verify connection - must use text() for SQLAlchemy 2.x
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "message": "Database connection active",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database connection failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/status")
async def get_system_status(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive system status
    Includes: DB connection, memory, uptime, active users, total orgs, total products
    Requires: authenticated user
    """
    try:
        # Database metrics
        db_status = check_database_connection(db)

        # Count active users (users with login activity in last 24 hours)
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        active_users = db.query(func.count(User.id)).filter(
            User.last_login >= cutoff_time if hasattr(User, 'last_login') else True
        ).scalar() or 0

        # Count organizations
        total_orgs = db.query(func.count(Organization.id)).scalar() or 0

        # Count products
        total_products = db.query(func.count(Product.id)).scalar() or 0

        # System metrics
        uptime_info = get_uptime()
        memory_info = get_memory_info()

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "operational",
            "uptime": uptime_info,
            "database": db_status,
            "memory": memory_info,
            "metrics": {
                "active_users": active_users,
                "total_organizations": total_orgs,
                "total_products": total_products,
                "api_healthy": True
            }
        }
    except Exception as e:
        logger.error(f"Error getting system status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve system status"
        )


@router.get("/metrics")
async def get_business_metrics(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get key business metrics
    Includes: total revenue, products analyzed, avg ROI, active clients
    Requires: authenticated user
    """
    try:
        # Total revenue from weekly reports
        total_revenue = db.query(func.sum(WeeklyReport.revenue)).scalar() or 0

        # Total products analyzed
        total_products = db.query(func.count(Product.id)).scalar() or 0

        # Average ROI
        avg_roi = db.query(func.avg(WeeklyReport.roi_pct)).scalar() or 0

        # Active clients (count of orgs with reports in last 30 days)
        cutoff_time = datetime.utcnow() - timedelta(days=30)
        active_clients = db.query(func.count(func.distinct(WeeklyReport.org_id))).filter(
            WeeklyReport.created_at >= cutoff_time
        ).scalar() or 0

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "financial": {
                "total_revenue": float(total_revenue),
                "revenue_currency": "USD",
                "avg_revenue_per_client": float(total_revenue / active_clients) if active_clients > 0 else 0
            },
            "products": {
                "total_analyzed": total_products
            },
            "performance": {
                "average_roi": float(avg_roi),
                "roi_unit": "percentage"
            },
            "clients": {
                "active_in_last_30_days": active_clients
            }
        }
    except Exception as e:
        logger.error(f"Error getting business metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve business metrics"
        )


@router.get("/logs")
async def get_system_logs(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
    limit: int = 100,
    level: Optional[str] = None,
    category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get recent application logs
    Requires: admin or owner role
    """
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin or owner role required")

    logs = app_logs.copy()

    # Filter by level if specified
    if level and level in ["error", "warning", "info"]:
        logs = [log for log in logs if log["level"] == level]

    # Filter by category if specified
    if category:
        logs = [log for log in logs if log["category"] == category]

    # Return most recent entries first
    logs = sorted(logs, key=lambda x: x["timestamp"], reverse=True)[:limit]

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "count": len(logs),
        "logs": logs
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Simple health check endpoint
    No authentication required
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/logs/clear")
async def clear_logs(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Clear the in-memory log buffer
    Requires: owner role
    """
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner role required")

    log_count = len(app_logs)
    app_logs.clear()

    return {
        "status": "success",
        "cleared_entries": log_count,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/diagnostics")
async def get_diagnostics(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive system diagnostics
    Requires: admin or owner role
    """
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin or owner role required")

    try:
        # System status
        uptime = get_uptime()
        memory = get_memory_info()
        db_check = check_database_connection(db)

        # Database query stats
        org_count = db.query(func.count(Organization.id)).scalar() or 0
        user_count = db.query(func.count(User.id)).scalar() or 0
        product_count = db.query(func.count(Product.id)).scalar() or 0
        client_count = db.query(func.count(Client.id)).scalar() or 0

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "uptime": uptime,
                "memory": memory
            },
            "database": db_check,
            "entities": {
                "organizations": org_count,
                "users": user_count,
                "products": product_count,
                "clients": client_count
            },
            "logs": {
                "total_entries": len(app_logs),
                "max_size": MAX_LOG_SIZE
            }
        }
    except Exception as e:
        logger.error(f"Error getting diagnostics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve diagnostics"
        )
