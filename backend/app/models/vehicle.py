"""
Weekly Vehicle Leasing Platform - Vehicle Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for fleet vehicles.
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Integer, String, Text, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.vehicle_image import VehicleImage


class VehicleStatus(str, PyEnum):
    """Vehicle availability status."""
    AVAILABLE = "available"           # Available for leasing
    LEASED = "leased"                 # Currently leased to a customer
    MAINTENANCE = "maintenance"       # In maintenance/repair
    UNAVAILABLE = "unavailable"       # Not available (other reasons)
    PENDING_INSPECTION = "pending_inspection"  # Awaiting inspection


class VehicleCondition(str, PyEnum):
    """Vehicle condition rating."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    NEEDS_REPAIR = "needs_repair"


class Vehicle(Base):
    """
    Fleet vehicle record.

    Tracks vehicles in the fleet, their availability status,
    condition, and assignment details.
    """

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Vehicle identification
    vin: Mapped[str] = mapped_column(String(17), unique=True, nullable=False, index=True)
    license_plate: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Vehicle details
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    body_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # sedan, suv, etc.

    # Engine/specs
    engine: Mapped[str | None] = mapped_column(String(100), nullable=True)
    transmission: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Pricing
    weekly_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("150.00")
    )
    security_deposit: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )

    # Status and condition
    status: Mapped[VehicleStatus] = mapped_column(
        Enum(VehicleStatus),
        default=VehicleStatus.AVAILABLE,
        nullable=False,
        index=True
    )
    condition: Mapped[VehicleCondition] = mapped_column(
        Enum(VehicleCondition),
        default=VehicleCondition.GOOD,
        nullable=False
    )

    # Acquisition info (salvage/auction)
    acquisition_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acquisition_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    acquisition_source: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Copart, IAAI, etc.
    repair_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    # Current assignment
    current_lease_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    current_tracker_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    # Image (stored in MinIO) - denormalized primary key for back-compat
    image_key: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Multi-image gallery (ordered, with a primary flag). Cascade-deletes with the vehicle.
    images: Mapped[list["VehicleImage"]] = relationship(
        "VehicleImage",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        order_by="VehicleImage.sort_order",
    )

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_on_fleet_page: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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
        return f"<Vehicle(id={self.id}, vin='{self.vin}', {self.year} {self.make} {self.model}, status={self.status.value})>"
