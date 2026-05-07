"""
Batch Processor Module - Background job processing for bulk ASIN operations
Queues, tracks, and manages batch processing with in-memory status tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pydantic import BaseModel
from uuid import uuid4
import asyncio

from config import settings
from database import get_db
from models import Product, ScoutResult, User
from auth import get_current_user, get_org_scoped_query, tenant_session

router = APIRouter(prefix="/batch", tags=["batch-processing"])

# In-memory batch tracking
batch_registry: Dict[str, Dict[str, Any]] = {}

# Pydantic schemas
class BatchScoutRequest(BaseModel):
    asins: List[str]
    batch_name: str
    priority: str = "normal"  # low, normal, high

class BatchScoutResponse(BaseModel):
    batch_id: str
    asins_count: int
    status: str
    created_at: datetime
    estimated_completion: datetime

class BatchStatus(BaseModel):
    batch_id: str
    batch_name: str
    status: str  # queued, processing, completed, failed
    total_asins: int
    processed_asins: int
    failed_asins: int
    progress_pct: float
    created_at: datetime
    started_at: datetime = None
    completed_at: datetime = None
    results: Dict[str, Any] = {}

    class Config:
        from_attributes = True

class BatchHistory(BaseModel):
    batch_id: str
    batch_name: str
    asins_count: int
    status: str
    created_at: datetime
    completed_at: datetime = None
    success_rate: float = 0.0


async def process_batch_async(batch_id: str, db: Session):
    """
    Simulate async batch processing with status updates.
    """
    if batch_id not in batch_registry:
        return

    batch = batch_registry[batch_id]
    batch["status"] = "processing"
    batch["started_at"] = datetime.utcnow()

    # Simulate processing each ASIN
    total = len(batch["asins"])
    for idx, asin in enumerate(batch["asins"]):
        # Simulate work (in real implementation, would call scout service)
        await asyncio.sleep(0.5)

        # Update progress
        batch["processed_asins"] = idx + 1
        batch["progress_pct"] = (idx + 1) / total * 100

        # Simulate occasional failures
        if idx % 7 == 0:
            batch["failed_asins"] += 1

    batch["status"] = "completed"
    batch["completed_at"] = datetime.utcnow()


@router.post("/scout", response_model=BatchScoutResponse)
async def queue_batch_scout(
    request: BatchScoutRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Queue a batch of ASINs for scouting/analysis.
    Returns batch ID for tracking progress.
    """
    batch_id = str(uuid4())
    estimated_hours = max(1, len(request.asins) / 100)  # Rough estimate

    batch_info = {
        "batch_id": batch_id,
        "batch_name": request.batch_name,
        "org_id": user.org_id,
        "asins": request.asins,
        "status": "queued",
        "priority": request.priority,
        "created_at": datetime.utcnow(),
        "started_at": None,
        "completed_at": None,
        "total_asins": len(request.asins),
        "processed_asins": 0,
        "failed_asins": 0,
        "progress_pct": 0.0,
        "results": {}
    }

    batch_registry[batch_id] = batch_info

    # Queue background processing (priority: high jobs start sooner)
    background_tasks.add_task(process_batch_async, batch_id, db)

    return BatchScoutResponse(
        batch_id=batch_id,
        asins_count=len(request.asins),
        status="queued",
        created_at=batch_info["created_at"],
        estimated_completion=batch_info["created_at"] + timedelta(hours=estimated_hours)
    )


@router.get("/status/{batch_id}", response_model=BatchStatus)
async def get_batch_status(
    batch_id: str,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Check processing status of a batch.
    """
    if batch_id not in batch_registry:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch = batch_registry[batch_id]

    # Verify ownership
    if batch["org_id"] != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return BatchStatus(
        batch_id=batch["batch_id"],
        batch_name=batch["batch_name"],
        status=batch["status"],
        total_asins=batch["total_asins"],
        processed_asins=batch["processed_asins"],
        failed_asins=batch["failed_asins"],
        progress_pct=round(batch["progress_pct"], 2),
        created_at=batch["created_at"],
        started_at=batch.get("started_at"),
        completed_at=batch.get("completed_at"),
        results=batch.get("results", {})
    )


@router.get("/history", response_model=List[BatchHistory])
async def get_batch_history(
    limit: int = 20,
    status_filter: str = None,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    List past batch operations for the organization.
    """
    org_batches = [
        b for b in batch_registry.values()
        if b["org_id"] == user.org_id
    ]

    # Apply status filter if provided
    if status_filter:
        org_batches = [b for b in org_batches if b["status"] == status_filter]

    # Sort by creation date, newest first
    org_batches = sorted(org_batches, key=lambda x: x["created_at"], reverse=True)

    # Calculate success rate
    history = []
    for batch in org_batches[:limit]:
        success_rate = (
            ((batch["total_asins"] - batch["failed_asins"]) / batch["total_asins"] * 100)
            if batch["total_asins"] > 0 else 0
        )
        history.append(BatchHistory(
            batch_id=batch["batch_id"],
            batch_name=batch["batch_name"],
            asins_count=batch["total_asins"],
            status=batch["status"],
            created_at=batch["created_at"],
            completed_at=batch.get("completed_at"),
            success_rate=round(success_rate, 2)
        ))

    return history


@router.delete("/cancel/{batch_id}")
async def cancel_batch(
    batch_id: str,
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Cancel a queued or processing batch.
    """
    if batch_id not in batch_registry:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch = batch_registry[batch_id]

    # Verify ownership and status
    if batch["org_id"] != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if batch["status"] == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed batch")

    batch["status"] = "cancelled"
    batch["completed_at"] = datetime.utcnow()

    return {"status": "cancelled", "batch_id": batch_id}


@router.get("/stats")
async def get_batch_statistics(
    user: User = Depends(tenant_session),
    db: Session = Depends(get_db)
):
    """
    Get aggregate statistics about batch processing for the organization.
    """
    org_batches = [b for b in batch_registry.values() if b["org_id"] == user.org_id]

    total_batches = len(org_batches)
    completed_batches = len([b for b in org_batches if b["status"] == "completed"])
    failed_batches = len([b for b in org_batches if b["status"] == "failed"])
    total_asins_processed = sum(b["processed_asins"] for b in org_batches)
    total_asins_failed = sum(b["failed_asins"] for b in org_batches)

    avg_success = (
        ((total_asins_processed - total_asins_failed) / total_asins_processed * 100)
        if total_asins_processed > 0 else 0
    )

    return {
        "total_batches": total_batches,
        "completed_batches": completed_batches,
        "failed_batches": failed_batches,
        "total_asins_processed": total_asins_processed,
        "total_asins_failed": total_asins_failed,
        "overall_success_rate_pct": round(avg_success, 2)
    }
