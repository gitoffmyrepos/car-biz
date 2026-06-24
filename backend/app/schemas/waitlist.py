"""
GigWheels - Waitlist Schemas

Pydantic schemas for waitlist signup validation and serialization.
Drivers submit basic contact; owners additionally declare vehicle(s) + the
gig-business categories they'll allow their car to be used for.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.waitlist import (
    BusinessCategory,
    WaitlistRole,
    WaitlistStatus,
)


class WaitlistCreate(BaseModel):
    """Schema for a public waitlist signup."""

    role: WaitlistRole = Field(..., description="driver or owner")
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    city: Optional[str] = Field(None, max_length=120)

    # Owner-only
    vehicle_make: Optional[str] = Field(None, max_length=80)
    vehicle_model: Optional[str] = Field(None, max_length=80)
    vehicle_year: Optional[int] = Field(None, ge=1990, le=2100)
    vehicle_count: Optional[int] = Field(None, ge=1, le=100)
    vehicle_type: Optional[str] = Field(None, max_length=40)
    business_categories: Optional[list[BusinessCategory]] = Field(
        None, description="Owner: which gig businesses the car may be used for (multi-select)"
    )

    notes: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def _owner_requires_categories(self):
        """Owners must pick at least one business category and name their car."""
        if self.role == WaitlistRole.OWNER:
            if not self.business_categories:
                raise ValueError("Owners must select at least one business category.")
            if not (self.vehicle_make or self.vehicle_model or self.vehicle_type):
                raise ValueError("Owners must describe their vehicle (make/model or type).")
        return self


class WaitlistResponse(BaseModel):
    """Full waitlist entry (admin)."""
    id: int
    role: WaitlistRole
    full_name: str
    email: str
    phone: Optional[str]
    city: Optional[str]
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    vehicle_year: Optional[int]
    vehicle_count: Optional[int]
    vehicle_type: Optional[str]
    business_categories: Optional[list[str]]
    notes: Optional[str]
    status: WaitlistStatus
    synced_to_crm: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WaitlistSubmitResponse(BaseModel):
    """Public confirmation after a successful signup."""
    success: bool = True
    message: str
    id: int


class WaitlistListResponse(BaseModel):
    items: list[WaitlistResponse]
    total: int
