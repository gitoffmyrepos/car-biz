"""
GigWheels - Lease Model
Weekly car rentals for gig drivers

SQLAlchemy model for customer vehicle leases.
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Integer, String, Text, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LeaseStatus(str, PyEnum):
    """Lease status."""
    ACTIVE = "active"           # Lease is currently active
    COMPLETED = "completed"     # Lease term completed
    TERMINATED = "terminated"   # Lease terminated early
    SUSPENDED = "suspended"     # Lease suspended (payment issues, etc.)


class Lease(Base):
    """
    Vehicle lease record.

    Tracks the assignment of a vehicle to a customer, including
    payment details and lease terms.
    """

    __tablename__ = "leases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Customer reference
    customer_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Vehicle request reference (if created from a request)
    vehicle_request_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("vehicle_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Vehicle information
    vehicle_make: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_model: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_year: Mapped[int] = mapped_column(Integer, nullable=False)
    vehicle_vin: Mapped[str | None] = mapped_column(String(17), nullable=True)
    vehicle_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    vehicle_license_plate: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Lease status
    status: Mapped[LeaseStatus] = mapped_column(
        Enum(LeaseStatus),
        default=LeaseStatus.ACTIVE,
        nullable=False,
        index=True
    )

    # Payment details
    weekly_payment: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    security_deposit: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )

    # Lease terms
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True  # Open-ended leases don't have end date
    )

    # Additional info
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

    # Termination info (if terminated)
    terminated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    termination_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Lease(id={self.id}, vehicle='{self.vehicle_year} {self.vehicle_make} {self.vehicle_model}', status={self.status.value})>"
