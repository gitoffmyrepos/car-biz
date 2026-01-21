"""
Weekly Vehicle Leasing Platform - Inquiry Schemas
Salvage-to-Lux Fleet Management

Pydantic schemas for inquiry API validation and serialization.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator
import re

from app.models.inquiry import (
    InquiryStatus,
    PreferredContactMethod,
    Timeframe,
    VehicleType,
)


class InquiryCreate(BaseModel):
    """Schema for creating a new inquiry from contact form."""

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Customer's full name"
    )
    email: EmailStr = Field(
        ...,
        description="Customer's email address"
    )
    phone: Optional[str] = Field(
        None,
        max_length=50,
        description="Customer's phone number"
    )
    preferred_contact: PreferredContactMethod = Field(
        default=PreferredContactMethod.EITHER,
        description="Preferred method of contact"
    )
    vehicle_type: VehicleType = Field(
        default=VehicleType.ANY,
        description="Type of vehicle interested in"
    )
    timeframe: Timeframe = Field(
        default=Timeframe.JUST_BROWSING,
        description="Timeframe for leasing"
    )
    notes: Optional[str] = Field(
        None,
        max_length=2000,
        description="Additional notes or questions"
    )

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        """Validate and clean full name."""
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Full name must be at least 2 characters')
        return v

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate and clean phone number."""
        if v is None:
            return None
        # Remove common formatting characters
        cleaned = re.sub(r'[\s\-\(\)\.]', '', v)
        # Check if it's a valid phone number (digits only, 10-15 chars)
        if not re.match(r'^\+?\d{10,15}$', cleaned):
            raise ValueError('Please enter a valid phone number')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "John Smith",
                "email": "john.smith@example.com",
                "phone": "(555) 123-4567",
                "preferred_contact": "email",
                "vehicle_type": "suv",
                "timeframe": "this_week",
                "notes": "I'm interested in a 3-month lease for a luxury SUV."
            }
        }


class InquiryResponse(BaseModel):
    """Schema for inquiry response."""

    id: int
    full_name: str
    email: str
    phone: Optional[str]
    preferred_contact: PreferredContactMethod
    vehicle_type: VehicleType
    timeframe: Timeframe
    notes: Optional[str]
    status: InquiryStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InquirySubmitResponse(BaseModel):
    """Schema for inquiry submission response to customer."""

    success: bool = Field(..., description="Whether the inquiry was submitted successfully")
    message: str = Field(..., description="Response message")
    inquiry_id: Optional[int] = Field(None, description="ID of the created inquiry")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Thank you for your inquiry! We will contact you within 24 hours.",
                "inquiry_id": 123
            }
        }


class InquiryListResponse(BaseModel):
    """Schema for paginated inquiry list (admin use)."""

    items: list[InquiryResponse]
    total: int
    page: int
    per_page: int
    pages: int
