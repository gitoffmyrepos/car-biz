"""
GigWheels - Vehicle Condition Report Model
Weekly car rentals for gig drivers

SQLAlchemy model for vehicle condition reports.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import DateTime, Enum, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ConditionReportType(str, PyEnum):
    """Types of condition reports."""
    PRE_LEASE = "pre_lease"           # Before leasing to customer
    POST_LEASE = "post_lease"         # After customer returns vehicle
    PERIODIC = "periodic"             # Regular scheduled inspection
    INCIDENT = "incident"             # After an incident report
    MAINTENANCE = "maintenance"       # During/after maintenance
    ACQUISITION = "acquisition"       # When vehicle is first acquired


class OverallCondition(str, PyEnum):
    """Overall vehicle condition rating."""
    EXCELLENT = "excellent"           # Like new, no issues
    GOOD = "good"                     # Minor wear, fully operational
    FAIR = "fair"                     # Some issues, needs attention
    POOR = "poor"                     # Significant issues, needs repair
    NEEDS_REPAIR = "needs_repair"     # Cannot be leased until repaired


class VehicleConditionReport(Base):
    """
    Vehicle condition report record.

    Tracks detailed condition assessments of vehicles including
    mileage, damage notes, and photographic documentation.
    """

    __tablename__ = "vehicle_condition_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Vehicle reference
    vehicle_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Report type
    report_type: Mapped[ConditionReportType] = mapped_column(
        Enum(ConditionReportType),
        nullable=False,
        index=True
    )

    # Overall condition assessment
    overall_condition: Mapped[OverallCondition] = mapped_column(
        Enum(OverallCondition),
        nullable=False,
        index=True
    )

    # Mileage at time of report
    mileage: Mapped[int] = mapped_column(Integer, nullable=False)

    # Detailed condition notes
    exterior_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    interior_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mechanical_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    damage_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Specific damage areas (JSON for flexibility)
    # e.g., {"front_bumper": "scratch", "driver_door": "dent"}
    damage_details: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=dict
    )

    # Photos stored in MinIO (list of storage keys)
    photo_keys: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        default=list
    )

    # Fuel level (0-100%)
    fuel_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Tire condition (tread depth or condition description)
    tire_condition: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Admin who created the report
    created_by_id: Mapped[str] = mapped_column(String(255), nullable=False)  # Keycloak ID
    created_by_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Optional: link to lease if post-lease report
    lease_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("leases.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Optional: link to incident if incident-related report
    incident_report_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("incident_reports.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Admin notes
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    report_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
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
        return f"<VehicleConditionReport(id={self.id}, vehicle_id={self.vehicle_id}, type={self.report_type.value}, condition={self.overall_condition.value})>"
