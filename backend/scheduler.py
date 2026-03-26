"""
Scheduled Tasks / Cron Job System for Amazon FBA Wholesale SaaS
Stage 6 Module - Handles background task execution with in-memory registry
"""

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import asyncio
from enum import Enum
import logging

from auth import get_current_user, require_role
from models import User
from database import get_db
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scheduler", tags=["scheduler"])

# Task status enum
class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    DISABLED = "disabled"

# In-memory task registry
task_history: List[Dict[str, Any]] = []
MAX_HISTORY_SIZE = 500

# Task state storage
task_states: Dict[str, Dict[str, Any]] = {
    "daily_price_check": {
        "enabled": True,
        "last_run": None,
        "next_run": datetime.utcnow() + timedelta(hours=24),
        "status": TaskStatus.PENDING,
        "description": "Daily price monitoring and competitor analysis"
    },
    "weekly_report_generation": {
        "enabled": True,
        "last_run": None,
        "next_run": datetime.utcnow() + timedelta(days=7),
        "status": TaskStatus.PENDING,
        "description": "Generate weekly performance reports for all clients"
    },
    "monthly_analytics_rollup": {
        "enabled": True,
        "last_run": None,
        "next_run": datetime.utcnow() + timedelta(days=30),
        "status": TaskStatus.PENDING,
        "description": "Aggregate monthly analytics and KPI calculations"
    },
    "daily_bsr_monitor": {
        "enabled": True,
        "last_run": None,
        "next_run": datetime.utcnow() + timedelta(hours=24),
        "status": TaskStatus.PENDING,
        "description": "Monitor Best Seller Rank trends across tracked products"
    }
}


async def execute_daily_price_check(db: Session) -> Dict[str, Any]:
    """Execute daily price check task"""
    try:
        logger.info("Starting daily price check task")
        # Simulate price checking logic
        await asyncio.sleep(0.5)
        result = {
            "products_checked": 1247,
            "price_changes_detected": 45,
            "alerts_sent": 12
        }
        logger.info(f"Daily price check completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Daily price check failed: {str(e)}")
        raise


async def execute_weekly_report_generation(db: Session) -> Dict[str, Any]:
    """Execute weekly report generation task"""
    try:
        logger.info("Starting weekly report generation task")
        # Simulate report generation
        await asyncio.sleep(1.0)
        result = {
            "reports_generated": 156,
            "emails_sent": 156,
            "total_revenue_analyzed": 1245600
        }
        logger.info(f"Weekly report generation completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Weekly report generation failed: {str(e)}")
        raise


async def execute_monthly_analytics_rollup(db: Session) -> Dict[str, Any]:
    """Execute monthly analytics rollup task"""
    try:
        logger.info("Starting monthly analytics rollup task")
        # Simulate analytics aggregation
        await asyncio.sleep(2.0)
        result = {
            "orgs_processed": 89,
            "data_points_aggregated": 45230,
            "kpis_calculated": 267
        }
        logger.info(f"Monthly analytics rollup completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Monthly analytics rollup failed: {str(e)}")
        raise


async def execute_daily_bsr_monitor(db: Session) -> Dict[str, Any]:
    """Execute daily BSR monitoring task"""
    try:
        logger.info("Starting daily BSR monitor task")
        # Simulate BSR monitoring
        await asyncio.sleep(0.75)
        result = {
            "products_monitored": 3421,
            "bsr_improvements": 234,
            "bsr_declines": 189
        }
        logger.info(f"Daily BSR monitor completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Daily BSR monitor failed: {str(e)}")
        raise


def add_history_entry(
    task_name: str,
    started_at: datetime,
    completed_at: datetime,
    status: TaskStatus,
    result: Any = None,
    error: str = None
):
    """Add entry to task execution history (thread-safe with list append)"""
    entry = {
        "task_name": task_name,
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
        "duration_seconds": (completed_at - started_at).total_seconds(),
        "status": status.value,
        "result": result,
        "error": error
    }
    task_history.append(entry)

    # Keep history size manageable
    if len(task_history) > MAX_HISTORY_SIZE:
        task_history.pop(0)


