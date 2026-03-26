from fastapi import APIRouter, HTTPException, Depends, Query, Header
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import jwt
import hashlib
from secrets import token_urlsafe
from database import Base, get_db
from auth import hash_password, verify_password
from config import settings


# ============================================================================
# DATABASE MODELS
# ============================================================================

class ClientPortalUser(Base):
    """Portal login for FBA wholesale clients"""
    __tablename__ = "client_portal_users"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="portal_users")

    def set_password(self, password: str) -> None:
        """Hash and set password"""
        self.password_hash = hash_password(password)

    def verify_password(self, password: str) -> bool:
        """Verify password against hash"""
        return verify_password(password, self.password_hash)

    def update_last_login(self) -> None:
        """Update last login timestamp"""
        self.last_login = datetime.utcnow()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ClientPortalUserCreate(BaseModel):
    """Schema for creating a portal user (admin endpoint)"""
    email: str
    name: str
    client_id: int


class ClientPortalUserUpdate(BaseModel):
    """Schema for updating a portal user"""
    email: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None


class ClientPortalUserResponse(BaseModel):
    """Schema for returning portal user data"""
    id: int
    email: str
    name: str
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ClientPortalUserInvite(BaseModel):
    """Schema for portal user creation response with temp password"""
    id: int
    email: str
    name: str
    temp_password: str
    created_at: datetime


class ClientLoginRequest(BaseModel):
    """Schema for client portal login"""
    email: str
    password: str


class ClientLoginResponse(BaseModel):
    """Schema for login response"""
    access_token: str
    token_type: str
    user: ClientPortalUserResponse


class PasswordChangeRequest(BaseModel):
    """Schema for password change"""
    current_password: str
    new_password: str


class PasswordResetResponse(BaseModel):
    """Schema for password reset response"""
    email: str
    temp_password: str
    message: str


class DashboardSummary(BaseModel):
    """Client dashboard overview"""
    active_products_count: int
    monthly_revenue: float
    total_orders: int
    pending_orders: int
    p_l_summary: dict


class ProductAssignment(BaseModel):
    """Product assigned to client"""
    product_id: int
    sku: str
    title: str
    status: str
    assigned_date: datetime


class PurchaseOrder(BaseModel):
    """Purchase order for client"""
    order_id: int
    po_number: str
    quantity: int
    unit_cost: float
    total_cost: float
    status: str
    order_date: datetime
    expected_delivery: Optional[datetime]


class MonthlyPnL(BaseModel):
    """Monthly P&L report"""
    month: str
    revenue: float
    cogs: float
    operational_costs: float
    gross_profit: float
    net_profit: float
    margin_percentage: float


class PnLDetail(BaseModel):
    """Detailed P&L for specific month"""
    month: str
    revenue_breakdown: dict
    cogs_breakdown: dict
    operational_costs: dict
    summary: MonthlyPnL


class ActivityLog(BaseModel):
    """Activity log entry"""
    activity_id: int
    activity_type: str
    description: str
    timestamp: datetime
    related_entity_id: Optional[int] = None
    related_entity_type: Optional[str] = None


class ClientProfile(BaseModel):
    """Client profile from portal user perspective"""
    user_id: int
    email: str
    name: str
    client_id: int
    client_name: str
    is_active: bool
    last_login: Optional[datetime]
    joined_date: datetime


# ============================================================================
# DEPENDENCIES
# ============================================================================

