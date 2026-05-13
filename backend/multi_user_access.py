"""
Multi-User Access & RBAC (Role-Based Access Control) Module
For Amazon Wholesale SaaS Platform (Ecom Era)

Manages user accounts, roles, permissions, and org-scoped access control.
"""

from datetime import datetime
from typing import List, Optional
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text, desc
from sqlalchemy.orm import Session

from auth import get_current_user, require_role, hash_password, tenant_session, validate_password
from models import User, Organization
from database import get_db
from audit_logs import record_audit


# ============================================================================
# ENUMS & CONSTANTS
# ============================================================================

class RoleEnum(str, Enum):
    """Role hierarchy: owner > admin > manager > viewer"""
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"


ROLE_HIERARCHY = {
    RoleEnum.OWNER: 4,
    RoleEnum.ADMIN: 3,
    RoleEnum.MANAGER: 2,
    RoleEnum.VIEWER: 1,
}

ROLE_PERMISSIONS = {
    RoleEnum.OWNER: {
        "manage_users": True,
        "manage_billing": True,
        "manage_settings": True,
        "view_analytics": True,
        "manage_products": True,
        "manage_orders": True,
        "view_reports": True,
        "manage_organization": True,
    },
    RoleEnum.ADMIN: {
        "manage_users": True,
        "manage_billing": False,
        "manage_settings": False,
        "view_analytics": True,
        "manage_products": True,
        "manage_orders": True,
        "view_reports": True,
        "manage_organization": False,
    },
    RoleEnum.MANAGER: {
        "manage_users": False,
        "manage_billing": False,
        "manage_settings": False,
        "view_analytics": True,
        "manage_products": True,
        "manage_orders": True,
        "view_reports": True,
        "manage_organization": False,
    },
    RoleEnum.VIEWER: {
        "manage_users": False,
        "manage_billing": False,
        "manage_settings": False,
        "view_analytics": True,
        "manage_products": False,
        "manage_orders": False,
        "view_reports": True,
        "manage_organization": False,
    },
}


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class RolePermissionSchema(BaseModel):
    """Schema for role with permissions"""
    role_name: str
    description: str
    permissions: dict

    class Config:
        from_attributes = True


class UserBaseSchema(BaseModel):
    """Base user schema"""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    role: RoleEnum


class UserCreateSchema(UserBaseSchema):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8)
    avatar: Optional[str] = None


class UserUpdateSchema(BaseModel):
    """Schema for updating user details"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None


class UserResponseSchema(BaseModel):
    """Schema for user response"""
    id: int
    name: str
    email: str
    username: str
    role: str
    is_active: bool
    avatar: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserListResponseSchema(BaseModel):
    """Schema for listing users"""
    total: int
    users: List[UserResponseSchema]


class ProfileUpdateSchema(BaseModel):
    """Schema for updating own profile"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    avatar: Optional[str] = None


class PasswordChangeSchema(BaseModel):
    """Schema for changing password"""
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)


class PasswordResetSchema(BaseModel):
    """Schema for resetting user password"""
    new_password: str = Field(..., min_length=8)


class TeamStatsSchema(BaseModel):
    """Schema for team statistics"""
    total_users: int
    active_users: int
    users_by_role: dict
    recent_logins: List[dict]


# ============================================================================
# ROUTER SETUP
# ============================================================================

router = APIRouter(prefix="/user-management", tags=["user-management"])

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def check_role_hierarchy(actor_role: str, target_role: str, action: str = "change") -> bool:
    """
    Check if actor can perform action on target role.
    Returns True if allowed, False otherwise.
    """
    actor_level = ROLE_HIERARCHY.get(actor_role, 0)
    target_level = ROLE_HIERARCHY.get(target_role, 0)

    if action == "change":
        # Can only change roles of lower or equal hierarchy
        return actor_level > target_level

    return False


def verify_email_unique(db: Session, email: str, org_id: int, exclude_user_id: Optional[int] = None) -> bool:
    """Check if email is unique in organization"""
    query = db.query(User).filter(
        User.org_id == org_id,
        User.email == email.lower(),
    )
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)

    return query.first() is None


def verify_username_unique(db: Session, username: str, org_id: int, exclude_user_id: Optional[int] = None) -> bool:
    """Check if username is unique in organization"""
    query = db.query(User).filter(
        User.org_id == org_id,
        User.username == username.lower(),
    )
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)

    return query.first() is None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/users", response_model=UserListResponseSchema)
