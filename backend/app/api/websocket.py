"""
GigWheels - WebSocket API
Weekly car rentals for gig drivers

WebSocket endpoints for real-time notifications.
"""

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy import select, func

from app.core.database import async_session_maker
from app.models.notification import Notification
from app.models.customer_profile import CustomerProfile
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: str = Query(..., description="Access token for authentication"),
):
    """
    WebSocket endpoint for real-time notifications.

    Connect with: ws://host/api/ws/notifications?token=<access_token>

    Message types sent:
    - notification: New notification received
    - notification_count: Updated unread count
    - ping: Keep-alive message

    Message types received:
    - pong: Response to ping
    - mark_read: Mark notification as read (data: {notification_id: int})
    - mark_all_read: Mark all notifications as read
    """
    # Authenticate the WebSocket connection
    user_info = await websocket_manager.authenticate_websocket(token)

    if not user_info:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    # Check if user is a customer
    if not user_info.get("is_customer"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Not a customer account")
        return

    # Look up customer_profile_id from database using keycloak_id (sub)
    user_sub = user_info.get("sub")
    customer_profile_id = None

    async with async_session_maker() as session:
        result = await session.execute(
            select(CustomerProfile.id).where(CustomerProfile.keycloak_id == user_sub)
        )
        customer_profile_id = result.scalar_one_or_none()

    if not customer_profile_id:
        logger.warning(f"WebSocket: No customer profile found for user {user_sub}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Customer profile not found")
        return

    # Connect
    await websocket_manager.connect(websocket, customer_profile_id)

    try:
        # Send initial unread count
        async with async_session_maker() as session:
            unread_count = await session.scalar(
                select(func.count(Notification.id)).where(
                    Notification.customer_profile_id == customer_profile_id,
                    Notification.is_read == False,
                )
            )
            await websocket.send_json({
                "type": "notification_count",
                "data": {"unread_count": unread_count or 0}
            })

        # Start ping task to keep connection alive
        ping_task = asyncio.create_task(send_pings(websocket))

        try:
            # Listen for messages from client
            while True:
                data = await websocket.receive_json()
                await handle_client_message(websocket, customer_profile_id, data)

        except WebSocketDisconnect:
            logger.info(f"WebSocket client disconnected: customer {customer_profile_id}")
        finally:
            ping_task.cancel()
            try:
                await ping_task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.error(f"WebSocket error for customer {customer_profile_id}: {e}")
    finally:
        await websocket_manager.disconnect(websocket)


async def send_pings(websocket: WebSocket, interval: float = 30.0):
    """Send periodic ping messages to keep the connection alive."""
    try:
        while True:
            await asyncio.sleep(interval)
            await websocket.send_json({
                "type": "ping",
                "data": {"timestamp": datetime.now(timezone.utc).isoformat()}
            })
    except asyncio.CancelledError:
        pass
    except Exception:
        pass


async def handle_client_message(
    websocket: WebSocket,
    customer_profile_id: int,
    data: dict,
):
    """
    Handle messages received from the WebSocket client.

    Args:
        websocket: The WebSocket connection
        customer_profile_id: ID of the authenticated customer
        data: Message data from client
    """
    message_type = data.get("type")

    if message_type == "pong":
        # Client responding to ping, no action needed
        return

    elif message_type == "mark_read":
        # Mark a specific notification as read
        notification_id = data.get("data", {}).get("notification_id")
        if notification_id:
            async with async_session_maker() as session:
                notification = await session.get(Notification, notification_id)
                if notification and notification.customer_profile_id == customer_profile_id:
                    notification.mark_as_read()
                    await session.commit()

                    # Send updated count
                    unread_count = await session.scalar(
                        select(func.count(Notification.id)).where(
                            Notification.customer_profile_id == customer_profile_id,
                            Notification.is_read == False,
                        )
                    )
                    await websocket.send_json({
                        "type": "notification_count",
                        "data": {"unread_count": unread_count or 0}
                    })

    elif message_type == "mark_all_read":
        # Mark all notifications as read
        async with async_session_maker() as session:
            from sqlalchemy import update
            await session.execute(
                update(Notification)
                .where(
                    Notification.customer_profile_id == customer_profile_id,
                    Notification.is_read == False,
                )
                .values(is_read=True, read_at=datetime.now(timezone.utc))
            )
            await session.commit()

            # Send updated count (should be 0)
            await websocket.send_json({
                "type": "notification_count",
                "data": {"unread_count": 0}
            })

    else:
        logger.warning(f"Unknown WebSocket message type: {message_type}")
