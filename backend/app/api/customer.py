"""
Weekly Vehicle Leasing Platform - Customer API
Salvage-to-Lux Fleet Management

Customer profile management endpoints.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List

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
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.services.email import email_service
from app.models.incident_report import IncidentReport, IncidentType, IncidentSeverity, IncidentStatus
from app.models.weekly_invoice import WeeklyInvoice, InvoiceStatus
from app.services.storage import storage_service
from app.services.vault import vault_service

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
    is_banned: bool
    ban_reason: Optional[str]
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

    Sends welcome email when a new profile is created.
    """
    # Try to find existing profile
    result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.keycloak_id == user.sub)
    )
    profile = result.scalar_one_or_none()

    is_new_profile = False
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
            is_new_profile = True
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

    # Send welcome email for new profiles
    if is_new_profile and profile.email:
        try:
            customer_name = profile.full_name or user.name or "Valued Customer"
            await email_service.send_welcome_email(
                to_email=profile.email,
                customer_name=customer_name,
            )
            logger.info(f"Welcome email sent to new customer: {profile.email}")
        except Exception as email_error:
            # Log email error but don't fail profile creation
            logger.error(f"Failed to send welcome email to {profile.email}: {email_error}")

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
        is_banned=profile.is_banned,
        ban_reason=profile.ban_reason,
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
        is_banned=profile.is_banned,
        ban_reason=profile.ban_reason,
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
        # Decrypt old key if encrypted
        old_key = profile.insurance_document_key
        if vault_service.is_encrypted(old_key):
            success_decrypt, old_key = vault_service.decrypt(old_key)
            if not success_decrypt:
                logger.warning(f"Failed to decrypt old insurance key for deletion: {old_key}")
                old_key = None
        if old_key:
            await storage_service.delete_file(
                bucket=settings.S3_BUCKET_INSURANCE,
                key=old_key
            )

    # Encrypt the storage key before storing in database
    success_encrypt, encrypted_key = vault_service.encrypt(storage_key)
    if not success_encrypt:
        logger.error(f"Failed to encrypt insurance document key: {encrypted_key}")
        raise HTTPException(
            status_code=500,
            detail="Failed to secure document metadata. Please try again."
        )

    # Update profile with encrypted key
    profile.insurance_document_key = encrypted_key
    profile.insurance_status = InsuranceStatus.PENDING
    await db.flush()
    await db.refresh(profile)

    logger.info(
        f"Insurance document uploaded for user {user.sub}: {storage_key} (encrypted in DB)"
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
        # Decrypt the storage key if encrypted
        storage_key = profile.insurance_document_key
        if vault_service.is_encrypted(storage_key):
            success, decrypted_key = vault_service.decrypt(storage_key)
            if success:
                storage_key = decrypted_key
            else:
                logger.error(f"Failed to decrypt insurance document key for user {user.sub}")
                storage_key = None

        if storage_key:
            document_url = storage_service.generate_signed_url(
                bucket=settings.S3_BUCKET_INSURANCE,
                key=storage_key,
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

    # Check if customer is banned
    if profile.is_banned:
        raise HTTPException(
            status_code=403,
            detail=f"Your account has been banned. Reason: {profile.ban_reason or 'Policy violation'}. You cannot request new vehicles. Please contact support if you believe this is an error."
        )

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
    is_banned: bool = False
    ban_reason: Optional[str] = None


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
        is_banned=profile.is_banned,
        ban_reason=profile.ban_reason,
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


# ============================================================================
# Incident Report Endpoints
# ============================================================================


class IncidentReportCreate(BaseModel):
    """Request body for creating an incident report."""
    incident_type: str
    severity: str = "medium"
    title: str
    description: str
    location: Optional[str] = None
    incident_date: Optional[datetime] = None


class IncidentReportResponse(BaseModel):
    """Response model for incident report."""
    id: int
    customer_profile_id: int
    lease_id: Optional[int]
    customer_email: str
    customer_name: Optional[str]
    incident_type: str
    severity: str
    status: str
    title: str
    description: str
    location: Optional[str]
    incident_date: datetime
    photo_keys: Optional[List[str]]
    admin_notes: Optional[str]
    resolution_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    reviewed_at: Optional[datetime]
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


class IncidentListResponse(BaseModel):
    """Response for incident list."""
    incidents: List[IncidentReportResponse]
    total_count: int


@router.post("/incidents", response_model=IncidentReportResponse)
async def create_incident_report(
    report_data: IncidentReportCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a new incident report.

    Requirements:
    - Customer must have an active lease
    - Incident type and description are required
    """
    # Get customer profile
    profile = await get_or_create_profile(user, db)

    # Check for active lease
    lease_result = await db.execute(
        select(Lease)
        .where(
            Lease.customer_profile_id == profile.id,
            Lease.status == LeaseStatus.ACTIVE
        )
        .order_by(Lease.start_date.desc())
        .limit(1)
    )
    active_lease = lease_result.scalar_one_or_none()

    if not active_lease:
        raise HTTPException(
            status_code=403,
            detail="You must have an active lease to report an incident. Please contact support if you believe this is an error."
        )

    # Validate incident type
    try:
        incident_type = IncidentType(report_data.incident_type.lower())
    except ValueError:
        valid_types = [t.value for t in IncidentType]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid incident type: {report_data.incident_type}. Valid types: {valid_types}"
        )

    # Validate severity
    try:
        severity = IncidentSeverity(report_data.severity.lower())
    except ValueError:
        valid_severities = [s.value for s in IncidentSeverity]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid severity: {report_data.severity}. Valid severities: {valid_severities}"
        )

    # Use provided date or current time
    incident_date = report_data.incident_date or datetime.now()

    # Create incident report
    incident = IncidentReport(
        customer_profile_id=profile.id,
        lease_id=active_lease.id,
        customer_email=profile.email,
        customer_name=profile.full_name,
        incident_type=incident_type,
        severity=severity,
        status=IncidentStatus.SUBMITTED,
        title=report_data.title,
        description=report_data.description,
        location=report_data.location,
        incident_date=incident_date,
        photo_keys=[],
    )

    db.add(incident)
    await db.flush()
    await db.refresh(incident)

    logger.info(f"Incident report created for customer {profile.email}: ID={incident.id}, Type={incident_type.value}")

    return IncidentReportResponse(
        id=incident.id,
        customer_profile_id=incident.customer_profile_id,
        lease_id=incident.lease_id,
        customer_email=incident.customer_email,
        customer_name=incident.customer_name,
        incident_type=incident.incident_type.value,
        severity=incident.severity.value,
        status=incident.status.value,
        title=incident.title,
        description=incident.description,
        location=incident.location,
        incident_date=incident.incident_date,
        photo_keys=incident.photo_keys,
        admin_notes=incident.admin_notes,
        resolution_notes=incident.resolution_notes,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        reviewed_at=incident.reviewed_at,
        resolved_at=incident.resolved_at,
    )


@router.get("/incidents", response_model=IncidentListResponse)
async def get_incidents(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """
    Get all incident reports for the current customer.
    """
    profile = await get_or_create_profile(user, db)

    # Get total count
    count_result = await db.execute(
        select(IncidentReport)
        .where(IncidentReport.customer_profile_id == profile.id)
    )
    total_count = len(count_result.scalars().all())

    # Get paginated results
    result = await db.execute(
        select(IncidentReport)
        .where(IncidentReport.customer_profile_id == profile.id)
        .order_by(IncidentReport.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    incidents = result.scalars().all()

    return IncidentListResponse(
        incidents=[
            IncidentReportResponse(
                id=inc.id,
                customer_profile_id=inc.customer_profile_id,
                lease_id=inc.lease_id,
                customer_email=inc.customer_email,
                customer_name=inc.customer_name,
                incident_type=inc.incident_type.value,
                severity=inc.severity.value,
                status=inc.status.value,
                title=inc.title,
                description=inc.description,
                location=inc.location,
                incident_date=inc.incident_date,
                photo_keys=inc.photo_keys,
                admin_notes=inc.admin_notes,
                resolution_notes=inc.resolution_notes,
                created_at=inc.created_at,
                updated_at=inc.updated_at,
                reviewed_at=inc.reviewed_at,
                resolved_at=inc.resolved_at,
            )
            for inc in incidents
        ],
        total_count=total_count,
    )


@router.get("/incidents/{incident_id}", response_model=IncidentReportResponse)
async def get_incident(
    incident_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific incident report by ID.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(IncidentReport)
        .where(
            IncidentReport.id == incident_id,
            IncidentReport.customer_profile_id == profile.id
        )
    )
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident report not found")

    return IncidentReportResponse(
        id=incident.id,
        customer_profile_id=incident.customer_profile_id,
        lease_id=incident.lease_id,
        customer_email=incident.customer_email,
        customer_name=incident.customer_name,
        incident_type=incident.incident_type.value,
        severity=incident.severity.value,
        status=incident.status.value,
        title=incident.title,
        description=incident.description,
        location=incident.location,
        incident_date=incident.incident_date,
        photo_keys=incident.photo_keys,
        admin_notes=incident.admin_notes,
        resolution_notes=incident.resolution_notes,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        reviewed_at=incident.reviewed_at,
        resolved_at=incident.resolved_at,
    )


@router.post("/incidents/{incident_id}/photos", response_model=dict)
async def upload_incident_photo(
    incident_id: int,
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a photo for an incident report.

    - Validates file type (images only)
    - Validates file size (max 10MB)
    - Stores file in MinIO/local storage
    - Updates incident report with photo key
    """
    profile = await get_or_create_profile(user, db)

    # Get incident report
    result = await db.execute(
        select(IncidentReport)
        .where(
            IncidentReport.id == incident_id,
            IncidentReport.customer_profile_id == profile.id
        )
    )
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident report not found")

    # Only allow photo uploads for submitted/under_review incidents
    if incident.status not in [IncidentStatus.SUBMITTED, IncidentStatus.UNDER_REVIEW]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot add photos to incident in {incident.status.value} status"
        )

    # Read file content
    file_content = await file.read()
    original_filename = file.filename or "incident_photo"

    # Allowed image types for incident photos
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    # Validate file
    is_valid, error_message, mime_type = storage_service.validate_file(
        file_content, original_filename, allowed_types=allowed_types
    )

    if not is_valid or mime_type is None:
        raise HTTPException(status_code=400, detail=error_message or "Invalid file type. Only images allowed.")

    # Generate storage key
    storage_key = storage_service.generate_storage_key(
        user_id=user.sub,
        document_type=f"incident/{incident_id}",
        original_filename=original_filename,
        mime_type=mime_type,
    )

    # Upload to storage
    success = await storage_service.upload_file(
        file_content=file_content,
        bucket=settings.S3_BUCKET_INCIDENTS,
        key=storage_key,
        content_type=mime_type,
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to upload photo. Please try again."
        )

    # Update incident with photo key
    if incident.photo_keys is None:
        incident.photo_keys = []
    incident.photo_keys = incident.photo_keys + [storage_key]  # Create new list to trigger update
    await db.flush()
    await db.refresh(incident)

    logger.info(f"Incident photo uploaded for incident {incident_id}: {storage_key}")

    return {
        "success": True,
        "message": "Photo uploaded successfully",
        "photo_key": storage_key,
        "total_photos": len(incident.photo_keys) if incident.photo_keys else 0,
    }


@router.get("/incidents/{incident_id}/photos")
async def get_incident_photos(
    incident_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get signed URLs for all photos in an incident report.
    """
    profile = await get_or_create_profile(user, db)

    # Get incident report
    result = await db.execute(
        select(IncidentReport)
        .where(
            IncidentReport.id == incident_id,
            IncidentReport.customer_profile_id == profile.id
        )
    )
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident report not found")

    # Generate signed URLs for all photos
    photos = []
    if incident.photo_keys:
        for key in incident.photo_keys:
            url = storage_service.generate_signed_url(
                bucket=settings.S3_BUCKET_INCIDENTS,
                key=key,
            )
            photos.append({
                "key": key,
                "url": url,
            })

    return {
        "incident_id": incident_id,
        "photos": photos,
        "total": len(photos),
    }


@router.get("/can-report-incident")
async def can_report_incident(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if the current customer can report an incident.

    Returns eligibility status and reasons.
    """
    profile = await get_or_create_profile(user, db)

    # Check for active lease
    lease_result = await db.execute(
        select(Lease)
        .where(
            Lease.customer_profile_id == profile.id,
            Lease.status == LeaseStatus.ACTIVE
        )
        .limit(1)
    )
    active_lease = lease_result.scalar_one_or_none()
    has_active_lease = active_lease is not None

    # Determine if can report
    can_report = has_active_lease

    # Build reasons list
    reasons = []
    if not has_active_lease:
        reasons.append("You must have an active lease to report an incident")

    return {
        "can_report": can_report,
        "has_active_lease": has_active_lease,
        "active_lease_id": active_lease.id if active_lease else None,
        "reasons": reasons,
    }


# ============================================================================
# Weekly Invoice Endpoints
# ============================================================================


class InvoiceResponse(BaseModel):
    """Response model for a weekly invoice."""
    id: int
    invoice_number: str
    week_number: int
    amount: float
    late_fee: float
    total_amount: float
    period_start: datetime
    period_end: datetime
    due_date: datetime
    status: str
    payment_method: Optional[str]
    payment_proof_uploaded_at: Optional[datetime]
    verified_at: Optional[datetime]
    rejection_reason: Optional[str]
    is_late: bool
    days_late: int
    notes: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """Response for invoice list."""
    invoices: List[InvoiceResponse]
    total_count: int
    pending_count: int
    paid_count: int
    total_due: float


class PaymentProofUploadResponse(BaseModel):
    """Response for payment proof upload."""
    success: bool
    message: str
    invoice_id: int
    invoice_number: str
    status: str
    proof_uploaded_at: Optional[datetime]
    is_duplicate_flagged: bool = False
    duplicate_warning: Optional[str] = None


@router.get("/invoices", response_model=InvoiceListResponse)
async def get_invoices(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Get all weekly invoices for the current customer.

    Returns a paginated list of invoices with summary statistics.
    """
    profile = await get_or_create_profile(user, db)

    # Build base query
    query = select(WeeklyInvoice).where(
        WeeklyInvoice.customer_profile_id == profile.id
    )

    # Apply status filter if provided
    if status_filter:
        try:
            status_enum = InvoiceStatus(status_filter.lower())
            query = query.where(WeeklyInvoice.status == status_enum)
        except ValueError:
            pass  # Ignore invalid status filter

    # Get total count (without filter for statistics)
    all_invoices_result = await db.execute(
        select(WeeklyInvoice).where(
            WeeklyInvoice.customer_profile_id == profile.id
        )
    )
    all_invoices = all_invoices_result.scalars().all()
    total_count = len(all_invoices)

    # Calculate statistics
    pending_count = len([i for i in all_invoices if i.status in [
        InvoiceStatus.PENDING, InvoiceStatus.DUE, InvoiceStatus.LATE,
        InvoiceStatus.VERIFICATION_IN_PROGRESS, InvoiceStatus.REJECTED
    ]])
    paid_count = len([i for i in all_invoices if i.status == InvoiceStatus.PAID])
    total_due = float(sum(
        i.total_amount for i in all_invoices
        if i.status in [InvoiceStatus.DUE, InvoiceStatus.LATE, InvoiceStatus.REJECTED]
    ))

    # Get paginated results
    result = await db.execute(
        query.order_by(WeeklyInvoice.due_date.desc())
        .offset(offset)
        .limit(limit)
    )
    invoices = result.scalars().all()

    return InvoiceListResponse(
        invoices=[
            InvoiceResponse(
                id=inv.id,
                invoice_number=inv.invoice_number,
                week_number=inv.week_number,
                amount=float(inv.amount),
                late_fee=float(inv.late_fee),
                total_amount=float(inv.total_amount),
                period_start=inv.period_start,
                period_end=inv.period_end,
                due_date=inv.due_date,
                status=inv.status.value,
                payment_method=inv.payment_method,
                payment_proof_uploaded_at=inv.payment_proof_uploaded_at,
                verified_at=inv.verified_at,
                rejection_reason=inv.rejection_reason,
                is_late=inv.is_late,
                days_late=inv.days_late,
                notes=inv.notes,
                created_at=inv.created_at,
                paid_at=inv.paid_at,
            )
            for inv in invoices
        ],
        total_count=total_count,
        pending_count=pending_count,
        paid_count=paid_count,
        total_due=total_due,
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific invoice by ID.

    Returns 404 if not found or not owned by current user.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(WeeklyInvoice).where(
            WeeklyInvoice.id == invoice_id,
            WeeklyInvoice.customer_profile_id == profile.id
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        week_number=invoice.week_number,
        amount=float(invoice.amount),
        late_fee=float(invoice.late_fee),
        total_amount=float(invoice.total_amount),
        period_start=invoice.period_start,
        period_end=invoice.period_end,
        due_date=invoice.due_date,
        status=invoice.status.value,
        payment_method=invoice.payment_method,
        payment_proof_uploaded_at=invoice.payment_proof_uploaded_at,
        verified_at=invoice.verified_at,
        rejection_reason=invoice.rejection_reason,
        is_late=invoice.is_late,
        days_late=invoice.days_late,
        notes=invoice.notes,
        created_at=invoice.created_at,
        paid_at=invoice.paid_at,
    )


@router.get("/invoices/{invoice_id}/payment-proof")
async def get_payment_proof(
    invoice_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get signed URL for payment proof document.

    Returns the signed URL for viewing the payment proof if one exists.
    """
    profile = await get_or_create_profile(user, db)

    result = await db.execute(
        select(WeeklyInvoice).where(
            WeeklyInvoice.id == invoice_id,
            WeeklyInvoice.customer_profile_id == profile.id
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not invoice.payment_proof_key:
        return {
            "has_proof": False,
            "message": "No payment proof uploaded for this invoice"
        }

    # Generate signed URL
    url = storage_service.generate_signed_url(
        bucket=settings.S3_BUCKET_PAYMENTS,
        key=invoice.payment_proof_key,
    )

    return {
        "has_proof": True,
        "url": url,
        "uploaded_at": invoice.payment_proof_uploaded_at,
        "payment_method": invoice.payment_method,
    }


@router.post("/invoices/{invoice_id}/upload-proof", response_model=PaymentProofUploadResponse)
async def upload_payment_proof(
    invoice_id: int,
    file: UploadFile = File(...),
    payment_method: str = "zelle",
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload payment proof for an invoice.

    - Validates file type (images only)
    - Validates file size (max 10MB)
    - Stores file in MinIO/local storage
    - Updates invoice status to verification_in_progress
    - Computes hash for duplicate detection
    """
    profile = await get_or_create_profile(user, db)

    # Get invoice
    result = await db.execute(
        select(WeeklyInvoice).where(
            WeeklyInvoice.id == invoice_id,
            WeeklyInvoice.customer_profile_id == profile.id
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Check if invoice can have proof uploaded
    allowed_statuses = [
        InvoiceStatus.DUE,
        InvoiceStatus.LATE,
        InvoiceStatus.REJECTED,  # Allow re-upload after rejection
    ]
    if invoice.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot upload payment proof for invoice in {invoice.status.value} status. "
                   f"Allowed statuses: {[s.value for s in allowed_statuses]}"
        )

    # Read file content
    file_content = await file.read()
    original_filename = file.filename or "payment_proof"

    # Allowed image types for payment proof
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    # Validate file
    is_valid, error_message, mime_type = storage_service.validate_file(
        file_content, original_filename, allowed_types=allowed_types
    )

    if not is_valid or mime_type is None:
        raise HTTPException(status_code=400, detail=error_message or "Invalid file type. Only images allowed.")

    # Compute file hash for duplicate detection
    file_hash = storage_service.compute_file_hash(file_content)
    logger.info(f"Payment proof hash for invoice {invoice.invoice_number}: {file_hash[:16]}...")

    # Check for duplicate payment proof (potential fraud detection)
    duplicate_invoice = None
    is_duplicate = False
    duplicate_warning = None

    existing_with_hash = await db.execute(
        select(WeeklyInvoice).where(
            WeeklyInvoice.payment_proof_hash == file_hash,
            WeeklyInvoice.id != invoice_id  # Exclude current invoice
        ).limit(1)  # Only need to find one duplicate
    )
    duplicate_invoice = existing_with_hash.scalar_one_or_none()

    if duplicate_invoice:
        is_duplicate = True
        duplicate_warning = (
            f"Warning: This payment proof appears to match a previously uploaded screenshot "
            f"(Invoice #{duplicate_invoice.invoice_number}). This has been flagged for review."
        )
        logger.warning(
            f"Potential duplicate payment proof detected! "
            f"Invoice {invoice.invoice_number} matches hash from Invoice {duplicate_invoice.invoice_number}. "
            f"User: {user.email}"
        )

    # Generate storage key
    storage_key = storage_service.generate_storage_key(
        user_id=user.sub,
        document_type=f"payment/{invoice.invoice_number}",
        original_filename=original_filename,
        mime_type=mime_type,
    )

    # Delete old payment proof if exists
    if invoice.payment_proof_key:
        await storage_service.delete_file(
            bucket=settings.S3_BUCKET_PAYMENTS,
            key=invoice.payment_proof_key
        )

    # Upload to storage
    success = await storage_service.upload_file(
        file_content=file_content,
        bucket=settings.S3_BUCKET_PAYMENTS,
        key=storage_key,
        content_type=mime_type,
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to upload payment proof. Please try again."
        )

    # Update invoice
    invoice.payment_proof_key = storage_key
    invoice.payment_proof_hash = file_hash
    invoice.payment_proof_uploaded_at = datetime.now(timezone.utc)
    invoice.payment_method = payment_method
    invoice.status = InvoiceStatus.VERIFICATION_IN_PROGRESS
    invoice.rejection_reason = None  # Clear any previous rejection reason

    # Set duplicate detection flags if duplicate found
    if is_duplicate and duplicate_invoice:
        invoice.is_duplicate_flagged = True
        invoice.duplicate_of_invoice_id = duplicate_invoice.id
        invoice.duplicate_flagged_at = datetime.now(timezone.utc)
    else:
        invoice.is_duplicate_flagged = False
        invoice.duplicate_of_invoice_id = None
        invoice.duplicate_flagged_at = None

    await db.flush()
    await db.refresh(invoice)

    logger.info(
        f"Payment proof uploaded for invoice {invoice.invoice_number} by {user.email}"
        f"{' (FLAGGED AS DUPLICATE)' if is_duplicate else ''}"
    )

    # Send verification pending email (48-hour verification notice)
    try:
        await email_service.send_payment_verification_pending(
            to_email=profile.email,
            customer_name=profile.full_name or "Valued Customer",
            invoice_number=invoice.invoice_number,
            amount=float(invoice.total_amount),
            uploaded_at=invoice.payment_proof_uploaded_at.strftime("%Y-%m-%d %H:%M UTC") if invoice.payment_proof_uploaded_at else datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        )
        logger.info(f"Payment verification pending email sent to {profile.email} for invoice {invoice.invoice_number}")
    except Exception as e:
        # Log error but don't fail the upload - email is non-critical
        logger.error(f"Failed to send payment verification email for invoice {invoice.invoice_number}: {e}")

    # Create in-app notification for payment proof received
    try:
        notification = Notification(
            customer_profile_id=profile.id,
            notification_type=NotificationType.PAYMENT_RECEIVED,
            title="Payment Proof Received",
            message=f"Your payment proof for Invoice #{invoice.invoice_number} (${invoice.total_amount:.2f}) has been received. "
                    f"Verification typically takes up to 48 hours. We'll notify you once verified.",
            priority=NotificationPriority.NORMAL,
            related_entity_type="invoice",
            related_entity_id=invoice.id,
            action_url=f"/dashboard/invoices/{invoice.id}",
            action_label="View Invoice",
        )
        db.add(notification)
        await db.flush()
        logger.info(f"In-app notification created for payment proof upload - invoice {invoice.invoice_number}")
    except Exception as e:
        # Log error but don't fail the upload - notification is non-critical
        logger.error(f"Failed to create notification for invoice {invoice.invoice_number}: {e}")

    # Build response message
    response_message = "Payment proof uploaded successfully. Verification in progress (48 hours)."
    if is_duplicate:
        response_message = (
            "Payment proof uploaded but has been FLAGGED for review. "
            "This screenshot appears to match a previous upload. Our team will verify manually."
        )

    return PaymentProofUploadResponse(
        success=True,
        message=response_message,
        invoice_id=invoice.id,
        invoice_number=invoice.invoice_number,
        status=invoice.status.value,
        proof_uploaded_at=invoice.payment_proof_uploaded_at,
        is_duplicate_flagged=is_duplicate,
        duplicate_warning=duplicate_warning,
    )


@router.get("/invoices/summary/stats")
async def get_invoice_summary(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get invoice summary statistics for the customer.

    Returns counts and totals for different invoice statuses.
    """
    profile = await get_or_create_profile(user, db)

    # Get all invoices
    result = await db.execute(
        select(WeeklyInvoice).where(
            WeeklyInvoice.customer_profile_id == profile.id
        )
    )
    invoices = result.scalars().all()

    # Calculate statistics
    total_count = len(invoices)
    pending_count = len([i for i in invoices if i.status in [
        InvoiceStatus.PENDING, InvoiceStatus.DUE
    ]])
    verification_count = len([i for i in invoices if i.status == InvoiceStatus.VERIFICATION_IN_PROGRESS])
    paid_count = len([i for i in invoices if i.status == InvoiceStatus.PAID])
    late_count = len([i for i in invoices if i.status == InvoiceStatus.LATE])
    rejected_count = len([i for i in invoices if i.status == InvoiceStatus.REJECTED])

    total_paid = float(sum(i.total_amount for i in invoices if i.status == InvoiceStatus.PAID))
    total_due = float(sum(
        i.total_amount for i in invoices
        if i.status in [InvoiceStatus.DUE, InvoiceStatus.LATE, InvoiceStatus.REJECTED]
    ))
    total_pending_verification = float(sum(
        i.total_amount for i in invoices
        if i.status == InvoiceStatus.VERIFICATION_IN_PROGRESS
    ))

    return {
        "total_invoices": total_count,
        "pending_count": pending_count,
        "verification_count": verification_count,
        "paid_count": paid_count,
        "late_count": late_count,
        "rejected_count": rejected_count,
        "total_paid": total_paid,
        "total_due": total_due,
        "total_pending_verification": total_pending_verification,
    }
