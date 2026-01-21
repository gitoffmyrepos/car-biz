"""
Weekly Vehicle Leasing Platform - Ban Record Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for tracking customer bans.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BanReason(str, PyEnum):
    """Reasons for customer ban."""
    RECOVERY_ACTION = "recovery_action"  # Banned due to vehicle recovery
    FRAUD = "fraud"  # Fraudulent activity detected
    POLICY_VIOLATION = "policy_violation"  # Violation of terms of service
    NON_PAYMENT = "non_payment"  # Persistent non-payment
    ABUSE = "abuse"  # Abuse of staff or property
    OTHER = "other"  # Other reason (details in notes)


class BanStatus(str, PyEnum):
    """Status of the ban."""
    ACTIVE = "active"  # Ban is currently in effect
    LIFTED = "lifted"  # Ban has been lifted (rare, requires approval)
    EXPIRED = "expired"  # Temporary ban that has expired


class BanRecord(Base):
    """
    Record of customer bans.

    Tracks permanent or temporary bans issued to customers,
    including the reason, related case details, and any
    appeal or lift history.
    """

    __tablename__ = "ban_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Customer relationship
    customer_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Ban details
    ban_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )
    reason: Mapped[BanReason] = mapped_column(
        Enum(BanReason),
        nullable=False,
        index=True
    )
    reason_details: Mapped[str] = mapped_column(Text, nullable=False)

    # Ban characteristics
    is_permanent: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[BanStatus] = mapped_column(
        Enum(BanStatus),
        default=BanStatus.ACTIVE,
        nullable=False,
        index=True
    )

    # Related entities (optional)
    delinquency_case_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("delinquency_cases.id", ondelete="SET NULL"),
        nullable=True
    )
    recovery_action_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("recovery_actions.id", ondelete="SET NULL"),
        nullable=True
    )
    lease_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("leases.id", ondelete="SET NULL"),
        nullable=True
    )

    # Issuing admin
    issued_by: Mapped[str] = mapped_column(String(255), nullable=False)
    issued_by_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Optional expiration (for temporary bans)
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Customer notification tracking
    customer_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    customer_notified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Lift details (if ban is ever lifted)
    lifted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    lifted_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    lifted_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Admin notes
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<BanRecord(id={self.id}, ban_number='{self.ban_number}', reason='{self.reason.value}', permanent={self.is_permanent}, status='{self.status.value}')>"

    def notify_customer(self) -> None:
        """Mark customer as notified of ban."""
        self.customer_notified = True
        self.customer_notified_at = datetime.now(timezone.utc)

    def lift_ban(self, lifted_by: str, reason: str) -> None:
        """Lift the ban with reason and admin details."""
        self.status = BanStatus.LIFTED
        self.lifted_at = datetime.now(timezone.utc)
        self.lifted_by = lifted_by
        self.lifted_reason = reason
