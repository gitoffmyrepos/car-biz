"""
Weekly Vehicle Leasing Platform - Admin API
Salvage-to-Lux Fleet Management

Admin-only API endpoints with RBAC protection.
"""

import logging
from typing import Any, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    AuthenticatedUser,
    require_admin,
    require_ops,
)
from app.core.config import settings
from app.core.database import get_db
from app.models.inquiry import Inquiry, InquiryStatus
from app.models.customer_profile import CustomerProfile, InsuranceStatus
from app.services.storage import storage_service

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/admin", tags=["Admin"])


class DashboardStatsResponse(BaseModel):
    """Admin dashboard statistics."""
    total_inquiries: int
    new_inquiries: int
    total_vehicles: int
    total_customers: int
    timestamp: str


class AdminActionResponse(BaseModel):
    """Response for admin actions."""
    success: bool
    message: str
    actor: str
    action: str
    timestamp: str


@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get admin dashboard statistics.

    Requires admin role.
    """
    # Get inquiry counts
    total_inquiries = await session.scalar(
        select(func.count()).select_from(Inquiry)
    )
    new_inquiries = await session.scalar(
        select(func.count()).select_from(Inquiry).where(Inquiry.status == InquiryStatus.NEW)
    )

    return DashboardStatsResponse(
        total_inquiries=total_inquiries or 0,
        new_inquiries=new_inquiries or 0,
        total_vehicles=0,  # Will be implemented with vehicles table
        total_customers=0,  # Will be implemented with customers table
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/inquiries", response_model=list[dict[str, Any]])
async def list_all_inquiries(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    List all inquiries for admin review.

    Requires admin or ops role.
    """
    query = select(Inquiry).order_by(Inquiry.created_at.desc())

    if status_filter:
        # Convert string to enum if valid
        try:
            status_enum = InquiryStatus(status_filter)
            query = query.where(Inquiry.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter: {status_filter}"
            )

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    inquiries = result.scalars().all()

    return [
        {
            "id": inq.id,
            "full_name": inq.full_name,
            "email": inq.email,
            "phone": inq.phone,
            "vehicle_type": inq.vehicle_type.value if inq.vehicle_type else None,
            "timeframe": inq.timeframe.value if inq.timeframe else None,
            "preferred_contact": inq.preferred_contact.value if inq.preferred_contact else None,
            "notes": inq.notes,
            "status": inq.status.value if inq.status else None,
            "created_at": inq.created_at.isoformat() if inq.created_at else None,
            "updated_at": inq.updated_at.isoformat() if inq.updated_at else None,
        }
        for inq in inquiries
    ]


