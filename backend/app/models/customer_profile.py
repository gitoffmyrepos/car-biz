"""
Weekly Vehicle Leasing Platform - Customer Profile Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for customer profiles.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InsuranceStatus(str, PyEnum):
    """Insurance verification status."""
    NOT_UPLOADED = "not_uploaded"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class CustomerProfile(Base):
    """
    Customer profile information.

    Stores additional customer information beyond what's in Keycloak,
    including verification status and contact preferences.
    """

    __tablename__ = "customer_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Keycloak user ID (sub claim from JWT)
    keycloak_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    # Contact information
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(50), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Driver's license info (minimal - actual doc stored in MinIO)
    drivers_license_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    drivers_license_state: Mapped[str | None] = mapped_column(String(2), nullable=True)

    # Insurance status
    insurance_status: Mapped[InsuranceStatus] = mapped_column(
        Enum(InsuranceStatus),
        default=InsuranceStatus.NOT_UPLOADED,
        nullable=False
    )
    insurance_document_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    insurance_expiration_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Account status
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ban_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Preferences
    notification_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_sms: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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
        return f"<CustomerProfile(id={self.id}, email='{self.email}', verified={self.is_verified})>"
