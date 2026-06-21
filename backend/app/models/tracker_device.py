"""
GigWheels - Tracker Device Model
Weekly car rentals for gig drivers

SQLAlchemy model for GPS tracker devices inventory and management.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TrackerStatus(str, PyEnum):
    """GPS tracker device status."""
    AVAILABLE = "available"         # In inventory, ready to assign
    ASSIGNED = "assigned"           # Currently assigned to a vehicle
    MAINTENANCE = "maintenance"     # Under maintenance/repair
    DECOMMISSIONED = "decommissioned"  # No longer in use
    LOST = "lost"                   # Lost or stolen


class TrackerDevice(Base):
    """
    GPS Tracker Device record.

    Tracks GPS tracker inventory, their assignment status,
    and device details for fleet management.
    """

    __tablename__ = "tracker_devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Device identification
    device_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    serial_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    # Device details
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    firmware_version: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # SIM/connectivity info
    sim_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sim_carrier: Mapped[str | None] = mapped_column(String(50), nullable=True)
    imei: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Status
    status: Mapped[TrackerStatus] = mapped_column(
        Enum(TrackerStatus),
        default=TrackerStatus.AVAILABLE,
        nullable=False,
        index=True
    )

    # Current assignment
    assigned_vehicle_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    assigned_vehicle_info: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Denormalized for display
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Last known location (if available from provider)
    last_latitude: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_longitude: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_location_update: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_checkin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Provider info
    provider_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # GPS provider name
    provider_device_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Provider's device ID

    # Acquisition info
    purchase_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    purchase_cost: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Store as string to avoid decimal issues
    warranty_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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
        return f"<TrackerDevice(id={self.id}, device_id='{self.device_id}', model='{self.model}', status={self.status.value})>"
