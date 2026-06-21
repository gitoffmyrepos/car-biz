"""
GigWheels - Vehicle Image Model
Weekly car rentals for gig drivers

SQLAlchemy model for the multi-image gallery attached to a fleet vehicle.

A dedicated table (not a JSON column) gives us cheap per-image ordering,
a primary-image flag, and per-image delete without re-serializing the whole
gallery on every edit.
"""

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle


class VehicleImage(Base):
    """A single gallery image for a vehicle, stored in the public images bucket."""

    __tablename__ = "vehicle_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    vehicle_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Object key within the public vehicle-images bucket (MinIO/S3)
    image_key: Mapped[str] = mapped_column(String(512), nullable=False)

    # Ordering within the gallery (ascending). Lower = earlier.
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Exactly one image per vehicle should carry the primary flag (enforced in API layer).
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship back to the owning vehicle.
    vehicle: Mapped["Vehicle"] = relationship(  # noqa: F821
        "Vehicle",
        back_populates="images",
    )

    def __repr__(self) -> str:
        return (
            f"<VehicleImage(id={self.id}, vehicle_id={self.vehicle_id}, "
            f"key='{self.image_key}', sort_order={self.sort_order}, "
            f"is_primary={self.is_primary})>"
        )
