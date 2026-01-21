"""
Weekly Vehicle Leasing Platform - Admin API
Salvage-to-Lux Fleet Management

Admin-only API endpoints with RBAC protection.
"""

from typing import Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    AuthenticatedUser,
    require_admin,
    require_ops,
)
from app.core.database import get_db
from app.models.inquiry import Inquiry, InquiryStatus


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
