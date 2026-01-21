"""
Weekly Vehicle Leasing Platform - Vehicle Request Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for customer vehicle requests.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class VehicleRequestStatus(str, PyEnum):
    """Vehicle request status."""
    PENDING = "pending"       # Customer submitted request
    REVIEWING = "reviewing"   # Admin is reviewing request
    APPROVED = "approved"     # Request approved, vehicle being assigned
    ASSIGNED = "assigned"     # Vehicle assigned to customer
    REJECTED = "rejected"     # Request rejected
    CANCELLED = "cancelled"   # Customer cancelled request


class VehiclePreference(str, PyEnum):
    """Vehicle type preference."""
    SEDAN = "sedan"
    SUV = "suv"
    LUXURY_SEDAN = "luxury_sedan"
    LUXURY_SUV = "luxury_suv"
    SPORTS = "sports"
    ANY = "any"


class VehicleRequest(Base):
    """
    Vehicle request from a customer.

    Customers with approved insurance can submit a vehicle request.
    Admin reviews and assigns a vehicle when available.
    """

    __tablename__ = "vehicle_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Customer reference (from CustomerProfile)
    customer_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Customer info snapshot (for quick display)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Request details
    status: Mapped[VehicleRequestStatus] = mapped_column(
        Enum(VehicleRequestStatus),
        default=VehicleRequestStatus.PENDING,
        nullable=False,
        index=True
    )

    # Vehicle preferences
    vehicle_preference: Mapped[VehiclePreference] = mapped_column(
        Enum(VehiclePreference),
        default=VehiclePreference.ANY,
        nullable=False
    )

    # Additional details
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Admin response
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # If a vehicle is assigned, store reference (optional - could be FK to Vehicle model)
    assigned_vehicle_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    assigned_vehicle_info: Mapped[str | None] = mapped_column(String(500), nullable=True)

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

    # Workflow timestamps
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<VehicleRequest(id={self.id}, customer='{self.customer_email}', status={self.status.value})>"
