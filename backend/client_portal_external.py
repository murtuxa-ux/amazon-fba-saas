"""
External Client Portal Module for Ecom Era Wholesale SaaS Platform

This module provides a separate portal for Ecom Era's wholesale clients to:
- Log in with client-specific credentials
- View their financial reports (P&L, revenue, profit)
- Monitor inventory status (FBA/FBM quantities)
- Access weekly/monthly performance reports
- Communicate with their account manager

Two categories of endpoints:
1. Internal (Ecom Era team) - manage portal access
2. Client-facing - view reports, inventory, messages
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth import hash_password, verify_password, create_access_token, get_current_user
from models import User, Organization, Client, WeeklyReport, Product
from database import get_db


# ============================================================================
# ROUTER SETUP
# ============================================================================

router = APIRouter(prefix="/client-portal-ext", tags=["client-portal-ext"])


# ============================================================================
# ENUMS
# ============================================================================

class SenderType(str, Enum):
    """Message sender type"""
    CLIENT = "client"
    TEAM = "team"


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ClientPortalUserCreate(BaseModel):
    """Schema for creating client portal access"""
    client_id: int
    email: EmailStr
    password: str
    portal_permissions: dict = {
        "view_pnl": True,
        "view_inventory": True,
        "view_reports": True,
        "can_message": True,
    }


class ClientPortalUserUpdate(BaseModel):
    """Schema for updating client portal permissions"""
    is_active: Optional[bool] = None
    can_view_pnl: Optional[bool] = None
    can_view_inventory: Optional[bool] = None
    can_view_reports: Optional[bool] = None
    can_message: Optional[bool] = None


class ClientPortalUserResponse(BaseModel):
    """Response schema for portal user"""
    id: int
    client_id: int
    email: str
    is_active: bool
    can_view_pnl: bool
    can_view_inventory: bool
    can_view_reports: bool
    can_message: bool
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ClientLoginRequest(BaseModel):
    """Client login request"""
    email: EmailStr
    password: str


class ClientLoginResponse(BaseModel):
    """Client login response"""
    access_token: str
    token_type: str
    client_id: int
    email: str
    client_name: str


class AccountSummary(BaseModel):
    """Account summary for client dashboard"""
    total_revenue: float
    total_profit: float
    total_products: int
    active_asins: int
    account_manager_name: str


class RecentReport(BaseModel):
    """Recent report summary"""
    id: int
    week_start: datetime
    week_end: datetime
    total_sales: float
    total_units: int
    roi: float


class ClientDashboardResponse(BaseModel):
    """Client dashboard response"""
    account_summary: AccountSummary
    recent_reports: List[RecentReport]


class PnLByPeriod(BaseModel):
    """P&L data for a specific period"""
    period: str
    revenue: float
    costs: float
    profit: float
    roi: float


class ClientPnLResponse(BaseModel):
    """Client P&L summary"""
    revenue: float
    costs: float
    profit: float
    roi: float
    by_period: List[PnLByPeriod]


class InventoryItem(BaseModel):
    """Inventory item"""
    asin: str
    title: str
    fba_quantity: int
    fbm_quantity: int
    in_transit: int
    status: str


class ClientInventoryResponse(BaseModel):
    """Client inventory response"""
    total_units: int
    items: List[InventoryItem]


class ClientMessageCreate(BaseModel):
    """Create client message"""
    subject: str
    message: str


class ClientMessageResponse(BaseModel):
    """Client message response"""
    id: int
    subject: str
    message: str
    sender_type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ClientProfile(BaseModel):
    """Client profile information"""
    client_id: int
    client_name: str
    email: str
    account_manager_name: str
    account_manager_email: str
    portal_created_at: datetime
    is_active: bool
    permissions: dict


# ============================================================================
# DEPENDENCIES
# ============================================================================

def get_current_portal_user(token: str = None, db: Session = Depends(get_db)):
    """
    Dependency to validate client portal JWT and return ClientPortalUser.
    In production, extract token from Authorization header.

    For now, this is a placeholder that would validate JWT.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        # In production, decode JWT and validate
        # payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        # portal_user_id = payload.get("sub")

        # For now, return mock implementation
        # In real implementation, query ClientPortalUser from DB
        pass
    except Exception as e:
        logger.error(f"Token validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )


def get_internal_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Verify that current user is an Ecom Era internal user (not a client).
    Used for admin endpoints.
    """
    # Verify user is from Ecom Era org or has admin role
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return current_user


# ============================================================================
# INTERNAL ENDPOINTS (Ecom Era Team)
# ============================================================================

@router.post(
    "/create-access",
    response_model=ClientPortalUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create client portal access",
)
def create_portal_access(
    request: ClientPortalUserCreate,
    current_user: User = Depends(get_internal_user),
    db: Session = Depends(get_db),
):
    """
    Create portal access for a client.

    Only Ecom Era internal users can create portal access.
    """
    try:
        # Verify client exists and belongs to current_user's org
        client = db.query(Client).filter(
            Client.id == request.client_id,
            Client.org_id == current_user.org_id,
        ).first()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        # Check if portal user already exists
        existing = db.query(text("SELECT id FROM client_portal_users WHERE client_id = :client_id")).params(
            client_id=request.client_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Portal access already exists for this client",
            )

        # Create client portal user
        password_hash = hash_password(request.password)

        create_query = text("""
            INSERT INTO client_portal_users (
                client_id, org_id, email, password_hash, is_active,
                can_view_pnl, can_view_inventory, can_view_reports, can_message,
                created_at
            )
            VALUES (
                :client_id, :org_id, :email, :password_hash, :is_active,
                :view_pnl, :view_inv, :view_reports, :can_msg, :created_at
            )
            RETURNING id, client_id, org_id, email, is_active,
                      can_view_pnl, can_view_inventory, can_view_reports, can_message,
                      last_login, created_at
        """)

        result = db.execute(create_query, {
            "client_id": request.client_id,
            "org_id": current_user.org_id,
            "email": request.email,
            "password_hash": password_hash,
            "is_active": True,
            "view_pnl": request.portal_permissions.get("view_pnl", True),
            "view_inv": request.portal_permissions.get("view_inventory", True),
            "view_reports": request.portal_permissions.get("view_reports", True),
            "can_msg": request.portal_permissions.get("can_message", True),
            "created_at": datetime.utcnow(),
        })

        db.commit()

        portal_user = result.mappings().first()
        logger.info(f"Created portal access for client {request.client_id} with email {request.email}")

        return {
            "id": portal_user["id"],
            "client_id": portal_user["client_id"],
            "email": portal_user["email"],
            "is_active": portal_user["is_active"],
            "can_view_pnl": portal_user["can_view_pnl"],
            "can_view_inventory": portal_user["can_view_inventory"],
            "can_view_reports": portal_user["can_view_reports"],
            "can_message": portal_user["can_message"],
            "last_login": portal_user["last_login"],
            "created_at": portal_user["created_at"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portal access: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create portal access",
        )

@router.get(
    "/portal-users",
    response_model=List[ClientPortalUserResponse],
    summary="List all client portal users",
)
def list_portal_users(
    current_user: User = Depends(get_internal_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    List all client portal users for the internal user's organization.

    Only Ecom Era internal users can view this list.
    """
    try:
        query = text("""
            SELECT id, client_id, email, is_active, can_view_pnl, can_view_inventory,
                   can_view_reports, can_message, last_login, created_at
            FROM client_portal_users
            WHERE org_id = :org_id
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :skip
        """)

        result = db.execute(query, {
            "org_id": current_user.org_id,
            "skip": skip,
            "limit": limit,
        })

        portal_users = result.mappings().all()
        logger.info(f"Retrieved {len(portal_users)} portal users for org {current_user.org_id}")

        return [dict(user) for user in portal_users]

    except Exception as e:
        logger.error(f"Error listing portal users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve portal users",
        )


@router.put(
    "/portal-users/{portal_user_id}",
    response_model=ClientPortalUserResponse,
    summary="Update client portal permissions",
)
def update_portal_user(
    portal_user_id: int,
    request: ClientPortalUserUpdate,
    current_user: User = Depends(get_internal_user),
    db: Session = Depends(get_db),
):
    """
    Update client portal permissions.

    Only Ecom Era internal users can update permissions.
    """
    try:
        # Verify portal user exists and belongs to org
        verify_query = text("""
            SELECT id FROM client_portal_users
            WHERE id = :id AND org_id = :org_id
        """)

        existing = db.execute(verify_query, {
            "id": portal_user_id,
            "org_id": current_user.org_id,
        }).first()

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portal user not found",
            )

        # Build dynamic update query
        updates = []
        params = {"id": portal_user_id}

        if request.is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = request.is_active

        if request.can_view_pnl is not None:
            updates.append("can_view_pnl = :can_view_pnl")
            params["can_view_pnl"] = request.can_view_pnl

        if request.can_view_inventory is not None:
            updates.append("can_view_inventory = :can_view_inventory")
            params["can_view_inventory"] = request.can_view_inventory

        if request.can_view_reports is not None:
            updates.append("can_view_reports = :can_view_reports")
            params["can_view_reports"] = request.can_view_reports

        if request.can_message is not None:
            updates.append("can_message = :can_message")
            params["can_message"] = request.can_message

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        update_query = text(f"""
            UPDATE client_portal_users
            SET {", ".join(updates)}
            WHERE id = :id
            RETURNING id, client_id, email, is_active, can_view_pnl, can_view_inventory,
                      can_view_reports, can_message, last_login, created_at
        """)

        result = db.execute(update_query, params)
        db.commit()

        portal_user = result.mappings().first()
        logger.info(f"Updated portal user {portal_user_id}")

        return {
            "id": portal_user["id"],
            "client_id": portal_user["client_id"],
            "email": portal_user["email"],
            "is_active": portal_user["is_active"],
            "can_view_pnl": portal_user["can_view_pnl"],
            "can_view_inventory": portal_user["can_view_inventory"],
            "can_view_reports": portal_user["can_view_reports"],
            "can_message": portal_user["can_message"],
            "last_login": portal_user["last_login"],
            "created_at": portal_user["created_at"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating portal user: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update portal user",
        )


@router.delete(
    "/portal-users/{portal_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke client portal access",
)
def delete_portal_user(
    portal_user_id: int,
    current_user: User = Depends(get_internal_user),
    db: Session = Depends(get_db),
):
    """
    Revoke client portal access (soft delete by marking inactive).

    Only Ecom Era internal users can revoke access.
    """
    try:
        # Verify and soft delete
        delete_query = text("""
            UPDATE client_portal_users
            SET is_active = FALSE
            WHERE id = :id AND org_id = :org_id
        """)

        result = db.execute(delete_query, {
            "id": portal_user_id,
            "org_id": current_user.org_id,
        })

        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portal user not found",
            )

        db.commit()
        logger.info(f"Revoked portal access for user {portal_user_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking portal access: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke portal access",
        )


