"""
WebSocket Manager Module
Real-time notification system for FBA Wholesale SaaS platform
Handles connections, broadcasts, and event distribution
"""

import json
import logging
from typing import Dict, List, Set
from datetime import datetime, timedelta

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from jose import jwt

from config import settings
from auth import get_current_user, tenant_session
from database import get_db
from models import User, Organization

logger = logging.getLogger(__name__)

# Event type constants
EVENT_TYPES = {
    "price_alert": "price_alert",
    "stock_alert": "stock_alert",
    "bsr_change": "bsr_change",
    "scout_complete": "scout_complete",
    "report_ready": "report_ready",
    "system_message": "system_message",
}


class ConnectionManager:
    """Manages WebSocket connections per organization and user"""

    def __init__(self):
        # Structure: {org_id: {user_id: [websocket, websocket, ...]}}
        self.active_connections: Dict[int, Dict[int, List[WebSocket]]] = {}
        self.connection_metadata: Dict[WebSocket, Dict] = {}

    async def connect(self, websocket: WebSocket, org_id: int, user_id: int):
        """Register a new WebSocket connection"""
        await websocket.accept()

        if org_id not in self.active_connections:
            self.active_connections[org_id] = {}

        if user_id not in self.active_connections[org_id]:
            self.active_connections[org_id][user_id] = []

        self.active_connections[org_id][user_id].append(websocket)
        self.connection_metadata[websocket] = {
            "org_id": org_id,
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
        }

        logger.info(f"User {user_id} connected to org {org_id}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket not in self.connection_metadata:
            return

        metadata = self.connection_metadata[websocket]
        org_id = metadata["org_id"]
        user_id = metadata["user_id"]

        if org_id in self.active_connections and user_id in self.active_connections[org_id]:
            self.active_connections[org_id][user_id].remove(websocket)

            # Clean up empty lists
            if not self.active_connections[org_id][user_id]:
                del self.active_connections[org_id][user_id]

            if not self.active_connections[org_id]:
                del self.active_connections[org_id]

        del self.connection_metadata[websocket]
        logger.info(f"User {user_id} disconnected from org {org_id}")

    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")

    async def broadcast_to_user(self, org_id: int, user_id: int, message: dict):
        """Broadcast a message to all connections for a specific user"""
        if org_id not in self.active_connections:
            return

        if user_id not in self.active_connections[org_id]:
            return

        connections = self.active_connections[org_id][user_id].copy()
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to user {user_id}: {e}")
                self.disconnect(websocket)

    async def broadcast_to_org(self, org_id: int, message: dict, exclude_user_id: int = None):
        """Broadcast a message to all connections in an organization"""
        if org_id not in self.active_connections:
            return

        for user_id, connections in self.active_connections[org_id].items():
            if exclude_user_id and user_id == exclude_user_id:
                continue

            connections_copy = connections.copy()
            for websocket in connections_copy:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send to user {user_id}: {e}")
                    self.disconnect(websocket)

    def get_org_connection_count(self, org_id: int) -> int:
        """Get the number of active connections in an organization"""
        if org_id not in self.active_connections:
            return 0

        total = 0
        for connections in self.active_connections[org_id].values():
            total += len(connections)

        return total

    def get_user_connection_count(self, org_id: int, user_id: int) -> int:
        """Get the number of active connections for a specific user"""
        if org_id not in self.active_connections:
            return 0

        if user_id not in self.active_connections[org_id]:
            return 0

        return len(self.active_connections[org_id][user_id])


# Global connection manager instance
manager = ConnectionManager()


def decode_token(token: str) -> dict:
    """Decode and validate JWT token from URL"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


async def notify_user(user_id: int, org_id: int, event_type: str, data: dict):
    """
    Helper function to notify a specific user
    Can be imported and used by other modules
    """
    if event_type not in EVENT_TYPES:
        logger.warning(f"Unknown event type: {event_type}")
        return

    message = {
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data,
    }

    await manager.broadcast_to_user(org_id, user_id, message)


async def notify_org(org_id: int, event_type: str, data: dict, exclude_user_id: int = None):
    """
    Helper function to notify all members of an organization
    Can be imported and used by other modules
    """
    if event_type not in EVENT_TYPES:
        logger.warning(f"Unknown event type: {event_type}")
        return

    message = {
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data,
    }

    await manager.broadcast_to_org(org_id, message, exclude_user_id)


# Initialize router
router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db=Depends(get_db)):
    """
    WebSocket endpoint for real-time notifications
    Authentication via JWT token in URL parameter
    """
    try:
        # Decode and validate token
        payload = decode_token(token)
        user_id = payload.get("sub")
        org_id = payload.get("org_id")

        if not user_id or not org_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Verify user exists and is active
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Connect and start listening
        await manager.connect(websocket, org_id, user_id)

        # Send connection confirmation
        await manager.send_personal(websocket, {
            "event_type": "connection_established",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"user_id": user_id, "org_id": org_id},
        })

        try:
            while True:
                # Keep connection alive and receive heartbeat/ping messages
                data = await websocket.receive_text()
                message = json.loads(data)

                # Handle ping/heartbeat
                if message.get("type") == "ping":
                    await manager.send_personal(websocket, {
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat(),
                    })

        except WebSocketDisconnect:
            manager.disconnect(websocket)
            logger.info(f"WebSocket disconnected for user {user_id}")

    except ValueError as e:
        logger.warning(f"WebSocket authentication failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=status.WS_1011_SERVER_ERROR)
        except Exception:
            pass


@router.get("/status")
async def get_connection_status(
    current_user: User = Depends(tenant_session),
    db=Depends(get_db)
):
    """
    Get real-time connection statistics for the organization
    Returns the number of active connections
    """
    org_id = current_user.org_id
    connection_count = manager.get_org_connection_count(org_id)
    user_connection_count = manager.get_user_connection_count(org_id, current_user.id)

    return {
        "success": True,
        "org_connection_count": connection_count,
        "user_connection_count": user_connection_count,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/broadcast")
async def broadcast_message(
    message_data: dict,
    current_user: User = Depends(tenant_session),
    db=Depends(get_db)
):
    """
    Broadcast a system message to all connected members of the organization
    Requires admin or owner role
    """
    # Check authorization
    if current_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can broadcast messages"
        )

    org_id = current_user.org_id
    event_type = message_data.get("event_type", "system_message")
    data = message_data.get("data", {})

    # Validate event type
    if event_type not in EVENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event type. Must be one of: {', '.join(EVENT_TYPES.keys())}"
        )

    # Add sender information
    data["sent_by"] = current_user.email
    data["sent_by_id"] = current_user.id

    # Broadcast to organization
    await notify_org(org_id, event_type, data)

    return {
        "success": True,
        "message": "Broadcast sent to all connected members",
        "org_id": org_id,
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
    }
