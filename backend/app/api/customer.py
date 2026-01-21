"""
Weekly Vehicle Leasing Platform - Customer API
Salvage-to-Lux Fleet Management

Customer profile management endpoints.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_db
from app.models.customer_profile import CustomerProfile


router = APIRouter(prefix="/customer", tags=["Customer"])


class ProfileResponse(BaseModel):
    """Customer profile response."""
    id: int
    keycloak_id: str
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    drivers_license_number: Optional[str]
    drivers_license_state: Optional[str]
    insurance_status: str
    insurance_expiration_date: Optional[datetime]
    is_verified: bool
    notification_email: bool
    notification_sms: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    """Request body for profile updates."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    drivers_license_number: Optional[str] = None
    drivers_license_state: Optional[str] = None
    notification_email: Optional[bool] = None
    notification_sms: Optional[bool] = None


class ProfileCreateRequest(BaseModel):
    """Request body for profile creation."""
    full_name: Optional[str] = None
    phone: Optional[str] = None


async def get_or_create_profile(
    user: AuthenticatedUser,
    db: AsyncSession
) -> CustomerProfile:
    """Get existing profile or create a new one for the user."""
    # Try to find existing profile
    result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.keycloak_id == user.sub)
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        # Create new profile
        profile = CustomerProfile(
            keycloak_id=user.sub,
            email=user.email,
            full_name=user.name if user.name else None,
        )
        db.add(profile)
        await db.flush()
        await db.refresh(profile)

    return profile


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's customer profile.

    Creates a new profile if one doesn't exist.
    """
    profile = await get_or_create_profile(user, db)

    return ProfileResponse(
        id=profile.id,
        keycloak_id=profile.keycloak_id,
        email=profile.email,
        full_name=profile.full_name,
        phone=profile.phone,
        address_line1=profile.address_line1,
        address_line2=profile.address_line2,
        city=profile.city,
        state=profile.state,
        zip_code=profile.zip_code,
        drivers_license_number=profile.drivers_license_number,
        drivers_license_state=profile.drivers_license_state,
        insurance_status=profile.insurance_status.value,
        insurance_expiration_date=profile.insurance_expiration_date,
        is_verified=profile.is_verified,
        notification_email=profile.notification_email,
        notification_sms=profile.notification_sms,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    update_data: ProfileUpdateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user's customer profile.

    Only updates fields that are provided (non-null).
    """
    profile = await get_or_create_profile(user, db)

    # Update only provided fields
    update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)

    for field, value in update_dict.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

    await db.flush()
    await db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        keycloak_id=profile.keycloak_id,
        email=profile.email,
        full_name=profile.full_name,
        phone=profile.phone,
        address_line1=profile.address_line1,
        address_line2=profile.address_line2,
        city=profile.city,
        state=profile.state,
        zip_code=profile.zip_code,
        drivers_license_number=profile.drivers_license_number,
        drivers_license_state=profile.drivers_license_state,
        insurance_status=profile.insurance_status.value,
        insurance_expiration_date=profile.insurance_expiration_date,
        is_verified=profile.is_verified,
        notification_email=profile.notification_email,
        notification_sms=profile.notification_sms,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.patch("/profile", response_model=ProfileResponse)
async def patch_profile(
    update_data: ProfileUpdateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Partially update current user's customer profile.

    Alias for PUT /profile - both support partial updates.
    """
    return await update_profile(update_data, user, db)
