"""
GigWheels - Inquiry API Endpoints
Weekly car rentals for gig drivers

API endpoints for customer inquiry submission and management.
"""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.inquiry import Inquiry, InquiryStatus
from app.schemas.inquiry import (
    InquiryCreate,
    InquiryListResponse,
    InquiryResponse,
    InquirySubmitResponse,
)
from app.services.email import email_service


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/inquiries", tags=["Inquiries"])


@router.post(
    "/",
    response_model=InquirySubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new inquiry",
    description="Submit a customer inquiry from the contact form."
)
async def create_inquiry(
    inquiry_data: InquiryCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> InquirySubmitResponse:
    """
    Create a new customer inquiry from the contact form.

    - **full_name**: Customer's full name (required)
    - **email**: Customer's email address (required)
    - **phone**: Customer's phone number (optional)
    - **preferred_contact**: Preferred method of contact
    - **vehicle_type**: Type of vehicle interested in
    - **timeframe**: Timeline for leasing
    - **notes**: Additional notes or questions

    Upon successful submission, an automatic acknowledgement email is sent
    to the customer via Resend.
    """
    try:
        # Get client info for tracking
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")[:500]

        # Create the inquiry record
        inquiry = Inquiry(
            full_name=inquiry_data.full_name,
            email=inquiry_data.email,
            phone=inquiry_data.phone,
            preferred_contact=inquiry_data.preferred_contact,
            vehicle_type=inquiry_data.vehicle_type,
            timeframe=inquiry_data.timeframe,
            notes=inquiry_data.notes,
            status=InquiryStatus.NEW,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        db.add(inquiry)
        await db.flush()
        await db.refresh(inquiry)

        # Send auto-response email in background
        background_tasks.add_task(
            email_service.send_inquiry_auto_response,
            to_email=inquiry.email,
            customer_name=inquiry.full_name,
            inquiry_id=inquiry.id,
        )

        # Send admin notification in background
        background_tasks.add_task(
            email_service.send_admin_notification,
            inquiry_id=inquiry.id,
            customer_name=inquiry.full_name,
            customer_email=inquiry.email,
            vehicle_type=inquiry.vehicle_type.value,
            timeframe=inquiry.timeframe.value,
        )

        logger.info(f"Inquiry {inquiry.id} created for {inquiry.email}, auto-response emails queued")

        return InquirySubmitResponse(
            success=True,
            message="Thank you for your inquiry! Our team will contact you within 24 hours.",
            inquiry_id=inquiry.id
        )

    except Exception as e:
        logger.error(f"Failed to create inquiry: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit inquiry. Please try again."
        )


@router.get(
    "/",
    response_model=InquiryListResponse,
    summary="List all inquiries",
    description="Get a paginated list of all inquiries (admin only)."
)
async def list_inquiries(
    page: int = 1,
    per_page: int = 20,
    status_filter: Optional[InquiryStatus] = None,
    db: AsyncSession = Depends(get_db)
) -> InquiryListResponse:
    """
    Get a paginated list of inquiries.

    - **page**: Page number (default: 1)
    - **per_page**: Items per page (default: 20, max: 100)
    - **status_filter**: Filter by inquiry status
    """
    # Validate pagination
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 20
    if per_page > 100:
        per_page = 100

    # Build query
    query = select(Inquiry).order_by(Inquiry.created_at.desc())

    if status_filter:
        query = query.where(Inquiry.status == status_filter)

    # Get total count
    count_query = select(func.count()).select_from(Inquiry)
    if status_filter:
        count_query = count_query.where(Inquiry.status == status_filter)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    inquiries = result.scalars().all()

    # Calculate pages
    pages = (total + per_page - 1) // per_page if total > 0 else 1

    return InquiryListResponse(
        items=[InquiryResponse.model_validate(i) for i in inquiries],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )


@router.get(
    "/{inquiry_id}",
    response_model=InquiryResponse,
    summary="Get inquiry details",
    description="Get details of a specific inquiry."
)
async def get_inquiry(
    inquiry_id: int,
    db: AsyncSession = Depends(get_db)
) -> InquiryResponse:
    """Get a specific inquiry by ID."""
    query = select(Inquiry).where(Inquiry.id == inquiry_id)
    result = await db.execute(query)
    inquiry = result.scalar_one_or_none()

    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inquiry not found"
        )

    return InquiryResponse.model_validate(inquiry)


@router.patch(
    "/{inquiry_id}/status",
    response_model=InquiryResponse,
    summary="Update inquiry status",
    description="Update the status of an inquiry (admin only)."
)
async def update_inquiry_status(
    inquiry_id: int,
    new_status: InquiryStatus,
    db: AsyncSession = Depends(get_db)
) -> InquiryResponse:
    """Update the status of an inquiry."""
    query = select(Inquiry).where(Inquiry.id == inquiry_id)
    result = await db.execute(query)
    inquiry = result.scalar_one_or_none()

    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inquiry not found"
        )

    inquiry.status = new_status
    await db.flush()
    await db.refresh(inquiry)

    return InquiryResponse.model_validate(inquiry)
