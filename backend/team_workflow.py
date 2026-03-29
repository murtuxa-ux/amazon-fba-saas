from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean, Text
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json

from auth import get_current_user
from database import get_db, Base, engine
from models import User

# ============================================================================
# DATABASE MODELS
# ============================================================================

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to = Column(Integer, ForeignKey("user.id"), nullable=True)
    assigned_by = Column(Integer, ForeignKey("user.id"), nullable=True)
    client_id = Column(Integer, nullable=True)
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    status = Column(String(50), default="todo")  # todo, in_progress, review, done, blocked
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    category = Column(String(50), default="other")  # ppc, inventory, sourcing, listing, account_health, reporting, other
    estimated_hours = Column(Float, default=0.0)
    actual_hours = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assigned_user = relationship("User", foreign_keys=[assigned_to], backref="assigned_tasks")
    created_user = relationship("User", foreign_keys=[assigned_by], backref="created_tasks")


class SOPTemplate(Base):
    __tablename__ = "sop_templates"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    steps = Column(JSON, default=[])  # [{"step_number": 1, "title": "...", "description": "...", "estimated_minutes": 10, "is_required": true}]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SOPExecution(Base):
    __tablename__ = "sop_executions"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True, nullable=False)
    sop_template_id = Column(Integer, ForeignKey("sop_templates.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    executed_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    client_id = Column(Integer, nullable=False)
    status = Column(String(50), default="not_started")  # not_started, in_progress, completed
    current_step = Column(Integer, default=0)
    step_completions = Column(JSON, default={})  # {"0": true, "1": false, ...}
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sop_template = relationship("SOPTemplate", backref="executions")
    task = relationship("Task", backref="sop_executions")
    executor = relationship("User", backref="sop_executions")


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    client_id = Column(Integer, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    hours = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    entry_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="time_entries")
    task = relationship("Task", backref="time_entries")


class TeamCapacity(Base):
    __tablename__ = "team_capacity"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    total_clients = Column(Integer, default=0)
    max_clients = Column(Integer, default=10)
    total_tasks_open = Column(Integer, default=0)
    total_hours_week = Column(Float, default=0.0)
    capacity_status = Column(String(20), default="available")  # available, busy, overloaded
    week_start = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="capacity_records")


Base.metadata.create_all(bind=engine)

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    client_id: Optional[int] = None
    priority: str = "medium"
    status: str = "todo"
    due_date: Optional[datetime] = None
    category: str = "other"
    estimated_hours: float = 0.0

    class Config:
        from_attributes = True


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    category: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None

    class Config:
        from_attributes = True


class TaskStatusUpdate(BaseModel):
    status: str
    actual_hours: Optional[float] = None

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    assigned_to: Optional[int]
    assigned_by: Optional[int]
    client_id: Optional[int]
    priority: str
    status: str
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    category: str
    estimated_hours: float
    actual_hours: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SOPTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    steps: List[Dict[str, Any]]
    is_active: bool = True

    class Config:
        from_attributes = True


class SOPTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    steps: List[Dict[str, Any]]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SOPExecutionCreate(BaseModel):
    sop_template_id: int
    client_id: int
    task_id: Optional[int] = None

    class Config:
        from_attributes = True


class SOPExecutionUpdate(BaseModel):
    current_step: Optional[int] = None
    step_completions: Optional[Dict[str, bool]] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class SOPExecutionResponse(BaseModel):
    id: int
    sop_template_id: int
    task_id: Optional[int]
    client_id: int
    status: str
    current_step: int
    step_completions: Dict[str, bool]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TimeEntryCreate(BaseModel):
    client_id: int
    task_id: Optional[int] = None
    hours: float
    description: Optional[str] = None
    entry_date: datetime

    class Config:
        from_attributes = True


class TimeEntryResponse(BaseModel):
    id: int
    user_id: int
    client_id: int
    task_id: Optional[int]
    hours: float
    description: Optional[str]
    entry_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class TeamCapacityResponse(BaseModel):
    id: int
    user_id: int
    total_clients: int
    max_clients: int
    total_tasks_open: int
    total_hours_week: float
    capacity_status: str
    week_start: datetime

    class Config:
        from_attributes = True


class TimeEntrySummaryResponse(BaseModel):
    total_hours: float
    hours_by_client: Dict[int, float]
    hours_by_user: Dict[int, float]
    week_start: datetime
    week_end: datetime

    class Config:
        from_attributes = True


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_capacity(user_id: int, org_id: int, db: Session):
    """Calculate team member capacity status"""
    # Count open tasks
    open_tasks = db.query(Task).filter(
        Task.assigned_to == user_id,
        Task.org_id == org_id,
        Task.status.in_(["todo", "in_progress", "review"])
    ).count()

    # Count unique clients
    client_tasks = db.query(Task.client_id).filter(
        Task.assigned_to == user_id,
        Task.org_id == org_id,
        Task.status.in_(["todo", "in_progress", "review"])
    ).distinct().all()
    total_clients = len(client_tasks)

    # Calculate weekly hours
    week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
    week_entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == user_id,
        TimeEntry.org_id == org_id,
        TimeEntry.entry_date >= week_start
    ).all()
    total_hours = sum(entry.hours for entry in week_entries)

    # Determine status
    if total_hours > 40 or open_tasks > 15 or total_clients > 8:
        capacity_status = "overloaded"
    elif total_hours > 30 or open_tasks > 10 or total_clients > 5:
        capacity_status = "busy"
    else:
        capacity_status = "available"

    # Upsert capacity record
    capacity = db.query(TeamCapacity).filter(
        TeamCapacity.user_id == user_id,
        TeamCapacity.org_id == org_id,
        TeamCapacity.week_start == week_start
    ).first()

    if capacity:
        capacity.total_clients = total_clients
        capacity.total_tasks_open = open_tasks
        capacity.total_hours_week = total_hours
        capacity.capacity_status = capacity_status
        capacity.updated_at = datetime.utcnow()
    else:
        capacity = TeamCapacity(
            org_id=org_id,
            user_id=user_id,
            total_clients=total_clients,
            total_tasks_open=open_tasks,
            total_hours_week=total_hours,
            capacity_status=capacity_status,
            week_start=week_start
        )
        db.add(capacity)

    db.commit()
    return capacity


