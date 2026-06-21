"""
GigWheels - MaintenanceSchedule Model
Weekly car rentals for gig drivers

SQLAlchemy model for vehicle maintenance scheduling.
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Integer, String, Text, Boolean, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MaintenanceType(str, PyEnum):
    """Types of maintenance."""
    OIL_CHANGE = "oil_change"
    TIRE_ROTATION = "tire_rotation"
    TIRE_REPLACEMENT = "tire_replacement"
    BRAKE_SERVICE = "brake_service"
    INSPECTION = "inspection"
    FLUID_CHECK = "fluid_check"
    FILTER_REPLACEMENT = "filter_replacement"
    BATTERY_SERVICE = "battery_service"
    AC_SERVICE = "ac_service"
    TRANSMISSION_SERVICE = "transmission_service"
    ENGINE_REPAIR = "engine_repair"
    BODY_REPAIR = "body_repair"
    DETAILING = "detailing"
    RECALL_SERVICE = "recall_service"
    OTHER = "other"


class MaintenanceStatus(str, PyEnum):
    """Maintenance schedule status."""
    SCHEDULED = "scheduled"      # Maintenance is planned
    IN_PROGRESS = "in_progress"  # Maintenance is being performed
    COMPLETED = "completed"      # Maintenance is done
    CANCELLED = "cancelled"      # Maintenance was cancelled
    OVERDUE = "overdue"         # Past scheduled date but not done


class MaintenancePriority(str, PyEnum):
    """Maintenance priority level."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class MaintenanceSchedule(Base):
    """
    Vehicle maintenance schedule record.

    Tracks scheduled and completed maintenance for fleet vehicles,
    including service type, costs, and completion details.
    """

    __tablename__ = "maintenance_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Vehicle reference
    vehicle_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Maintenance details
    maintenance_type: Mapped[MaintenanceType] = mapped_column(
        Enum(MaintenanceType),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scheduling
    scheduled_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    estimated_duration_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Status and priority
    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus),
        default=MaintenanceStatus.SCHEDULED,
        nullable=False,
        index=True
    )
    priority: Mapped[MaintenancePriority] = mapped_column(
        Enum(MaintenancePriority),
        default=MaintenancePriority.MEDIUM,
        nullable=False
    )

    # Service provider
    service_provider: Mapped[str | None] = mapped_column(String(200), nullable=True)
    service_location: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Costs
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    actual_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    # Mileage tracking
    mileage_at_service: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_service_mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Completion details
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    completion_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Admin tracking
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Flags
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurrence_interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requires_vehicle_offline: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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
        return f"<MaintenanceSchedule(id={self.id}, vehicle_id={self.vehicle_id}, type={self.maintenance_type.value}, status={self.status.value})>"

    def mark_in_progress(self) -> None:
        """Mark maintenance as in progress."""
        self.status = MaintenanceStatus.IN_PROGRESS
        self.updated_at = datetime.now(timezone.utc)

    def mark_completed(
        self,
        completed_by: str,
        actual_cost: Decimal | None = None,
        mileage: int | None = None,
        notes: str | None = None
    ) -> None:
        """Mark maintenance as completed."""
        self.status = MaintenanceStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        self.completed_by = completed_by
        if actual_cost is not None:
            self.actual_cost = actual_cost
        if mileage is not None:
            self.mileage_at_service = mileage
        if notes is not None:
            self.completion_notes = notes
        self.updated_at = datetime.now(timezone.utc)

    def cancel(self, reason: str | None = None) -> None:
        """Cancel the maintenance schedule."""
        self.status = MaintenanceStatus.CANCELLED
        if reason:
            self.admin_notes = f"Cancelled: {reason}"
        self.updated_at = datetime.now(timezone.utc)
