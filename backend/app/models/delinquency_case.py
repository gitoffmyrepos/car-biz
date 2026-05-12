"""
Weekly Vehicle Leasing Platform - Delinquency Case Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for tracking delinquent payment cases and recovery actions.
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import DateTime, Enum, Integer, String, Text, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DelinquencyStatus(str, PyEnum):
    """Delinquency case status."""
    OPEN = "open"                      # Case just opened (Day 1)
    ESCALATED = "escalated"            # Escalated (Day 2+)
    PAYMENT_PLAN = "payment_plan"      # Customer on payment plan
    RECOVERY_PENDING = "recovery_pending"  # Recovery action scheduled
    VEHICLE_RECOVERED = "vehicle_recovered"  # Vehicle has been recovered
    RESOLVED = "resolved"              # Case resolved (paid or settled)
    CLOSED = "closed"                  # Case closed (written off, etc.)


class EscalationLevel(str, PyEnum):
    """Escalation level for delinquency cases."""
    LEVEL_1 = "level_1"        # Day 1: Initial late notice
    LEVEL_2 = "level_2"        # Day 2: Escalation notice
    LEVEL_3 = "level_3"        # Day 3: Final warning
    LEVEL_4 = "level_4"        # Day 7+: Recovery authorization
    LEVEL_5 = "level_5"        # Day 14+: Tow scheduled


class DelinquencyCase(Base):
    """
    Delinquency case for tracking late payments and recovery actions.

    Created automatically when an invoice becomes late, tracks the
    escalation timeline and resolution process.
    """

    __tablename__ = "delinquency_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # References
    customer_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    invoice_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("weekly_invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    lease_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("leases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Case identifiers
    case_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)

    # Status
    status: Mapped[DelinquencyStatus] = mapped_column(
        Enum(DelinquencyStatus),
        default=DelinquencyStatus.OPEN,
        nullable=False,
        index=True
    )
    escalation_level: Mapped[EscalationLevel] = mapped_column(
        Enum(EscalationLevel),
        default=EscalationLevel.LEVEL_1,
        nullable=False,
        index=True
    )

    # Financial details
    amount_owed: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    late_fees_accumulated: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    total_owed: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    remaining_balance: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Timeline
    days_delinquent: Mapped[int] = mapped_column(Integer, default=1)
    delinquent_since: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_escalation_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_escalation_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Contact attempts
    contact_attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_contact_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_contact_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # phone, email, sms

    # Recovery tracking
    recovery_authorized: Mapped[bool] = mapped_column(Boolean, default=False)
    recovery_authorized_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recovery_authorized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    tow_scheduled: Mapped[bool] = mapped_column(Boolean, default=False)
    tow_scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    vehicle_recovered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Resolution
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resolution_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # paid, settled, written_off, recovered
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Notes and history
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Assigned to (for case management)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Admin email
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Priority
    is_priority: Mapped[bool] = mapped_column(Boolean, default=False)

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
        return f"<DelinquencyCase(id={self.id}, case_number='{self.case_number}', status={self.status.value}, days={self.days_delinquent})>"

    def escalate(self, new_level: EscalationLevel) -> None:
        """Escalate the case to a new level."""
        self.escalation_level = new_level
        self.last_escalation_at = datetime.now(timezone.utc)
        if new_level in [EscalationLevel.LEVEL_2, EscalationLevel.LEVEL_3]:
            self.status = DelinquencyStatus.ESCALATED

    def authorize_recovery(self, authorized_by: str) -> None:
        """Authorize vehicle recovery."""
        self.recovery_authorized = True
        self.recovery_authorized_by = authorized_by
        self.recovery_authorized_at = datetime.now(timezone.utc)
        self.status = DelinquencyStatus.RECOVERY_PENDING

    def schedule_tow(self, scheduled_at: datetime) -> None:
        """Schedule a tow for the vehicle."""
        self.tow_scheduled = True
        self.tow_scheduled_at = scheduled_at
        self.escalation_level = EscalationLevel.LEVEL_5

    def mark_vehicle_recovered(self) -> None:
        """Mark the vehicle as recovered."""
        self.vehicle_recovered_at = datetime.now(timezone.utc)
        self.status = DelinquencyStatus.VEHICLE_RECOVERED
        self.tow_scheduled = False

    def record_contact(self, method: str) -> None:
        """Record a contact attempt."""
        self.contact_attempts += 1
        self.last_contact_at = datetime.now(timezone.utc)
        self.last_contact_method = method

    def record_payment(self, amount: Decimal) -> None:
        """Record a partial or full payment."""
        self.amount_paid += amount
        self.remaining_balance = self.total_owed - self.amount_paid
        if self.remaining_balance <= 0:
            self.resolve(resolution_type="paid")

    def resolve(self, resolution_type: str, resolved_by: str | None = None, notes: str | None = None) -> None:
        """Resolve the delinquency case."""
        self.status = DelinquencyStatus.RESOLVED
        self.resolved_at = datetime.now(timezone.utc)
        self.resolved_by = resolved_by
        self.resolution_type = resolution_type
        self.resolution_notes = notes

    def close(self, notes: str | None = None) -> None:
        """Close the case (e.g., written off)."""
        self.status = DelinquencyStatus.CLOSED
        self.resolution_notes = notes