# ============================================================================
# CLIENT-FACING ENDPOINTS
# ============================================================================

@router.post(
    "/client-login",
    response_model=ClientLoginResponse,
    summary="Client portal login",
)
def client_login(
    request: ClientLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Client login endpoint.

    Returns JWT token for authenticated client.
    """
    try:
        # Find portal user by email
        user_query = text("""
            SELECT cpu.id, cpu.client_id, cpu.email, cpu.password_hash, cpu.org_id
            FROM client_portal_users cpu
            WHERE cpu.email = :email AND cpu.is_active = TRUE
        """)

        user_result = db.execute(user_query, {"email": request.email}).mappings().first()

        if not user_result:
            logger.warning(f"Failed login attempt for email {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        # Verify password
        if not verify_password(request.password, user_result["password_hash"]):
            logger.warning(f"Failed login attempt for email {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        # Get client info
        client_query = text("""
            SELECT id, name FROM clients WHERE id = :client_id
        """)

        client_result = db.execute(client_query, {
            "client_id": user_result["client_id"]
        }).mappings().first()

        if not client_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        # Update last_login
        update_query = text("""
            UPDATE client_portal_users
            SET last_login = :now
            WHERE id = :id
        """)

        db.execute(update_query, {
            "id": user_result["id"],
            "now": datetime.utcnow(),
        })
        db.commit()

        # Create JWT token
        token = create_access_token({
            "sub": str(user_result["id"]),
            "client_id": user_result["client_id"],
            "org_id": user_result["org_id"],
        })

        logger.info(f"Client {user_result['email']} logged in successfully")

        return {
            "access_token": token,
            "token_type": "bearer",
            "client_id": user_result["client_id"],
            "email": user_result["email"],
            "client_name": client_result["name"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during client login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed",
        )


@router.get(
    "/client-dashboard",
    response_model=ClientDashboardResponse,
    summary="Client dashboard",
)
def get_client_dashboard(
    portal_user_id: int,  # In production, extract from JWT
    db: Session = Depends(get_db),
):
    """
    Client dashboard with account summary and recent reports.
    """
    try:
        # Get client info
        client_query = text("""
            SELECT client_id FROM client_portal_users WHERE id = :id
        """)

        client_result = db.execute(client_query, {
            "id": portal_user_id
        }).mappings().first()

        if not client_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        client_id = client_result["client_id"]

        # Get revenue and profit (mock for now)
        total_revenue = 125000.00
        total_profit = 32500.00

        # Get product count
        product_query = text("""
            SELECT COUNT(*) as count FROM products WHERE client_id = :client_id
        """)

        product_result = db.execute(product_query, {
            "client_id": client_id
        }).mappings().first()

        total_products = product_result["count"] if product_result else 0
        active_asins = int(total_products * 0.85)  # Mock: 85% active

        # Get account manager (mock)
        account_manager_name = "Sarah Johnson"

        # Get recent reports (mock)
        recent_reports = [
            {
                "id": 1,
                "week_start": datetime.utcnow() - timedelta(days=14),
                "week_end": datetime.utcnow() - timedelta(days=8),
                "total_sales": 28000.00,
                "total_units": 450,
                "roi": 2.45,
            },
            {
                "id": 2,
                "week_start": datetime.utcnow() - timedelta(days=7),
                "week_end": datetime.utcnow(),
                "total_sales": 31500.00,
                "total_units": 512,
                "roi": 2.68,
            },
        ]

        logger.info(f"Retrieved dashboard for client {client_id}")

        return {
            "account_summary": {
                "total_revenue": total_revenue,
                "total_profit": total_profit,
                "total_products": total_products,
                "active_asins": active_asins,
                "account_manager_name": account_manager_name,
            },
            "recent_reports": recent_reports,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard",
        )


@router.get(
    "/client-pnl",
    response_model=ClientPnLResponse,
    summary="Client P&L summary",
)
def get_client_pnl(
    portal_user_id: int,  # In production, extract from JWT
    db: Session = Depends(get_db),
):
    """
    Client's P&L summary with period breakdown.
    """
    try:
        # Get client info
        client_query = text("""
            SELECT client_id FROM client_portal_users WHERE id = :id
        """)

        client_result = db.execute(client_query, {
            "id": portal_user_id
        }).mappings().first()

        if not client_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        # Mock P&L data
        total_revenue = 125000.00
        total_costs = 92500.00
        total_profit = total_revenue - total_costs
        roi = (total_profit / total_costs) * 100 if total_costs > 0 else 0

        # Mock period breakdown (last 4 weeks)
        by_period = [
            {
                "period": "Week 1",
                "revenue": 28000.00,
                "costs": 21000.00,
                "profit": 7000.00,
                "roi": 33.33,
            },
            {
                "period": "Week 2",
                "revenue": 31500.00,
                "costs": 23500.00,
                "profit": 8000.00,
                "roi": 34.04,
            },
            {
                "period": "Week 3",
                "revenue": 29500.00,
                "costs": 22000.00,
                "profit": 7500.00,
                "roi": 34.09,
            },
            {
                "period": "Week 4",
                "revenue": 36000.00,
                "costs": 26000.00,
                "profit": 10000.00,
                "roi": 38.46,
            },
        ]

        logger.info(f"Retrieved P&L for client {client_result['client_id']}")

        return {
            "revenue": total_revenue,
            "costs": total_costs,
            "profit": total_profit,
            "roi": roi,
            "by_period": by_period,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving P&L: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve P&L",
        )


@router.get(
    "/client-inventory",
    response_model=ClientInventoryResponse,
    summary="Client inventory status",
)
def get_client_inventory(
    portal_user_id: int,  # In production, extract from JWT
    db: Session = Depends(get_db),
):
    """
    Client's inventory status with FBA/FBM quantities.
    """
    try:
        # Get client info
        client_query = text("""
            SELECT client_id FROM client_portal_users WHERE id = :id
        """)

        client_result = db.execute(client_query, {
            "id": portal_user_id
        }).mappings().first()

        if not client_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        # Mock inventory data
        items = [
            {
                "asin": "B08N5Y5B3X",
                "title": "Premium Wireless Headphones",
                "fba_quantity": 450,
                "fbm_quantity": 120,
                "in_transit": 200,
                "status": "Active",
            },
            {
                "asin": "B07X8KDYR2",
                "title": "USB-C Charging Cable 3-Pack",
                "fba_quantity": 1200,
                "fbm_quantity": 450,
                "in_transit": 500,
                "status": "Active",
            },
            {
                "asin": "B09K4MNXQZ",
                "title": "Portable Phone Stand",
                "fba_quantity": 280,
                "fbm_quantity": 85,
                "in_transit": 150,
                "status": "Active",
            },
            {
                "asin": "B08RZ7VX9K",
                "title": "Laptop Cooling Pad",
                "fba_quantity": 0,
                "fbm_quantity": 0,
                "in_transit": 300,
                "status": "Restock Pending",
            },
            {
                "asin": "B07HRG8QKX",
                "title": "Wireless Mouse with Nano Receiver",
                "fba_quantity": 650,
                "fbm_quantity": 200,
                "in_transit": 0,
                "status": "Active",
            },
        ]

        total_units = sum(
            item["fba_quantity"] + item["fbm_quantity"] + item["in_transit"]
            for item in items
        )

        logger.info(f"Retrieved inventory for client {client_result['client_id']}")

        return {
            "total_units": total_units,
            "items": items,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving inventory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve inventory",
        )


@router.get(
    "/client-reports",
    response_model=List[RecentReport],
    summary="Client weekly/monthly reports",
)
def get_client_reports(
    portal_user_id: int,  # In production, extract from JWT
    db: Session = Depends(get_db),
):
    """
    Client's weekly and monthly performance reports.
    """
    try:
        # Get client info
        client_query = text("""
            SELECT client_id FROM client_portal_users WHERE id = :id
        """)

        client_result = db.execute(client_query, {
            "id": portal_user_id
        }).mappings().first()

        if not client_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        # Mock reports (last 8 weeks)
        reports = []
        for week in range(8, 0, -1):
            week_start = datetime.utcnow() - timedelta(days=week*7)
            week_end = week_start + timedelta(days=6)

            reports.append({
                "id": week,
                "week_start": week_start,
                "week_end": week_end,
                "total_sales": 28000 + (week * 500),
                "total_units": 400 + (week * 20),
                "roi": 2.3 + (week * 0.05),
            })

        logger.info(f"Retrieved reports for client {client_result['client_id']}")

        return reports

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving reports: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reports",
        )


@router.post(
    "/client-messages",
    response_model=ClientMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Client sends message to AM",
)
def send_client_message(
    request: ClientMessageCreate,
    portal_user_id: int,  # In production, extract from JWT
    db: Session = Depends(get_db),
):
    """
    Client sends a message to their account manager.
    """
    try:
        # Verify portal user
        user_query = text("""
            SELECT id, client_id, org_id FROM client_portal_users WHERE id = :id
        """)

        user_result = db.execute(user_query, {
            "id": portal_user_id
        }).mappings().first()

        if not user_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Create message
        create_query = text("""
            INSERT INTO client_messages (
                client_portal_user_id, org_id, subject, message,
                sender_type, is_read, created_at
            )
            VALUES (
                :portal_user_id, :org_id, :subject, :message,
                :sender_type, FALSE, :created_at
            )
            RETURNING id, subject, message, sender_type, is_read, created_at
        """)

        result = db.execute(create_query, {
            "portal_user_id": user_result["id"],
            "org_id": user_result["org_id"],
            "subject": request.subject,
            "message": request.message,
            "sender_type": SenderType.CLIENT.value,
            "created_at": datetime.utcnow(),
        })

        db.commit()

        msg = result.mappings().first()
        logger.info(f"Client {portal_user_id} sent message: {request.subject}")

        return {
            "id": msg["id"],
            "subject": msg["subject"],
            "message": msg["message"],
            "sender_type": msg["sender_type"],
            "is_read": msg["is_read"],
            "created_at": msg["created_at"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message",
        )


@router.get(
    "/client-messages",
    response_model=List[ClientMessageResponse],
    summary="Client message history",
)
def get_client_messages(
    portal_user_id: int,  # In production, extract from JWT
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    """
    Client's message history with account manager.
    """
    try:
        query = text("""
            SELECT id, subject, message, sender_type, is_read, created_at
            FROM client_messages
            WHERE client_portal_user_id = :portal_user_id
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :skip
        """)

        result = db.execute(query, {
            "portal_user_id": portal_user_id,
            "skip": skip,
            "limit": limit,
        })

        messages = result.mappings().all()
        logger.info(f"Retrieved {len(messages)} messages for client {portal_user_id}")

        return [dict(msg) for msg in messages]

    except Exception as e:
        logger.error(f"Error retrieving messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages",
        )


@router.get(
    "/client-profile",
    response_model=ClientProfile,
    summary="Client profile information",
)
def get_client_profile(
    portal_user_id: int,  # In production, extract from JWT
    db: Session = Depends(get_db),
):
    """
    Client's profile information and permissions.
    """
    try:
        # Get portal user
        user_query = text("""
            SELECT id, client_id, email, can_view_pnl, can_view_inventory,
                   can_view_reports, can_message, created_at, is_active
            FROM client_portal_users
            WHERE id = :id
        """)

        user_result = db.execute(user_query, {
            "id": portal_user_id
        }).mappings().first()

        if not user_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Get client info
        client_query = text("""
            SELECT name FROM clients WHERE id = :client_id
        """)

        client_result = db.execute(client_query, {
            "client_id": user_result["client_id"]
        }).mappings().first()

        # Mock account manager info
        account_manager_name = "Sarah Johnson"
        account_manager_email = "sarah.johnson@ecomera.com"

        logger.info(f"Retrieved profile for client {user_result['client_id']}")

        return {
            "client_id": user_result["client_id"],
            "client_name": client_result["name"] if client_result else "Unknown",
            "email": user_result["email"],
            "account_manager_name": account_manager_name,
            "account_manager_email": account_manager_email,
            "portal_created_at": user_result["created_at"],
            "is_active": user_result["is_active"],
            "permissions": {
                "can_view_pnl": user_result["can_view_pnl"],
                "can_view_inventory": user_result["can_view_inventory"],
                "can_view_reports": user_result["can_view_reports"],
                "can_message": user_result["can_message"],
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile",
        )
