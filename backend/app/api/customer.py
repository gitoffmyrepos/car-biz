"""
Weekly Vehicle Leasing Platform - Customer API
Salvage-to-Lux Fleet Management

Customer profile management endpoints.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.customer_profile import CustomerProfile, InsuranceStatus
from app.models.vehicle_request import VehicleRequest, VehicleRequestStatus, VehiclePreference
from app.models.lease import Lease, LeaseStatus
from app.models.notification import Notification
from app.services.storage import storage_service

logger = logging.getLogger(__name__)


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
    """Get existing profile or create a new one for the user.

    Handles race conditions where concurrent requests might try to create
    the same profile by catching IntegrityError and re-fetching.
    """
    # Try to find existing profile
    result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.keycloak_id == user.sub)
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        try:
            # Create new profile
            profile = CustomerProfile(
                keycloak_id=user.sub,
                email=user.email,
                full_name=user.name if user.name else None,
            )
            db.add(profile)
            await db.flush()
            await db.refresh(profile)
        except IntegrityError:
            # Race condition: another request created the profile
            # Rollback the failed insert and re-fetch
            await db.rollback()
            result = await db.execute(
                select(CustomerProfile).where(CustomerProfile.keycloak_id == user.sub)
            )
            profile = result.scalar_one_or_none()
            if profile is None:
                # This should not happen, but handle it gracefully
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create or retrieve customer profile"
                )

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


class InsuranceUploadResponse(BaseModel):
    """Response for insurance upload."""
    success: bool
    message: str
    insurance_status: str
    document_key: Optional[str] = None


@router.post("/insurance/upload", response_model=InsuranceUploadResponse)
async def upload_insurance_document(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload driver insurance documentation.

    - Validates file type (images, PDF)
    - Validates file size (max 10MB)
    - Stores file in MinIO/local storage
    - Updates customer profile with pending status
    """
    # Read file content
    file_content = await file.read()
    original_filename = file.filename or "insurance_document"

    # Validate file
    is_valid, error_message, mime_type = storage_service.validate_file(
        file_content, original_filename
    )

    if not is_valid or mime_type is None:
        raise HTTPException(status_code=400, detail=error_message or "Invalid file type")

    # Get or create customer profile
    profile = await get_or_create_profile(user, db)

    # Generate storage key
    storage_key = storage_service.generate_storage_key(
        user_id=user.sub,
        document_type="insurance",
        original_filename=original_filename,
        mime_type=mime_type,
    )

    # Compute file hash for duplicate detection
    file_hash = storage_service.compute_file_hash(file_content)
    logger.info(f"Insurance document hash: {file_hash[:16]}...")

    # Upload to storage
    success = await storage_service.upload_file(
        file_content=file_content,
        bucket=settings.S3_BUCKET_INSURANCE,
        key=storage_key,
        content_type=mime_type,
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to upload document. Please try again."
        )

    # Delete old insurance document if exists
    if profile.insurance_document_key:
        await storage_service.delete_file(
            bucket=settings.S3_BUCKET_INSURANCE,
            key=profile.insurance_document_key
        )

    # Update profile
    profile.insurance_document_key = storage_key
    profile.insurance_status = InsuranceStatus.PENDING
    await db.flush()
    await db.refresh(profile)

    logger.info(
        f"Insurance document uploaded for user {user.sub}: {storage_key}"
    )

    return InsuranceUploadResponse(
        success=True,
        message="Insurance document uploaded successfully. Verification pending (48 hours).",
        insurance_status=profile.insurance_status.value,
        document_key=storage_key,
    )


