"""
GigWheels - WebSocket Manager
Weekly car rentals for gig drivers

WebSocket connection manager for real-time notifications.
Handles client connections, authentication, and message broadcasting.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import WebSocket, HTTPException

from app.core.auth import oidc_auth

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time notifications.

    Features:
    - Authenticated WebSocket connections via JWT
    - Per-customer connection tracking
    - Broadcast to specific customer or all customers
    - Automatic cleanup on disconnect
    - Heartbeat/ping support
    """

    def __init__(self):
        # Maps customer_profile_id to list of WebSocket connections
        # A customer may have multiple connections (different tabs/devices)
        self._active_connections: dict[int, list[WebSocket]] = {}
        # Maps WebSocket to customer_profile_id for quick lookup
        self._websocket_to_customer: dict[WebSocket, int] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

    async def authenticate_websocket(self, token: str) -> Optional[dict]:
        """
        Validate token and return user info.

        Uses the same OIDC authenticator as the REST API to support
        both production (OIDC/JWT) and development (dev:role:email) tokens.

        Args:
            token: Access token (JWT or dev token)

        Returns:
            User info dict if valid, None otherwise
        """
        try:
            # Use the OIDC authenticator which handles both dev and production tokens
            user = await oidc_auth.validate_token(token)

            # Return user info as dict for WebSocket processing
            return {
                "sub": user.sub,
                "email": user.email,
                "name": user.name,
                "roles": user.roles,
                "is_customer": user.is_customer,
                # customer_profile_id will be looked up separately
            }
        except HTTPException as e:
            logger.warning(f"WebSocket auth failed: {e.detail}")
            return None
        except Exception as e:
            logger.warning(f"WebSocket auth failed: {e}")
            return None

    async def connect(self, websocket: WebSocket, customer_profile_id: int) -> bool:
        """
        Accept a WebSocket connection and register it.

        Args:
            websocket: The WebSocket connection
            customer_profile_id: ID of the authenticated customer

        Returns:
            True if connection accepted, False otherwise
        """
        async with self._lock:
            await websocket.accept()

            if customer_profile_id not in self._active_connections:
                self._active_connections[customer_profile_id] = []

            self._active_connections[customer_profile_id].append(websocket)
            self._websocket_to_customer[websocket] = customer_profile_id

            logger.info(
                f"WebSocket connected for customer {customer_profile_id}. "
                f"Total connections for customer: {len(self._active_connections[customer_profile_id])}"
            )

            return True

    async def disconnect(self, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection on disconnect.

        Args:
            websocket: The WebSocket connection to remove
        """
        async with self._lock:
            customer_id = self._websocket_to_customer.pop(websocket, None)

            if customer_id is not None and customer_id in self._active_connections:
                connections = self._active_connections[customer_id]
                if websocket in connections:
                    connections.remove(websocket)

                # Clean up empty connection lists
                if not connections:
                    del self._active_connections[customer_id]

                logger.info(f"WebSocket disconnected for customer {customer_id}")

    async def send_to_customer(
        self,
        customer_profile_id: int,
        message: dict[str, Any]
    ) -> int:
        """
        Send a message to all connections for a specific customer.

        Args:
            customer_profile_id: Target customer ID
            message: Message dict to send

        Returns:
            Number of connections message was sent to
        """
        sent_count = 0

        async with self._lock:
            connections = self._active_connections.get(customer_profile_id, [])
            disconnected = []

            for websocket in connections:
                try:
                    await websocket.send_json(message)
                    sent_count += 1
                except Exception as e:
                    logger.warning(f"Failed to send to customer {customer_profile_id}: {e}")
                    disconnected.append(websocket)

            # Clean up failed connections
            for ws in disconnected:
                if ws in connections:
                    connections.remove(ws)
                    self._websocket_to_customer.pop(ws, None)

        return sent_count

    async def send_notification(
        self,
        customer_profile_id: int,
        notification_id: int,
        notification_type: str,
        title: str,
        message: str,
        priority: str = "normal",
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
    ) -> int:
        """
        Send a notification to a customer via WebSocket.

        Args:
            customer_profile_id: Target customer ID
            notification_id: ID of the notification record
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            priority: Priority level
            action_url: Optional action URL
            action_label: Optional action label

        Returns:
            Number of connections message was sent to
        """
        notification_data = {
            "type": "notification",
            "data": {
                "id": notification_id,
                "notification_type": notification_type,
                "title": title,
                "message": message,
                "priority": priority,
                "action_url": action_url,
                "action_label": action_label,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_read": False,
            }
        }

        return await self.send_to_customer(customer_profile_id, notification_data)

    async def send_notification_count_update(
        self,
        customer_profile_id: int,
        unread_count: int,
    ) -> int:
        """
        Send updated unread notification count to a customer.

        Args:
            customer_profile_id: Target customer ID
            unread_count: Number of unread notifications

        Returns:
            Number of connections message was sent to
        """
        message = {
            "type": "notification_count",
            "data": {
                "unread_count": unread_count,
            }
        }

        return await self.send_to_customer(customer_profile_id, message)

    async def broadcast_to_all(self, message: dict[str, Any]) -> int:
        """
        Broadcast a message to all connected customers.

        Args:
            message: Message dict to broadcast

        Returns:
            Total number of connections message was sent to
        """
        total_sent = 0

        async with self._lock:
            for customer_id, connections in list(self._active_connections.items()):
                disconnected = []

                for websocket in connections:
                    try:
                        await websocket.send_json(message)
                        total_sent += 1
                    except Exception:
                        disconnected.append(websocket)

                # Clean up failed connections
                for ws in disconnected:
                    if ws in connections:
                        connections.remove(ws)
                        self._websocket_to_customer.pop(ws, None)

        return total_sent

    def get_connection_count(self, customer_profile_id: Optional[int] = None) -> int:
        """
        Get the number of active connections.

        Args:
            customer_profile_id: If provided, count only for this customer

        Returns:
            Number of active connections
        """
        if customer_profile_id is not None:
            return len(self._active_connections.get(customer_profile_id, []))
        return sum(len(conns) for conns in self._active_connections.values())

    def is_customer_connected(self, customer_profile_id: int) -> bool:
        """Check if a customer has any active WebSocket connections."""
        return (
            customer_profile_id in self._active_connections
            and len(self._active_connections[customer_profile_id]) > 0
        )


# Singleton instance
websocket_manager = ConnectionManager()