def list_users(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    List all users in the organization.
    Only owner/admin can access.
    """
    # Check authorization
    if current_user.role not in [RoleEnum.OWNER, RoleEnum.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner or admin can view users",
        )

    # Get all users in org
    total = db.query(User).filter(User.org_id == current_user.org_id).count()

    users = db.query(User).filter(
        User.org_id == current_user.org_id,
    ).order_by(desc(User.created_at)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "is_active": u.is_active,
                "avatar": u.avatar,
                "created_at": u.created_at,
                "last_login": u.last_login,
            }
            for u in users
        ],
    }


@router.post("/users", response_model=UserResponseSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreateSchema,
    request: Request,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Invite/create new user in the organization.
    - Only owner can create admin
    - Admin can create manager/viewer
    - Validate email/username uniqueness and role hierarchy
    """
    # Check authorization
    if current_user.role == RoleEnum.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot create users",
        )

    # Role hierarchy check
    if user_data.role == RoleEnum.ADMIN and current_user.role != RoleEnum.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can create admin users",
        )

    if user_data.role == RoleEnum.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create additional owner users",
        )

    # Validate email uniqueness
    if not verify_email_unique(db, user_data.email, current_user.org_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists in organization",
        )

    # Validate username uniqueness
    if not verify_username_unique(db, user_data.username, current_user.org_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists in organization",
        )
    ok, reason = validate_password(user_data.password)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)
    # Create user
    new_user = User(
        org_id=current_user.org_id,
        name=user_data.name,
        email=user_data.email.lower(),
        username=user_data.username.lower(),
        password_hash=hash_password(user_data.password),
        password_changed_at=datetime.utcnow(),
        role=user_data.role,
        avatar=user_data.avatar,
        is_active=True,
        created_at=datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit(
        db, request, current_user,
        action="user.create", resource_type="user",
        resource_id=new_user.id,
        after={"username": new_user.username, "email": new_user.email, "role": new_user.role},
    )

    return UserResponseSchema.from_orm(new_user)


@router.get("/users/{user_id}", response_model=UserResponseSchema)
def get_user(
    user_id: int,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """Get user details"""
    user = db.query(User).filter(
        User.id == user_id,
        User.org_id == current_user.org_id,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponseSchema.from_orm(user)


@router.put("/users/{user_id}", response_model=UserResponseSchema)
def update_user(
    user_id: int,
    user_data: UserUpdateSchema,
    request: Request,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Update user details (name, email, role, is_active).
    Role change rules:
    - Owner can change anyone
    - Admin can change manager/viewer only
    - No one can demote owner
    """
    # Check authorization
    if current_user.role not in [RoleEnum.OWNER, RoleEnum.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner or admin can update users",
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.org_id == current_user.org_id,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    before = {"name": user.name, "email": user.email, "role": user.role, "is_active": user.is_active}

    # Prevent demoting owner
    if user.role == RoleEnum.OWNER and user_data.role and user_data.role != RoleEnum.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change owner role",
        )

    # Check role change authorization
    if user_data.role and user_data.role != user.role:
        if current_user.role == RoleEnum.ADMIN and user.role != RoleEnum.MANAGER and user.role != RoleEnum.VIEWER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin can only change manager/viewer roles",
            )

        if not check_role_hierarchy(current_user.role, user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change role to higher privilege level",
            )

    # Validate email uniqueness if changing
    if user_data.email and user_data.email.lower() != user.email:
        if not verify_email_unique(db, user_data.email, current_user.org_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists in organization",
            )
        user.email = user_data.email.lower()

    # Update fields
    if user_data.name:
        user.name = user_data.name
    if user_data.role:
        user.role = user_data.role
    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    db.commit()
    db.refresh(user)

    record_audit(
        db, request, current_user,
        action="user.update", resource_type="user",
        resource_id=user_id,
        before=before,
        after={"name": user.name, "email": user.email, "role": user.role, "is_active": user.is_active},
    )

    return UserResponseSchema.from_orm(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Deactivate user (soft delete — set is_active=False).
    Cannot deactivate yourself or the owner.
    """
    # Check authorization
    if current_user.role not in [RoleEnum.OWNER, RoleEnum.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner or admin can deactivate users",
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.org_id == current_user.org_id,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent self-deactivation
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself",
        )

    # Prevent deactivating owner
    if user.role == RoleEnum.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate owner",
        )

    user.is_active = False
    db.commit()

    record_audit(
        db, request, current_user,
        action="user.deactivate", resource_type="user",
        resource_id=user_id,
        before={"is_active": True},
        after={"is_active": False},
    )

@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    password_data: PasswordResetSchema,
    request: Request,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Reset user's password.
    Only owner/admin can reset others' passwords.
    """
    # Check authorization
    if current_user.role not in [RoleEnum.OWNER, RoleEnum.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner or admin can reset passwords",
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.org_id == current_user.org_id,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    ok, reason = validate_password(password_data.new_password)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    # Reset password
    user.password_hash = hash_password(password_data.new_password)
    user.password_changed_at = datetime.utcnow()
    db.commit()

    record_audit(
        db, request, current_user,
        action="user.password_reset", resource_type="user",
        resource_id=user_id,
    )

    return {"message": "Password reset successfully"}


@router.put("/profile", response_model=UserResponseSchema)
def update_profile(
    profile_data: ProfileUpdateSchema,
    request: Request,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Update own profile (current user).
    Can update: name, email, avatar
    """
    before = {"name": current_user.name, "email": current_user.email, "avatar": current_user.avatar}

    # Validate email uniqueness if changing
    if profile_data.email and profile_data.email.lower() != current_user.email:
        if not verify_email_unique(db, profile_data.email, current_user.org_id, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists in organization",
            )
        current_user.email = profile_data.email.lower()

    # Update fields
    if profile_data.name:
        current_user.name = profile_data.name
    if profile_data.avatar is not None:
        current_user.avatar = profile_data.avatar

    db.commit()
    db.refresh(current_user)

    record_audit(
        db, request, current_user,
        action="user.profile_update", resource_type="user",
        resource_id=current_user.id,
        before=before,
        after={"name": current_user.name, "email": current_user.email, "avatar": current_user.avatar},
    )

    return UserResponseSchema.from_orm(current_user)


@router.put("/change-password")
def change_password(
    password_data: PasswordChangeSchema,
    request: Request,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Change own password.
    Validates current password before changing.
    """
    from auth import verify_password  # Import verify function

    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Prevent using same password
    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    ok, reason = validate_password(password_data.new_password)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    # Update password
    current_user.password_hash = hash_password(password_data.new_password)
    current_user.password_changed_at = datetime.utcnow()
    db.commit()

    record_audit(
        db, request, current_user,
        action="user.password_change", resource_type="user",
        resource_id=current_user.id,
    )

    return {"message": "Password changed successfully"}


@router.get("/roles", response_model=List[RolePermissionSchema])
def list_roles():
    """
    List available roles with their permissions.
    Output: role_name, description, permissions list
    """
    role_descriptions = {
        RoleEnum.OWNER: "Full access to everything, can manage all users, billing, and settings",
        RoleEnum.ADMIN: "Can manage users (except owner), view all data, manage operations",
        RoleEnum.MANAGER: "Can manage products, clients, orders, reports — no user management",
        RoleEnum.VIEWER: "Read-only access to dashboards and reports",
    }

    roles = []
    for role in RoleEnum:
        roles.append({
            "role_name": role.value,
            "description": role_descriptions[role],
            "permissions": ROLE_PERMISSIONS[role],
        })

    return roles


@router.get("/stats", response_model=TeamStatsSchema)
def get_team_stats(
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Get team statistics.
    Output: total_users, active_users, users_by_role, recent_logins
    """
    # Get total users
    total_users = db.query(User).filter(
        User.org_id == current_user.org_id,
    ).count()

    # Get active users
    active_users = db.query(User).filter(
        User.org_id == current_user.org_id,
        User.is_active == True,
    ).count()

    # Get users by role
    users_by_role = {}
    for role in RoleEnum:
        count = db.query(User).filter(
            User.org_id == current_user.org_id,
            User.role == role.value,
        ).count()
        users_by_role[role.value] = count

    # Get recent logins (last 7 days)
    recent_logins = db.query(User).filter(
        User.org_id == current_user.org_id,
        User.last_login != None,
    ).order_by(desc(User.last_login)).limit(10).all()

    recent_logins_list = [
        {
            "user_id": u.id,
            "name": u.name,
            "email": u.email,
            "last_login": u.last_login,
        }
        for u in recent_logins
    ]

    return {
        "total_users": total_users,
        "active_users": active_users,
        "users_by_role": users_by_role,
        "recent_logins": recent_logins_list,
    }


@router.post("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    request: Request,
    current_user: User = Depends(tenant_session),
    db: Session = Depends(get_db),
):
    """
    Toggle user active/inactive status.
    Cannot toggle yourself or the owner.
    """
    # Check authorization
    if current_user.role not in [RoleEnum.OWNER, RoleEnum.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner or admin can toggle user status",
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.org_id == current_user.org_id,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent self-toggle
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot toggle your own status",
        )

    # Prevent toggling owner
    if user.role == RoleEnum.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot toggle owner status",
        )

    # Toggle status
    previous_state = user.is_active
    user.is_active = not user.is_active
    db.commit()

    record_audit(
        db, request, current_user,
        action="user.toggle_active", resource_type="user",
        resource_id=user_id,
        before={"is_active": previous_state},
        after={"is_active": user.is_active},
    )

    return {
        "message": f"User {'activated' if user.is_active else 'deactivated'} successfully",
        "is_active": user.is_active,
    }
