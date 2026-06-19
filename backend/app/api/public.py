"""
Weekly Vehicle Leasing Platform - Public API Routes
Salvage-to-Lux Fleet Management

Public API endpoints that don't require authentication.

Exposes the public fleet inventory: list (with filters + sort) and per-car
detail (with the full ordered image gallery). Image URLs are public-readable
(CDN / presigned / local route) so the frontend can render them directly.
"""

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.vehicle_image import VehicleImage
from app.schemas.fleet import (
    FleetImage,
    FleetSort,
    FleetVehicleDetail,
    FleetVehicleSummary,
)
from app.services.storage import storage_service

router = APIRouter(prefix="/public", tags=["Public"])


class FleetCategoryResponse(BaseModel):
    """Aggregated fleet category information."""

    category: str
    display_name: str
    count: int
    available_count: int


def _image_public_url(image: VehicleImage) -> str:
    """Build a public-readable URL for a gallery image."""
    return storage_service.generate_public_url(
        bucket=settings.S3_BUCKET_VEHICLE_IMAGES,
        key=image.image_key,
    )


def _primary_image_url(vehicle: Vehicle) -> Optional[str]:
    """
    Resolve the primary image URL for a vehicle.

    Prefers the gallery image flagged is_primary; falls back to the first
    gallery image by sort order; finally falls back to the denormalized
    legacy vehicle.image_key (served from the private vehicles bucket route).
    """
    images = list(vehicle.images or [])
    if images:
        primary = next((img for img in images if img.is_primary), None)
        chosen = primary or min(images, key=lambda i: i.sort_order)
        return _image_public_url(chosen)

    if vehicle.image_key:
        return storage_service.generate_signed_url(
            bucket=settings.S3_BUCKET_VEHICLES,
            key=vehicle.image_key,
        )

    return None


def _to_summary(vehicle: Vehicle) -> FleetVehicleSummary:
    return FleetVehicleSummary(
        id=vehicle.id,
        year=vehicle.year,
        make=vehicle.make,
        model=vehicle.model,
        body_type=vehicle.body_type,
        transmission=vehicle.transmission,
        mileage=vehicle.mileage,
        weekly_rate=vehicle.weekly_rate,
        security_deposit=vehicle.security_deposit,
        status=vehicle.status.value,
        primary_image_url=_primary_image_url(vehicle),
    )


@router.get("/fleet", response_model=list[FleetVehicleSummary])
async def get_public_fleet(
    body_type: Optional[str] = Query(None, description="Filter by body type"),
    min_rate: Optional[float] = Query(None, ge=0, description="Minimum weekly rate"),
    max_rate: Optional[float] = Query(None, ge=0, description="Maximum weekly rate"),
    sort: Optional[FleetSort] = Query(
        None, description="price_asc | price_desc | year_desc"
    ),
    session: AsyncSession = Depends(get_db),
) -> list[FleetVehicleSummary]:
    """
    Public fleet listing.

    Returns only vehicles that are is_active AND show_on_fleet_page.
    Supports filtering by body_type and weekly-rate range, and sorting.
    """
    query = (
        select(Vehicle)
        .where(
            Vehicle.show_on_fleet_page == True,  # noqa: E712
            Vehicle.is_active == True,  # noqa: E712
        )
        .options(selectinload(Vehicle.images))
    )

    if body_type:
        query = query.where(Vehicle.body_type == body_type.lower())

    if min_rate is not None:
        query = query.where(Vehicle.weekly_rate >= Decimal(str(min_rate)))

    if max_rate is not None:
        query = query.where(Vehicle.weekly_rate <= Decimal(str(max_rate)))

    if sort == FleetSort.PRICE_ASC:
        query = query.order_by(Vehicle.weekly_rate.asc(), Vehicle.id.asc())
    elif sort == FleetSort.PRICE_DESC:
        query = query.order_by(Vehicle.weekly_rate.desc(), Vehicle.id.asc())
    elif sort == FleetSort.YEAR_DESC:
        query = query.order_by(Vehicle.year.desc(), Vehicle.id.asc())
    else:
        query = query.order_by(Vehicle.make, Vehicle.model, Vehicle.year.desc())

    result = await session.execute(query)
    vehicles = result.scalars().unique().all()

    return [_to_summary(v) for v in vehicles]


@router.get("/fleet/categories", response_model=list[FleetCategoryResponse])
async def get_fleet_categories(
    session: AsyncSession = Depends(get_db),
) -> list[FleetCategoryResponse]:
    """
    Aggregated fleet category statistics (count + available per body type).
    """
    query = select(Vehicle).where(
        Vehicle.show_on_fleet_page == True,  # noqa: E712
        Vehicle.is_active == True,  # noqa: E712
    )

    result = await session.execute(query)
    vehicles = result.scalars().all()

    display_names = {
        "sedan": "Luxury Sedans",
        "suv": "Premium SUVs",
        "truck": "Pickup Trucks",
        "coupe": "Sports & Coupe",
        "van": "Vans & Minivans",
        "hatchback": "Compact & Hatchback",
        "other": "Other Vehicles",
    }

    categories: dict[str, dict] = {}
    for vehicle in vehicles:
        body_type = vehicle.body_type or "other"
        if body_type not in categories:
            categories[body_type] = {
                "category": body_type,
                "display_name": display_names.get(body_type, body_type.title()),
                "count": 0,
                "available_count": 0,
            }
        categories[body_type]["count"] += 1
        if vehicle.status == VehicleStatus.AVAILABLE:
            categories[body_type]["available_count"] += 1

    return [FleetCategoryResponse(**cat) for cat in categories.values()]


@router.get("/fleet/{vehicle_id}", response_model=FleetVehicleDetail)
async def get_public_vehicle(
    vehicle_id: int,
    session: AsyncSession = Depends(get_db),
) -> FleetVehicleDetail:
    """
    Public fleet detail for one vehicle, including the full ordered gallery.

    Only returns the vehicle if is_active AND show_on_fleet_page.
    """
    query = (
        select(Vehicle)
        .where(
            Vehicle.id == vehicle_id,
            Vehicle.show_on_fleet_page == True,  # noqa: E712
            Vehicle.is_active == True,  # noqa: E712
        )
        .options(selectinload(Vehicle.images))
    )

    result = await session.execute(query)
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    ordered_images = sorted(vehicle.images or [], key=lambda i: i.sort_order)
    gallery = [
        FleetImage(
            id=img.id,
            url=_image_public_url(img),
            sort_order=img.sort_order,
            is_primary=img.is_primary,
        )
        for img in ordered_images
    ]

    return FleetVehicleDetail(
        id=vehicle.id,
        year=vehicle.year,
        make=vehicle.make,
        model=vehicle.model,
        body_type=vehicle.body_type,
        transmission=vehicle.transmission,
        mileage=vehicle.mileage,
        weekly_rate=vehicle.weekly_rate,
        security_deposit=vehicle.security_deposit,
        status=vehicle.status.value,
        primary_image_url=_primary_image_url(vehicle),
        color=vehicle.color,
        engine=vehicle.engine,
        condition=vehicle.condition.value,
        images=gallery,
    )
