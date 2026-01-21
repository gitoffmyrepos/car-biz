"""
Weekly Vehicle Leasing Platform - Notification Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for customer notifications (in-app).
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class NotificationType(str, PyEnum):
    """Types of notifications sent to customers."""
    # Payment related
    PAYMENT_DUE_REMINDER = "payment_due_reminder"
    PAYMENT_OVERDUE = "payment_overdue"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_VERIFIED = "payment_verified"
    PAYMENT_REJECTED = "payment_rejected"

    # Insurance related
    INSURANCE_PENDING = "insurance_pending"
    INSURANCE_APPROVED = "insurance_approved"
    INSURANCE_REJECTED = "insurance_rejected"
    INSURANCE_EXPIRING = "insurance_expiring"
    INSURANCE_EXPIRED = "insurance_expired"

    # Vehicle related
    VEHICLE_REQUEST_RECEIVED = "vehicle_request_received"
    VEHICLE_REQUEST_APPROVED = "vehicle_request_approved"
    VEHICLE_REQUEST_REJECTED = "vehicle_request_rejected"
    VEHICLE_ASSIGNED = "vehicle_assigned"
    VEHICLE_MAINTENANCE_SCHEDULED = "vehicle_maintenance_scheduled"

    # Account related
    WELCOME = "welcome"
    PROFILE_UPDATED = "profile_updated"
    ACCOUNT_VERIFIED = "account_verified"

    # Lease related
    LEASE_CREATED = "lease_created"
    LEASE_ENDING = "lease_ending"
    LEASE_TERMINATED = "lease_terminated"

    # Delinquency related
    LATE_PAYMENT_WARNING = "late_payment_warning"
    DELINQUENCY_ESCALATION = "delinquency_escalation"
    RECOVERY_NOTICE = "recovery_notice"

    # General
    GENERAL_INFO = "general_info"
    SYSTEM_MAINTENANCE = "system_maintenance"


class NotificationPriority(str, PyEnum):
    """Priority levels for notifications."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    """
    In-app notification for customers.

    Stores notification content, read status, and metadata for
    displaying important events to customers in the notification center.
    """

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Customer relationship
    customer_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Notification content
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Priority and status
    priority: Mapped[NotificationPriority] = mapped_column(
        Enum(NotificationPriority),
        default=NotificationPriority.NORMAL,
        nullable=False
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Related entity (optional link to relevant record)
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    related_entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Action link (optional URL path for "View Details")
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    action_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # Expiration (optional - some notifications may expire)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationship to CustomerProfile (optional, for eager loading)
    # customer_profile = relationship("CustomerProfile", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type='{self.notification_type.value}', customer_id={self.customer_profile_id}, read={self.is_read})>"

    def mark_as_read(self) -> None:
        """Mark notification as read with timestamp."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.now(timezone.utc)