@router.get("/insurance/status")
async def get_insurance_status(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current insurance document status.
    """
    profile = await get_or_create_profile(user, db)

    # Generate signed URL if document exists
    document_url = None
    if profile.insurance_document_key:
        document_url = storage_service.generate_signed_url(
            bucket=settings.S3_BUCKET_INSURANCE,
            key=profile.insurance_document_key,
        )

    return {
        "insurance_status": profile.insurance_status.value,
        "insurance_expiration_date": profile.insurance_expiration_date,
        "has_document": bool(profile.insurance_document_key),
        "document_url": document_url,
    }


# ============================================================================
# Vehicle Request Endpoints
# ============================================================================

class VehicleRequestCreate(BaseModel):
    """Request body for creating a vehicle request."""
    vehicle_preference: str = "any"
    notes: Optional[str] = None
    preferred_start_date: Optional[datetime] = None


class VehicleRequestResponse(BaseModel):
    """Response for vehicle request."""
    id: int
    customer_profile_id: int
    customer_email: str
    customer_name: Optional[str]
    status: str
    vehicle_preference: str
    notes: Optional[str]
    preferred_start_date: Optional[datetime]
    admin_notes: Optional[str]
    rejection_reason: Optional[str]
    assigned_vehicle_id: Optional[int]
    assigned_vehicle_info: Optional[str]
    created_at: datetime
    updated_at: datetime
    reviewed_at: Optional[datetime]
    assigned_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.post("/vehicle-request", response_model=VehicleRequestResponse)
async def create_vehicle_request(
    request_data: VehicleRequestCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a vehicle request.

    Requirements:
    - Customer must have an approved insurance status
    - Customer cannot have an existing pending/reviewing/approved request
    """
    # Get customer profile
    profile = await get_or_create_profile(user, db)

    # Verify insurance is approved
    if profile.insurance_status != InsuranceStatus.APPROVED:
        raise HTTPException(
            status_code=403,
            detail=f"Insurance verification required. Current status: {profile.insurance_status.value}. Only customers with approved insurance can request vehicles."
        )

    # Check for existing active requests
    existing_result = await db.execute(
        select(VehicleRequest).where(
            VehicleRequest.customer_profile_id == profile.id,
            VehicleRequest.status.in_([
                VehicleRequestStatus.PENDING,
                VehicleRequestStatus.REVIEWING,
                VehicleRequestStatus.APPROVED,
            ])
        )
    )
    existing_request = existing_result.scalar_one_or_none()

    if existing_request:
        raise HTTPException(
            status_code=400,
            detail=f"You already have an active vehicle request (Status: {existing_request.status.value}). Please wait for it to be processed or cancel it first."
        )

    # Validate vehicle preference
    try:
        vehicle_pref = VehiclePreference(request_data.vehicle_preference.lower())
    except ValueError:
        vehicle_pref = VehiclePreference.ANY

    # Create vehicle request
    vehicle_request = VehicleRequest(
        customer_profile_id=profile.id,
        customer_email=profile.email,
        customer_name=profile.full_name,
        vehicle_preference=vehicle_pref,
        notes=request_data.notes,
        preferred_start_date=request_data.preferred_start_date,
        status=VehicleRequestStatus.PENDING,
    )

    db.add(vehicle_request)
    await db.flush()
    await db.refresh(vehicle_request)

    logger.info(f"Vehicle request created for customer {profile.email}: ID={vehicle_request.id}")

    return VehicleRequestResponse(
        id=vehicle_request.id,
        customer_profile_id=vehicle_request.customer_profile_id,
        customer_email=vehicle_request.customer_email,
        customer_name=vehicle_request.customer_name,
        status=vehicle_request.status.value,
        vehicle_preference=vehicle_request.vehicle_preference.value,
        notes=vehicle_request.notes,
        preferred_start_date=vehicle_request.preferred_start_date,
        admin_notes=vehicle_request.admin_notes,
        rejection_reason=vehicle_request.rejection_reason,
        assigned_vehicle_id=vehicle_request.assigned_vehicle_id,
        assigned_vehicle_info=vehicle_request.assigned_vehicle_info,
        created_at=vehicle_request.created_at,
        updated_at=vehicle_request.updated_at,
        reviewed_at=vehicle_request.reviewed_at,
        assigned_at=vehicle_request.assigned_at,
    )


@router.get("/vehicle-requests", response_model=list[VehicleRequestResponse])
async def get_vehicle_requests(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all vehicle requests for the current customer.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(VehicleRequest)
        .where(VehicleRequest.customer_profile_id == profile.id)
        .order_by(VehicleRequest.created_at.desc())
    )
    requests = result.scalars().all()

    return [
        VehicleRequestResponse(
            id=req.id,
            customer_profile_id=req.customer_profile_id,
            customer_email=req.customer_email,
            customer_name=req.customer_name,
            status=req.status.value,
            vehicle_preference=req.vehicle_preference.value,
            notes=req.notes,
            preferred_start_date=req.preferred_start_date,
            admin_notes=req.admin_notes,
            rejection_reason=req.rejection_reason,
            assigned_vehicle_id=req.assigned_vehicle_id,
            assigned_vehicle_info=req.assigned_vehicle_info,
            created_at=req.created_at,
            updated_at=req.updated_at,
            reviewed_at=req.reviewed_at,
            assigned_at=req.assigned_at,
        )
        for req in requests
    ]


@router.get("/vehicle-request/{request_id}", response_model=VehicleRequestResponse)
async def get_vehicle_request(
    request_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific vehicle request by ID.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(VehicleRequest).where(
            VehicleRequest.id == request_id,
            VehicleRequest.customer_profile_id == profile.id
        )
    )
    vehicle_request = result.scalar_one_or_none()

    if not vehicle_request:
        raise HTTPException(status_code=404, detail="Vehicle request not found")

    return VehicleRequestResponse(
        id=vehicle_request.id,
        customer_profile_id=vehicle_request.customer_profile_id,
        customer_email=vehicle_request.customer_email,
        customer_name=vehicle_request.customer_name,
        status=vehicle_request.status.value,
        vehicle_preference=vehicle_request.vehicle_preference.value,
        notes=vehicle_request.notes,
        preferred_start_date=vehicle_request.preferred_start_date,
        admin_notes=vehicle_request.admin_notes,
        rejection_reason=vehicle_request.rejection_reason,
        assigned_vehicle_id=vehicle_request.assigned_vehicle_id,
        assigned_vehicle_info=vehicle_request.assigned_vehicle_info,
        created_at=vehicle_request.created_at,
        updated_at=vehicle_request.updated_at,
        reviewed_at=vehicle_request.reviewed_at,
        assigned_at=vehicle_request.assigned_at,
    )


@router.post("/vehicle-request/{request_id}/cancel", response_model=VehicleRequestResponse)
async def cancel_vehicle_request(
    request_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel a pending vehicle request.

    Can only cancel requests in PENDING or REVIEWING status.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(VehicleRequest).where(
            VehicleRequest.id == request_id,
            VehicleRequest.customer_profile_id == profile.id
        )
    )
    vehicle_request = result.scalar_one_or_none()

    if not vehicle_request:
        raise HTTPException(status_code=404, detail="Vehicle request not found")

    # Can only cancel pending or reviewing requests
    if vehicle_request.status not in [VehicleRequestStatus.PENDING, VehicleRequestStatus.REVIEWING]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel request in {vehicle_request.status.value} status"
        )

    vehicle_request.status = VehicleRequestStatus.CANCELLED
    await db.flush()
    await db.refresh(vehicle_request)

    logger.info(f"Vehicle request {request_id} cancelled by customer {profile.email}")

    return VehicleRequestResponse(
        id=vehicle_request.id,
        customer_profile_id=vehicle_request.customer_profile_id,
        customer_email=vehicle_request.customer_email,
        customer_name=vehicle_request.customer_name,
        status=vehicle_request.status.value,
        vehicle_preference=vehicle_request.vehicle_preference.value,
        notes=vehicle_request.notes,
        preferred_start_date=vehicle_request.preferred_start_date,
        admin_notes=vehicle_request.admin_notes,
        rejection_reason=vehicle_request.rejection_reason,
        assigned_vehicle_id=vehicle_request.assigned_vehicle_id,
        assigned_vehicle_info=vehicle_request.assigned_vehicle_info,
        created_at=vehicle_request.created_at,
        updated_at=vehicle_request.updated_at,
        reviewed_at=vehicle_request.reviewed_at,
        assigned_at=vehicle_request.assigned_at,
    )


