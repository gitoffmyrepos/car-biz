"""
GigWheels - Inquiry Model
Weekly car rentals for gig drivers

SQLAlchemy model for customer inquiries/contact form submissions.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PreferredContactMethod(str, PyEnum):
    """Preferred contact method options."""
    EMAIL = "email"
    PHONE = "phone"
    EITHER = "either"


class VehicleType(str, PyEnum):
    """Vehicle type interest options."""
    SEDAN = "sedan"
    SUV = "suv"
    TRUCK = "truck"
    SPORTS = "sports"
    LUXURY = "luxury"
    ANY = "any"


class Timeframe(str, PyEnum):
    """Inquiry timeframe options."""
    IMMEDIATE = "immediate"
    THIS_WEEK = "this_week"
    THIS_MONTH = "this_month"
    JUST_BROWSING = "just_browsing"


class InquiryStatus(str, PyEnum):
    """Inquiry processing status."""
    NEW = "new"
    CONTACTED = "contacted"
    IN_PROGRESS = "in_progress"
    CONVERTED = "converted"
    CLOSED = "closed"


class Inquiry(Base):
    """
    Customer inquiry/contact form submission.

    Stores all inquiries submitted through the contact page
    for follow-up by the sales team.
    """

    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Contact information
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    preferred_contact: Mapped[PreferredContactMethod] = mapped_column(
        Enum(PreferredContactMethod),
        default=PreferredContactMethod.EITHER,
        nullable=False
    )

    # Inquiry details
    vehicle_type: Mapped[VehicleType] = mapped_column(
        Enum(VehicleType),
        default=VehicleType.ANY,
        nullable=False
    )
    timeframe: Mapped[Timeframe] = mapped_column(
        Enum(Timeframe),
        default=Timeframe.JUST_BROWSING,
        nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Processing status
    status: Mapped[InquiryStatus] = mapped_column(
        Enum(InquiryStatus),
        default=InquiryStatus.NEW,
        nullable=False,
        index=True
    )

    # Metadata
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

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
        return f"<Inquiry(id={self.id}, email='{self.email}', status='{self.status}')>"
