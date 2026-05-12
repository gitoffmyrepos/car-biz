"""
Weekly Vehicle Leasing Platform - Weekly Invoice Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for weekly invoices and payment tracking.
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Integer, String, Text, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InvoiceStatus(str, PyEnum):
    """Invoice payment status."""
    PENDING = "pending"                    # Invoice generated, payment not yet due
    DUE = "due"                            # Payment is now due
    VERIFICATION_IN_PROGRESS = "verification_in_progress"  # Payment proof uploaded, awaiting verification
    PAID = "paid"                          # Payment verified and approved
    LATE = "late"                          # Payment is past due
    REJECTED = "rejected"                  # Payment proof rejected, needs resubmission
    WAIVED = "waived"                      # Invoice waived by admin
    CANCELLED = "cancelled"                # Invoice cancelled


class WeeklyInvoice(Base):
    """
    Weekly invoice for a lease.

    Tracks weekly payment obligations for active leases,
    including payment proof uploads and verification status.
    """

    __tablename__ = "weekly_invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # References
    lease_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("leases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    customer_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Invoice details
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)  # Week of the lease

    # Amounts
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    late_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Dates
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Status
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus),
        default=InvoiceStatus.PENDING,
        nullable=False,
        index=True
    )

    # Payment proof
    payment_proof_key: Mapped[str | None] = mapped_column(String(500), nullable=True)  # MinIO storage key
    payment_proof_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)  # For duplicate detection
    payment_proof_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)  # zelle, cashapp, cash, etc.

    # Verification
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Admin who verified
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Late tracking
    is_late: Mapped[bool] = mapped_column(Boolean, default=False)
    late_fee_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    days_late: Mapped[int] = mapped_column(Integer, default=0)

    # Duplicate detection
    is_duplicate_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_invoice_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # ID of original invoice with same hash
    duplicate_flagged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Reminder tracking
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_count: Mapped[int] = mapped_column(Integer, default=0)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

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
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<WeeklyInvoice(id={self.id}, invoice_number='{self.invoice_number}', amount={self.total_amount}, status={self.status.value})>"

    def apply_late_fee(self, fee_amount: Decimal) -> None:
        """Apply late fee to the invoice."""
        self.late_fee = fee_amount
        self.total_amount = self.amount + fee_amount
        self.is_late = True
        self.late_fee_applied_at = datetime.now(timezone.utc)

    def mark_as_paid(self, verified_by: str, notes: str | None = None) -> None:
        """Mark invoice as paid after verification."""
        self.status = InvoiceStatus.PAID
        self.verified_at = datetime.now(timezone.utc)
        self.verified_by_id = verified_by
        self.verification_notes = notes
        self.paid_at = datetime.now(timezone.utc)

    def mark_as_rejected(self, reason: str, verified_by: str) -> None:
        """Reject payment proof."""
        self.status = InvoiceStatus.REJECTED
        self.rejection_reason = reason
        self.verified_at = datetime.now(timezone.utc)
        self.verified_by_id = verified_by