def get_portal_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> ClientPortalUser:
    """
    Validate portal JWT token and return authenticated ClientPortalUser.

    Portal tokens must have type="portal" claim to distinguish from internal tokens.

    Raises:
        HTTPException: 401 if token is missing, invalid, expired, or not a portal token
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization header"
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization scheme"
            )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format"
        )

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    # Verify this is a portal token, not an internal token
    if payload.get("type") != "portal":
        raise HTTPException(
            status_code=401,
            detail="Invalid token type for portal access"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )

    user = db.query(ClientPortalUser).filter(
        ClientPortalUser.id == user_id
    ).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User not found or inactive"
        )

    return user


def generate_portal_token(user_id: int, expires_in_hours: int = 24) -> str:
    """
    Generate a portal JWT token with type="portal" claim.

    Args:
        user_id: The ClientPortalUser ID
        expires_in_hours: Token expiration time in hours

    Returns:
        Encoded JWT token
    """
    payload = {
        "sub": user_id,
        "type": "portal",
        "exp": datetime.utcnow() + timedelta(hours=expires_in_hours),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def generate_temp_password(length: int = 12) -> str:
    """Generate a temporary password for portal users"""
    return token_urlsafe(length)


# ============================================================================
# ROUTER SETUP
# ============================================================================

router = APIRouter(prefix="/portal", tags=["Portal"])


# ============================================================================
# ADMIN ENDPOINTS (Requires internal team auth)
# ============================================================================

@router.post("/users", response_model=ClientPortalUserInvite)
def create_portal_user(
    user_create: ClientPortalUserCreate,
    current_user = Depends(lambda: None),  # Replace with actual internal auth
    db: Session = Depends(get_db)
):
    """
    Create a new portal login for a client (admin endpoint).

    Generates a temporary password and returns it to be sent to the client.
    The client will be prompted to change password on first login.

    Requires: Internal team authentication
    """
    # Check if email already exists
    existing_user = db.query(ClientPortalUser).filter(
        ClientPortalUser.email == user_create.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered for portal access"
        )

    # Verify client exists and belongs to org
    # TODO: Verify client_id exists and org_id matches
    # client = db.query(Client).filter(Client.id == user_create.client_id).first()
    # if not client:
    #     raise HTTPException(status_code=404, detail="Client not found")

    temp_password = generate_temp_password()

    new_user = ClientPortalUser(
        org_id=1,  # TODO: Get from current_user's org
        client_id=user_create.client_id,
        email=user_create.email,
        name=user_create.name
    )
    new_user.set_password(temp_password)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return ClientPortalUserInvite(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        temp_password=temp_password,
        created_at=new_user.created_at
    )


@router.get("/users", response_model=List[ClientPortalUserResponse])
def list_portal_users(
    org_id: int = Query(...),
    current_user = Depends(lambda: None),  # Replace with actual internal auth
    db: Session = Depends(get_db)
):
    """
    List all portal users for an organization (admin endpoint).

    Requires: Internal team authentication
    """
    users = db.query(ClientPortalUser).filter(
        ClientPortalUser.org_id == org_id
    ).all()

    return users


@router.put("/users/{user_id}", response_model=ClientPortalUserResponse)
def update_portal_user(
    user_id: int,
    user_update: ClientPortalUserUpdate,
    current_user = Depends(lambda: None),  # Replace with actual internal auth
    db: Session = Depends(get_db)
):
    """
    Update a portal user (admin endpoint).

    Can update: email, name, is_active status

    Requires: Internal team authentication
    """
    user = db.query(ClientPortalUser).filter(
        ClientPortalUser.id == user_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Portal user not found")

    if user_update.email and user_update.email != user.email:
        existing = db.query(ClientPortalUser).filter(
            ClientPortalUser.email == user_update.email
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Email already in use"
            )
        user.email = user_update.email

    if user_update.name:
        user.name = user_update.name

    if user_update.is_active is not None:
        user.is_active = user_update.is_active

    db.commit()
    db.refresh(user)

    return user


@router.delete("/users/{user_id}")
def delete_portal_user(
    user_id: int,
    current_user = Depends(lambda: None),  # Replace with actual internal auth
    db: Session = Depends(get_db)
):
    """
    Revoke portal access for a user (soft delete via is_active=False).

    Requires: Internal team authentication
    """
    user = db.query(ClientPortalUser).filter(
        ClientPortalUser.id == user_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Portal user not found")

    user.is_active = False
    db.commit()

    return {"message": "Portal access revoked"}


@router.put("/users/{user_id}/reset-password", response_model=PasswordResetResponse)
def reset_portal_user_password(
    user_id: int,
    current_user = Depends(lambda: None),  # Replace with actual internal auth
    db: Session = Depends(get_db)
):
    """
    Reset a portal user's password and return temporary password (admin endpoint).

    Requires: Internal team authentication
    """
    user = db.query(ClientPortalUser).filter(
        ClientPortalUser.id == user_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Portal user not found")

    temp_password = generate_temp_password()
    user.set_password(temp_password)
    db.commit()

    return PasswordResetResponse(
        email=user.email,
        temp_password=temp_password,
        message="Password has been reset. Please send the temporary password to the user."
    )


# ============================================================================
# CLIENT-FACING ENDPOINTS (Portal Authentication)
# ============================================================================

@router.post("/login", response_model=ClientLoginResponse)
def portal_login(
    credentials: ClientLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Client portal login endpoint.

    Returns JWT token with type="portal" claim for subsequent requests.
    """
    user = db.query(ClientPortalUser).filter(
        ClientPortalUser.email == credentials.email
    ).first()

    if not user or not user.verify_password(credentials.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account has been deactivated"
        )

    # Update last login
    user.update_last_login()
    db.commit()

    # Generate portal token
    token = generate_portal_token(user.id)

    return ClientLoginResponse(
        access_token=token,
        token_type="bearer",
        user=ClientPortalUserResponse.from_orm(user)
    )


@router.get("/me", response_model=ClientProfile)
def get_client_profile(
    current_user: ClientPortalUser = Depends(get_portal_user),
    db: Session = Depends(get_db)
):
    """
    Get authenticated client's profile information.

    Requires: Portal authentication
    """
    # TODO: Fetch actual client data
    # client = db.query(Client).filter(Client.id == current_user.client_id).first()

    return ClientProfile(
        user_id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        client_id=current_user.client_id,
        client_name="Client Name",  # TODO: Get from Client model
        is_active=current_user.is_active,
        last_login=current_user.last_login,
        joined_date=current_user.created_at
    )


