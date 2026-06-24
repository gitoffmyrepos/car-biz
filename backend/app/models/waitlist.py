"""
GigWheels - Waitlist Model
Weekly car rentals for gig drivers

Pre-launch waitlist: captures interested DRIVERS and car OWNERS while the fleet is
being prepared. Owners declare their vehicle(s) and which gig-business categories
they'd let their car be used for. Entries sync to EspoCRM as Leads for outreach.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WaitlistRole(str, PyEnum):
    """Which side of the marketplace the signup is for."""
    DRIVER = "driver"   # wants to rent a car and drive
    OWNER = "owner"     # owns car(s) and wants passive income


class BusinessCategory(str, PyEnum):
    """Gig-business categories an owner will allow their car to be used for."""
    RIDE_SHARING = "ride_sharing"        # Uber, Lyft, Bolt
    FOOD_DELIVERY = "food_delivery"      # DoorDash, Uber Eats, Grubhub
    PACKAGE_DELIVERY = "package_delivery"  # Amazon Flex, courier, last-mile
    GROCERY_DELIVERY = "grocery_delivery"  # Instacart, Shipt
    OTHER = "other"


class WaitlistStatus(str, PyEnum):
    """Lead processing status."""
    NEW = "new"
    CONTACTED = "contacted"
    CONVERTED = "converted"
    CLOSED = "closed"


class WaitlistEntry(Base):
    """A pre-launch waitlist signup (driver or owner)."""

    __tablename__ = "waitlist_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    role: Mapped[WaitlistRole] = mapped_column(Enum(WaitlistRole), nullable=False, index=True)

    # Contact
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Owner-only vehicle details (null for drivers)
    vehicle_make: Mapped[str | None] = mapped_column(String(80), nullable=True)
    vehicle_model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    vehicle_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vehicle_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vehicle_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # Owner-selected gig categories (list of BusinessCategory values). Multi-select.
    business_categories: Mapped[list | None] = mapped_column(JSON, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[WaitlistStatus] = mapped_column(
        Enum(WaitlistStatus), default=WaitlistStatus.NEW, nullable=False, index=True
    )

    # CRM sync
    synced_to_crm: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    crm_lead_id: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # Metadata
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self) -> str:
        return f"<WaitlistEntry(id={self.id}, role='{self.role}', email='{self.email}')>"