@router.patch("/inquiries/{inquiry_id}/status")
async def update_inquiry_status(
    inquiry_id: int,
    new_status: str,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Update inquiry status.

    Requires admin or ops role.
    """
    # Validate status
    try:
        status_enum = InquiryStatus(new_status)
    except ValueError:
        valid_statuses = [s.value for s in InquiryStatus]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Get inquiry
    result = await session.execute(
        select(Inquiry).where(Inquiry.id == inquiry_id)
    )
    inquiry = result.scalar_one_or_none()

    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inquiry not found"
        )

    old_status = inquiry.status.value if inquiry.status else "unknown"
    inquiry.status = status_enum
    inquiry.updated_at = datetime.now(timezone.utc)
    await session.commit()

    return AdminActionResponse(
        success=True,
        message=f"Inquiry #{inquiry_id} status updated from '{old_status}' to '{new_status}'",
        actor=user.email,
        action="update_inquiry_status",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/protected/admin-only")
async def admin_only_endpoint(
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Test endpoint that requires admin role.

    Returns 403 for non-admin users.
    """
    return {
        "message": "Welcome, admin!",
        "user": user.email,
        "roles": user.roles,
        "access_level": "admin",
    }


@router.get("/protected/ops-access")
async def ops_access_endpoint(
    user: AuthenticatedUser = Depends(require_ops),
):
    """
    Test endpoint that requires admin or ops role.

    Returns 403 for customer users.
    """
    return {
        "message": "Welcome to operations!",
        "user": user.email,
        "roles": user.roles,
        "access_level": "ops",
    }


# =============================================================================
# Customer Verification Management
# =============================================================================

class CustomerListResponse(BaseModel):
    """Customer profile for admin listing."""
    id: int
    keycloak_id: str
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    insurance_status: str
    insurance_document_key: Optional[str]
    insurance_expiration_date: Optional[datetime]
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerVerificationRequest(BaseModel):
    """Request to approve/reject customer insurance."""
    action: str  # "approve" or "reject"
    expiration_date: Optional[datetime] = None
    notes: Optional[str] = None


class CustomerVerificationResponse(BaseModel):
    """Response for verification action."""
    success: bool
    message: str
    customer_id: int
    new_status: str
    actor: str
    timestamp: str


@router.get("/customers", response_model=list[CustomerListResponse])
async def list_customers(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
    insurance_status: Optional[str] = Query(None, description="Filter by insurance status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List all customer profiles.

    Requires admin or ops role.
    Optionally filter by insurance_status: not_uploaded, pending, approved, rejected, expired
    """
    query = select(CustomerProfile).order_by(CustomerProfile.created_at.desc())

    if insurance_status:
        try:
            status_enum = InsuranceStatus(insurance_status)
            query = query.where(CustomerProfile.insurance_status == status_enum)
        except ValueError:
            valid_statuses = [s.value for s in InsuranceStatus]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid insurance_status. Must be one of: {', '.join(valid_statuses)}"
            )

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    customers = result.scalars().all()

    return [
        CustomerListResponse(
            id=c.id,
            keycloak_id=c.keycloak_id,
            email=c.email,
            full_name=c.full_name,
            phone=c.phone,
            insurance_status=c.insurance_status.value,
            insurance_document_key=c.insurance_document_key,
            insurance_expiration_date=c.insurance_expiration_date,
            is_verified=c.is_verified,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in customers
    ]


@router.get("/customers/pending-verification")
async def list_pending_verifications(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    List customers with pending insurance verification.

    Requires admin or ops role.
    """
    result = await session.execute(
        select(CustomerProfile)
        .where(CustomerProfile.insurance_status == InsuranceStatus.PENDING)
        .order_by(CustomerProfile.updated_at.desc())
    )
    customers = result.scalars().all()

    return {
        "total": len(customers),
        "customers": [
            {
                "id": c.id,
                "email": c.email,
                "full_name": c.full_name,
                "phone": c.phone,
                "insurance_status": c.insurance_status.value,
                "has_document": bool(c.insurance_document_key),
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in customers
        ]
    }


@router.get("/customers/{customer_id}")
async def get_customer_detail(
    customer_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get detailed customer profile for admin review.

    Requires admin or ops role.
    """
    result = await session.execute(
        select(CustomerProfile).where(CustomerProfile.id == customer_id)
    )
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    return {
        "id": customer.id,
        "keycloak_id": customer.keycloak_id,
        "email": customer.email,
        "full_name": customer.full_name,
        "phone": customer.phone,
        "address_line1": customer.address_line1,
        "address_line2": customer.address_line2,
        "city": customer.city,
        "state": customer.state,
        "zip_code": customer.zip_code,
        "drivers_license_number": customer.drivers_license_number,
        "drivers_license_state": customer.drivers_license_state,
        "insurance_status": customer.insurance_status.value,
        "insurance_document_key": customer.insurance_document_key,
        "insurance_expiration_date": customer.insurance_expiration_date.isoformat() if customer.insurance_expiration_date else None,
        "is_verified": customer.is_verified,
        "is_banned": customer.is_banned,
        "notification_email": customer.notification_email,
        "notification_sms": customer.notification_sms,
        "created_at": customer.created_at.isoformat(),
        "updated_at": customer.updated_at.isoformat(),
    }


@router.get("/customers/{customer_id}/insurance-document")
async def get_insurance_document_url(
    customer_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get signed URL for customer's insurance document.

    Requires admin or ops role.
    Returns a time-limited signed URL for viewing the document.
    """
    result = await session.execute(
        select(CustomerProfile).where(CustomerProfile.id == customer_id)
    )
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    if not customer.insurance_document_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No insurance document uploaded"
        )

    # Generate signed URL (valid for 5 minutes)
    signed_url = storage_service.generate_signed_url(
        bucket=settings.S3_BUCKET_INSURANCE,
        key=customer.insurance_document_key,
        expires_in=300,  # 5 minutes
    )

    logger.info(f"Admin {user.email} accessed insurance document for customer {customer_id}")

    return {
        "customer_id": customer_id,
        "document_url": signed_url,
        "expires_in_seconds": 300,
        "accessed_by": user.email,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/customers/{customer_id}/verify-insurance", response_model=CustomerVerificationResponse)
async def verify_customer_insurance(
    customer_id: int,
    request: CustomerVerificationRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Approve or reject customer insurance verification.

    Requires admin role.
    - action: "approve" or "reject"
    - expiration_date: Required when approving (policy expiration date)
    - notes: Optional verification notes
    """
    if request.action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'approve' or 'reject'"
        )

    result = await session.execute(
        select(CustomerProfile).where(CustomerProfile.id == customer_id)
    )
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    if customer.insurance_status != InsuranceStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer insurance status is '{customer.insurance_status.value}', not 'pending'"
        )

    old_status = customer.insurance_status.value

    if request.action == "approve":
        if not request.expiration_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expiration date is required when approving insurance"
            )
        customer.insurance_status = InsuranceStatus.APPROVED
        customer.insurance_expiration_date = request.expiration_date
        customer.is_verified = True
        message = f"Insurance approved for customer {customer.email}"
    else:
        customer.insurance_status = InsuranceStatus.REJECTED
        customer.is_verified = False
        message = f"Insurance rejected for customer {customer.email}"

    customer.updated_at = datetime.now(timezone.utc)
    await session.commit()

    logger.info(f"Admin {user.email} {request.action}d insurance for customer {customer_id}: {request.notes or 'No notes'}")

    return CustomerVerificationResponse(
        success=True,
        message=message,
        customer_id=customer_id,
        new_status=customer.insurance_status.value,
        actor=user.email,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
