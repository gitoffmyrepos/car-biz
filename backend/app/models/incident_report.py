"""
Weekly Vehicle Leasing Platform - Incident Report Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for customer incident reports.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import DateTime, Enum, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IncidentType(str, PyEnum):
    """Types of incidents that can be reported."""
    ACCIDENT = "accident"               # Vehicle collision or accident
    BREAKDOWN = "breakdown"             # Mechanical breakdown
    THEFT = "theft"                     # Vehicle theft
    VANDALISM = "vandalism"             # Vandalism damage
    FLAT_TIRE = "flat_tire"             # Flat tire
    LOCKOUT = "lockout"                 # Locked out of vehicle
    WARNING_LIGHT = "warning_light"     # Dashboard warning light
    BODY_DAMAGE = "body_damage"         # Body/cosmetic damage
    OTHER = "other"                     # Other incident


class IncidentSeverity(str, PyEnum):
    """Severity levels for incidents."""
    LOW = "low"             # Minor issue, vehicle still operational
    MEDIUM = "medium"       # Moderate issue, may affect operation
    HIGH = "high"           # Serious issue, vehicle may be inoperable
    CRITICAL = "critical"   # Critical issue, safety concern


class IncidentStatus(str, PyEnum):
    """Status of incident reports."""
    SUBMITTED = "submitted"       # Report submitted, pending review
    UNDER_REVIEW = "under_review" # Admin is reviewing
    IN_PROGRESS = "in_progress"   # Being handled/resolved
    RESOLVED = "resolved"         # Issue resolved
    CLOSED = "closed"             # Report closed


class IncidentReport(Base):
    """
    Customer incident report record.

    Tracks incidents reported by customers during their lease period,
    including photos and resolution details.
    """

    __tablename__ = "incident_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Customer reference
    customer_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Lease reference (which lease the incident is for)
    lease_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("leases.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Customer info (denormalized for quick access)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Incident details
    incident_type: Mapped[IncidentType] = mapped_column(
        Enum(IncidentType),
        nullable=False,
        index=True
    )
    severity: Mapped[IncidentSeverity] = mapped_column(
        Enum(IncidentSeverity),
        default=IncidentSeverity.MEDIUM,
        nullable=False,
        index=True
    )
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(IncidentStatus),
        default=IncidentStatus.SUBMITTED,
        nullable=False,
        index=True
    )

    # Incident description
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Location (optional)
    location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Date/time of incident
    incident_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    # Photos stored in MinIO (list of storage keys)
    photo_keys: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        default=list
    )

    # Admin handling
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Admin keycloak_id
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<IncidentReport(id={self.id}, type={self.incident_type.value}, status={self.status.value})>"