@router.get("/can-request-vehicle")
async def can_request_vehicle(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if the current customer can request a vehicle.

    Returns eligibility status and reasons.
    """
    profile = await get_or_create_profile(user, db)

    # Check insurance status
    insurance_approved = profile.insurance_status == InsuranceStatus.APPROVED

    # Check for existing active requests
    existing_result = await db.execute(
        select(VehicleRequest).where(
            VehicleRequest.customer_profile_id == profile.id,
            VehicleRequest.status.in_([
                VehicleRequestStatus.PENDING,
                VehicleRequestStatus.REVIEWING,
                VehicleRequestStatus.APPROVED,
            ])
        )
    )
    existing_request = existing_result.scalar_one_or_none()
    has_active_request = existing_request is not None

    # Check if banned
    is_banned = profile.is_banned

    # Determine if can request
    can_request = insurance_approved and not has_active_request and not is_banned

    # Build reasons list
    reasons = []
    if not insurance_approved:
        reasons.append(f"Insurance must be approved. Current status: {profile.insurance_status.value}")
    if has_active_request:
        reasons.append(f"You have an active vehicle request (Status: {existing_request.status.value})")
    if is_banned:
        reasons.append("Your account has been suspended")

    return {
        "can_request": can_request,
        "insurance_status": profile.insurance_status.value,
        "insurance_approved": insurance_approved,
        "has_active_request": has_active_request,
        "active_request_id": existing_request.id if existing_request else None,
        "active_request_status": existing_request.status.value if existing_request else None,
        "is_banned": is_banned,
        "reasons": reasons,
    }


# ============================================================================
# Lease Endpoints
# ============================================================================

class LeaseResponse(BaseModel):
    """Response for lease details."""
    id: int
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    vehicle_vin: Optional[str]
    vehicle_color: Optional[str]
    vehicle_license_plate: Optional[str]
    status: str
    weekly_payment: float
    security_deposit: Optional[float]
    start_date: datetime
    end_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    """Dashboard summary response."""
    active_leases_count: int
    pending_requests_count: int
    total_leases_count: int
    active_lease: Optional[LeaseResponse]
    pending_request: Optional[dict]


@router.get("/leases")
async def get_customer_leases(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all leases for the current customer.

    Returns a list of all leases (active and historical).
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(Lease)
        .where(Lease.customer_profile_id == profile.id)
        .order_by(Lease.created_at.desc())
    )
    leases = result.scalars().all()

    return [
        LeaseResponse(
            id=lease.id,
            vehicle_make=lease.vehicle_make,
            vehicle_model=lease.vehicle_model,
            vehicle_year=lease.vehicle_year,
            vehicle_vin=lease.vehicle_vin,
            vehicle_color=lease.vehicle_color,
            vehicle_license_plate=lease.vehicle_license_plate,
            status=lease.status.value,
            weekly_payment=float(lease.weekly_payment),
            security_deposit=float(lease.security_deposit) if lease.security_deposit else None,
            start_date=lease.start_date,
            end_date=lease.end_date,
            notes=lease.notes,
            created_at=lease.created_at,
        )
        for lease in leases
    ]


@router.get("/active-lease")
async def get_active_lease(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the customer's current active lease.

    Returns the active lease details if one exists, otherwise null.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(Lease)
        .where(
            Lease.customer_profile_id == profile.id,
            Lease.status == LeaseStatus.ACTIVE
        )
        .order_by(Lease.start_date.desc())
        .limit(1)
    )
    lease = result.scalar_one_or_none()

    if not lease:
        return None

    return LeaseResponse(
        id=lease.id,
        vehicle_make=lease.vehicle_make,
        vehicle_model=lease.vehicle_model,
        vehicle_year=lease.vehicle_year,
        vehicle_vin=lease.vehicle_vin,
        vehicle_color=lease.vehicle_color,
        vehicle_license_plate=lease.vehicle_license_plate,
        status=lease.status.value,
        weekly_payment=float(lease.weekly_payment),
        security_deposit=float(lease.security_deposit) if lease.security_deposit else None,
        start_date=lease.start_date,
        end_date=lease.end_date,
        notes=lease.notes,
        created_at=lease.created_at,
    )


@router.get("/dashboard-summary")
async def get_dashboard_summary(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get dashboard summary for the current customer.

    Returns counts of active leases, pending requests, and total leases,
    plus details of active lease and pending request if they exist.
    """
    profile = await get_or_create_profile(user, db)

    # Count active leases
    active_leases_result = await db.execute(
        select(Lease)
        .where(
            Lease.customer_profile_id == profile.id,
            Lease.status == LeaseStatus.ACTIVE
        )
    )
    active_leases = active_leases_result.scalars().all()
    active_leases_count = len(active_leases)

    # Count total leases
    total_leases_result = await db.execute(
        select(Lease).where(Lease.customer_profile_id == profile.id)
    )
    total_leases_count = len(total_leases_result.scalars().all())

    # Count pending requests
    pending_requests_result = await db.execute(
        select(VehicleRequest)
        .where(
            VehicleRequest.customer_profile_id == profile.id,
            VehicleRequest.status.in_([
                VehicleRequestStatus.PENDING,
                VehicleRequestStatus.REVIEWING,
                VehicleRequestStatus.APPROVED,
            ])
        )
    )
    pending_requests = pending_requests_result.scalars().all()
    pending_requests_count = len(pending_requests)

    # Get active lease details (most recent)
    active_lease = None
    if active_leases:
        lease = active_leases[0]
        active_lease = LeaseResponse(
            id=lease.id,
            vehicle_make=lease.vehicle_make,
            vehicle_model=lease.vehicle_model,
            vehicle_year=lease.vehicle_year,
            vehicle_vin=lease.vehicle_vin,
            vehicle_color=lease.vehicle_color,
            vehicle_license_plate=lease.vehicle_license_plate,
            status=lease.status.value,
            weekly_payment=float(lease.weekly_payment),
            security_deposit=float(lease.security_deposit) if lease.security_deposit else None,
            start_date=lease.start_date,
            end_date=lease.end_date,
            notes=lease.notes,
            created_at=lease.created_at,
        )

    # Get pending request details (most recent)
    pending_request = None
    if pending_requests:
        req = pending_requests[0]
        pending_request = {
            "id": req.id,
            "status": req.status.value,
            "vehicle_preference": req.vehicle_preference.value,
            "created_at": req.created_at.isoformat(),
        }

    return DashboardSummary(
        active_leases_count=active_leases_count,
        pending_requests_count=pending_requests_count,
        total_leases_count=total_leases_count,
        active_lease=active_lease,
        pending_request=pending_request,
    )


# ============================================================================
# Notification Endpoints
# ============================================================================


class NotificationResponse(BaseModel):
    """Response model for a notification."""
    id: int
    notification_type: str
    title: str
    message: str
    priority: str
    is_read: bool
    read_at: Optional[datetime]
    action_url: Optional[str]
    action_label: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Response model for notification list."""
    notifications: list[NotificationResponse]
    total_count: int
    unread_count: int


class NotificationSummary(BaseModel):
    """Summary of notification counts."""
    total: int
    unread: int


@router.get("/notifications", response_model=NotificationListResponse)
async def get_notifications(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
):
    """
    Get customer's notifications.

    Returns a paginated list of notifications with unread count.
    """
    profile = await get_or_create_profile(user, db)

    # Build query
    query = select(Notification).where(
        Notification.customer_profile_id == profile.id
    )

    if unread_only:
        query = query.where(Notification.is_read == False)

    # Get total count
    count_result = await db.execute(
        select(Notification)
        .where(Notification.customer_profile_id == profile.id)
    )
    total_count = len(count_result.scalars().all())

    # Get unread count
    unread_result = await db.execute(
        select(Notification)
        .where(
            Notification.customer_profile_id == profile.id,
            Notification.is_read == False
        )
    )
    unread_count = len(unread_result.scalars().all())

    # Get paginated results
    result = await db.execute(
        query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    notifications = result.scalars().all()

    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=n.id,
                notification_type=n.notification_type.value,
                title=n.title,
                message=n.message,
                priority=n.priority.value,
                is_read=n.is_read,
                read_at=n.read_at,
                action_url=n.action_url,
                action_label=n.action_label,
                created_at=n.created_at,
            )
            for n in notifications
        ],
        total_count=total_count,
        unread_count=unread_count,
    )


@router.get("/notifications/summary", response_model=NotificationSummary)
async def get_notifications_summary(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get notification summary (counts only).

    Returns total and unread notification counts.
    """
    profile = await get_or_create_profile(user, db)

    # Get total count
    count_result = await db.execute(
        select(Notification)
        .where(Notification.customer_profile_id == profile.id)
    )
    total_count = len(count_result.scalars().all())

    # Get unread count
    unread_result = await db.execute(
        select(Notification)
        .where(
            Notification.customer_profile_id == profile.id,
            Notification.is_read == False
        )
    )
    unread_count = len(unread_result.scalars().all())

    return NotificationSummary(total=total_count, unread=unread_count)


@router.get("/notifications/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific notification by ID.

    Returns 404 if not found or not owned by current user.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.customer_profile_id == profile.id
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return NotificationResponse(
        id=notification.id,
        notification_type=notification.notification_type.value,
        title=notification.title,
        message=notification.message,
        priority=notification.priority.value,
        is_read=notification.is_read,
        read_at=notification.read_at,
        action_url=notification.action_url,
        action_label=notification.action_label,
        created_at=notification.created_at,
    )


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a notification as read.

    Returns success status and updated notification.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.customer_profile_id == profile.id
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    if not notification.is_read:
        notification.mark_as_read()
        await db.flush()
        await db.refresh(notification)

    return {
        "success": True,
        "message": "Notification marked as read",
        "notification": NotificationResponse(
            id=notification.id,
            notification_type=notification.notification_type.value,
            title=notification.title,
            message=notification.message,
            priority=notification.priority.value,
            is_read=notification.is_read,
            read_at=notification.read_at,
            action_url=notification.action_url,
            action_label=notification.action_label,
            created_at=notification.created_at,
        )
    }


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark all notifications as read.

    Returns count of notifications marked as read.
    """
    profile = await get_or_create_profile(user, db)

    # Get all unread notifications
    result = await db.execute(
        select(Notification)
        .where(
            Notification.customer_profile_id == profile.id,
            Notification.is_read == False
        )
    )
    unread_notifications = result.scalars().all()

    count = 0
    for notification in unread_notifications:
        notification.mark_as_read()
        count += 1

    if count > 0:
        await db.flush()

    return {
        "success": True,
        "message": f"Marked {count} notifications as read",
        "count": count
    }
