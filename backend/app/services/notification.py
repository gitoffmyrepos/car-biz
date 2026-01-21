"""
Weekly Vehicle Leasing Platform - Notification Service
Salvage-to-Lux Fleet Management

Service for creating and managing customer notifications.
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType, NotificationPriority

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and managing customer notifications."""

    async def create_notification(
        self,
        db: AsyncSession,
        customer_profile_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None,
    ) -> Notification:
        """
        Create a new notification for a customer.

        Args:
            db: Database session
            customer_profile_id: ID of the customer profile
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            priority: Priority level (default: NORMAL)
            action_url: Optional URL for action button
            action_label: Optional label for action button
            related_entity_type: Optional type of related entity
            related_entity_id: Optional ID of related entity

        Returns:
            Created Notification object
        """
        notification = Notification(
            customer_profile_id=customer_profile_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            action_url=action_url,
            action_label=action_label,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )

        db.add(notification)
        await db.flush()
        await db.refresh(notification)

        logger.info(
            f"Created notification {notification.id} for customer {customer_profile_id}: {title}"
        )

        return notification

    async def create_welcome_notification(
        self, db: AsyncSession, customer_profile_id: int, customer_name: str
    ) -> Notification:
        """Create a welcome notification for new customers."""
        return await self.create_notification(
            db=db,
            customer_profile_id=customer_profile_id,
            notification_type=NotificationType.WELCOME,
            title="Welcome to FX Weekly!",
            message=f"Welcome {customer_name}! We're excited to have you. Start by uploading your insurance documentation to get verified.",
            priority=NotificationPriority.HIGH,
            action_url="/profile",
            action_label="Complete Profile",
        )

    async def create_insurance_pending_notification(
        self, db: AsyncSession, customer_profile_id: int
    ) -> Notification:
        """Create notification when insurance is uploaded and pending review."""
        return await self.create_notification(
            db=db,
            customer_profile_id=customer_profile_id,
            notification_type=NotificationType.INSURANCE_PENDING,
            title="Insurance Document Received",
            message="We've received your insurance documentation. Our team will review it within 48 hours.",
            priority=NotificationPriority.NORMAL,
            action_url="/profile",
            action_label="View Status",
        )

    async def create_insurance_approved_notification(
        self, db: AsyncSession, customer_profile_id: int
    ) -> Notification:
        """Create notification when insurance is approved."""
        return await self.create_notification(
            db=db,
            customer_profile_id=customer_profile_id,
            notification_type=NotificationType.INSURANCE_APPROVED,
            title="Insurance Approved!",
            message="Great news! Your insurance documentation has been verified. You can now request a vehicle.",
            priority=NotificationPriority.HIGH,
            action_url="/vehicle-request",
            action_label="Request Vehicle",
        )

    async def create_insurance_rejected_notification(
        self, db: AsyncSession, customer_profile_id: int, reason: str
    ) -> Notification:
        """Create notification when insurance is rejected."""
        return await self.create_notification(
            db=db,
            customer_profile_id=customer_profile_id,
            notification_type=NotificationType.INSURANCE_REJECTED,
            title="Insurance Document Issue",
            message=f"There was an issue with your insurance documentation: {reason}. Please upload a new document.",
            priority=NotificationPriority.URGENT,
            action_url="/profile",
            action_label="Upload New Document",
        )

    async def create_vehicle_request_received_notification(
        self, db: AsyncSession, customer_profile_id: int, request_id: int
    ) -> Notification:
        """Create notification when vehicle request is submitted."""
        return await self.create_notification(
            db=db,
            customer_profile_id=customer_profile_id,
            notification_type=NotificationType.VEHICLE_REQUEST_RECEIVED,
            title="Vehicle Request Submitted",
            message="Your vehicle request has been submitted and is being reviewed by our team.",
            priority=NotificationPriority.NORMAL,
            action_url="/vehicle-request",
            action_label="View Request",
            related_entity_type="vehicle_request",
            related_entity_id=request_id,
        )

    async def create_vehicle_assigned_notification(
        self, db: AsyncSession, customer_profile_id: int, vehicle_info: str, lease_id: int
    ) -> Notification:
        """Create notification when a vehicle is assigned."""
        return await self.create_notification(
            db=db,
            customer_profile_id=customer_profile_id,
            notification_type=NotificationType.VEHICLE_ASSIGNED,
            title="Vehicle Assigned!",
            message=f"Great news! You've been assigned a {vehicle_info}. Check your dashboard for details.",
            priority=NotificationPriority.HIGH,
            action_url="/dashboard",
            action_label="View Vehicle",
            related_entity_type="lease",
            related_entity_id=lease_id,
        )

    async def create_payment_due_notification(
        self, db: AsyncSession, customer_profile_id: int, amount: float, due_date: str
    ) -> Notification:
        """Create notification for upcoming payment due."""
        return await self.create_notification(
            db=db,
            customer_profile_id=customer_profile_id,
            notification_type=NotificationType.PAYMENT_DUE_REMINDER,
            title="Payment Reminder",
            message=f"Your weekly payment of ${amount:.2f} is due on {due_date}. Upload your payment proof to verify.",
            priority=NotificationPriority.HIGH,
            action_url="/payments",
            action_label="View Payment",
        )

    async def create_payment_verified_notification(
        self, db: AsyncSession, customer_profile_id: int, amount: float
    ) -> Notification:
        """Create notification when payment is verified."""
        return await self.create_notification(
            db=db,
            customer_profile_id=customer_profile_id,
            notification_type=NotificationType.PAYMENT_VERIFIED,
            title="Payment Confirmed",
            message=f"Your payment of ${amount:.2f} has been verified. Thank you!",
            priority=NotificationPriority.NORMAL,
            action_url="/payments",
            action_label="View History",
        )


# Singleton instance
notification_service = NotificationService()
