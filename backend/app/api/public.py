"""
Weekly Vehicle Leasing Platform - Public API Routes
Salvage-to-Lux Fleet Management

Public API endpoints that don't require authentication.
"""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.vehicle import Vehicle, VehicleStatus

router = APIRouter(prefix="/public", tags=["Public"])


class PublicVehicleResponse(BaseModel):
    """Public vehicle response - limited info for public fleet page."""
    id: int
    make: str
    model: str
    year: int
    color: Optional[str] = None
    body_type: Optional[str] = None
    status: str
    condition: str

    class Config:
        from_attributes = True


class FleetCategoryResponse(BaseModel):
    """Aggregated fleet category information."""
    category: str
    display_name: str
    count: int
    available_count: int


@router.get("/fleet", response_model=list[PublicVehicleResponse])
async def get_public_fleet(
    body_type: Optional[str] = None,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_db)
) -> list[PublicVehicleResponse]:
    """
    Get public fleet vehicles for display on the fleet page.

    Only returns vehicles marked as show_on_fleet_page=True and is_active=True.
    Does NOT expose sensitive data like VIN, pricing, or lease information.

    Query params:
    - body_type: Filter by vehicle body type (sedan, suv, truck, etc.)
    - status: Filter by status (available, leased, maintenance, unavailable)
    """
    query = select(Vehicle).where(
        Vehicle.show_on_fleet_page == True,
        Vehicle.is_active == True
    )

    if body_type:
        query = query.where(Vehicle.body_type == body_type.lower())

    if status:
        try:
            status_enum = VehicleStatus(status.lower())
            query = query.where(Vehicle.status == status_enum)
        except ValueError:
            pass  # Invalid status, ignore filter

    query = query.order_by(Vehicle.make, Vehicle.model, Vehicle.year.desc())

    result = await session.execute(query)
    vehicles = result.scalars().all()

    return [
        PublicVehicleResponse(
            id=v.id,
            make=v.make,
            model=v.model,
            year=v.year,
            color=v.color,
            body_type=v.body_type,
            status=v.status.value,
            condition=v.condition.value
        )
        for v in vehicles
    ]


@router.get("/fleet/categories", response_model=list[FleetCategoryResponse])
async def get_fleet_categories(
    session: AsyncSession = Depends(get_db)
) -> list[FleetCategoryResponse]:
    """
    Get aggregated fleet category statistics.

    Returns count of vehicles in each body type category,
    along with how many are currently available.
    """
    # Get all public vehicles
    query = select(Vehicle).where(
        Vehicle.show_on_fleet_page == True,
        Vehicle.is_active == True
    )

    result = await session.execute(query)
    vehicles = result.scalars().all()

    # Aggregate by body_type
    categories: dict[str, dict] = {}

    # Define display names for body types
    display_names = {
        "sedan": "Luxury Sedans",
        "suv": "Premium SUVs",
        "truck": "Pickup Trucks",
        "coupe": "Sports & Coupe",
        "van": "Vans & Minivans",
        "hatchback": "Compact & Hatchback",
        "other": "Other Vehicles"
    }

    for vehicle in vehicles:
        body_type = vehicle.body_type or "other"
        if body_type not in categories:
            categories[body_type] = {
                "category": body_type,
                "display_name": display_names.get(body_type, body_type.title()),
                "count": 0,
                "available_count": 0
            }

        categories[body_type]["count"] += 1
        if vehicle.status == VehicleStatus.AVAILABLE:
            categories[body_type]["available_count"] += 1

    return [FleetCategoryResponse(**cat) for cat in categories.values()]


@router.get("/fleet/{vehicle_id}", response_model=PublicVehicleResponse)
async def get_public_vehicle(
    vehicle_id: int,
    session: AsyncSession = Depends(get_db)
) -> PublicVehicleResponse:
    """
    Get a single public vehicle by ID.

    Only returns vehicle if it's marked as show_on_fleet_page=True and is_active=True.
    """
    query = select(Vehicle).where(
        Vehicle.id == vehicle_id,
        Vehicle.show_on_fleet_page == True,
        Vehicle.is_active == True
    )

    result = await session.execute(query)
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Vehicle not found")

    return PublicVehicleResponse(
        id=vehicle.id,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        body_type=vehicle.body_type,
        status=vehicle.status.value,
        condition=vehicle.condition.value
    )
