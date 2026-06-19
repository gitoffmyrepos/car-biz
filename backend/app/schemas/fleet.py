"""
Weekly Vehicle Leasing Platform - Public Fleet Schemas
Salvage-to-Lux Fleet Management

Pydantic response schemas for the public fleet inventory API.
"""

from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class FleetSort(str, Enum):
    """Supported sort orders for the public fleet listing."""

    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    YEAR_DESC = "year_desc"


class FleetImage(BaseModel):
    """A single public gallery image (public-readable URL)."""

    id: int
    url: str
    sort_order: int
    is_primary: bool


class FleetVehicleSummary(BaseModel):
    """Summary view of a vehicle for the public fleet grid."""

    id: int
    year: int
    make: str
    model: str
    body_type: Optional[str] = None
    transmission: Optional[str] = None
    mileage: Optional[int] = None
    weekly_rate: Decimal
    security_deposit: Optional[Decimal] = None
    status: str
    primary_image_url: Optional[str] = Field(
        None, description="Public URL of the primary gallery image, if any"
    )

    class Config:
        from_attributes = True


class FleetVehicleDetail(FleetVehicleSummary):
    """Detail view of a vehicle: summary plus the full ordered gallery."""

    color: Optional[str] = None
    engine: Optional[str] = None
    condition: str
    images: list[FleetImage] = Field(default_factory=list)