def advance_sop_step(execution_id: int, db: Session):
    """Advance SOP execution to next step"""
    execution = db.query(SOPExecution).filter(SOPExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="SOP execution not found")

    sop = db.query(SOPTemplate).filter(SOPTemplate.id == execution.sop_template_id).first()
    steps = sop.steps or []

    if execution.status == "not_started":
        execution.status = "in_progress"
        execution.started_at = datetime.utcnow()

    if execution.current_step < len(steps):
        next_step = execution.current_step + 1
        execution.current_step = next_step

        if next_step >= len(steps):
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()

    execution.updated_at = datetime.utcnow()
    db.commit()
    return execution


# ============================================================================
# ROUTER SETUP
# ============================================================================

router = APIRouter(prefix="/workflow", tags=["Workflow"])


# ============================================================================
# TASK ENDPOINTS
# ============================================================================

@router.get("/tasks")
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    assigned_to: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
):
    """List all tasks with optional filters"""
    query = db.query(Task).filter(Task.org_id == current_user.org_id)

    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if client_id:
        query = query.filter(Task.client_id == client_id)
    if category:
        query = query.filter(Task.category == category)

    tasks = query.order_by(Task.due_date.asc(), Task.priority.desc()).all()
    return tasks


@router.post("/tasks")
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task"""
    task = Task(
        org_id=current_user.org_id,
        **task_data.dict(),
        assigned_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific task"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.org_id == current_user.org_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a task"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.org_id == current_user.org_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in task_data.dict(exclude_unset=True).items():
        setattr(task, field, value)

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


@router.put("/tasks/{task_id}/status")
def update_task_status(
    task_id: int,
    status_data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update task status"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.org_id == current_user.org_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = status_data.status

    if status_data.actual_hours:
        task.actual_hours = status_data.actual_hours

    if status_data.status == "done":
        task.completed_at = datetime.utcnow()

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks/my-tasks")
def get_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's tasks"""
    tasks = db.query(Task).filter(
        Task.assigned_to == current_user.id,
        Task.org_id == current_user.org_id,
        Task.status.in_(["todo", "in_progress", "review"])
    ).order_by(Task.due_date.asc(), Task.priority.desc()).all()

    return tasks