async def run_task(task_name: str, db: Session) -> Dict[str, Any]:
    """Execute a scheduled task and log results"""
    if task_name not in task_states:
        raise ValueError(f"Unknown task: {task_name}")

    task_state = task_states[task_name]
    started_at = datetime.utcnow()

    try:
        task_state["status"] = TaskStatus.RUNNING

        # Route to appropriate task handler
        if task_name == "daily_price_check":
            result = await execute_daily_price_check(db)
        elif task_name == "weekly_report_generation":
            result = await execute_weekly_report_generation(db)
        elif task_name == "monthly_analytics_rollup":
            result = await execute_monthly_analytics_rollup(db)
        elif task_name == "daily_bsr_monitor":
            result = await execute_daily_bsr_monitor(db)
        else:
            raise ValueError(f"No handler for task: {task_name}")

        completed_at = datetime.utcnow()
        task_state["status"] = TaskStatus.COMPLETED
        task_state["last_run"] = completed_at.isoformat()

        # Schedule next run
        if task_name in ["daily_price_check", "daily_bsr_monitor"]:
            task_state["next_run"] = (completed_at + timedelta(hours=24)).isoformat()
        elif task_name == "weekly_report_generation":
            task_state["next_run"] = (completed_at + timedelta(days=7)).isoformat()
        elif task_name == "monthly_analytics_rollup":
            task_state["next_run"] = (completed_at + timedelta(days=30)).isoformat()

        add_history_entry(task_name, started_at, completed_at, TaskStatus.COMPLETED, result=result)
        return result

    except Exception as e:
        completed_at = datetime.utcnow()
        task_state["status"] = TaskStatus.FAILED
        add_history_entry(task_name, started_at, completed_at, TaskStatus.FAILED, error=str(e))
        raise


@router.post("/trigger/{task_name}")
async def trigger_task(
    task_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger a scheduled task
    Requires: admin or owner role
    """
    require_role(current_user, ["admin", "owner"])

    if task_name not in task_states:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_name}' not found"
        )

    if not task_states[task_name]["enabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task '{task_name}' is disabled"
        )

    try:
        result = await run_task(task_name, db)
        return {
            "status": "success",
            "task_name": task_name,
            "result": result,
            "executed_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error triggering task {task_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Task execution failed: {str(e)}"
        )


@router.get("/tasks")
async def get_tasks(
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get list of all registered tasks with their status
    Requires: authenticated user
    """
    tasks = []
    for task_name, task_state in task_states.items():
        tasks.append({
            "name": task_name,
            "description": task_state["description"],
            "enabled": task_state["enabled"],
            "status": task_state["status"].value,
            "last_run": task_state["last_run"],
            "next_run": task_state["next_run"],
        })
    return tasks


@router.get("/history")
async def get_history(
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    task_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get task execution history
    Requires: authenticated user
    """
    history = task_history.copy()

    if task_name:
        history = [h for h in history if h["task_name"] == task_name]

    # Return most recent entries first
    return sorted(history, key=lambda x: x["started_at"], reverse=True)[:limit]


@router.post("/toggle/{task_name}")
async def toggle_task(
    task_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enable or disable a scheduled task
    Requires: admin or owner role
    """
    require_role(current_user, ["admin", "owner"])

    if task_name not in task_states:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_name}' not found"
        )

    task_state = task_states[task_name]
    was_enabled = task_state["enabled"]
    task_state["enabled"] = not was_enabled

    if task_state["enabled"]:
        task_state["status"] = TaskStatus.PENDING
        logger.info(f"Task {task_name} enabled")
    else:
        task_state["status"] = TaskStatus.DISABLED
        logger.info(f"Task {task_name} disabled")

    return {
        "task_name": task_name,
        "enabled": task_state["enabled"],
        "status": task_state["status"].value,
        "toggled_at": datetime.utcnow().isoformat()
    }


@router.get("/status/{task_name}")
async def get_task_status(
    task_name: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get detailed status of a specific task
    Requires: authenticated user
    """
    if task_name not in task_states:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_name}' not found"
        )

    task_state = task_states[task_name]
    recent_runs = [h for h in task_history if h["task_name"] == task_name]

    return {
        "name": task_name,
        "description": task_state["description"],
        "enabled": task_state["enabled"],
        "status": task_state["status"].value,
        "last_run": task_state["last_run"],
        "next_run": task_state["next_run"],
        "recent_runs": recent_runs[-10:]  # Last 10 executions
    }
