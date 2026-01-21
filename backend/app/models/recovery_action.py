"""
Weekly Vehicle Leasing Platform - Recovery Action Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for tracking vehicle recovery actions with tow vendor details.
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import DateTime, Enum, Integer, String, Text, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RecoveryStatus(str, PyEnum):
    """Status of a recovery action."""
    TOW_REQUESTED = "tow_requested"      # Recovery authorized, tow requested
    TOW_SCHEDULED = "tow_scheduled"      # Tow vendor has scheduled pickup
    IN_PROGRESS = "in_progress"          # Tow in progress
    VEHICLE_RECOVERED = "vehicle_recovered"  # Vehicle successfully recovered
    FAILED = "failed"                    # Recovery attempt failed
    CANCELLED = "cancelled"              # Recovery cancelled


class RecoveryAction(Base):
    """
    Recovery action for tracking vehicle repossession attempts.

    Created when admin authorizes recovery for a delinquency case.
    Tracks the entire recovery process from authorization to vehicle pickup.
    """

    __tablename__ = "recovery_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # References
    delinquency_case_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("delinquency_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    customer_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    lease_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("leases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    vehicle_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Case identifiers
    action_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)

    # Status
    status: Mapped[RecoveryStatus] = mapped_column(
        Enum(RecoveryStatus),
        default=RecoveryStatus.TOW_REQUESTED,
        nullable=False,
        index=True
    )

    # Authorization details (from compliance gate)
    authorized_by: Mapped[str] = mapped_column(String(255), nullable=False)
    authorization_reason: Mapped[str] = mapped_column(Text, nullable=False)
    contract_version: Mapped[str] = mapped_column(String(100), nullable=False)
    authorization_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Tow vendor details (manual entry)
    tow_vendor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tow_vendor_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tow_vendor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tow_vendor_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Vendor's job/reference number
    tow_vendor_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tow_vendor_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Scheduling
    tow_scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    tow_pickup_location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tow_destination: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Where vehicle will be taken

    # Financial
    estimated_tow_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    actual_tow_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Recovery outcomes
    vehicle_recovered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    recovery_completed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vehicle_condition_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mileage_at_recovery: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Failed/Cancelled tracking
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancelled_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Customer notification
    customer_notified: Mapped[bool] = mapped_column(Boolean, default=False)
    customer_notified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Lease termination
    lease_terminated: Mapped[bool] = mapped_column(Boolean, default=False)
    lease_terminated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Ban tracking
    customer_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    ban_record_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Notes
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<RecoveryAction(id={self.id}, action_number='{self.action_number}', status={self.status.value})>"

    def update_tow_vendor(
        self,
        vendor_name: str,
        vendor_phone: str | None = None,
        vendor_email: str | None = None,
        vendor_reference: str | None = None,
        vendor_address: str | None = None,
        vendor_notes: str | None = None,
    ) -> None:
        """Update tow vendor details."""
        self.tow_vendor_name = vendor_name
        self.tow_vendor_phone = vendor_phone
        self.tow_vendor_email = vendor_email
        self.tow_vendor_reference = vendor_reference
        self.tow_vendor_address = vendor_address
        self.tow_vendor_notes = vendor_notes

    def schedule_tow(
        self,
        scheduled_at: datetime,
        pickup_location: str | None = None,
        destination: str | None = None,
        estimated_cost: Decimal | None = None,
    ) -> None:
        """Schedule the tow pickup."""
        self.status = RecoveryStatus.TOW_SCHEDULED
        self.tow_scheduled_at = scheduled_at
        self.tow_pickup_location = pickup_location
        self.tow_destination = destination
        self.estimated_tow_cost = estimated_cost

    def mark_in_progress(self) -> None:
        """Mark recovery as in progress."""
        self.status = RecoveryStatus.IN_PROGRESS

    def mark_recovered(
        self,
        completed_by: str,
        condition_notes: str | None = None,
        mileage: int | None = None,
        actual_cost: Decimal | None = None,
    ) -> None:
        """Mark vehicle as recovered."""
        self.status = RecoveryStatus.VEHICLE_RECOVERED
        self.vehicle_recovered_at = datetime.now(timezone.utc)
        self.recovery_completed_by = completed_by
        self.vehicle_condition_notes = condition_notes
        self.mileage_at_recovery = mileage
        self.actual_tow_cost = actual_cost

    def mark_failed(self, reason: str) -> None:
        """Mark recovery attempt as failed."""
        self.status = RecoveryStatus.FAILED
        self.failure_reason = reason

    def cancel(self, cancelled_by: str, reason: str) -> None:
        """Cancel the recovery action."""
        self.status = RecoveryStatus.CANCELLED
        self.cancelled_by = cancelled_by
        self.cancelled_at = datetime.now(timezone.utc)
        self.cancellation_reason = reason

    def notify_customer(self) -> None:
        """Mark customer as notified."""
        self.customer_notified = True
        self.customer_notified_at = datetime.now(timezone.utc)

    def terminate_lease(self) -> None:
        """Mark lease as terminated due to recovery."""
        self.lease_terminated = True
        self.lease_terminated_at = datetime.now(timezone.utc)

    def record_ban(self, ban_record_id: int) -> None:
        """Record that customer was banned."""
        self.customer_banned = True
        self.ban_record_id = ban_record_id