@router.put("/me/password")
def change_portal_password(
    password_change: PasswordChangeRequest,
    current_user: ClientPortalUser = Depends(get_portal_user),
    db: Session = Depends(get_db)
):
    """
    Change client's portal password.

    Requires: Portal authentication
    """
    if not current_user.verify_password(password_change.current_password):
        raise HTTPException(
            status_code=401,
            detail="Current password is incorrect"
        )

    current_user.set_password(password_change.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


@router.get("/dashboard", response_model=DashboardSummary)
def get_client_dashboard(
    current_user: ClientPortalUser = Depends(get_portal_user),
    db: Session = Depends(get_db)
):
    """
    Get client's account dashboard overview.

    Returns:
    - Active products count
    - Monthly revenue
    - Recent orders (count and pending)
    - P&L summary

    Requires: Portal authentication
    """
    # TODO: Implement actual queries against product assignments, orders, and P&L tables
    # This is a placeholder structure

    active_products = 0
    monthly_revenue = 0.0
    total_orders = 0
    pending_orders = 0

    # Example P&L summary - replace with actual data
    p_l_summary = {
        "gross_profit": 0.0,
        "net_profit": 0.0,
        "margin_percentage": 0.0,
        "period": "current_month"
    }

    return DashboardSummary(
        active_products_count=active_products,
        monthly_revenue=monthly_revenue,
        total_orders=total_orders,
        pending_orders=pending_orders,
        p_l_summary=p_l_summary
    )


@router.get("/products", response_model=List[ProductAssignment])
def list_client_products(
    status: Optional[str] = Query(None),
    current_user: ClientPortalUser = Depends(get_portal_user),
    db: Session = Depends(get_db)
):
    """
    Get products assigned to client's account.

    Query Parameters:
    - status: Filter by product status (active, inactive, pending_approval, etc.)

    Requires: Portal authentication
    """
    # TODO: Implement query against product assignments table
    # Filter by current_user.client_id and optional status

    products = []
    return products


@router.get("/orders", response_model=List[PurchaseOrder])
def list_client_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: ClientPortalUser = Depends(get_portal_user),
    db: Session = Depends(get_db)
):
    """
    Get purchase orders for client's account.

    Query Parameters:
    - status: Filter by order status (pending, placed, delivered, cancelled, etc.)
    - limit: Number of results (default 50, max 100)
    - offset: Pagination offset

    Requires: Portal authentication
    """
    # TODO: Implement query against purchase orders table
    # Filter by current_user.client_id

    orders = []
    return orders


@router.get("/pnl", response_model=List[MonthlyPnL])
def list_client_pnl(
    months: int = Query(12, ge=1, le=36),
    current_user: ClientPortalUser = Depends(get_portal_user),
    db: Session = Depends(get_db)
):
    """
    Get client's monthly P&L reports.

    Query Parameters:
    - months: Number of months to retrieve (default 12, max 36)

    Requires: Portal authentication
    """
    # TODO: Implement query against P&L reports table
    # Filter by current_user.client_id and return last N months

    pnl_reports = []
    return pnl_reports


@router.get("/pnl/{month}", response_model=PnLDetail)
def get_client_pnl_detail(
    month: str,
    current_user: ClientPortalUser = Depends(get_portal_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed P&L report for specific month.

    Path Parameters:
    - month: Month in format YYYY-MM

    Returns detailed breakdown of:
    - Revenue by product/category
    - COGS breakdown
    - Operational costs
    - Profit summary

    Requires: Portal authentication
    """
    # TODO: Implement detailed P&L query
    # Validate month format (YYYY-MM)
    # Filter by current_user.client_id and month

    try:
        # Validate month format
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid month format. Use YYYY-MM"
        )

    # Placeholder structure
    detail = PnLDetail(
        month=month,
        revenue_breakdown={},
        cogs_breakdown={},
        operational_costs={},
        summary=MonthlyPnL(
            month=month,
            revenue=0.0,
            cogs=0.0,
            operational_costs=0.0,
            gross_profit=0.0,
            net_profit=0.0,
            margin_percentage=0.0
        )
    )

    return detail


@router.get("/activity", response_model=List[ActivityLog])
def list_client_activity(
    activity_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: ClientPortalUser = Depends(get_portal_user),
    db: Session = Depends(get_db)
):
    """
    Get recent activity on client's account.

    Activity types include:
    - product_approved
    - product_rejected
    - order_placed
    - order_delivered
    - order_cancelled
    - pnl_generated
    - user_login
    - settings_updated

    Query Parameters:
    - activity_type: Filter by specific activity type
    - limit: Number of results (default 50, max 100)
    - offset: Pagination offset

    Requires: Portal authentication
    """
    # TODO: Implement query against activity/audit log table
    # Filter by current_user.client_id

    activities = []
    return activities