# ============================================================================
# SOP ENDPOINTS
# ============================================================================

@router.get("/sops")
def list_sops(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all SOP templates"""
    sops = db.query(SOPTemplate).filter(
        SOPTemplate.org_id == current_user.org_id,
        SOPTemplate.is_active == True
    ).all()
    return sops


@router.post("/sops")
def create_sop(
    sop_data: SOPTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new SOP template"""
    sop = SOPTemplate(
        org_id=current_user.org_id,
        **sop_data.dict()
    )
    db.add(sop)
    db.commit()
    db.refresh(sop)
    return sop


@router.get("/sops/{sop_id}")
def get_sop(
    sop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific SOP template"""
    sop = db.query(SOPTemplate).filter(
        SOPTemplate.id == sop_id,
        SOPTemplate.org_id == current_user.org_id
    ).first()

    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")
    return sop


@router.put("/sops/{sop_id}")
def update_sop(
    sop_id: int,
    sop_data: SOPTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a SOP template"""
    sop = db.query(SOPTemplate).filter(
        SOPTemplate.id == sop_id,
        SOPTemplate.org_id == current_user.org_id
    ).first()

    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    for field, value in sop_data.dict().items():
        setattr(sop, field, value)

    sop.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sop)
    return sop


@router.post("/sops/{sop_id}/execute")
def execute_sop(
    sop_id: int,
    execution_data: SOPExecutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start SOP execution for a client/task"""
    sop = db.query(SOPTemplate).filter(
        SOPTemplate.id == sop_id,
        SOPTemplate.org_id == current_user.org_id
    ).first()

    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    execution = SOPExecution(
        org_id=current_user.org_id,
        sop_template_id=sop_id,
        client_id=execution_data.client_id,
        task_id=execution_data.task_id,
        executed_by=current_user.id,
        current_step=0,
        step_completions={}
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)
    return execution


# ============================================================================
# SOP EXECUTION ENDPOINTS
# ============================================================================

@router.get("/sop-executions/{execution_id}")
def get_sop_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific SOP execution"""
    execution = db.query(SOPExecution).filter(
        SOPExecution.id == execution_id,
        SOPExecution.org_id == current_user.org_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="SOP execution not found")
    return execution


@router.put("/sop-executions/{execution_id}")
def update_sop_execution(
    execution_id: int,
    update_data: SOPExecutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Advance SOP execution step"""
    execution = db.query(SOPExecution).filter(
        SOPExecution.id == execution_id,
        SOPExecution.org_id == current_user.org_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="SOP execution not found")

    if update_data.current_step is not None:
        execution.current_step = update_data.current_step

    if update_data.step_completions is not None:
        execution.step_completions = update_data.step_completions

    if update_data.status:
        execution.status = update_data.status
        if update_data.status == "in_progress" and not execution.started_at:
            execution.started_at = datetime.utcnow()
        elif update_data.status == "completed":
            execution.completed_at = datetime.utcnow()

    execution.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(execution)
    return execution


# ============================================================================
# TIME ENTRY ENDPOINTS
# ============================================================================

@router.get("/time-entries")
def list_time_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """List time entries with optional filters"""
    query = db.query(TimeEntry).filter(TimeEntry.org_id == current_user.org_id)

    if user_id:
        query = query.filter(TimeEntry.user_id == user_id)
    if client_id:
        query = query.filter(TimeEntry.client_id == client_id)
    if date_from:
        query = query.filter(TimeEntry.entry_date >= date_from)
    if date_to:
        query = query.filter(TimeEntry.entry_date <= date_to)

    entries = query.order_by(TimeEntry.entry_date.desc()).all()
    return entries


@router.post("/time-entries")
def create_time_entry(
    entry_data: TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a time entry"""
    entry = TimeEntry(
        org_id=current_user.org_id,
        user_id=current_user.id,
        **entry_data.dict()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/time-entries/summary")
def get_time_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """Get time entry summary"""
    query = db.query(TimeEntry).filter(TimeEntry.org_id == current_user.org_id)

    if date_from:
        query = query.filter(TimeEntry.entry_date >= date_from)
    if date_to:
        query = query.filter(TimeEntry.entry_date <= date_to)

    entries = query.all()

    total_hours = sum(entry.hours for entry in entries)
    hours_by_client = {}
    hours_by_user = {}

    for entry in entries:
        hours_by_client[entry.client_id] = hours_by_client.get(entry.client_id, 0) + entry.hours
        hours_by_user[entry.user_id] = hours_by_user.get(entry.user_id, 0) + entry.hours

    week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
    week_end = week_start + timedelta(days=6)

    return {
        "total_hours": total_hours,
        "hours_by_client": hours_by_client,
        "hours_by_user": hours_by_user,
        "week_start": week_start,
        "week_end": week_end
    }


# ============================================================================
# CAPACITY ENDPOINTS
# ============================================================================

@router.get("/capacity")
def get_team_capacity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get team capacity overview"""
    week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())

    capacities = db.query(TeamCapacity).filter(
        TeamCapacity.org_id == current_user.org_id,
        TeamCapacity.week_start == week_start
    ).all()

    return capacities


@router.post("/capacity/calculate")
def calculate_all_capacity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Refresh capacity for all team members"""
    team_members = db.query(User).filter(
        User.org_id == current_user.org_id,
        User.is_active == True
    ).all()

    results = []
    for member in team_members:
        capacity = calculate_capacity(member.id, current_user.org_id, db)
        results.append(capacity)

    return results


# ============================================================================
# DASHBOARD ENDPOINT
# ============================================================================

@router.get("/dashboard")
def get_workflow_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get workflow dashboard data"""
    # Open tasks by status
    tasks_by_status = {}
    for status in ["todo", "in_progress", "review", "done", "blocked"]:
        count = db.query(Task).filter(
            Task.org_id == current_user.org_id,
            Task.status == status
        ).count()
        tasks_by_status[status] = count

    # Overdue tasks
    now = datetime.utcnow()
    overdue_tasks = db.query(Task).filter(
        Task.org_id == current_user.org_id,
        Task.status.in_(["todo", "in_progress", "review"]),
        Task.due_date < now
    ).count()

    # Upcoming deadlines (next 7 days)
    week_end = now + timedelta(days=7)
    upcoming_tasks = db.query(Task).filter(
        Task.org_id == current_user.org_id,
        Task.status.in_(["todo", "in_progress"]),
        Task.due_date.between(now, week_end)
    ).order_by(Task.due_date.asc()).all()

    # Team utilization
    week_start = now - timedelta(days=now.weekday())
    team_members = db.query(User).filter(
        User.org_id == current_user.org_id,
        User.is_active == True
    ).all()

    utilization = {}
    for member in team_members:
        entries = db.query(TimeEntry).filter(
            TimeEntry.user_id == member.id,
            TimeEntry.entry_date >= week_start
        ).all()
        total_hours = sum(entry.hours for entry in entries)
        utilization[member.id] = {
            "username": member.username,
            "hours": total_hours
        }

    return {
        "tasks_by_status": tasks_by_status,
        "overdue_count": overdue_tasks,
        "upcoming_tasks": upcoming_tasks,
        "team_utilization": utilization
    }
