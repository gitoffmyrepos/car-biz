"""
Weekly Vehicle Leasing Platform - Admin API
Salvage-to-Lux Fleet Management

Admin-only API endpoints with RBAC protection.
"""

import logging
from typing import Any, Optional
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, Query, status, UploadFile
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
from app.models.audit_log import AuditLog, AuditAction
from app.models.lease import Lease, LeaseStatus
from app.models.weekly_invoice import WeeklyInvoice, InvoiceStatus
from app.models.vehicle_request import VehicleRequest, VehicleRequestStatus
from app.models.vehicle import Vehicle, VehicleStatus, VehicleCondition
from app.models.tracker_device import TrackerDevice, TrackerStatus
from app.models.maintenance_schedule import (
    MaintenanceSchedule,
    MaintenanceType,
    MaintenanceStatus,
    MaintenancePriority,
)
from app.models.delinquency_case import (
    DelinquencyCase,
    DelinquencyStatus,
    EscalationLevel,
)
from app.models.recovery_action import (
    RecoveryAction,
    RecoveryStatus,
)
from app.models.ban_record import (
    BanRecord,
    BanReason,
    BanStatus,
)
from app.models.incident_report import (
    IncidentReport,
    IncidentType,
    IncidentSeverity,
    IncidentStatus,
)
from app.services.storage import storage_service
from app.services.audit import audit_service
from app.services.notification import notification_service
from app.services.invoice import invoice_service
from app.services.email import email_service
from app.services.vault import vault_service

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/admin", tags=["Admin"])


class DashboardStatsResponse(BaseModel):
    """Admin dashboard statistics."""
    total_inquiries: int
    new_inquiries: int
    total_customers: int
    active_leases: int
    pending_payments: int
    pending_vehicle_requests: int
    pending_verifications: int
    late_invoices: int
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
    _user: AuthenticatedUser = Depends(require_admin),
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

    # Get customer counts
    total_customers = await session.scalar(
        select(func.count()).select_from(CustomerProfile)
    )

    # Get active lease count
    active_leases = await session.scalar(
        select(func.count()).select_from(Lease).where(Lease.status == LeaseStatus.ACTIVE)
    )

    # Get pending payment verification count
    pending_payments = await session.scalar(
        select(func.count()).select_from(WeeklyInvoice).where(
            WeeklyInvoice.status == InvoiceStatus.VERIFICATION_IN_PROGRESS
        )
    )

    # Get pending vehicle request count
    pending_vehicle_requests = await session.scalar(
        select(func.count()).select_from(VehicleRequest).where(
            VehicleRequest.status.in_([VehicleRequestStatus.PENDING, VehicleRequestStatus.REVIEWING])
        )
    )

    # Get customers pending insurance verification
    pending_verifications = await session.scalar(
        select(func.count()).select_from(CustomerProfile).where(
            CustomerProfile.insurance_status == InsuranceStatus.PENDING
        )
    )

    # Get late invoice count
    late_invoices = await session.scalar(
        select(func.count()).select_from(WeeklyInvoice).where(
            WeeklyInvoice.status == InvoiceStatus.LATE
        )
    )

    return DashboardStatsResponse(
        total_inquiries=total_inquiries or 0,
        new_inquiries=new_inquiries or 0,
        total_customers=total_customers or 0,
        active_leases=active_leases or 0,
        pending_payments=pending_payments or 0,
        pending_vehicle_requests=pending_vehicle_requests or 0,
        pending_verifications=pending_verifications or 0,
        late_invoices=late_invoices or 0,
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


class CustomerUpdateRequest(BaseModel):
    """Request body for admin customer update."""
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
    is_verified: Optional[bool] = None


@router.put("/customers/{customer_id}")
async def update_customer(
    customer_id: int,
    update_data: CustomerUpdateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Update customer profile.

    Requires admin role.
    Updates only the fields that are provided (non-null).
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

    # Update only provided fields
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        if value is not None:
            setattr(customer, field, value)

    customer.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(customer)

    # Log the update
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.ADMIN_ACTION,
        target_type="CustomerProfile",
        target_id=str(customer.id),
        target_description=f"Updated customer {customer.email}",
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


class InsuranceAccessRequest(BaseModel):
    """Request to access insurance document (requires reason for audit)."""
    reason: str


@router.post("/customers/{customer_id}/insurance-document")
async def get_insurance_document_url(
    customer_id: int,
    request: InsuranceAccessRequest,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get signed URL for customer's insurance document.

    Requires admin or ops role.
    Returns a time-limited signed URL for viewing the document.

    IMPORTANT: This is a break-glass access operation.
    A reason must be provided and will be recorded in the audit log.
    """
    if not request.reason or len(request.reason.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A reason for access is required (minimum 10 characters)"
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

    if not customer.insurance_document_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No insurance document uploaded"
        )

    # Decrypt the storage key if encrypted
    storage_key = customer.insurance_document_key
    if vault_service.is_encrypted(storage_key):
        success, decrypted_key = vault_service.decrypt(storage_key)
        if success:
            storage_key = decrypted_key
        else:
            logger.error(f"Failed to decrypt insurance document key for customer {customer_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to decrypt document metadata"
            )

    # Generate signed URL (valid for 5 minutes)
    signed_url = storage_service.generate_signed_url(
        bucket=settings.S3_BUCKET_INSURANCE,
        key=storage_key,
        expires_in=300,  # 5 minutes
    )

    # Create audit log entry for this access
    await audit_service.log_insurance_document_access(
        session=session,
        user=user,
        customer_id=customer_id,
        customer_email=customer.email,
        reason=request.reason.strip(),
    )

    logger.info(f"Admin {user.email} accessed insurance document for customer {customer_id} (reason: {request.reason[:50]}...)")

    return {
        "customer_id": customer_id,
        "document_url": signed_url,
        "expires_in_seconds": 300,
        "accessed_by": user.email,
        "access_reason": request.reason,
        "audit_logged": True,
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
    is_approved = request.action == "approve"

    if is_approved:
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

    # Create audit log entry for verification decision
    await audit_service.log_insurance_verification(
        session=session,
        user=user,
        customer_id=customer_id,
        customer_email=customer.email,
        approved=is_approved,
        old_status=old_status,
        new_status=customer.insurance_status.value,
        expiration_date=request.expiration_date if is_approved else None,
        notes=request.notes,
    )

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


# =============================================================================
# Audit Log Management
# =============================================================================

class AuditLogResponse(BaseModel):
    """Audit log entry for API response."""
    id: int
    actor_id: str
    actor_email: str
    actor_role: str
    action: str
    target_type: str
    target_id: str
    target_description: Optional[str]
    reason: Optional[str]
    requires_reason: bool
    notes: Optional[str]
    success: bool
    timestamp: datetime

    class Config:
        from_attributes = True


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    action_filter: Optional[str] = Query(None, description="Filter by action type"),
    target_type_filter: Optional[str] = Query(None, description="Filter by target type"),
    actor_email_filter: Optional[str] = Query(None, description="Filter by actor email"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    List audit log entries.

    Requires admin role.
    Supports filtering by action type, target type, and actor email.
    """
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())

    if action_filter:
        try:
            action_enum = AuditAction(action_filter)
            query = query.where(AuditLog.action == action_enum)
        except ValueError:
            valid_actions = [a.value for a in AuditAction]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action filter. Must be one of: {', '.join(valid_actions)}"
            )

    if target_type_filter:
        query = query.where(AuditLog.target_type == target_type_filter)

    if actor_email_filter:
        query = query.where(AuditLog.actor_email.ilike(f"%{actor_email_filter}%"))

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    logs = result.scalars().all()

    return [
        AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            actor_email=log.actor_email,
            actor_role=log.actor_role,
            action=log.action.value,
            target_type=log.target_type,
            target_id=log.target_id,
            target_description=log.target_description,
            reason=log.reason,
            requires_reason=log.requires_reason,
            notes=log.notes,
            success=log.success,
            timestamp=log.timestamp,
        )
        for log in logs
    ]


@router.get("/audit-logs/insurance", response_model=list[AuditLogResponse])
async def list_insurance_audit_logs(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    List audit log entries specifically for insurance-related actions.

    Requires admin role.
    This provides a focused view of all insurance document access and verification actions.
    """
    insurance_actions = [
        AuditAction.INSURANCE_DOCUMENT_VIEW,
        AuditAction.INSURANCE_DOCUMENT_DOWNLOAD,
        AuditAction.INSURANCE_VERIFICATION_APPROVE,
        AuditAction.INSURANCE_VERIFICATION_REJECT,
        AuditAction.INSURANCE_BREAK_GLASS_ACCESS,
    ]

    query = (
        select(AuditLog)
        .where(AuditLog.action.in_(insurance_actions))
        .order_by(AuditLog.timestamp.desc())
    )

    if customer_id:
        query = query.where(AuditLog.target_id == str(customer_id))

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    logs = result.scalars().all()

    return [
        AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            actor_email=log.actor_email,
            actor_role=log.actor_role,
            action=log.action.value,
            target_type=log.target_type,
            target_id=log.target_id,
            target_description=log.target_description,
            reason=log.reason,
            requires_reason=log.requires_reason,
            notes=log.notes,
            success=log.success,
            timestamp=log.timestamp,
        )
        for log in logs
    ]


@router.get("/audit-logs/{log_id}")
async def get_audit_log_detail(
    log_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get detailed audit log entry including before/after state.

    Requires admin role.
    """
    result = await session.execute(
        select(AuditLog).where(AuditLog.id == log_id)
    )
    log = result.scalar_one_or_none()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log entry not found"
        )

    return {
        "id": log.id,
        "actor_id": log.actor_id,
        "actor_email": log.actor_email,
        "actor_role": log.actor_role,
        "action": log.action.value,
        "target_type": log.target_type,
        "target_id": log.target_id,
        "target_description": log.target_description,
        "request_id": log.request_id,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "before_state": log.before_state,
        "after_state": log.after_state,
        "reason": log.reason,
        "requires_reason": log.requires_reason,
        "notes": log.notes,
        "success": log.success,
        "error_message": log.error_message,
        "timestamp": log.timestamp.isoformat(),
    }


# =============================================================================
# Vehicle Management (CRUD)
# =============================================================================

class VehicleCreateRequest(BaseModel):
    """Request to create a new vehicle."""
    vin: str
    make: str
    model: str
    year: int
    color: Optional[str] = None
    body_type: Optional[str] = None
    license_plate: Optional[str] = None
    engine: Optional[str] = None
    transmission: Optional[str] = None
    mileage: Optional[int] = None
    weekly_rate: float = 150.00
    security_deposit: Optional[float] = None
    status: str = "available"
    condition: str = "good"
    acquisition_source: Optional[str] = None
    acquisition_cost: Optional[float] = None
    repair_cost: Optional[float] = None
    notes: Optional[str] = None
    show_on_fleet_page: bool = True


class VehicleUpdateRequest(BaseModel):
    """Request to update a vehicle."""
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    body_type: Optional[str] = None
    license_plate: Optional[str] = None
    engine: Optional[str] = None
    transmission: Optional[str] = None
    mileage: Optional[int] = None
    weekly_rate: Optional[float] = None
    security_deposit: Optional[float] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    show_on_fleet_page: Optional[bool] = None


class VehicleResponse(BaseModel):
    """Vehicle response for API."""
    id: int
    vin: str
    make: str
    model: str
    year: int
    color: Optional[str]
    body_type: Optional[str]
    license_plate: Optional[str]
    engine: Optional[str]
    transmission: Optional[str]
    mileage: Optional[int]
    weekly_rate: float
    security_deposit: Optional[float]
    status: str
    condition: str
    acquisition_source: Optional[str]
    acquisition_cost: Optional[float]
    repair_cost: Optional[float]
    current_lease_id: Optional[int]
    current_tracker_id: Optional[int]
    notes: Optional[str]
    admin_notes: Optional[str]
    is_active: bool
    show_on_fleet_page: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/vehicles", response_model=list[VehicleResponse])
async def list_vehicles(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List all vehicles in the fleet.

    Requires admin or ops role.
    Optionally filter by status: available, leased, maintenance, unavailable, pending_inspection
    """
    query = select(Vehicle).where(Vehicle.is_active == True).order_by(Vehicle.created_at.desc())

    if status_filter:
        try:
            status_enum = VehicleStatus(status_filter)
            query = query.where(Vehicle.status == status_enum)
        except ValueError:
            valid_statuses = [s.value for s in VehicleStatus]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    vehicles = result.scalars().all()

    return [
        VehicleResponse(
            id=v.id,
            vin=v.vin,
            make=v.make,
            model=v.model,
            year=v.year,
            color=v.color,
            body_type=v.body_type,
            license_plate=v.license_plate,
            engine=v.engine,
            transmission=v.transmission,
            mileage=v.mileage,
            weekly_rate=float(v.weekly_rate) if v.weekly_rate else 0.0,
            security_deposit=float(v.security_deposit) if v.security_deposit else None,
            status=v.status.value,
            condition=v.condition.value,
            acquisition_source=v.acquisition_source,
            acquisition_cost=float(v.acquisition_cost) if v.acquisition_cost else None,
            repair_cost=float(v.repair_cost) if v.repair_cost else None,
            current_lease_id=v.current_lease_id,
            current_tracker_id=v.current_tracker_id,
            notes=v.notes,
            admin_notes=v.admin_notes,
            is_active=v.is_active,
            show_on_fleet_page=v.show_on_fleet_page,
            created_at=v.created_at,
            updated_at=v.updated_at,
        )
        for v in vehicles
    ]


@router.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get a specific vehicle by ID.

    Requires admin or ops role.
    """
    result = await session.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    return VehicleResponse(
        id=vehicle.id,
        vin=vehicle.vin,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        body_type=vehicle.body_type,
        license_plate=vehicle.license_plate,
        engine=vehicle.engine,
        transmission=vehicle.transmission,
        mileage=vehicle.mileage,
        weekly_rate=float(vehicle.weekly_rate) if vehicle.weekly_rate else 0.0,
        security_deposit=float(vehicle.security_deposit) if vehicle.security_deposit else None,
        status=vehicle.status.value,
        condition=vehicle.condition.value,
        acquisition_source=vehicle.acquisition_source,
        acquisition_cost=float(vehicle.acquisition_cost) if vehicle.acquisition_cost else None,
        repair_cost=float(vehicle.repair_cost) if vehicle.repair_cost else None,
        current_lease_id=vehicle.current_lease_id,
        current_tracker_id=vehicle.current_tracker_id,
        notes=vehicle.notes,
        admin_notes=vehicle.admin_notes,
        is_active=vehicle.is_active,
        show_on_fleet_page=vehicle.show_on_fleet_page,
        created_at=vehicle.created_at,
        updated_at=vehicle.updated_at,
    )


@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    request: VehicleCreateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Create a new vehicle.

    Requires admin role.
    """
    # Check VIN uniqueness
    existing = await session.execute(
        select(Vehicle).where(Vehicle.vin == request.vin)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with VIN '{request.vin}' already exists"
        )

    # Validate status
    try:
        status_enum = VehicleStatus(request.status)
    except ValueError:
        valid_statuses = [s.value for s in VehicleStatus]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Validate condition
    try:
        condition_enum = VehicleCondition(request.condition)
    except ValueError:
        valid_conditions = [c.value for c in VehicleCondition]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid condition. Must be one of: {', '.join(valid_conditions)}"
        )

    # Create vehicle
    vehicle = Vehicle(
        vin=request.vin,
        make=request.make,
        model=request.model,
        year=request.year,
        color=request.color,
        body_type=request.body_type,
        license_plate=request.license_plate,
        engine=request.engine,
        transmission=request.transmission,
        mileage=request.mileage,
        weekly_rate=request.weekly_rate,
        security_deposit=request.security_deposit,
        status=status_enum,
        condition=condition_enum,
        acquisition_source=request.acquisition_source,
        acquisition_cost=request.acquisition_cost,
        repair_cost=request.repair_cost,
        notes=request.notes,
        show_on_fleet_page=request.show_on_fleet_page,
    )

    session.add(vehicle)
    await session.flush()
    await session.refresh(vehicle)

    logger.info(f"Admin {user.email} created vehicle {vehicle.id} (VIN: {vehicle.vin})")

    return VehicleResponse(
        id=vehicle.id,
        vin=vehicle.vin,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        body_type=vehicle.body_type,
        license_plate=vehicle.license_plate,
        engine=vehicle.engine,
        transmission=vehicle.transmission,
        mileage=vehicle.mileage,
        weekly_rate=float(vehicle.weekly_rate) if vehicle.weekly_rate else 0.0,
        security_deposit=float(vehicle.security_deposit) if vehicle.security_deposit else None,
        status=vehicle.status.value,
        condition=vehicle.condition.value,
        acquisition_source=vehicle.acquisition_source,
        acquisition_cost=float(vehicle.acquisition_cost) if vehicle.acquisition_cost else None,
        repair_cost=float(vehicle.repair_cost) if vehicle.repair_cost else None,
        current_lease_id=vehicle.current_lease_id,
        current_tracker_id=vehicle.current_tracker_id,
        notes=vehicle.notes,
        admin_notes=vehicle.admin_notes,
        is_active=vehicle.is_active,
        show_on_fleet_page=vehicle.show_on_fleet_page,
        created_at=vehicle.created_at,
        updated_at=vehicle.updated_at,
    )


@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    request: VehicleUpdateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Update an existing vehicle.

    Requires admin role.
    """
    result = await session.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    # Update fields if provided
    if request.make is not None:
        vehicle.make = request.make
    if request.model is not None:
        vehicle.model = request.model
    if request.year is not None:
        vehicle.year = request.year
    if request.color is not None:
        vehicle.color = request.color
    if request.body_type is not None:
        vehicle.body_type = request.body_type
    if request.license_plate is not None:
        vehicle.license_plate = request.license_plate
    if request.engine is not None:
        vehicle.engine = request.engine
    if request.transmission is not None:
        vehicle.transmission = request.transmission
    if request.mileage is not None:
        vehicle.mileage = request.mileage
    if request.weekly_rate is not None:
        vehicle.weekly_rate = Decimal(str(request.weekly_rate))
    if request.security_deposit is not None:
        vehicle.security_deposit = Decimal(str(request.security_deposit))
    if request.notes is not None:
        vehicle.notes = request.notes
    if request.admin_notes is not None:
        vehicle.admin_notes = request.admin_notes
    if request.show_on_fleet_page is not None:
        vehicle.show_on_fleet_page = request.show_on_fleet_page

    # Validate and update status
    if request.status is not None:
        try:
            status_enum = VehicleStatus(request.status)
            vehicle.status = status_enum
        except ValueError:
            valid_statuses = [s.value for s in VehicleStatus]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

    # Validate and update condition
    if request.condition is not None:
        try:
            condition_enum = VehicleCondition(request.condition)
            vehicle.condition = condition_enum
        except ValueError:
            valid_conditions = [c.value for c in VehicleCondition]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid condition. Must be one of: {', '.join(valid_conditions)}"
            )

    vehicle.updated_at = datetime.now(timezone.utc)

    await session.flush()
    await session.refresh(vehicle)

    logger.info(f"Admin {user.email} updated vehicle {vehicle.id} (VIN: {vehicle.vin})")

    return VehicleResponse(
        id=vehicle.id,
        vin=vehicle.vin,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        body_type=vehicle.body_type,
        license_plate=vehicle.license_plate,
        engine=vehicle.engine,
        transmission=vehicle.transmission,
        mileage=vehicle.mileage,
        weekly_rate=float(vehicle.weekly_rate) if vehicle.weekly_rate else 0.0,
        security_deposit=float(vehicle.security_deposit) if vehicle.security_deposit else None,
        status=vehicle.status.value,
        condition=vehicle.condition.value,
        acquisition_source=vehicle.acquisition_source,
        acquisition_cost=float(vehicle.acquisition_cost) if vehicle.acquisition_cost else None,
        repair_cost=float(vehicle.repair_cost) if vehicle.repair_cost else None,
        current_lease_id=vehicle.current_lease_id,
        current_tracker_id=vehicle.current_tracker_id,
        notes=vehicle.notes,
        admin_notes=vehicle.admin_notes,
        is_active=vehicle.is_active,
        show_on_fleet_page=vehicle.show_on_fleet_page,
        created_at=vehicle.created_at,
        updated_at=vehicle.updated_at,
    )


@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Delete a vehicle (soft delete by setting is_active=False).

    Requires admin role.
    Cannot delete vehicles with active leases.
    """
    result = await session.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    # Check for active leases
    if vehicle.current_lease_id:
        lease_result = await session.execute(
            select(Lease).where(
                Lease.id == vehicle.current_lease_id,
                Lease.status == LeaseStatus.ACTIVE
            )
        )
        active_lease = lease_result.scalar_one_or_none()
        if active_lease:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete vehicle with active lease"
            )

    # Soft delete
    vehicle.is_active = False
    vehicle.updated_at = datetime.now(timezone.utc)

    logger.info(f"Admin {user.email} deleted (soft) vehicle {vehicle.id} (VIN: {vehicle.vin})")

    return {
        "success": True,
        "message": f"Vehicle {vehicle.vin} has been deleted",
        "vehicle_id": vehicle.id,
        "deleted_by": user.email,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# Vehicle Condition Reports
# =============================================================================

from app.models.vehicle_condition_report import (
    VehicleConditionReport,
    ConditionReportType,
    OverallCondition,
)


class ConditionReportCreateRequest(BaseModel):
    """Request to create a vehicle condition report."""
    vehicle_id: int
    report_type: str  # pre_lease, post_lease, periodic, incident, maintenance, acquisition
    overall_condition: str  # excellent, good, fair, poor, needs_repair
    mileage: int
    exterior_notes: Optional[str] = None
    interior_notes: Optional[str] = None
    mechanical_notes: Optional[str] = None
    damage_notes: Optional[str] = None
    damage_details: Optional[dict] = None
    fuel_level: Optional[int] = None
    tire_condition: Optional[str] = None
    lease_id: Optional[int] = None
    incident_report_id: Optional[int] = None
    admin_notes: Optional[str] = None


class ConditionReportResponse(BaseModel):
    """Vehicle condition report response for API."""
    id: int
    vehicle_id: int
    report_type: str
    overall_condition: str
    mileage: int
    exterior_notes: Optional[str]
    interior_notes: Optional[str]
    mechanical_notes: Optional[str]
    damage_notes: Optional[str]
    damage_details: Optional[dict]
    photo_keys: Optional[list]
    fuel_level: Optional[int]
    tire_condition: Optional[str]
    created_by_id: str
    created_by_email: str
    lease_id: Optional[int]
    incident_report_id: Optional[int]
    admin_notes: Optional[str]
    report_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/vehicles/{vehicle_id}/condition-reports", response_model=list[ConditionReportResponse])
async def list_vehicle_condition_reports(
    vehicle_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List condition reports for a specific vehicle.

    Requires admin or ops role.
    Reports are returned in reverse chronological order.
    """
    # Verify vehicle exists
    vehicle_result = await session.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = vehicle_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    query = (
        select(VehicleConditionReport)
        .where(VehicleConditionReport.vehicle_id == vehicle_id)
        .order_by(VehicleConditionReport.report_date.desc())
    )

    if report_type:
        try:
            type_enum = ConditionReportType(report_type)
            query = query.where(VehicleConditionReport.report_type == type_enum)
        except ValueError:
            valid_types = [t.value for t in ConditionReportType]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid report_type. Must be one of: {', '.join(valid_types)}"
            )

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    reports = result.scalars().all()

    return [
        ConditionReportResponse(
            id=r.id,
            vehicle_id=r.vehicle_id,
            report_type=r.report_type.value,
            overall_condition=r.overall_condition.value,
            mileage=r.mileage,
            exterior_notes=r.exterior_notes,
            interior_notes=r.interior_notes,
            mechanical_notes=r.mechanical_notes,
            damage_notes=r.damage_notes,
            damage_details=r.damage_details,
            photo_keys=r.photo_keys,
            fuel_level=r.fuel_level,
            tire_condition=r.tire_condition,
            created_by_id=r.created_by_id,
            created_by_email=r.created_by_email,
            lease_id=r.lease_id,
            incident_report_id=r.incident_report_id,
            admin_notes=r.admin_notes,
            report_date=r.report_date,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in reports
    ]


@router.post("/vehicles/{vehicle_id}/condition-reports", response_model=ConditionReportResponse, status_code=status.HTTP_201_CREATED)
async def create_condition_report(
    vehicle_id: int,
    request: ConditionReportCreateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Create a new condition report for a vehicle.

    Requires admin role.
    Photos can be uploaded separately after creating the report.
    """
    # Verify vehicle exists
    vehicle_result = await session.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = vehicle_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    # Validate report_type
    try:
        report_type_enum = ConditionReportType(request.report_type)
    except ValueError:
        valid_types = [t.value for t in ConditionReportType]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid report_type. Must be one of: {', '.join(valid_types)}"
        )

    # Validate overall_condition
    try:
        condition_enum = OverallCondition(request.overall_condition)
    except ValueError:
        valid_conditions = [c.value for c in OverallCondition]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid overall_condition. Must be one of: {', '.join(valid_conditions)}"
        )

    # Create condition report
    report = VehicleConditionReport(
        vehicle_id=vehicle_id,
        report_type=report_type_enum,
        overall_condition=condition_enum,
        mileage=request.mileage,
        exterior_notes=request.exterior_notes,
        interior_notes=request.interior_notes,
        mechanical_notes=request.mechanical_notes,
        damage_notes=request.damage_notes,
        damage_details=request.damage_details or {},
        fuel_level=request.fuel_level,
        tire_condition=request.tire_condition,
        created_by_id=user.sub,
        created_by_email=user.email,
        lease_id=request.lease_id,
        incident_report_id=request.incident_report_id,
        admin_notes=request.admin_notes,
    )

    session.add(report)
    await session.flush()
    await session.refresh(report)

    # Update vehicle mileage if this report has higher mileage
    if vehicle.mileage is None or request.mileage > vehicle.mileage:
        vehicle.mileage = request.mileage
        vehicle.updated_at = datetime.now(timezone.utc)

    # Update vehicle condition based on report
    # Map OverallCondition to VehicleCondition
    condition_mapping = {
        OverallCondition.EXCELLENT: VehicleCondition.EXCELLENT,
        OverallCondition.GOOD: VehicleCondition.GOOD,
        OverallCondition.FAIR: VehicleCondition.FAIR,
        OverallCondition.POOR: VehicleCondition.NEEDS_REPAIR,
        OverallCondition.NEEDS_REPAIR: VehicleCondition.NEEDS_REPAIR,
    }
    if condition_enum in condition_mapping:
        vehicle.condition = condition_mapping[condition_enum]
        vehicle.updated_at = datetime.now(timezone.utc)

    logger.info(f"Admin {user.email} created condition report {report.id} for vehicle {vehicle_id}")

    return ConditionReportResponse(
        id=report.id,
        vehicle_id=report.vehicle_id,
        report_type=report.report_type.value,
        overall_condition=report.overall_condition.value,
        mileage=report.mileage,
        exterior_notes=report.exterior_notes,
        interior_notes=report.interior_notes,
        mechanical_notes=report.mechanical_notes,
        damage_notes=report.damage_notes,
        damage_details=report.damage_details,
        photo_keys=report.photo_keys or [],
        fuel_level=report.fuel_level,
        tire_condition=report.tire_condition,
        created_by_id=report.created_by_id,
        created_by_email=report.created_by_email,
        lease_id=report.lease_id,
        incident_report_id=report.incident_report_id,
        admin_notes=report.admin_notes,
        report_date=report.report_date,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.get("/condition-reports/{report_id}", response_model=ConditionReportResponse)
async def get_condition_report(
    report_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get a specific condition report by ID.

    Requires admin or ops role.
    """
    result = await session.execute(
        select(VehicleConditionReport).where(VehicleConditionReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condition report not found"
        )

    return ConditionReportResponse(
        id=report.id,
        vehicle_id=report.vehicle_id,
        report_type=report.report_type.value,
        overall_condition=report.overall_condition.value,
        mileage=report.mileage,
        exterior_notes=report.exterior_notes,
        interior_notes=report.interior_notes,
        mechanical_notes=report.mechanical_notes,
        damage_notes=report.damage_notes,
        damage_details=report.damage_details,
        photo_keys=report.photo_keys or [],
        fuel_level=report.fuel_level,
        tire_condition=report.tire_condition,
        created_by_id=report.created_by_id,
        created_by_email=report.created_by_email,
        lease_id=report.lease_id,
        incident_report_id=report.incident_report_id,
        admin_notes=report.admin_notes,
        report_date=report.report_date,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.post("/condition-reports/{report_id}/photos")
async def upload_condition_report_photo(
    report_id: int,
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Upload a photo for a condition report.

    Requires admin role.
    - Validates file type (images only)
    - Validates file size (max 10MB)
    - Stores file in MinIO/local storage
    - Updates condition report with photo key
    """
    # Verify report exists
    result = await session.execute(
        select(VehicleConditionReport).where(VehicleConditionReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condition report not found"
        )

    # Read file content
    file_content = await file.read()
    original_filename = file.filename or "condition_photo"

    # Allowed image types for condition photos
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
        raise HTTPException(status_code=400, detail=error_message or "Invalid file type")

    # Generate storage key
    storage_key = storage_service.generate_storage_key(
        user_id=f"vehicle_{report.vehicle_id}",
        document_type=f"condition_report_{report_id}",
        original_filename=original_filename,
        mime_type=mime_type,
    )

    # Upload file
    upload_success = await storage_service.upload_file(
        file_content=file_content,
        bucket=settings.S3_BUCKET_CONDITION_REPORTS,
        key=storage_key,
        content_type=mime_type,
    )

    if not upload_success:
        raise HTTPException(
            status_code=500,
            detail="Failed to upload file to storage"
        )

    # Add photo key to report
    current_photos = report.photo_keys or []
    current_photos.append(storage_key)
    report.photo_keys = current_photos
    report.updated_at = datetime.now(timezone.utc)

    await session.flush()
    await session.refresh(report)

    logger.info(f"Admin {user.email} uploaded photo for condition report {report_id}")

    return {
        "success": True,
        "message": "Photo uploaded successfully",
        "report_id": report_id,
        "photo_key": storage_key,
        "photo_count": len(current_photos),
        "photo_url": storage_service.generate_signed_url(
            bucket=settings.S3_BUCKET_CONDITION_REPORTS,
            key=storage_key,
            expires_in=300,
        ),
    }


@router.get("/condition-reports/{report_id}/photos/{photo_index}")
async def get_condition_report_photo_url(
    report_id: int,
    photo_index: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get signed URL for a condition report photo.

    Requires admin or ops role.
    Returns a time-limited signed URL for viewing the photo.
    """
    result = await session.execute(
        select(VehicleConditionReport).where(VehicleConditionReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condition report not found"
        )

    if not report.photo_keys or photo_index >= len(report.photo_keys):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    photo_key = report.photo_keys[photo_index]

    # Generate signed URL (valid for 5 minutes)
    signed_url = storage_service.generate_signed_url(
        bucket=settings.S3_BUCKET_CONDITION_REPORTS,
        key=photo_key,
        expires_in=300,
    )

    return {
        "report_id": report_id,
        "photo_index": photo_index,
        "photo_url": signed_url,
        "expires_in_seconds": 300,
    }


# =============================================================================
# Vehicle Assignment (Lease Creation)
# =============================================================================

class VehicleAssignmentRequest(BaseModel):
    """Request to assign a vehicle to a customer, creating a lease."""
    vehicle_id: int
    customer_profile_id: int
    vehicle_request_id: Optional[int] = None
    weekly_payment: float
    security_deposit: Optional[float] = None
    start_date: datetime
    end_date: Optional[datetime] = None  # Open-ended leases don't have end date
    notes: Optional[str] = None
    admin_notes: Optional[str] = None


class VehicleAssignmentResponse(BaseModel):
    """Response for vehicle assignment action."""
    success: bool
    message: str
    lease_id: int
    vehicle_id: int
    customer_profile_id: int
    vehicle_info: str
    weekly_payment: float
    start_date: datetime
    assigned_by: str
    timestamp: str


@router.get("/vehicle-requests", response_model=list[dict[str, Any]])
async def list_vehicle_requests(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List all vehicle requests.

    Requires admin or ops role.
    Optionally filter by status: pending, reviewing, approved, assigned, rejected, cancelled
    """
    query = select(VehicleRequest).order_by(VehicleRequest.created_at.desc())

    if status_filter:
        try:
            status_enum = VehicleRequestStatus(status_filter)
            query = query.where(VehicleRequest.status == status_enum)
        except ValueError:
            valid_statuses = [s.value for s in VehicleRequestStatus]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    requests = result.scalars().all()

    return [
        {
            "id": req.id,
            "customer_profile_id": req.customer_profile_id,
            "customer_email": req.customer_email,
            "customer_name": req.customer_name,
            "status": req.status.value,
            "vehicle_preference": req.vehicle_preference.value if req.vehicle_preference else None,
            "notes": req.notes,
            "preferred_start_date": req.preferred_start_date.isoformat() if req.preferred_start_date else None,
            "admin_notes": req.admin_notes,
            "rejection_reason": req.rejection_reason,
            "assigned_vehicle_id": req.assigned_vehicle_id,
            "assigned_vehicle_info": req.assigned_vehicle_info,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "updated_at": req.updated_at.isoformat() if req.updated_at else None,
            "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
            "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
        }
        for req in requests
    ]


@router.get("/vehicle-requests/{request_id}")
async def get_vehicle_request(
    request_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get a specific vehicle request by ID.

    Requires admin or ops role.
    """
    result = await session.execute(
        select(VehicleRequest).where(VehicleRequest.id == request_id)
    )
    vr = result.scalar_one_or_none()

    if not vr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle request not found"
        )

    return {
        "id": vr.id,
        "customer_profile_id": vr.customer_profile_id,
        "customer_email": vr.customer_email,
        "customer_name": vr.customer_name,
        "status": vr.status.value,
        "vehicle_preference": vr.vehicle_preference.value if vr.vehicle_preference else None,
        "notes": vr.notes,
        "preferred_start_date": vr.preferred_start_date.isoformat() if vr.preferred_start_date else None,
        "admin_notes": vr.admin_notes,
        "rejection_reason": vr.rejection_reason,
        "assigned_vehicle_id": vr.assigned_vehicle_id,
        "assigned_vehicle_info": vr.assigned_vehicle_info,
        "created_at": vr.created_at.isoformat() if vr.created_at else None,
        "updated_at": vr.updated_at.isoformat() if vr.updated_at else None,
        "reviewed_at": vr.reviewed_at.isoformat() if vr.reviewed_at else None,
        "assigned_at": vr.assigned_at.isoformat() if vr.assigned_at else None,
    }


@router.patch("/vehicle-requests/{request_id}/status")
async def update_vehicle_request_status(
    request_id: int,
    new_status: str,
    notes: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Update vehicle request status.

    Requires admin or ops role.
    Valid statuses: pending, reviewing, approved, rejected, cancelled
    Note: Use assign-vehicle endpoint to change status to 'assigned'
    """
    # Validate status
    if new_status == "assigned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot set status to 'assigned' directly. Use the assign-vehicle endpoint."
        )

    try:
        status_enum = VehicleRequestStatus(new_status)
    except ValueError:
        valid_statuses = [s.value for s in VehicleRequestStatus if s != VehicleRequestStatus.ASSIGNED]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Get vehicle request
    result = await session.execute(
        select(VehicleRequest).where(VehicleRequest.id == request_id)
    )
    vr = result.scalar_one_or_none()

    if not vr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle request not found"
        )

    old_status = vr.status.value
    vr.status = status_enum
    vr.updated_at = datetime.now(timezone.utc)

    if new_status == "reviewing":
        vr.reviewed_at = datetime.now(timezone.utc)

    if new_status == "rejected" and notes:
        vr.rejection_reason = notes

    if notes:
        vr.admin_notes = notes

    await session.commit()

    logger.info(f"Admin {user.email} updated vehicle request {request_id} status from '{old_status}' to '{new_status}'")

    return AdminActionResponse(
        success=True,
        message=f"Vehicle request #{request_id} status updated from '{old_status}' to '{new_status}'",
        actor=user.email,
        action="update_vehicle_request_status",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/assign-vehicle", response_model=VehicleAssignmentResponse)
async def assign_vehicle_to_customer(
    request: VehicleAssignmentRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Assign a vehicle to a customer, creating a new lease contract.

    Requires admin role.

    This endpoint:
    1. Validates vehicle is available
    2. Validates customer exists and has approved insurance
    3. Creates a new Lease record
    4. Updates vehicle status to 'leased' and links to lease
    5. Updates vehicle request status to 'assigned' (if provided)
    6. Sends notification to customer

    Args:
        request: VehicleAssignmentRequest with vehicle_id, customer_profile_id,
                 weekly_payment, start_date, and optional fields
    """
    # 1. Validate vehicle exists and is available
    vehicle_result = await session.execute(
        select(Vehicle).where(Vehicle.id == request.vehicle_id)
    )
    vehicle = vehicle_result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    if not vehicle.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle is not active"
        )

    if vehicle.status != VehicleStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle is not available (current status: {vehicle.status.value})"
        )

    # 2. Validate customer exists and has approved insurance
    customer_result = await session.execute(
        select(CustomerProfile).where(CustomerProfile.id == request.customer_profile_id)
    )
    customer = customer_result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    if customer.insurance_status != InsuranceStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer insurance is not approved (current status: {customer.insurance_status.value})"
        )

    # 3. Validate vehicle request if provided
    vehicle_request = None
    if request.vehicle_request_id:
        vr_result = await session.execute(
            select(VehicleRequest).where(VehicleRequest.id == request.vehicle_request_id)
        )
        vehicle_request = vr_result.scalar_one_or_none()

        if not vehicle_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle request not found"
            )

        if vehicle_request.customer_profile_id != request.customer_profile_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle request does not belong to the specified customer"
            )

        if vehicle_request.status == VehicleRequestStatus.ASSIGNED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle request has already been assigned"
            )

    # 4. Create lease record
    vehicle_info = f"{vehicle.year} {vehicle.make} {vehicle.model}"

    lease = Lease(
        customer_profile_id=request.customer_profile_id,
        vehicle_request_id=request.vehicle_request_id,
        vehicle_make=vehicle.make,
        vehicle_model=vehicle.model,
        vehicle_year=vehicle.year,
        vehicle_vin=vehicle.vin,
        vehicle_color=vehicle.color,
        vehicle_license_plate=vehicle.license_plate,
        status=LeaseStatus.ACTIVE,
        weekly_payment=Decimal(str(request.weekly_payment)),
        security_deposit=Decimal(str(request.security_deposit)) if request.security_deposit else None,
        start_date=request.start_date,
        end_date=request.end_date,
        notes=request.notes,
        admin_notes=request.admin_notes,
    )

    session.add(lease)
    await session.flush()
    await session.refresh(lease)

    # 5. Update vehicle status and link to lease
    vehicle.status = VehicleStatus.LEASED
    vehicle.current_lease_id = lease.id
    vehicle.updated_at = datetime.now(timezone.utc)

    # 6. Update vehicle request status to assigned (if provided)
    if vehicle_request:
        vehicle_request.status = VehicleRequestStatus.ASSIGNED
        vehicle_request.assigned_vehicle_id = vehicle.id
        vehicle_request.assigned_vehicle_info = vehicle_info
        vehicle_request.assigned_at = datetime.now(timezone.utc)
        vehicle_request.updated_at = datetime.now(timezone.utc)

    # 7. Send notification to customer
    await notification_service.create_vehicle_assigned_notification(
        db=session,
        customer_profile_id=request.customer_profile_id,
        vehicle_info=vehicle_info,
        lease_id=lease.id,
    )

    # Audit log: Vehicle assignment
    await audit_service.log_vehicle_assignment(
        session=session,
        user=user,
        vehicle_id=vehicle.id,
        customer_id=request.customer_profile_id,
        is_assignment=True,
        notes=f"Lease #{lease.id} created. Weekly payment: ${request.weekly_payment}",
    )

    await session.commit()

    logger.info(
        f"Admin {user.email} assigned vehicle {vehicle.id} ({vehicle_info}) to customer {customer.email} "
        f"(lease_id={lease.id}, weekly_payment=${request.weekly_payment})"
    )

    return VehicleAssignmentResponse(
        success=True,
        message=f"Vehicle {vehicle_info} successfully assigned to customer",
        lease_id=lease.id,
        vehicle_id=vehicle.id,
        customer_profile_id=request.customer_profile_id,
        vehicle_info=vehicle_info,
        weekly_payment=float(lease.weekly_payment),
        start_date=lease.start_date,
        assigned_by=user.email,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/available-vehicles", response_model=list[VehicleResponse])
async def list_available_vehicles(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    List all available vehicles that can be assigned to customers.

    Requires admin or ops role.
    Returns only active vehicles with status 'available'.
    """
    query = (
        select(Vehicle)
        .where(Vehicle.is_active == True)
        .where(Vehicle.status == VehicleStatus.AVAILABLE)
        .order_by(Vehicle.make, Vehicle.model, Vehicle.year)
    )

    result = await session.execute(query)
    vehicles = result.scalars().all()

    return [
        VehicleResponse(
            id=v.id,
            vin=v.vin,
            make=v.make,
            model=v.model,
            year=v.year,
            color=v.color,
            body_type=v.body_type,
            license_plate=v.license_plate,
            engine=v.engine,
            transmission=v.transmission,
            mileage=v.mileage,
            weekly_rate=float(v.weekly_rate) if v.weekly_rate else 0.0,
            security_deposit=float(v.security_deposit) if v.security_deposit else None,
            status=v.status.value,
            condition=v.condition.value,
            acquisition_source=v.acquisition_source,
            acquisition_cost=float(v.acquisition_cost) if v.acquisition_cost else None,
            repair_cost=float(v.repair_cost) if v.repair_cost else None,
            current_lease_id=v.current_lease_id,
            current_tracker_id=v.current_tracker_id,
            notes=v.notes,
            admin_notes=v.admin_notes,
            is_active=v.is_active,
            show_on_fleet_page=v.show_on_fleet_page,
            created_at=v.created_at,
            updated_at=v.updated_at,
        )
        for v in vehicles
    ]


@router.get("/leases", response_model=list[dict[str, Any]])
async def list_leases(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List all leases.

    Requires admin or ops role.
    Optionally filter by status: active, completed, terminated, suspended
    """
    query = select(Lease).order_by(Lease.created_at.desc())

    if status_filter:
        try:
            status_enum = LeaseStatus(status_filter)
            query = query.where(Lease.status == status_enum)
        except ValueError:
            valid_statuses = [s.value for s in LeaseStatus]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    leases = result.scalars().all()

    return [
        {
            "id": lease.id,
            "customer_profile_id": lease.customer_profile_id,
            "vehicle_request_id": lease.vehicle_request_id,
            "vehicle_make": lease.vehicle_make,
            "vehicle_model": lease.vehicle_model,
            "vehicle_year": lease.vehicle_year,
            "vehicle_vin": lease.vehicle_vin,
            "vehicle_color": lease.vehicle_color,
            "vehicle_license_plate": lease.vehicle_license_plate,
            "status": lease.status.value,
            "weekly_payment": float(lease.weekly_payment),
            "security_deposit": float(lease.security_deposit) if lease.security_deposit else None,
            "start_date": lease.start_date.isoformat() if lease.start_date else None,
            "end_date": lease.end_date.isoformat() if lease.end_date else None,
            "notes": lease.notes,
            "admin_notes": lease.admin_notes,
            "created_at": lease.created_at.isoformat() if lease.created_at else None,
            "updated_at": lease.updated_at.isoformat() if lease.updated_at else None,
            "terminated_at": lease.terminated_at.isoformat() if lease.terminated_at else None,
            "termination_reason": lease.termination_reason,
        }
        for lease in leases
    ]


@router.get("/leases/{lease_id}")
async def get_lease(
    lease_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get a specific lease by ID.

    Requires admin or ops role.
    """
    result = await session.execute(
        select(Lease).where(Lease.id == lease_id)
    )
    lease = result.scalar_one_or_none()

    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lease not found"
        )

    return {
        "id": lease.id,
        "customer_profile_id": lease.customer_profile_id,
        "vehicle_request_id": lease.vehicle_request_id,
        "vehicle_make": lease.vehicle_make,
        "vehicle_model": lease.vehicle_model,
        "vehicle_year": lease.vehicle_year,
        "vehicle_vin": lease.vehicle_vin,
        "vehicle_color": lease.vehicle_color,
        "vehicle_license_plate": lease.vehicle_license_plate,
        "status": lease.status.value,
        "weekly_payment": float(lease.weekly_payment),
        "security_deposit": float(lease.security_deposit) if lease.security_deposit else None,
        "start_date": lease.start_date.isoformat() if lease.start_date else None,
        "end_date": lease.end_date.isoformat() if lease.end_date else None,
        "notes": lease.notes,
        "admin_notes": lease.admin_notes,
        "created_at": lease.created_at.isoformat() if lease.created_at else None,
        "updated_at": lease.updated_at.isoformat() if lease.updated_at else None,
        "terminated_at": lease.terminated_at.isoformat() if lease.terminated_at else None,
        "termination_reason": lease.termination_reason,
    }


# =============================================================================
# Tracker Device Management (CRUD)
# =============================================================================

class TrackerCreateRequest(BaseModel):
    """Request to create a new tracker device."""
    device_id: str
    serial_number: str
    model: str
    manufacturer: Optional[str] = None
    firmware_version: Optional[str] = None
    sim_number: Optional[str] = None
    sim_carrier: Optional[str] = None
    imei: Optional[str] = None
    status: str = "available"
    provider_name: Optional[str] = None
    provider_device_id: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[str] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = None


class TrackerUpdateRequest(BaseModel):
    """Request to update a tracker device."""
    device_id: Optional[str] = None
    serial_number: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    firmware_version: Optional[str] = None
    sim_number: Optional[str] = None
    sim_carrier: Optional[str] = None
    imei: Optional[str] = None
    status: Optional[str] = None
    provider_name: Optional[str] = None
    provider_device_id: Optional[str] = None
    purchase_cost: Optional[str] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None


class TrackerResponse(BaseModel):
    """Tracker device response for API."""
    id: int
    device_id: str
    serial_number: str
    model: str
    manufacturer: Optional[str]
    firmware_version: Optional[str]
    sim_number: Optional[str]
    sim_carrier: Optional[str]
    imei: Optional[str]
    status: str
    assigned_vehicle_id: Optional[int]
    assigned_vehicle_info: Optional[str]
    assigned_at: Optional[datetime]
    last_latitude: Optional[str]
    last_longitude: Optional[str]
    last_location_update: Optional[datetime]
    last_checkin: Optional[datetime]
    provider_name: Optional[str]
    provider_device_id: Optional[str]
    purchase_date: Optional[datetime]
    purchase_cost: Optional[str]
    warranty_expiry: Optional[datetime]
    notes: Optional[str]
    admin_notes: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/trackers", response_model=list[TrackerResponse])
async def list_trackers(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List all tracker devices in inventory.

    Requires admin or ops role.
    Optionally filter by status: available, assigned, maintenance, decommissioned, lost
    """
    query = select(TrackerDevice).where(TrackerDevice.is_active == True).order_by(TrackerDevice.created_at.desc())

    if status_filter:
        try:
            status_enum = TrackerStatus(status_filter)
            query = query.where(TrackerDevice.status == status_enum)
        except ValueError:
            valid_statuses = [s.value for s in TrackerStatus]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    trackers = result.scalars().all()

    return [
        TrackerResponse(
            id=t.id,
            device_id=t.device_id,
            serial_number=t.serial_number,
            model=t.model,
            manufacturer=t.manufacturer,
            firmware_version=t.firmware_version,
            sim_number=t.sim_number,
            sim_carrier=t.sim_carrier,
            imei=t.imei,
            status=t.status.value,
            assigned_vehicle_id=t.assigned_vehicle_id,
            assigned_vehicle_info=t.assigned_vehicle_info,
            assigned_at=t.assigned_at,
            last_latitude=t.last_latitude,
            last_longitude=t.last_longitude,
            last_location_update=t.last_location_update,
            last_checkin=t.last_checkin,
            provider_name=t.provider_name,
            provider_device_id=t.provider_device_id,
            purchase_date=t.purchase_date,
            purchase_cost=t.purchase_cost,
            warranty_expiry=t.warranty_expiry,
            notes=t.notes,
            admin_notes=t.admin_notes,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in trackers
    ]


@router.get("/trackers/{tracker_id}", response_model=TrackerResponse)
async def get_tracker(
    tracker_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get a specific tracker device by ID.

    Requires admin or ops role.
    """
    result = await session.execute(
        select(TrackerDevice).where(TrackerDevice.id == tracker_id)
    )
    tracker = result.scalar_one_or_none()

    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tracker device not found"
        )

    return TrackerResponse(
        id=tracker.id,
        device_id=tracker.device_id,
        serial_number=tracker.serial_number,
        model=tracker.model,
        manufacturer=tracker.manufacturer,
        firmware_version=tracker.firmware_version,
        sim_number=tracker.sim_number,
        sim_carrier=tracker.sim_carrier,
        imei=tracker.imei,
        status=tracker.status.value,
        assigned_vehicle_id=tracker.assigned_vehicle_id,
        assigned_vehicle_info=tracker.assigned_vehicle_info,
        assigned_at=tracker.assigned_at,
        last_latitude=tracker.last_latitude,
        last_longitude=tracker.last_longitude,
        last_location_update=tracker.last_location_update,
        last_checkin=tracker.last_checkin,
        provider_name=tracker.provider_name,
        provider_device_id=tracker.provider_device_id,
        purchase_date=tracker.purchase_date,
        purchase_cost=tracker.purchase_cost,
        warranty_expiry=tracker.warranty_expiry,
        notes=tracker.notes,
        admin_notes=tracker.admin_notes,
        is_active=tracker.is_active,
        created_at=tracker.created_at,
        updated_at=tracker.updated_at,
    )


@router.post("/trackers", response_model=TrackerResponse, status_code=status.HTTP_201_CREATED)
async def create_tracker(
    request: TrackerCreateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Create a new tracker device.

    Requires admin role.
    """
    # Check device_id uniqueness
    existing_device_id = await session.execute(
        select(TrackerDevice).where(TrackerDevice.device_id == request.device_id)
    )
    if existing_device_id.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tracker with device ID '{request.device_id}' already exists"
        )

    # Check serial_number uniqueness
    existing_serial = await session.execute(
        select(TrackerDevice).where(TrackerDevice.serial_number == request.serial_number)
    )
    if existing_serial.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tracker with serial number '{request.serial_number}' already exists"
        )

    # Validate status
    try:
        status_enum = TrackerStatus(request.status)
    except ValueError:
        valid_statuses = [s.value for s in TrackerStatus]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Create tracker
    tracker = TrackerDevice(
        device_id=request.device_id,
        serial_number=request.serial_number,
        model=request.model,
        manufacturer=request.manufacturer,
        firmware_version=request.firmware_version,
        sim_number=request.sim_number,
        sim_carrier=request.sim_carrier,
        imei=request.imei,
        status=status_enum,
        provider_name=request.provider_name,
        provider_device_id=request.provider_device_id,
        purchase_date=request.purchase_date,
        purchase_cost=request.purchase_cost,
        warranty_expiry=request.warranty_expiry,
        notes=request.notes,
    )

    session.add(tracker)
    await session.flush()
    await session.refresh(tracker)

    logger.info(f"Admin {user.email} created tracker device {tracker.id} (device_id: {tracker.device_id})")

    return TrackerResponse(
        id=tracker.id,
        device_id=tracker.device_id,
        serial_number=tracker.serial_number,
        model=tracker.model,
        manufacturer=tracker.manufacturer,
        firmware_version=tracker.firmware_version,
        sim_number=tracker.sim_number,
        sim_carrier=tracker.sim_carrier,
        imei=tracker.imei,
        status=tracker.status.value,
        assigned_vehicle_id=tracker.assigned_vehicle_id,
        assigned_vehicle_info=tracker.assigned_vehicle_info,
        assigned_at=tracker.assigned_at,
        last_latitude=tracker.last_latitude,
        last_longitude=tracker.last_longitude,
        last_location_update=tracker.last_location_update,
        last_checkin=tracker.last_checkin,
        provider_name=tracker.provider_name,
        provider_device_id=tracker.provider_device_id,
        purchase_date=tracker.purchase_date,
        purchase_cost=tracker.purchase_cost,
        warranty_expiry=tracker.warranty_expiry,
        notes=tracker.notes,
        admin_notes=tracker.admin_notes,
        is_active=tracker.is_active,
        created_at=tracker.created_at,
        updated_at=tracker.updated_at,
    )


@router.put("/trackers/{tracker_id}", response_model=TrackerResponse)
async def update_tracker(
    tracker_id: int,
    request: TrackerUpdateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Update an existing tracker device.

    Requires admin role.
    """
    result = await session.execute(
        select(TrackerDevice).where(TrackerDevice.id == tracker_id)
    )
    tracker = result.scalar_one_or_none()

    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tracker device not found"
        )

    # Check device_id uniqueness if being updated
    if request.device_id is not None and request.device_id != tracker.device_id:
        existing = await session.execute(
            select(TrackerDevice).where(
                TrackerDevice.device_id == request.device_id,
                TrackerDevice.id != tracker_id
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tracker with device ID '{request.device_id}' already exists"
            )
        tracker.device_id = request.device_id

    # Check serial_number uniqueness if being updated
    if request.serial_number is not None and request.serial_number != tracker.serial_number:
        existing = await session.execute(
            select(TrackerDevice).where(
                TrackerDevice.serial_number == request.serial_number,
                TrackerDevice.id != tracker_id
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tracker with serial number '{request.serial_number}' already exists"
            )
        tracker.serial_number = request.serial_number

    # Update other fields if provided
    if request.model is not None:
        tracker.model = request.model
    if request.manufacturer is not None:
        tracker.manufacturer = request.manufacturer
    if request.firmware_version is not None:
        tracker.firmware_version = request.firmware_version
    if request.sim_number is not None:
        tracker.sim_number = request.sim_number
    if request.sim_carrier is not None:
        tracker.sim_carrier = request.sim_carrier
    if request.imei is not None:
        tracker.imei = request.imei
    if request.provider_name is not None:
        tracker.provider_name = request.provider_name
    if request.provider_device_id is not None:
        tracker.provider_device_id = request.provider_device_id
    if request.purchase_cost is not None:
        tracker.purchase_cost = request.purchase_cost
    if request.warranty_expiry is not None:
        tracker.warranty_expiry = request.warranty_expiry
    if request.notes is not None:
        tracker.notes = request.notes
    if request.admin_notes is not None:
        tracker.admin_notes = request.admin_notes

    # Validate and update status
    if request.status is not None:
        try:
            status_enum = TrackerStatus(request.status)
            tracker.status = status_enum
        except ValueError:
            valid_statuses = [s.value for s in TrackerStatus]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

    tracker.updated_at = datetime.now(timezone.utc)

    await session.flush()
    await session.refresh(tracker)

    logger.info(f"Admin {user.email} updated tracker device {tracker.id} (device_id: {tracker.device_id})")

    return TrackerResponse(
        id=tracker.id,
        device_id=tracker.device_id,
        serial_number=tracker.serial_number,
        model=tracker.model,
        manufacturer=tracker.manufacturer,
        firmware_version=tracker.firmware_version,
        sim_number=tracker.sim_number,
        sim_carrier=tracker.sim_carrier,
        imei=tracker.imei,
        status=tracker.status.value,
        assigned_vehicle_id=tracker.assigned_vehicle_id,
        assigned_vehicle_info=tracker.assigned_vehicle_info,
        assigned_at=tracker.assigned_at,
        last_latitude=tracker.last_latitude,
        last_longitude=tracker.last_longitude,
        last_location_update=tracker.last_location_update,
        last_checkin=tracker.last_checkin,
        provider_name=tracker.provider_name,
        provider_device_id=tracker.provider_device_id,
        purchase_date=tracker.purchase_date,
        purchase_cost=tracker.purchase_cost,
        warranty_expiry=tracker.warranty_expiry,
        notes=tracker.notes,
        admin_notes=tracker.admin_notes,
        is_active=tracker.is_active,
        created_at=tracker.created_at,
        updated_at=tracker.updated_at,
    )


@router.delete("/trackers/{tracker_id}")
async def delete_tracker(
    tracker_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Delete a tracker device (soft delete by setting is_active=False).

    Requires admin role.
    Cannot delete trackers currently assigned to vehicles.
    """
    result = await session.execute(
        select(TrackerDevice).where(TrackerDevice.id == tracker_id)
    )
    tracker = result.scalar_one_or_none()

    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tracker device not found"
        )

    # Check if tracker is currently assigned
    if tracker.status == TrackerStatus.ASSIGNED or tracker.assigned_vehicle_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete tracker device that is currently assigned to a vehicle"
        )

    # Soft delete
    tracker.is_active = False
    tracker.updated_at = datetime.now(timezone.utc)

    logger.info(f"Admin {user.email} deleted (soft) tracker device {tracker.id} (device_id: {tracker.device_id})")

    return {
        "success": True,
        "message": f"Tracker device {tracker.device_id} has been deleted",
        "tracker_id": tracker.id,
        "deleted_by": user.email,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/trackers/available", response_model=list[TrackerResponse])
async def list_available_trackers(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    List all available tracker devices that can be assigned to vehicles.

    Requires admin or ops role.
    Returns only active trackers with status 'available'.
    """
    query = (
        select(TrackerDevice)
        .where(TrackerDevice.is_active == True)
        .where(TrackerDevice.status == TrackerStatus.AVAILABLE)
        .order_by(TrackerDevice.model, TrackerDevice.device_id)
    )

    result = await session.execute(query)
    trackers = result.scalars().all()

    return [
        TrackerResponse(
            id=t.id,
            device_id=t.device_id,
            serial_number=t.serial_number,
            model=t.model,
            manufacturer=t.manufacturer,
            firmware_version=t.firmware_version,
            sim_number=t.sim_number,
            sim_carrier=t.sim_carrier,
            imei=t.imei,
            status=t.status.value,
            assigned_vehicle_id=t.assigned_vehicle_id,
            assigned_vehicle_info=t.assigned_vehicle_info,
            assigned_at=t.assigned_at,
            last_latitude=t.last_latitude,
            last_longitude=t.last_longitude,
            last_location_update=t.last_location_update,
            last_checkin=t.last_checkin,
            provider_name=t.provider_name,
            provider_device_id=t.provider_device_id,
            purchase_date=t.purchase_date,
            purchase_cost=t.purchase_cost,
            warranty_expiry=t.warranty_expiry,
            notes=t.notes,
            admin_notes=t.admin_notes,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in trackers
    ]


# ==================== Tracker Assignment Endpoints ====================


class TrackerAssignmentRequest(BaseModel):
    """Request to assign a tracker to a vehicle."""
    vehicle_id: int


@router.post("/trackers/{tracker_id}/assign", response_model=TrackerResponse)
async def assign_tracker_to_vehicle(
    tracker_id: int,
    request: TrackerAssignmentRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Assign a tracker device to a vehicle.

    Requires admin role.

    - Tracker must be available (not already assigned)
    - Vehicle must exist and be active
    - Creates audit log entry for the assignment
    """
    # Get tracker
    result = await session.execute(
        select(TrackerDevice).where(TrackerDevice.id == tracker_id)
    )
    tracker = result.scalar_one_or_none()

    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tracker device not found"
        )

    if not tracker.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tracker device is not active"
        )

    if tracker.status == TrackerStatus.ASSIGNED or tracker.assigned_vehicle_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tracker is already assigned to a vehicle"
        )

    # Get vehicle
    result = await session.execute(
        select(Vehicle).where(Vehicle.id == request.vehicle_id)
    )
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    if not vehicle.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle is not active"
        )

    # Check if vehicle already has a tracker
    if vehicle.current_tracker_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle already has a tracker assigned. Unassign it first."
        )

    # Create vehicle description for display
    vehicle_description = f"{vehicle.year} {vehicle.make} {vehicle.model}"

    # Assign tracker to vehicle
    tracker.assigned_vehicle_id = vehicle.id
    tracker.assigned_vehicle_info = vehicle_description
    tracker.assigned_at = datetime.now(timezone.utc)
    tracker.status = TrackerStatus.ASSIGNED
    tracker.updated_at = datetime.now(timezone.utc)

    # Update vehicle's current_tracker_id
    vehicle.current_tracker_id = tracker.id
    vehicle.updated_at = datetime.now(timezone.utc)

    # Create audit log entry
    await audit_service.log_tracker_assignment(
        session=session,
        user=user,
        tracker_id=tracker.id,
        vehicle_id=vehicle.id,
        is_assignment=True,
        tracker_device_id=tracker.device_id,
        vehicle_description=vehicle_description,
    )

    await session.commit()
    await session.refresh(tracker)

    logger.info(f"Admin {user.email} assigned tracker {tracker.device_id} to vehicle {vehicle.id} ({vehicle_description})")

    return TrackerResponse(
        id=tracker.id,
        device_id=tracker.device_id,
        serial_number=tracker.serial_number,
        model=tracker.model,
        manufacturer=tracker.manufacturer,
        firmware_version=tracker.firmware_version,
        sim_number=tracker.sim_number,
        sim_carrier=tracker.sim_carrier,
        imei=tracker.imei,
        status=tracker.status.value,
        assigned_vehicle_id=tracker.assigned_vehicle_id,
        assigned_vehicle_info=tracker.assigned_vehicle_info,
        assigned_at=tracker.assigned_at,
        last_latitude=tracker.last_latitude,
        last_longitude=tracker.last_longitude,
        last_location_update=tracker.last_location_update,
        last_checkin=tracker.last_checkin,
        provider_name=tracker.provider_name,
        provider_device_id=tracker.provider_device_id,
        purchase_date=tracker.purchase_date,
        purchase_cost=tracker.purchase_cost,
        warranty_expiry=tracker.warranty_expiry,
        notes=tracker.notes,
        admin_notes=tracker.admin_notes,
        is_active=tracker.is_active,
        created_at=tracker.created_at,
        updated_at=tracker.updated_at,
    )


@router.post("/trackers/{tracker_id}/unassign", response_model=TrackerResponse)
async def unassign_tracker_from_vehicle(
    tracker_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Unassign a tracker device from its current vehicle.

    Requires admin role.

    - Tracker must be currently assigned
    - Creates audit log entry for the unassignment
    """
    # Get tracker
    result = await session.execute(
        select(TrackerDevice).where(TrackerDevice.id == tracker_id)
    )
    tracker = result.scalar_one_or_none()

    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tracker device not found"
        )

    if tracker.status != TrackerStatus.ASSIGNED or not tracker.assigned_vehicle_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tracker is not currently assigned to any vehicle"
        )

    # Get the vehicle to update
    vehicle_id = tracker.assigned_vehicle_id
    vehicle_description = tracker.assigned_vehicle_info or "Unknown vehicle"

    result = await session.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = result.scalar_one_or_none()

    # Unassign tracker
    tracker.assigned_vehicle_id = None
    tracker.assigned_vehicle_info = None
    tracker.assigned_at = None
    tracker.status = TrackerStatus.AVAILABLE
    tracker.updated_at = datetime.now(timezone.utc)

    # Update vehicle if it exists
    if vehicle:
        vehicle.current_tracker_id = None
        vehicle.updated_at = datetime.now(timezone.utc)

    # Create audit log entry
    await audit_service.log_tracker_assignment(
        session=session,
        user=user,
        tracker_id=tracker.id,
        vehicle_id=vehicle_id,
        is_assignment=False,
        tracker_device_id=tracker.device_id,
        vehicle_description=vehicle_description,
    )

    await session.commit()
    await session.refresh(tracker)

    logger.info(f"Admin {user.email} unassigned tracker {tracker.device_id} from vehicle {vehicle_id}")

    return TrackerResponse(
        id=tracker.id,
        device_id=tracker.device_id,
        serial_number=tracker.serial_number,
        model=tracker.model,
        manufacturer=tracker.manufacturer,
        firmware_version=tracker.firmware_version,
        sim_number=tracker.sim_number,
        sim_carrier=tracker.sim_carrier,
        imei=tracker.imei,
        status=tracker.status.value,
        assigned_vehicle_id=tracker.assigned_vehicle_id,
        assigned_vehicle_info=tracker.assigned_vehicle_info,
        assigned_at=tracker.assigned_at,
        last_latitude=tracker.last_latitude,
        last_longitude=tracker.last_longitude,
        last_location_update=tracker.last_location_update,
        last_checkin=tracker.last_checkin,
        provider_name=tracker.provider_name,
        provider_device_id=tracker.provider_device_id,
        purchase_date=tracker.purchase_date,
        purchase_cost=tracker.purchase_cost,
        warranty_expiry=tracker.warranty_expiry,
        notes=tracker.notes,
        admin_notes=tracker.admin_notes,
        is_active=tracker.is_active,
        created_at=tracker.created_at,
        updated_at=tracker.updated_at,
    )


# =====================================================
# Weekly Invoice Management Endpoints
# =====================================================


class AdminInvoiceResponse(BaseModel):
    """Admin response for invoice details."""
    id: int
    lease_id: int
    customer_profile_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    invoice_number: str
    week_number: int
    amount: float
    late_fee: float
    total_amount: float
    period_start: datetime
    period_end: datetime
    due_date: datetime
    status: str
    payment_method: Optional[str] = None
    payment_proof_uploaded_at: Optional[datetime] = None
    has_payment_proof: bool = False
    verified_at: Optional[datetime] = None
    verified_by_id: Optional[str] = None
    verification_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_late: bool
    days_late: int
    late_fee_applied_at: Optional[datetime] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    paid_at: Optional[datetime] = None
    # Lease info
    vehicle_info: Optional[str] = None
    weekly_payment: Optional[float] = None


class AdminInvoiceListResponse(BaseModel):
    """Admin response for invoice list."""
    invoices: list[AdminInvoiceResponse]
    total_count: int
    pending_count: int
    verification_in_progress_count: int
    paid_count: int
    late_count: int
    total_pending_amount: float
    total_collected_amount: float


class InvoiceGenerationRequest(BaseModel):
    """Request to generate invoices."""
    week_number: Optional[int] = None  # If not provided, generates for current week
    lease_id: Optional[int] = None  # If provided, generates only for this lease


class InvoiceGenerationResponse(BaseModel):
    """Response for invoice generation."""
    success: bool
    message: str
    invoices_created: int
    leases_processed: int


class PaymentVerificationRequest(BaseModel):
    """Request to verify a payment."""
    approved: bool
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class PaymentVerificationResponse(BaseModel):
    """Response for payment verification."""
    success: bool
    message: str
    invoice_id: int
    invoice_number: str
    new_status: str
    verified_by: str
    timestamp: str


@router.get("/invoices", response_model=AdminInvoiceListResponse)
async def get_all_invoices(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = None,
    customer_id: Optional[int] = None,
    lease_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Get all weekly invoices with optional filters.

    Requires admin role.

    Filters:
    - status_filter: Filter by status (pending, due, verification_in_progress, paid, late, rejected)
    - customer_id: Filter by customer profile ID
    - lease_id: Filter by lease ID
    - from_date: Filter invoices with due date after this date (YYYY-MM-DD)
    - to_date: Filter invoices with due date before this date (YYYY-MM-DD)
    """
    # Validate admin access
    _ = user

    # Build base query
    query = select(WeeklyInvoice)

    # Apply filters
    if status_filter:
        try:
            status_enum = InvoiceStatus(status_filter.lower())
            query = query.where(WeeklyInvoice.status == status_enum)
        except ValueError:
            pass

    if customer_id:
        query = query.where(WeeklyInvoice.customer_profile_id == customer_id)

    if lease_id:
        query = query.where(WeeklyInvoice.lease_id == lease_id)

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.where(WeeklyInvoice.due_date >= from_dt)
        except ValueError:
            pass

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.where(WeeklyInvoice.due_date <= to_dt)
        except ValueError:
            pass

    # Get all invoices for statistics
    all_result = await session.execute(select(WeeklyInvoice))
    all_invoices = all_result.scalars().all()

    # Calculate statistics
    pending_count = len([i for i in all_invoices if i.status == InvoiceStatus.PENDING])
    verification_in_progress_count = len([i for i in all_invoices if i.status == InvoiceStatus.VERIFICATION_IN_PROGRESS])
    paid_count = len([i for i in all_invoices if i.status == InvoiceStatus.PAID])
    late_count = len([i for i in all_invoices if i.status == InvoiceStatus.LATE])
    total_pending_amount = float(sum(
        i.total_amount for i in all_invoices
        if i.status in [InvoiceStatus.PENDING, InvoiceStatus.DUE, InvoiceStatus.LATE, InvoiceStatus.VERIFICATION_IN_PROGRESS]
    ))
    total_collected_amount = float(sum(
        i.total_amount for i in all_invoices
        if i.status == InvoiceStatus.PAID
    ))

    # Get paginated results
    result = await session.execute(
        query.order_by(WeeklyInvoice.due_date.desc())
        .offset(offset)
        .limit(limit)
    )
    invoices = result.scalars().all()

    # Fetch related data (customer profiles and leases)
    invoice_responses = []
    for inv in invoices:
        # Get customer profile
        customer = await session.get(CustomerProfile, inv.customer_profile_id)
        customer_name = customer.full_name if customer else None
        customer_email = customer.email if customer else None

        # Get lease
        lease = await session.get(Lease, inv.lease_id)
        vehicle_info = f"{lease.vehicle_year} {lease.vehicle_make} {lease.vehicle_model}" if lease else None
        weekly_payment = float(lease.weekly_payment) if lease else None

        invoice_responses.append(AdminInvoiceResponse(
            id=inv.id,
            lease_id=inv.lease_id,
            customer_profile_id=inv.customer_profile_id,
            customer_name=customer_name,
            customer_email=customer_email,
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
            has_payment_proof=bool(inv.payment_proof_key),
            verified_at=inv.verified_at,
            verified_by_id=inv.verified_by_id,
            verification_notes=inv.verification_notes,
            rejection_reason=inv.rejection_reason,
            is_late=inv.is_late,
            days_late=inv.days_late,
            late_fee_applied_at=inv.late_fee_applied_at,
            notes=inv.notes,
            admin_notes=inv.admin_notes,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            paid_at=inv.paid_at,
            vehicle_info=vehicle_info,
            weekly_payment=weekly_payment,
        ))

    return AdminInvoiceListResponse(
        invoices=invoice_responses,
        total_count=len(all_invoices),
        pending_count=pending_count,
        verification_in_progress_count=verification_in_progress_count,
        paid_count=paid_count,
        late_count=late_count,
        total_pending_amount=total_pending_amount,
        total_collected_amount=total_collected_amount,
    )


@router.get("/invoices/verification-queue", response_model=AdminInvoiceListResponse)
async def get_verification_queue(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """
    Get invoices pending payment verification.

    Requires admin role.

    Returns invoices where payment proof has been uploaded and is awaiting verification.
    """
    # Validate admin access
    _ = user

    # Get invoices in verification queue
    result = await session.execute(
        select(WeeklyInvoice).where(
            WeeklyInvoice.status == InvoiceStatus.VERIFICATION_IN_PROGRESS
        ).order_by(WeeklyInvoice.payment_proof_uploaded_at.asc())
        .offset(offset)
        .limit(limit)
    )
    invoices = result.scalars().all()

    # Get statistics
    all_result = await session.execute(select(WeeklyInvoice))
    all_invoices = all_result.scalars().all()

    pending_count = len([i for i in all_invoices if i.status == InvoiceStatus.PENDING])
    verification_in_progress_count = len([i for i in all_invoices if i.status == InvoiceStatus.VERIFICATION_IN_PROGRESS])
    paid_count = len([i for i in all_invoices if i.status == InvoiceStatus.PAID])
    late_count = len([i for i in all_invoices if i.status == InvoiceStatus.LATE])
    total_pending_amount = float(sum(
        i.total_amount for i in all_invoices
        if i.status in [InvoiceStatus.PENDING, InvoiceStatus.DUE, InvoiceStatus.LATE, InvoiceStatus.VERIFICATION_IN_PROGRESS]
    ))
    total_collected_amount = float(sum(
        i.total_amount for i in all_invoices
        if i.status == InvoiceStatus.PAID
    ))

    # Fetch related data
    invoice_responses = []
    for inv in invoices:
        customer = await session.get(CustomerProfile, inv.customer_profile_id)
        customer_name = customer.full_name if customer else None
        customer_email = customer.email if customer else None

        lease = await session.get(Lease, inv.lease_id)
        vehicle_info = f"{lease.vehicle_year} {lease.vehicle_make} {lease.vehicle_model}" if lease else None
        weekly_payment = float(lease.weekly_payment) if lease else None

        invoice_responses.append(AdminInvoiceResponse(
            id=inv.id,
            lease_id=inv.lease_id,
            customer_profile_id=inv.customer_profile_id,
            customer_name=customer_name,
            customer_email=customer_email,
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
            has_payment_proof=bool(inv.payment_proof_key),
            verified_at=inv.verified_at,
            verified_by_id=inv.verified_by_id,
            verification_notes=inv.verification_notes,
            rejection_reason=inv.rejection_reason,
            is_late=inv.is_late,
            days_late=inv.days_late,
            late_fee_applied_at=inv.late_fee_applied_at,
            notes=inv.notes,
            admin_notes=inv.admin_notes,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            paid_at=inv.paid_at,
            vehicle_info=vehicle_info,
            weekly_payment=weekly_payment,
        ))

    return AdminInvoiceListResponse(
        invoices=invoice_responses,
        total_count=verification_in_progress_count,
        pending_count=pending_count,
        verification_in_progress_count=verification_in_progress_count,
        paid_count=paid_count,
        late_count=late_count,
        total_pending_amount=total_pending_amount,
        total_collected_amount=total_collected_amount,
    )


@router.get("/invoices/{invoice_id}", response_model=AdminInvoiceResponse)
async def get_invoice_detail(
    invoice_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific invoice.

    Requires admin role.
    """
    # Validate admin access
    _ = user

    invoice = await session.get(WeeklyInvoice, invoice_id)

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Get customer profile
    customer = await session.get(CustomerProfile, invoice.customer_profile_id)
    customer_name = customer.full_name if customer else None
    customer_email = customer.email if customer else None

    # Get lease
    lease = await session.get(Lease, invoice.lease_id)
    vehicle_info = f"{lease.vehicle_year} {lease.vehicle_make} {lease.vehicle_model}" if lease else None
    weekly_payment = float(lease.weekly_payment) if lease else None

    return AdminInvoiceResponse(
        id=invoice.id,
        lease_id=invoice.lease_id,
        customer_profile_id=invoice.customer_profile_id,
        customer_name=customer_name,
        customer_email=customer_email,
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
        has_payment_proof=bool(invoice.payment_proof_key),
        verified_at=invoice.verified_at,
        verified_by_id=invoice.verified_by_id,
        verification_notes=invoice.verification_notes,
        rejection_reason=invoice.rejection_reason,
        is_late=invoice.is_late,
        days_late=invoice.days_late,
        late_fee_applied_at=invoice.late_fee_applied_at,
        notes=invoice.notes,
        admin_notes=invoice.admin_notes,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        paid_at=invoice.paid_at,
        vehicle_info=vehicle_info,
        weekly_payment=weekly_payment,
    )


@router.get("/invoices/{invoice_id}/payment-proof")
async def get_invoice_payment_proof(
    invoice_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get signed URL for payment proof of a specific invoice.

    Requires admin role.

    Creates an audit log entry for this access.
    """
    invoice = await session.get(WeeklyInvoice, invoice_id)

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    if not invoice.payment_proof_key:
        return {
            "has_proof": False,
            "message": "No payment proof uploaded for this invoice"
        }

    # Generate signed URL
    try:
        url = storage_service.generate_signed_url(
            bucket=settings.S3_BUCKET_PAYMENTS,
            key=invoice.payment_proof_key,
        )
    except Exception as e:
        logger.error(f"Failed to generate signed URL for payment proof: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate access URL"
        )

    # Log this access for audit
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.PAYMENT_PROOF_VIEW,
        target_type="payment_proof",
        target_id=str(invoice.id),
        target_description=f"Payment proof for invoice {invoice.invoice_number}",
        after_state={"document_type": "payment_proof", "invoice_id": invoice.id},
    )
    await session.commit()

    return {
        "has_proof": True,
        "url": url,
        "uploaded_at": invoice.payment_proof_uploaded_at,
        "payment_method": invoice.payment_method,
        "invoice_number": invoice.invoice_number,
    }


@router.post("/invoices/generate", response_model=InvoiceGenerationResponse)
async def generate_invoices(
    request: InvoiceGenerationRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Generate weekly invoices for active leases.

    Requires admin role.

    If lease_id is provided, generates invoice only for that lease.
    Otherwise, generates invoices for all active leases.

    If week_number is not provided, generates for the current week based on each lease's start date.
    """
    # Validate admin access
    _ = user

    try:
        if request.lease_id:
            # Generate for specific lease
            result = await session.execute(
                select(Lease).where(Lease.id == request.lease_id)
            )
            lease = result.scalar_one_or_none()

            if not lease:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Lease not found"
                )

            invoice = await invoice_service.generate_invoice_for_lease(
                db=session,
                lease=lease,
                week_number=request.week_number,
            )

            if invoice:
                await session.commit()
                return InvoiceGenerationResponse(
                    success=True,
                    message=f"Invoice {invoice.invoice_number} generated successfully",
                    invoices_created=1,
                    leases_processed=1,
                )
            else:
                return InvoiceGenerationResponse(
                    success=False,
                    message="Invoice already exists or lease is not active",
                    invoices_created=0,
                    leases_processed=1,
                )
        else:
            # Generate for all active leases
            invoices_created, leases_processed = await invoice_service.generate_invoices_for_all_active_leases(
                db=session,
                week_number=request.week_number,
            )

            return InvoiceGenerationResponse(
                success=True,
                message=f"Generated {invoices_created} invoices for {leases_processed} active leases",
                invoices_created=invoices_created,
                leases_processed=leases_processed,
            )

    except Exception as e:
        logger.error(f"Invoice generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invoice generation failed: {str(e)}"
        )


@router.post("/invoices/{invoice_id}/verify", response_model=PaymentVerificationResponse)
async def verify_payment(
    invoice_id: int,
    request: PaymentVerificationRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Verify or reject a payment proof for an invoice.

    Requires admin role.

    - If approved=true: Marks invoice as paid
    - If approved=false: Marks invoice as rejected with reason

    Sends email notification to customer on approval/rejection.
    """
    try:
        invoice = await invoice_service.verify_payment(
            db=session,
            invoice_id=invoice_id,
            verified_by=user.email,
            approved=request.approved,
            notes=request.notes,
            rejection_reason=request.rejection_reason,
        )

        # Log the verification action
        await audit_service.log_action(
            session=session,
            user=user,
            action=AuditAction.PAYMENT_APPROVE if request.approved else AuditAction.PAYMENT_REJECT,
            target_type="invoice",
            target_id=str(invoice.id),
            target_description=f"Invoice {invoice.invoice_number}",
            after_state={
                "approved": request.approved,
                "notes": request.notes,
                "rejection_reason": request.rejection_reason,
                "new_status": invoice.status.value,
            },
        )

        await session.commit()

        # Send email notification to customer
        try:
            # Get customer profile for email
            customer = await session.get(CustomerProfile, invoice.customer_profile_id)
            if customer and customer.email:
                customer_name = customer.full_name or "Valued Customer"
                verification_date = datetime.now(timezone.utc).strftime("%B %d, %Y")

                if request.approved:
                    # Send payment approved email
                    await email_service.send_payment_approved_email(
                        to_email=customer.email,
                        customer_name=customer_name,
                        invoice_number=invoice.invoice_number,
                        amount=float(invoice.total_amount),
                        payment_date=verification_date,
                    )
                    logger.info(f"Payment approval email sent to {customer.email} for invoice {invoice.invoice_number}")
                else:
                    # Send payment rejected email
                    rejection_reason = request.rejection_reason or "Payment proof could not be verified"
                    await email_service.send_payment_rejected_email(
                        to_email=customer.email,
                        customer_name=customer_name,
                        invoice_number=invoice.invoice_number,
                        amount=float(invoice.total_amount),
                        rejection_reason=rejection_reason,
                    )
                    logger.info(f"Payment rejection email sent to {customer.email} for invoice {invoice.invoice_number}")
        except Exception as email_error:
            # Log email error but don't fail the verification
            logger.error(f"Failed to send payment verification email: {email_error}")

        return PaymentVerificationResponse(
            success=True,
            message="Payment approved" if request.approved else "Payment rejected",
            invoice_id=invoice.id,
            invoice_number=invoice.invoice_number,
            new_status=invoice.status.value,
            verified_by=user.email,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verification failed: {str(e)}"
        )


@router.post("/invoices/process-late-fees")
async def process_late_fees(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Process late fees for overdue invoices and create delinquency cases.

    Requires admin role.

    Marks invoices as DUE if their due date has passed, then applies late fees
    to invoices that are more than 1 day overdue. Creates DelinquencyCase records
    for tracking and escalation.
    """
    # Validate admin access
    _ = user

    try:
        # First mark due invoices
        due_count = await invoice_service.mark_due_invoices(session)

        # Then apply late fees and create delinquency cases
        late_fee_count, delinquency_count = await invoice_service.apply_late_fees(session)

        return {
            "success": True,
            "message": f"Processed late fees: {due_count} invoices marked as due, {late_fee_count} late fees applied, {delinquency_count} delinquency cases created",
            "invoices_marked_due": due_count,
            "late_fees_applied": late_fee_count,
            "delinquency_cases_created": delinquency_count,
        }

    except Exception as e:
        logger.error(f"Late fee processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Late fee processing failed: {str(e)}"
        )


@router.patch("/invoices/{invoice_id}/notes")
async def update_invoice_notes(
    invoice_id: int,
    notes: Optional[str] = None,
    admin_notes: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Update notes on an invoice.

    Requires admin role.
    """
    # Validate admin access
    _ = user

    invoice = await session.get(WeeklyInvoice, invoice_id)

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    if notes is not None:
        invoice.notes = notes
    if admin_notes is not None:
        invoice.admin_notes = admin_notes

    invoice.updated_at = datetime.now(timezone.utc)

    await session.commit()

    return {
        "success": True,
        "message": "Invoice notes updated",
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
    }


class ReminderResponse(BaseModel):
    """Response for due date reminder job."""
    success: bool
    reminders_sent: int
    emails_sent: int
    message: str
    timestamp: str


@router.post("/invoices/send-reminders", response_model=ReminderResponse)
async def send_due_date_reminders(
    days_before_due: int = Query(default=2, ge=0, le=7, description="Send reminders for invoices due within this many days"),
    include_day_of: bool = Query(default=True, description="Include invoices due today"),
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Trigger due date reminder notifications.

    Sends both in-app notifications and emails to customers with invoices
    approaching their due date.

    Requires admin role.
    """
    try:
        reminders_sent, emails_sent = await invoice_service.send_due_date_reminders(
            db=session,
            days_before_due=days_before_due,
            include_day_of=include_day_of,
        )

        # Log the action
        await audit_service.log_action(
            session=session,
            user=user,
            action=AuditAction.ADMIN_ACTION,
            target_type="reminder_job",
            target_id=f"reminder-batch-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            after_state={
                "days_before_due": days_before_due,
                "include_day_of": include_day_of,
                "reminders_sent": reminders_sent,
                "emails_sent": emails_sent,
            },
            request_id=f"reminder-{datetime.now(timezone.utc).isoformat()}",
        )

        return ReminderResponse(
            success=True,
            reminders_sent=reminders_sent,
            emails_sent=emails_sent,
            message=f"Sent {reminders_sent} reminder notifications and {emails_sent} emails",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    except Exception as e:
        logger.error(f"Failed to send due date reminders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send reminders: {str(e)}"
        )


# =============================================================================
# MAINTENANCE SCHEDULING ENDPOINTS
# =============================================================================


class MaintenanceScheduleCreate(BaseModel):
    """Schema for creating a maintenance schedule."""
    vehicle_id: int
    maintenance_type: str
    title: str
    description: Optional[str] = None
    scheduled_date: datetime
    estimated_duration_hours: Optional[int] = None
    priority: str = "medium"
    service_provider: Optional[str] = None
    service_location: Optional[str] = None
    estimated_cost: Optional[float] = None
    notes: Optional[str] = None
    is_recurring: bool = False
    recurrence_interval_days: Optional[int] = None
    requires_vehicle_offline: bool = True


class MaintenanceScheduleUpdate(BaseModel):
    """Schema for updating a maintenance schedule."""
    maintenance_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    estimated_duration_hours: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    service_provider: Optional[str] = None
    service_location: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None


class MaintenanceCompleteRequest(BaseModel):
    """Schema for completing a maintenance schedule."""
    actual_cost: Optional[float] = None
    mileage_at_service: Optional[int] = None
    completion_notes: Optional[str] = None


@router.get("/maintenance")
async def get_maintenance_schedules(
    filter_status: Optional[str] = Query(None, alias="status"),
    vehicle_id: Optional[int] = None,
    maintenance_type: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get all maintenance schedules with optional filtering.

    Requires admin role.
    """
    _ = user

    query = select(MaintenanceSchedule).order_by(MaintenanceSchedule.scheduled_date.desc())

    # Apply filters
    if filter_status:
        try:
            status_enum = MaintenanceStatus(filter_status)
            query = query.where(MaintenanceSchedule.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {filter_status}"
            )

    if vehicle_id:
        query = query.where(MaintenanceSchedule.vehicle_id == vehicle_id)

    if maintenance_type:
        try:
            type_enum = MaintenanceType(maintenance_type)
            query = query.where(MaintenanceSchedule.maintenance_type == type_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid maintenance type: {maintenance_type}"
            )

    if from_date:
        query = query.where(MaintenanceSchedule.scheduled_date >= from_date)

    if to_date:
        query = query.where(MaintenanceSchedule.scheduled_date <= to_date)

    # Get total count
    count_query = select(func.count()).select_from(MaintenanceSchedule)
    if filter_status:
        count_query = count_query.where(MaintenanceSchedule.status == MaintenanceStatus(filter_status))
    if vehicle_id:
        count_query = count_query.where(MaintenanceSchedule.vehicle_id == vehicle_id)

    total = await session.scalar(count_query) or 0

    # Apply pagination
    query = query.offset(offset).limit(limit)

    result = await session.execute(query)
    schedules = result.scalars().all()

    # Get vehicle info for each schedule
    items = []
    for schedule in schedules:
        vehicle = await session.get(Vehicle, schedule.vehicle_id)
        vehicle_info = f"{vehicle.year} {vehicle.make} {vehicle.model}" if vehicle else "Unknown"

        items.append({
            "id": schedule.id,
            "vehicle_id": schedule.vehicle_id,
            "vehicle_info": vehicle_info,
            "maintenance_type": schedule.maintenance_type.value,
            "title": schedule.title,
            "description": schedule.description,
            "scheduled_date": schedule.scheduled_date.isoformat() if schedule.scheduled_date else None,
            "estimated_duration_hours": schedule.estimated_duration_hours,
            "status": schedule.status.value,
            "priority": schedule.priority.value,
            "service_provider": schedule.service_provider,
            "service_location": schedule.service_location,
            "estimated_cost": float(schedule.estimated_cost) if schedule.estimated_cost else None,
            "actual_cost": float(schedule.actual_cost) if schedule.actual_cost else None,
            "completed_at": schedule.completed_at.isoformat() if schedule.completed_at else None,
            "completed_by": schedule.completed_by,
            "created_by": schedule.created_by,
            "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
            "is_recurring": schedule.is_recurring,
            "requires_vehicle_offline": schedule.requires_vehicle_offline,
        })

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/maintenance/types")
async def get_maintenance_types(
    _user: AuthenticatedUser = Depends(require_admin),
):
    """
    Get all available maintenance types, statuses, and priorities.

    Requires admin role.
    """
    return {
        "types": [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in MaintenanceType],
        "statuses": [{"value": s.value, "label": s.value.replace("_", " ").title()} for s in MaintenanceStatus],
        "priorities": [{"value": p.value, "label": p.value.title()} for p in MaintenancePriority],
    }


@router.get("/maintenance/{schedule_id}")
async def get_maintenance_schedule(
    schedule_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get a single maintenance schedule by ID.

    Requires admin role.
    """
    _ = user

    schedule = await session.get(MaintenanceSchedule, schedule_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance schedule not found"
        )

    vehicle = await session.get(Vehicle, schedule.vehicle_id)
    vehicle_info = f"{vehicle.year} {vehicle.make} {vehicle.model}" if vehicle else "Unknown"

    return {
        "id": schedule.id,
        "vehicle_id": schedule.vehicle_id,
        "vehicle_info": vehicle_info,
        "vehicle_vin": vehicle.vin if vehicle else None,
        "vehicle_license_plate": vehicle.license_plate if vehicle else None,
        "maintenance_type": schedule.maintenance_type.value,
        "title": schedule.title,
        "description": schedule.description,
        "scheduled_date": schedule.scheduled_date.isoformat() if schedule.scheduled_date else None,
        "estimated_duration_hours": schedule.estimated_duration_hours,
        "status": schedule.status.value,
        "priority": schedule.priority.value,
        "service_provider": schedule.service_provider,
        "service_location": schedule.service_location,
        "estimated_cost": float(schedule.estimated_cost) if schedule.estimated_cost else None,
        "actual_cost": float(schedule.actual_cost) if schedule.actual_cost else None,
        "mileage_at_service": schedule.mileage_at_service,
        "next_service_mileage": schedule.next_service_mileage,
        "completed_at": schedule.completed_at.isoformat() if schedule.completed_at else None,
        "completed_by": schedule.completed_by,
        "completion_notes": schedule.completion_notes,
        "created_by": schedule.created_by,
        "assigned_to": schedule.assigned_to,
        "notes": schedule.notes,
        "admin_notes": schedule.admin_notes,
        "is_recurring": schedule.is_recurring,
        "recurrence_interval_days": schedule.recurrence_interval_days,
        "requires_vehicle_offline": schedule.requires_vehicle_offline,
        "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
        "updated_at": schedule.updated_at.isoformat() if schedule.updated_at else None,
    }


@router.post("/maintenance", status_code=status.HTTP_201_CREATED)
async def create_maintenance_schedule(
    data: MaintenanceScheduleCreate,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Create a new maintenance schedule for a vehicle.

    Requires admin role.
    """
    # Verify vehicle exists
    vehicle = await session.get(Vehicle, data.vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    # Validate maintenance type
    try:
        maint_type = MaintenanceType(data.maintenance_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid maintenance type: {data.maintenance_type}. Valid types: {[t.value for t in MaintenanceType]}"
        )

    # Validate priority
    try:
        priority = MaintenancePriority(data.priority)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority: {data.priority}. Valid values: {[p.value for p in MaintenancePriority]}"
        )

    # Create the schedule
    schedule = MaintenanceSchedule(
        vehicle_id=data.vehicle_id,
        maintenance_type=maint_type,
        title=data.title,
        description=data.description,
        scheduled_date=data.scheduled_date,
        estimated_duration_hours=data.estimated_duration_hours,
        status=MaintenanceStatus.SCHEDULED,
        priority=priority,
        service_provider=data.service_provider,
        service_location=data.service_location,
        estimated_cost=Decimal(str(data.estimated_cost)) if data.estimated_cost else None,
        notes=data.notes,
        is_recurring=data.is_recurring,
        recurrence_interval_days=data.recurrence_interval_days,
        requires_vehicle_offline=data.requires_vehicle_offline,
        created_by=user.email,
    )

    session.add(schedule)
    await session.commit()
    await session.refresh(schedule)

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.MAINTENANCE_SCHEDULE,
        target_type="maintenance_schedule",
        target_id=str(schedule.id),
        target_description=f"Maintenance '{schedule.title}' for {vehicle.year} {vehicle.make} {vehicle.model}",
    )

    vehicle_info = f"{vehicle.year} {vehicle.make} {vehicle.model}"

    return {
        "success": True,
        "message": "Maintenance schedule created",
        "schedule_id": schedule.id,
        "vehicle_info": vehicle_info,
        "scheduled_date": schedule.scheduled_date.isoformat(),
        "maintenance_type": schedule.maintenance_type.value,
        "created_by": schedule.created_by,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.patch("/maintenance/{schedule_id}")
async def update_maintenance_schedule(
    schedule_id: int,
    data: MaintenanceScheduleUpdate,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Update a maintenance schedule.

    Requires admin role.
    """
    schedule = await session.get(MaintenanceSchedule, schedule_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance schedule not found"
        )

    # Update fields if provided
    if data.maintenance_type is not None:
        try:
            schedule.maintenance_type = MaintenanceType(data.maintenance_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid maintenance type: {data.maintenance_type}"
            )

    if data.title is not None:
        schedule.title = data.title

    if data.description is not None:
        schedule.description = data.description

    if data.scheduled_date is not None:
        schedule.scheduled_date = data.scheduled_date

    if data.estimated_duration_hours is not None:
        schedule.estimated_duration_hours = data.estimated_duration_hours

    if data.status is not None:
        try:
            schedule.status = MaintenanceStatus(data.status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {data.status}"
            )

    if data.priority is not None:
        try:
            schedule.priority = MaintenancePriority(data.priority)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority: {data.priority}"
            )

    if data.service_provider is not None:
        schedule.service_provider = data.service_provider

    if data.service_location is not None:
        schedule.service_location = data.service_location

    if data.estimated_cost is not None:
        schedule.estimated_cost = Decimal(str(data.estimated_cost))

    if data.actual_cost is not None:
        schedule.actual_cost = Decimal(str(data.actual_cost))

    if data.notes is not None:
        schedule.notes = data.notes

    if data.admin_notes is not None:
        schedule.admin_notes = data.admin_notes

    schedule.updated_at = datetime.now(timezone.utc)

    await session.commit()

    return {
        "success": True,
        "message": "Maintenance schedule updated",
        "schedule_id": schedule.id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/maintenance/{schedule_id}/start")
async def start_maintenance(
    schedule_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Mark maintenance as in progress.

    Requires admin role.
    """
    schedule = await session.get(MaintenanceSchedule, schedule_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance schedule not found"
        )

    if schedule.status != MaintenanceStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start maintenance with status: {schedule.status.value}"
        )

    # Update status
    schedule.mark_in_progress()

    # Optionally update vehicle status
    if schedule.requires_vehicle_offline:
        vehicle = await session.get(Vehicle, schedule.vehicle_id)
        if vehicle:
            vehicle.status = VehicleStatus.MAINTENANCE
            vehicle.updated_at = datetime.now(timezone.utc)

    await session.commit()

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.MAINTENANCE_UPDATE,
        target_type="maintenance_schedule",
        target_id=str(schedule.id),
        target_description=f"Started maintenance '{schedule.title}'",
    )

    return {
        "success": True,
        "message": "Maintenance started",
        "schedule_id": schedule.id,
        "status": schedule.status.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/maintenance/{schedule_id}/complete")
async def complete_maintenance(
    schedule_id: int,
    data: MaintenanceCompleteRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Mark maintenance as completed.

    Requires admin role.
    """
    schedule = await session.get(MaintenanceSchedule, schedule_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance schedule not found"
        )

    if schedule.status not in [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete maintenance with status: {schedule.status.value}"
        )

    # Mark as completed
    schedule.mark_completed(
        completed_by=user.email,
        actual_cost=Decimal(str(data.actual_cost)) if data.actual_cost else None,
        mileage=data.mileage_at_service,
        notes=data.completion_notes,
    )

    # Update vehicle status back to available
    if schedule.requires_vehicle_offline:
        vehicle = await session.get(Vehicle, schedule.vehicle_id)
        if vehicle and vehicle.status == VehicleStatus.MAINTENANCE:
            # Only change if not leased
            if not vehicle.current_lease_id:
                vehicle.status = VehicleStatus.AVAILABLE
            vehicle.updated_at = datetime.now(timezone.utc)

    await session.commit()

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.MAINTENANCE_UPDATE,
        target_type="maintenance_schedule",
        target_id=str(schedule.id),
        target_description=f"Completed maintenance '{schedule.title}'",
    )

    return {
        "success": True,
        "message": "Maintenance completed",
        "schedule_id": schedule.id,
        "status": schedule.status.value,
        "completed_at": schedule.completed_at.isoformat() if schedule.completed_at else None,
        "completed_by": schedule.completed_by,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/maintenance/{schedule_id}/cancel")
async def cancel_maintenance(
    schedule_id: int,
    reason: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Cancel a maintenance schedule.

    Requires admin role.
    """
    schedule = await session.get(MaintenanceSchedule, schedule_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance schedule not found"
        )

    if schedule.status in [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel maintenance with status: {schedule.status.value}"
        )

    # Cancel the schedule
    schedule.cancel(reason)

    # If vehicle was set to maintenance, revert it
    if schedule.requires_vehicle_offline:
        vehicle = await session.get(Vehicle, schedule.vehicle_id)
        if vehicle and vehicle.status == VehicleStatus.MAINTENANCE:
            if not vehicle.current_lease_id:
                vehicle.status = VehicleStatus.AVAILABLE
            vehicle.updated_at = datetime.now(timezone.utc)

    await session.commit()

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.MAINTENANCE_CANCEL,
        target_type="maintenance_schedule",
        target_id=str(schedule.id),
        target_description=f"Cancelled maintenance '{schedule.title}'",
    )

    return {
        "success": True,
        "message": "Maintenance cancelled",
        "schedule_id": schedule.id,
        "status": schedule.status.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.delete("/maintenance/{schedule_id}")
async def delete_maintenance_schedule(
    schedule_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Delete a maintenance schedule.

    Only allows deletion of scheduled or cancelled maintenance.
    Requires admin role.
    """
    schedule = await session.get(MaintenanceSchedule, schedule_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance schedule not found"
        )

    if schedule.status not in [MaintenanceStatus.SCHEDULED, MaintenanceStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete maintenance with status: {schedule.status.value}. Only scheduled or cancelled maintenance can be deleted."
        )

    schedule_title = schedule.title
    await session.delete(schedule)
    await session.commit()

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.MAINTENANCE_DELETE,
        target_type="maintenance_schedule",
        target_id=str(schedule_id),
        target_description=f"Deleted maintenance '{schedule_title}'",
    )

    return {
        "success": True,
        "message": "Maintenance schedule deleted",
        "schedule_id": schedule_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ==============================================================================
# Delinquency Case Management Endpoints
# ==============================================================================

class DelinquencyCaseCreateRequest(BaseModel):
    """Schema for creating a delinquency case."""
    customer_profile_id: int
    invoice_id: int
    lease_id: int
    vehicle_id: Optional[int] = None
    amount_owed: float
    notes: Optional[str] = None


class DelinquencyCaseUpdateRequest(BaseModel):
    """Schema for updating a delinquency case."""
    status: Optional[str] = None
    escalation_level: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    assigned_to: Optional[str] = None
    is_priority: Optional[bool] = None


class ContactAttemptRequest(BaseModel):
    """Schema for recording a contact attempt."""
    method: str  # phone, email, sms
    notes: Optional[str] = None


class RecoveryAuthorizationRequest(BaseModel):
    """Schema for authorizing recovery with compliance gate."""
    compliance_confirmed: bool  # Must be True to authorize
    reason: str  # Reason for recovery
    contract_version: str  # Contract version reference
    notes: Optional[str] = None  # Supporting notes


class TowScheduleRequest(BaseModel):
    """Schema for scheduling a tow."""
    scheduled_at: datetime
    notes: Optional[str] = None


class TowVendorDetailsRequest(BaseModel):
    """Schema for entering tow vendor details."""
    vendor_name: str
    vendor_phone: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_reference: Optional[str] = None  # Vendor's job/reference number
    vendor_address: Optional[str] = None
    vendor_notes: Optional[str] = None
    # Optional scheduling info
    scheduled_at: Optional[datetime] = None
    pickup_location: Optional[str] = None
    destination: Optional[str] = None
    estimated_cost: Optional[float] = None


class ResolveDelinquencyRequest(BaseModel):
    """Schema for resolving a delinquency case."""
    resolution_type: str  # paid, settled, written_off, recovered
    notes: Optional[str] = None


def generate_case_number() -> str:
    """Generate a unique delinquency case number."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    import random
    suffix = random.randint(100, 999)
    return f"DC-{timestamp}-{suffix}"


@router.get("/delinquency/types")
async def get_delinquency_types(
    _user: AuthenticatedUser = Depends(require_admin),
) -> dict[str, Any]:
    """
    Get delinquency status and escalation level options.

    Requires admin role.
    """
    return {
        "statuses": [
            {"value": s.value, "label": s.value.replace("_", " ").title()}
            for s in DelinquencyStatus
        ],
        "escalation_levels": [
            {"value": e.value, "label": e.value.replace("_", " ").upper()}
            for e in EscalationLevel
        ],
    }


@router.get("/delinquency")
async def get_delinquency_cases(
    filter_status: Optional[str] = Query(None, alias="status"),
    escalation_level: Optional[str] = None,
    customer_id: Optional[int] = None,
    is_priority: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Get delinquency cases with optional filtering.

    Requires admin role.
    """
    query = select(DelinquencyCase).order_by(DelinquencyCase.created_at.desc())

    if filter_status:
        try:
            status_enum = DelinquencyStatus(filter_status)
            query = query.where(DelinquencyCase.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {filter_status}"
            )

    if escalation_level:
        try:
            level_enum = EscalationLevel(escalation_level)
            query = query.where(DelinquencyCase.escalation_level == level_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid escalation level: {escalation_level}"
            )

    if customer_id:
        query = query.where(DelinquencyCase.customer_profile_id == customer_id)

    if is_priority is not None:
        query = query.where(DelinquencyCase.is_priority == is_priority)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await session.scalar(count_query) or 0

    # Apply pagination
    query = query.offset(offset).limit(limit)
    result = await session.execute(query)
    cases = result.scalars().all()

    # Build response with customer and vehicle info
    items = []
    for case in cases:
        # Get customer info
        customer = await session.get(CustomerProfile, case.customer_profile_id)
        customer_info = customer.full_name or customer.email if customer else "Unknown"
        customer_email = customer.email if customer else None

        # Get vehicle info
        vehicle_info = None
        if case.vehicle_id:
            vehicle = await session.get(Vehicle, case.vehicle_id)
            if vehicle:
                vehicle_info = f"{vehicle.year} {vehicle.make} {vehicle.model}"

        items.append({
            "id": case.id,
            "case_number": case.case_number,
            "customer_profile_id": case.customer_profile_id,
            "customer_name": customer_info,
            "customer_email": customer_email,
            "invoice_id": case.invoice_id,
            "lease_id": case.lease_id,
            "vehicle_id": case.vehicle_id,
            "vehicle_info": vehicle_info,
            "status": case.status.value,
            "escalation_level": case.escalation_level.value,
            "amount_owed": float(case.amount_owed),
            "late_fees_accumulated": float(case.late_fees_accumulated),
            "total_owed": float(case.total_owed),
            "amount_paid": float(case.amount_paid),
            "remaining_balance": float(case.remaining_balance),
            "days_delinquent": case.days_delinquent,
            "delinquent_since": case.delinquent_since.isoformat(),
            "contact_attempts": case.contact_attempts,
            "last_contact_at": case.last_contact_at.isoformat() if case.last_contact_at else None,
            "recovery_authorized": case.recovery_authorized,
            "tow_scheduled": case.tow_scheduled,
            "is_priority": case.is_priority,
            "assigned_to": case.assigned_to,
            "notes": case.notes,
            "admin_notes": case.admin_notes,
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
        })

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/delinquency/{case_id}")
async def get_delinquency_case(
    case_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Get a single delinquency case by ID.

    Requires admin role.
    """
    case = await session.get(DelinquencyCase, case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delinquency case not found"
        )

    # Get customer info
    customer = await session.get(CustomerProfile, case.customer_profile_id)
    customer_info = {
        "id": customer.id,
        "name": customer.full_name or customer.email if customer else "Unknown",
        "email": customer.email if customer else None,
        "phone": customer.phone if customer else None,
    } if customer else None

    # Get vehicle info
    vehicle_info = None
    if case.vehicle_id:
        vehicle = await session.get(Vehicle, case.vehicle_id)
        if vehicle:
            vehicle_info = {
                "id": vehicle.id,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "vin": vehicle.vin,
                "license_plate": vehicle.license_plate,
            }

    # Get invoice info
    invoice = await session.get(WeeklyInvoice, case.invoice_id)
    invoice_info = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "amount": float(invoice.amount),
        "total_amount": float(invoice.total_amount),
        "due_date": invoice.due_date.isoformat(),
        "status": invoice.status.value,
    } if invoice else None

    return {
        "id": case.id,
        "case_number": case.case_number,
        "customer": customer_info,
        "vehicle": vehicle_info,
        "invoice": invoice_info,
        "lease_id": case.lease_id,
        "status": case.status.value,
        "escalation_level": case.escalation_level.value,
        "amount_owed": float(case.amount_owed),
        "late_fees_accumulated": float(case.late_fees_accumulated),
        "total_owed": float(case.total_owed),
        "amount_paid": float(case.amount_paid),
        "remaining_balance": float(case.remaining_balance),
        "days_delinquent": case.days_delinquent,
        "delinquent_since": case.delinquent_since.isoformat(),
        "last_escalation_at": case.last_escalation_at.isoformat() if case.last_escalation_at else None,
        "next_escalation_at": case.next_escalation_at.isoformat() if case.next_escalation_at else None,
        "contact_attempts": case.contact_attempts,
        "last_contact_at": case.last_contact_at.isoformat() if case.last_contact_at else None,
        "last_contact_method": case.last_contact_method,
        "recovery_authorized": case.recovery_authorized,
        "recovery_authorized_by": case.recovery_authorized_by,
        "recovery_authorized_at": case.recovery_authorized_at.isoformat() if case.recovery_authorized_at else None,
        "tow_scheduled": case.tow_scheduled,
        "tow_scheduled_at": case.tow_scheduled_at.isoformat() if case.tow_scheduled_at else None,
        "vehicle_recovered_at": case.vehicle_recovered_at.isoformat() if case.vehicle_recovered_at else None,
        "resolved_at": case.resolved_at.isoformat() if case.resolved_at else None,
        "resolved_by": case.resolved_by,
        "resolution_type": case.resolution_type,
        "resolution_notes": case.resolution_notes,
        "is_priority": case.is_priority,
        "assigned_to": case.assigned_to,
        "assigned_at": case.assigned_at.isoformat() if case.assigned_at else None,
        "notes": case.notes,
        "admin_notes": case.admin_notes,
        "created_at": case.created_at.isoformat(),
        "updated_at": case.updated_at.isoformat(),
    }


@router.post("/delinquency")
async def create_delinquency_case(
    data: DelinquencyCaseCreateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Create a new delinquency case.

    Requires admin role.
    """
    # Verify customer exists
    customer = await session.get(CustomerProfile, data.customer_profile_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    # Verify invoice exists
    invoice = await session.get(WeeklyInvoice, data.invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Verify lease exists
    lease = await session.get(Lease, data.lease_id)
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lease not found"
        )

    # Check for existing case for this invoice
    existing = await session.execute(
        select(DelinquencyCase).where(DelinquencyCase.invoice_id == data.invoice_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delinquency case already exists for this invoice"
        )

    # Create the case
    case = DelinquencyCase(
        customer_profile_id=data.customer_profile_id,
        invoice_id=data.invoice_id,
        lease_id=data.lease_id,
        vehicle_id=data.vehicle_id,
        case_number=generate_case_number(),
        amount_owed=Decimal(str(data.amount_owed)),
        late_fees_accumulated=Decimal("0.00"),
        total_owed=Decimal(str(data.amount_owed)),
        remaining_balance=Decimal(str(data.amount_owed)),
        delinquent_since=datetime.now(timezone.utc),
        notes=data.notes,
    )

    session.add(case)
    await session.commit()
    await session.refresh(case)

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.DELINQUENCY_ESCALATION,
        target_type="delinquency_case",
        target_id=str(case.id),
        target_description=f"Created delinquency case {case.case_number}",
    )

    return {
        "success": True,
        "message": "Delinquency case created",
        "case_id": case.id,
        "case_number": case.case_number,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.put("/delinquency/{case_id}")
async def update_delinquency_case(
    case_id: int,
    data: DelinquencyCaseUpdateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Update a delinquency case.

    Requires admin role.
    """
    case = await session.get(DelinquencyCase, case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delinquency case not found"
        )

    if data.status:
        try:
            case.status = DelinquencyStatus(data.status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {data.status}"
            )

    if data.escalation_level:
        try:
            case.escalation_level = EscalationLevel(data.escalation_level)
            case.last_escalation_at = datetime.now(timezone.utc)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid escalation level: {data.escalation_level}"
            )

    if data.notes is not None:
        case.notes = data.notes

    if data.admin_notes is not None:
        case.admin_notes = data.admin_notes

    if data.assigned_to is not None:
        case.assigned_to = data.assigned_to
        case.assigned_at = datetime.now(timezone.utc) if data.assigned_to else None

    if data.is_priority is not None:
        case.is_priority = data.is_priority

    await session.commit()

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.DELINQUENCY_ESCALATION,
        target_type="delinquency_case",
        target_id=str(case.id),
        target_description=f"Updated delinquency case {case.case_number}",
    )

    return {
        "success": True,
        "message": "Delinquency case updated",
        "case_id": case.id,
        "case_number": case.case_number,
        "status": case.status.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/delinquency/{case_id}/contact")
async def record_contact_attempt(
    case_id: int,
    data: ContactAttemptRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Record a contact attempt for a delinquency case.

    Requires admin role.
    """
    case = await session.get(DelinquencyCase, case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delinquency case not found"
        )

    case.record_contact(data.method)
    if data.notes:
        existing_notes = case.notes or ""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        case.notes = f"{existing_notes}\n[{timestamp}] Contact ({data.method}): {data.notes}".strip()

    await session.commit()

    return {
        "success": True,
        "message": "Contact attempt recorded",
        "case_id": case.id,
        "contact_attempts": case.contact_attempts,
        "last_contact_at": case.last_contact_at.isoformat(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/delinquency/{case_id}/escalate")
async def escalate_delinquency(
    case_id: int,
    level: str,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Escalate a delinquency case to a new level.

    Sends escalation notice email and creates in-app notification.
    Requires admin role.
    """
    case = await session.get(DelinquencyCase, case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delinquency case not found"
        )

    try:
        new_level = EscalationLevel(level)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid escalation level: {level}"
        )

    old_level = case.escalation_level.value
    case.escalate(new_level)
    case.days_delinquent = max(case.days_delinquent, 2)  # At least Day 2 if being escalated
    await session.commit()

    # Get customer info for notification
    customer = await session.get(CustomerProfile, case.customer_profile_id)
    email_sent = False
    notification_created = False

    if customer:
        customer_name = customer.full_name or customer.email or "Valued Customer"
        customer_email = customer.email

        # Send escalation notice email
        if customer_email:
            email_result = await email_service.send_escalation_notice(
                to_email=customer_email,
                customer_name=customer_name,
                case_number=case.case_number,
                amount_owed=float(case.amount_owed),
                late_fees=float(case.late_fees_accumulated),
                total_owed=float(case.total_owed),
                days_delinquent=case.days_delinquent,
                escalation_level=new_level.value,
            )
            email_sent = email_result.get("success", False)
            if not email_sent:
                logger.warning(f"Failed to send escalation email for case {case.case_number}: {email_result.get('error')}")

        # Create in-app notification for customer
        try:
            from app.models.notification import NotificationType, NotificationPriority
            await notification_service.create_notification(
                db=session,
                customer_profile_id=case.customer_profile_id,
                notification_type=NotificationType.DELINQUENCY_ESCALATION,
                title="Account Escalation Notice",
                message=f"Your account has been escalated to {new_level.value.replace('_', ' ').upper()}. "
                        f"Total amount owed: ${float(case.total_owed):.2f}. Please make payment immediately to avoid further action.",
                priority=NotificationPriority.URGENT,
                action_url="/payments",
                action_label="Make Payment",
                related_entity_type="delinquency_case",
                related_entity_id=case.id,
            )
            notification_created = True
        except Exception as e:
            logger.warning(f"Failed to create escalation notification for case {case.case_number}: {str(e)}")

    # Log the action with before/after states
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.DELINQUENCY_ESCALATION,
        target_type="delinquency_case",
        target_id=str(case.id),
        target_description=f"Escalated case {case.case_number} from {old_level} to {level}",
        before_state={
            "escalation_level": old_level,
            "status": "open",
        },
        after_state={
            "escalation_level": level,
            "status": case.status.value,
            "email_sent": email_sent,
            "notification_created": notification_created,
        },
    )

    return {
        "success": True,
        "message": f"Case escalated to {level}",
        "case_id": case.id,
        "escalation_level": case.escalation_level.value,
        "status": case.status.value,
        "email_sent": email_sent,
        "notification_created": notification_created,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/delinquency/{case_id}/authorize-recovery")
async def authorize_recovery(
    case_id: int,
    data: RecoveryAuthorizationRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Authorize vehicle recovery for a delinquency case.

    Requires compliance gate authorization with:
    - compliance_confirmed: Must be True
    - reason: Reason for recovery action
    - contract_version: Contract version reference
    - notes: Optional supporting notes

    Requires admin role.
    """
    # Check if recovery workflow is enabled
    recovery_setting_result = await session.execute(
        select(SystemSettings).where(
            SystemSettings.setting_key == "recovery_workflow_enabled",
            SystemSettings.is_active == True
        )
    )
    recovery_setting = recovery_setting_result.scalar_one_or_none()

    if recovery_setting and not recovery_setting.get_typed_value():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recovery workflow is currently disabled. Contact system administrator to enable recovery actions."
        )

    # Validate compliance gate
    if not data.compliance_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compliance authorization must be confirmed to initiate recovery"
        )

    if not data.reason or len(data.reason.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recovery reason must be at least 10 characters"
        )

    if not data.contract_version or len(data.contract_version.strip()) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract version reference is required"
        )

    case = await session.get(DelinquencyCase, case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delinquency case not found"
        )

    # Store compliance gate details in admin notes
    existing_notes = case.admin_notes or ""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    compliance_entry = (
        f"\n[{timestamp}] COMPLIANCE GATE AUTHORIZED\n"
        f"  - Authorized By: {user.email}\n"
        f"  - Reason: {data.reason.strip()}\n"
        f"  - Contract Version: {data.contract_version.strip()}\n"
    )
    if data.notes:
        compliance_entry += f"  - Supporting Notes: {data.notes.strip()}\n"
    case.admin_notes = f"{existing_notes}{compliance_entry}".strip()

    # Authorize recovery
    case.authorize_recovery(user.email)
    case.escalation_level = EscalationLevel.LEVEL_4

    # Generate action number
    action_timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    action_number = f"REC-{case.customer_profile_id:06d}-{action_timestamp}"

    # Create RecoveryAction record
    recovery_action = RecoveryAction(
        delinquency_case_id=case.id,
        customer_profile_id=case.customer_profile_id,
        lease_id=case.lease_id,
        vehicle_id=case.vehicle_id,
        action_number=action_number,
        status=RecoveryStatus.TOW_REQUESTED,
        authorized_by=user.email,
        authorization_reason=data.reason.strip(),
        contract_version=data.contract_version.strip(),
        authorization_notes=data.notes.strip() if data.notes else None,
    )
    session.add(recovery_action)

    # === LEASE TERMINATION ON RECOVERY (Feature #63) ===

    # 1. Terminate the lease
    lease = await session.get(Lease, case.lease_id)
    lease_terminated = False
    vehicle_status_changed = False
    email_sent = False
    notification_created = False
    old_lease_status = None
    old_vehicle_status = None

    if lease:
        old_lease_status = lease.status.value
        lease.status = LeaseStatus.TERMINATED
        lease.terminated_at = datetime.now(timezone.utc)
        lease.termination_reason = f"Recovery initiated due to non-payment. Case: {case.case_number}. Reason: {data.reason.strip()}"
        recovery_action.terminate_lease()
        lease_terminated = True

        # 2. Update vehicle status to PENDING_INSPECTION (needs to be checked after recovery)
        vehicle = await session.get(Vehicle, case.vehicle_id) if case.vehicle_id else None
        if vehicle:
            old_vehicle_status = vehicle.status.value
            vehicle.status = VehicleStatus.PENDING_INSPECTION
            vehicle.current_lease_id = None  # Clear the current lease assignment
            vehicle.notes = f"{vehicle.notes or ''}\n[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}] Lease terminated due to recovery. Case: {case.case_number}".strip()
            vehicle_status_changed = True

        # 3. Get customer profile for email notification
        customer = await session.get(CustomerProfile, case.customer_profile_id)
        if customer and customer.email:
            # Get vehicle info for email
            vehicle_info = f"{lease.vehicle_year} {lease.vehicle_make} {lease.vehicle_model}"

            # Calculate total amount owed
            amount_owed = float(case.amount_owed or 0) + float(case.late_fees_accumulated or 0)

            # Send termination email
            try:
                from app.models.notification import NotificationType, NotificationPriority, Notification

                email_result = await email_service.send_lease_termination_notice(
                    to_email=customer.email,
                    customer_name=customer.full_name or "Valued Customer",
                    vehicle_info=vehicle_info,
                    termination_reason=data.reason.strip(),
                    case_number=case.case_number,
                    amount_owed=amount_owed,
                    recovery_action_number=action_number,
                )
                email_sent = email_result.get("success", False)

                # 4. Create in-app notification for customer
                notification = Notification(
                    customer_profile_id=customer.id,
                    notification_type=NotificationType.LEASE_TERMINATED,
                    title="Lease Terminated",
                    message=f"Your lease for {vehicle_info} has been terminated due to non-payment. Vehicle recovery has been initiated. Case: {case.case_number}. Please contact us immediately if you have questions.",
                    priority=NotificationPriority.URGENT,
                    related_entity_type="recovery_action",
                    related_entity_id=recovery_action.id,
                    action_url="/dashboard",
                    action_label="View Account Status",
                )
                session.add(notification)
                notification_created = True

                # Mark customer as notified on recovery action
                recovery_action.notify_customer()
            except Exception as e:
                logger.error(f"Failed to send termination email/notification: {str(e)}")

    # === PERMANENT BAN ON RECOVERY (Feature #64) ===

    # 1. Create BanRecord for permanent ban
    ban_created = False
    ban_email_sent = False
    ban_notification_created = False
    ban_number = None

    if customer:
        # Generate ban number
        ban_timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        ban_number = f"BAN-{customer.id:06d}-{ban_timestamp}"

        # Calculate total amount owed for ban record
        total_owed = float(case.amount_owed or 0) + float(case.late_fees_accumulated or 0)

        # Create BanRecord
        ban_record = BanRecord(
            customer_profile_id=customer.id,
            ban_number=ban_number,
            reason=BanReason.RECOVERY_ACTION,
            reason_details=f"Permanently banned due to vehicle recovery action. Case: {case.case_number}. Recovery: {action_number}. Reason: {data.reason.strip()}",
            is_permanent=True,
            status=BanStatus.ACTIVE,
            delinquency_case_id=case.id,
            recovery_action_id=recovery_action.id,
            lease_id=case.lease_id,
            issued_by=user.sub,
            issued_by_email=user.email,
            admin_notes=f"Auto-generated ban from recovery authorization. Outstanding balance: ${total_owed:.2f}",
        )
        session.add(ban_record)
        ban_created = True

        # 2. Mark customer as banned in their profile
        customer.is_banned = True
        customer.ban_reason = f"Permanent ban due to vehicle recovery. Case: {case.case_number}. Ban: {ban_number}"

        # 3. Send ban notification email
        try:
            ban_email_result = await email_service.send_ban_notice(
                to_email=customer.email,
                customer_name=customer.full_name or "Valued Customer",
                ban_number=ban_number,
                ban_reason=f"Vehicle recovery initiated due to non-payment",
                case_number=case.case_number,
                amount_owed=total_owed,
            )
            ban_email_sent = ban_email_result.get("success", False)

            # 4. Create in-app notification for ban
            ban_notification = Notification(
                customer_profile_id=customer.id,
                notification_type=NotificationType.ACCOUNT_BANNED,
                title="Account Permanently Banned",
                message=f"Your account has been permanently banned due to vehicle recovery. Ban Reference: {ban_number}. You cannot request new vehicles or create leases. Contact legal@fxweeklylease.com for appeals.",
                priority=NotificationPriority.URGENT,
                related_entity_type="ban_record",
                related_entity_id=ban_record.id,
                action_url="/dashboard",
                action_label="View Account Status",
            )
            session.add(ban_notification)
            ban_notification_created = True

            # Mark ban record as customer notified
            ban_record.notify_customer()

        except Exception as e:
            logger.error(f"Failed to send ban notice email/notification: {str(e)}")

    await session.commit()
    await session.refresh(recovery_action)

    # Log the action with compliance gate details
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.RECOVERY_AUTHORIZATION,
        target_type="delinquency_case",
        target_id=str(case.id),
        target_description=f"Compliance gate authorized for case {case.case_number}",
        before_state={
            "status": "escalated",
            "recovery_authorized": False,
            "lease_status": old_lease_status if lease_terminated else None,
            "vehicle_status": old_vehicle_status if vehicle_status_changed else None,
        },
        after_state={
            "status": case.status.value,
            "recovery_authorized": True,
            "compliance_confirmed": True,
            "reason": data.reason.strip(),
            "contract_version": data.contract_version.strip(),
            "notes": data.notes.strip() if data.notes else None,
            "lease_terminated": lease_terminated,
            "vehicle_status_changed": vehicle_status_changed,
            "email_sent": email_sent,
            "notification_created": notification_created,
            "ban_created": ban_created,
            "ban_number": ban_number,
            "ban_email_sent": ban_email_sent,
            "ban_notification_created": ban_notification_created,
        },
    )

    return {
        "success": True,
        "message": "Recovery authorized via compliance gate",
        "case_id": case.id,
        "recovery_authorized": case.recovery_authorized,
        "recovery_authorized_at": case.recovery_authorized_at.isoformat() if case.recovery_authorized_at else None,
        "recovery_action": {
            "id": recovery_action.id,
            "action_number": recovery_action.action_number,
            "status": recovery_action.status.value,
            "authorized_by": recovery_action.authorized_by,
            "created_at": recovery_action.created_at.isoformat(),
        },
        "compliance_gate": {
            "confirmed": True,
            "reason": data.reason.strip(),
            "contract_version": data.contract_version.strip(),
            "notes": data.notes.strip() if data.notes else None,
        },
        "lease_termination": {
            "lease_terminated": lease_terminated,
            "termination_reason": lease.termination_reason if lease and lease_terminated else None,
            "vehicle_status_changed": vehicle_status_changed,
            "email_sent": email_sent,
            "notification_created": notification_created,
        },
        "permanent_ban": {
            "ban_created": ban_created,
            "ban_number": ban_number,
            "customer_banned": customer.is_banned if customer else False,
            "ban_email_sent": ban_email_sent,
            "ban_notification_created": ban_notification_created,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/recovery-actions")
async def list_recovery_actions(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    """
    List all recovery actions with optional status filter.

    Requires admin role.
    """
    query = select(RecoveryAction).order_by(RecoveryAction.created_at.desc())

    if status_filter:
        try:
            status_enum = RecoveryStatus(status_filter)
            query = query.where(RecoveryAction.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join([s.value for s in RecoveryStatus])}"
            )

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)
    actions = result.scalars().all()

    items = []
    for action in actions:
        # Get customer info
        customer = await session.get(CustomerProfile, action.customer_profile_id)
        customer_name = customer.full_name if customer else "Unknown"
        customer_email = customer.email if customer else None

        # Get vehicle info
        vehicle_info = None
        if action.vehicle_id:
            vehicle = await session.get(Vehicle, action.vehicle_id)
            if vehicle:
                vehicle_info = f"{vehicle.year} {vehicle.make} {vehicle.model}"

        items.append({
            "id": action.id,
            "action_number": action.action_number,
            "status": action.status.value,
            "customer_profile_id": action.customer_profile_id,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "vehicle_id": action.vehicle_id,
            "vehicle_info": vehicle_info,
            "delinquency_case_id": action.delinquency_case_id,
            "authorized_by": action.authorized_by,
            "authorization_reason": action.authorization_reason,
            "tow_vendor_name": action.tow_vendor_name,
            "tow_vendor_phone": action.tow_vendor_phone,
            "tow_vendor_reference": action.tow_vendor_reference,
            "tow_scheduled_at": action.tow_scheduled_at.isoformat() if action.tow_scheduled_at else None,
            "created_at": action.created_at.isoformat(),
            "updated_at": action.updated_at.isoformat(),
        })

    return {
        "items": items,
        "total": len(items),
        "limit": limit,
        "offset": offset,
    }


@router.get("/recovery-actions/{action_id}")
async def get_recovery_action(
    action_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Get recovery action details by ID.

    Requires admin role.
    """
    action = await session.get(RecoveryAction, action_id)

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recovery action not found"
        )

    # Get customer info
    customer = await session.get(CustomerProfile, action.customer_profile_id)
    customer_name = customer.full_name if customer else "Unknown"
    customer_email = customer.email if customer else None

    # Get vehicle info
    vehicle_info = None
    if action.vehicle_id:
        vehicle = await session.get(Vehicle, action.vehicle_id)
        if vehicle:
            vehicle_info = f"{vehicle.year} {vehicle.make} {vehicle.model}"

    # Get delinquency case info
    case = await session.get(DelinquencyCase, action.delinquency_case_id)

    return {
        "id": action.id,
        "action_number": action.action_number,
        "status": action.status.value,
        "customer_profile_id": action.customer_profile_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "lease_id": action.lease_id,
        "vehicle_id": action.vehicle_id,
        "vehicle_info": vehicle_info,
        "delinquency_case_id": action.delinquency_case_id,
        "case_number": case.case_number if case else None,
        # Authorization details
        "authorized_by": action.authorized_by,
        "authorization_reason": action.authorization_reason,
        "contract_version": action.contract_version,
        "authorization_notes": action.authorization_notes,
        # Tow vendor details
        "tow_vendor_name": action.tow_vendor_name,
        "tow_vendor_phone": action.tow_vendor_phone,
        "tow_vendor_email": action.tow_vendor_email,
        "tow_vendor_reference": action.tow_vendor_reference,
        "tow_vendor_address": action.tow_vendor_address,
        "tow_vendor_notes": action.tow_vendor_notes,
        # Scheduling
        "tow_scheduled_at": action.tow_scheduled_at.isoformat() if action.tow_scheduled_at else None,
        "tow_pickup_location": action.tow_pickup_location,
        "tow_destination": action.tow_destination,
        "estimated_tow_cost": float(action.estimated_tow_cost) if action.estimated_tow_cost else None,
        "actual_tow_cost": float(action.actual_tow_cost) if action.actual_tow_cost else None,
        # Recovery outcomes
        "vehicle_recovered_at": action.vehicle_recovered_at.isoformat() if action.vehicle_recovered_at else None,
        "recovery_completed_by": action.recovery_completed_by,
        "vehicle_condition_notes": action.vehicle_condition_notes,
        "mileage_at_recovery": action.mileage_at_recovery,
        # Failure/cancellation
        "failure_reason": action.failure_reason,
        "cancelled_by": action.cancelled_by,
        "cancelled_at": action.cancelled_at.isoformat() if action.cancelled_at else None,
        "cancellation_reason": action.cancellation_reason,
        # Customer notification
        "customer_notified": action.customer_notified,
        "customer_notified_at": action.customer_notified_at.isoformat() if action.customer_notified_at else None,
        # Lease/ban tracking
        "lease_terminated": action.lease_terminated,
        "lease_terminated_at": action.lease_terminated_at.isoformat() if action.lease_terminated_at else None,
        "customer_banned": action.customer_banned,
        "ban_record_id": action.ban_record_id,
        # Notes and timestamps
        "admin_notes": action.admin_notes,
        "created_at": action.created_at.isoformat(),
        "updated_at": action.updated_at.isoformat(),
    }


@router.put("/recovery-actions/{action_id}/vendor")
async def update_tow_vendor_details(
    action_id: int,
    data: TowVendorDetailsRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Update tow vendor details for a recovery action.

    Requires admin role.
    """
    action = await session.get(RecoveryAction, action_id)

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recovery action not found"
        )

    if action.status not in [RecoveryStatus.TOW_REQUESTED, RecoveryStatus.TOW_SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update vendor details when action status is {action.status.value}"
        )

    # Validate vendor name
    if not data.vendor_name or len(data.vendor_name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor name is required (minimum 2 characters)"
        )

    before_state = {
        "tow_vendor_name": action.tow_vendor_name,
        "tow_vendor_phone": action.tow_vendor_phone,
        "tow_vendor_reference": action.tow_vendor_reference,
        "status": action.status.value,
    }

    # Update tow vendor details
    action.update_tow_vendor(
        vendor_name=data.vendor_name.strip(),
        vendor_phone=data.vendor_phone.strip() if data.vendor_phone else None,
        vendor_email=data.vendor_email.strip() if data.vendor_email else None,
        vendor_reference=data.vendor_reference.strip() if data.vendor_reference else None,
        vendor_address=data.vendor_address.strip() if data.vendor_address else None,
        vendor_notes=data.vendor_notes.strip() if data.vendor_notes else None,
    )

    # If scheduling info provided, schedule the tow
    if data.scheduled_at:
        action.schedule_tow(
            scheduled_at=data.scheduled_at,
            pickup_location=data.pickup_location.strip() if data.pickup_location else None,
            destination=data.destination.strip() if data.destination else None,
            estimated_cost=Decimal(str(data.estimated_cost)) if data.estimated_cost else None,
        )

    await session.commit()

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.TOW_ACTION,
        target_type="recovery_action",
        target_id=str(action.id),
        target_description=f"Updated tow vendor details for action {action.action_number}",
        before_state=before_state,
        after_state={
            "tow_vendor_name": action.tow_vendor_name,
            "tow_vendor_phone": action.tow_vendor_phone,
            "tow_vendor_reference": action.tow_vendor_reference,
            "status": action.status.value,
        },
    )

    return {
        "success": True,
        "message": "Tow vendor details updated successfully",
        "action_id": action.id,
        "action_number": action.action_number,
        "status": action.status.value,
        "tow_vendor": {
            "name": action.tow_vendor_name,
            "phone": action.tow_vendor_phone,
            "email": action.tow_vendor_email,
            "reference": action.tow_vendor_reference,
            "address": action.tow_vendor_address,
            "notes": action.tow_vendor_notes,
        },
        "scheduling": {
            "scheduled_at": action.tow_scheduled_at.isoformat() if action.tow_scheduled_at else None,
            "pickup_location": action.tow_pickup_location,
            "destination": action.tow_destination,
            "estimated_cost": float(action.estimated_tow_cost) if action.estimated_tow_cost else None,
        },
        "updated_by": user.email,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/delinquency/{case_id}/schedule-tow")
async def schedule_tow(
    case_id: int,
    data: TowScheduleRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Schedule a tow for a delinquency case.

    Requires admin role.
    """
    case = await session.get(DelinquencyCase, case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delinquency case not found"
        )

    if not case.recovery_authorized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recovery must be authorized before scheduling tow"
        )

    case.schedule_tow(data.scheduled_at)
    if data.notes:
        existing_notes = case.admin_notes or ""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        case.admin_notes = f"{existing_notes}\n[{timestamp}] Tow scheduled: {data.notes}".strip()

    await session.commit()

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.TOW_ACTION,
        target_type="delinquency_case",
        target_id=str(case.id),
        target_description=f"Scheduled tow for case {case.case_number}",
    )

    return {
        "success": True,
        "message": "Tow scheduled",
        "case_id": case.id,
        "tow_scheduled": case.tow_scheduled,
        "tow_scheduled_at": case.tow_scheduled_at.isoformat(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/delinquency/{case_id}/resolve")
async def resolve_delinquency(
    case_id: int,
    data: ResolveDelinquencyRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Resolve a delinquency case.

    Requires admin role.
    """
    case = await session.get(DelinquencyCase, case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delinquency case not found"
        )

    valid_resolution_types = ["paid", "settled", "written_off", "recovered"]
    if data.resolution_type not in valid_resolution_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resolution type. Must be one of: {', '.join(valid_resolution_types)}"
        )

    case.resolve(
        resolution_type=data.resolution_type,
        resolved_by=user.email,
        notes=data.notes
    )

    await session.commit()

    # Log the action
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.DELINQUENCY_ESCALATION,
        target_type="delinquency_case",
        target_id=str(case.id),
        target_description=f"Resolved case {case.case_number} as {data.resolution_type}",
    )

    return {
        "success": True,
        "message": f"Case resolved as {data.resolution_type}",
        "case_id": case.id,
        "status": case.status.value,
        "resolution_type": case.resolution_type,
        "resolved_at": case.resolved_at.isoformat(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# Incident Report Management
# =============================================================================

class IncidentReportResponse(BaseModel):
    """Response model for incident report."""
    id: int
    customer_profile_id: int
    customer_email: str
    customer_name: Optional[str]
    lease_id: Optional[int]
    incident_type: str
    severity: str
    status: str
    title: str
    description: str
    location: Optional[str]
    incident_date: datetime
    photo_keys: Optional[list[str]]
    assigned_to: Optional[str]
    admin_notes: Optional[str]
    resolution_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    reviewed_at: Optional[datetime]
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


class IncidentUpdateRequest(BaseModel):
    """Request to update incident report."""
    status: Optional[str] = None
    severity: Optional[str] = None
    admin_notes: Optional[str] = None
    resolution_notes: Optional[str] = None
    assigned_to: Optional[str] = None


@router.get("/incidents/types")
async def get_incident_types(
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Get available incident types, severities, and statuses.
    """
    return {
        "types": [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in IncidentType],
        "severities": [{"value": s.value, "label": s.value.title()} for s in IncidentSeverity],
        "statuses": [{"value": s.value, "label": s.value.replace("_", " ").title()} for s in IncidentStatus],
    }


@router.get("/incidents", response_model=list[IncidentReportResponse])
async def list_incident_reports(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    type_filter: Optional[str] = Query(None, description="Filter by incident type"),
    severity_filter: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    List incident reports with optional filtering.

    Requires admin role.
    """
    query = select(IncidentReport).order_by(IncidentReport.created_at.desc())

    if status_filter:
        try:
            status_enum = IncidentStatus(status_filter)
            query = query.where(IncidentReport.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join([s.value for s in IncidentStatus])}"
            )

    if type_filter:
        try:
            type_enum = IncidentType(type_filter)
            query = query.where(IncidentReport.incident_type == type_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid type. Must be one of: {', '.join([t.value for t in IncidentType])}"
            )

    if severity_filter:
        try:
            severity_enum = IncidentSeverity(severity_filter)
            query = query.where(IncidentReport.severity == severity_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid severity. Must be one of: {', '.join([s.value for s in IncidentSeverity])}"
            )

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    incidents = result.scalars().all()

    return [
        IncidentReportResponse(
            id=i.id,
            customer_profile_id=i.customer_profile_id,
            customer_email=i.customer_email,
            customer_name=i.customer_name,
            lease_id=i.lease_id,
            incident_type=i.incident_type.value,
            severity=i.severity.value,
            status=i.status.value,
            title=i.title,
            description=i.description,
            location=i.location,
            incident_date=i.incident_date,
            photo_keys=i.photo_keys,
            assigned_to=i.assigned_to,
            admin_notes=i.admin_notes,
            resolution_notes=i.resolution_notes,
            created_at=i.created_at,
            updated_at=i.updated_at,
            reviewed_at=i.reviewed_at,
            resolved_at=i.resolved_at,
        )
        for i in incidents
    ]


@router.get("/incidents/{incident_id}", response_model=IncidentReportResponse)
async def get_incident_report(
    incident_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get detailed incident report by ID.

    Requires admin role.
    """
    result = await session.execute(
        select(IncidentReport).where(IncidentReport.id == incident_id)
    )
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )

    return IncidentReportResponse(
        id=incident.id,
        customer_profile_id=incident.customer_profile_id,
        customer_email=incident.customer_email,
        customer_name=incident.customer_name,
        lease_id=incident.lease_id,
        incident_type=incident.incident_type.value,
        severity=incident.severity.value,
        status=incident.status.value,
        title=incident.title,
        description=incident.description,
        location=incident.location,
        incident_date=incident.incident_date,
        photo_keys=incident.photo_keys,
        assigned_to=incident.assigned_to,
        admin_notes=incident.admin_notes,
        resolution_notes=incident.resolution_notes,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        reviewed_at=incident.reviewed_at,
        resolved_at=incident.resolved_at,
    )


@router.put("/incidents/{incident_id}")
async def update_incident_report(
    incident_id: int,
    request: IncidentUpdateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Update incident report (status, notes, severity, assignment).

    Requires admin role.
    """
    result = await session.execute(
        select(IncidentReport).where(IncidentReport.id == incident_id)
    )
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )

    # Update fields if provided
    if request.status:
        try:
            new_status = IncidentStatus(request.status)
            incident.status = new_status

            # Track review/resolution times
            if new_status == IncidentStatus.UNDER_REVIEW and not incident.reviewed_at:
                incident.reviewed_at = datetime.now(timezone.utc)
            elif new_status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
                incident.resolved_at = datetime.now(timezone.utc)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join([s.value for s in IncidentStatus])}"
            )

    if request.severity:
        try:
            incident.severity = IncidentSeverity(request.severity)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid severity. Must be one of: {', '.join([s.value for s in IncidentSeverity])}"
            )

    if request.admin_notes is not None:
        incident.admin_notes = request.admin_notes

    if request.resolution_notes is not None:
        incident.resolution_notes = request.resolution_notes

    if request.assigned_to is not None:
        incident.assigned_to = request.assigned_to

    await session.commit()

    return {
        "success": True,
        "message": "Incident report updated",
        "incident_id": incident.id,
        "status": incident.status.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/incidents/{incident_id}/start-review")
async def start_incident_review(
    incident_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Start reviewing an incident (changes status to under_review).

    Requires admin role.
    """
    result = await session.execute(
        select(IncidentReport).where(IncidentReport.id == incident_id)
    )
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )

    incident.status = IncidentStatus.UNDER_REVIEW
    incident.reviewed_at = datetime.now(timezone.utc)
    incident.assigned_to = user.email

    await session.commit()

    return {
        "success": True,
        "message": "Incident review started",
        "incident_id": incident.id,
        "status": incident.status.value,
        "assigned_to": incident.assigned_to,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident(
    incident_id: int,
    resolution_notes: str = Query(..., description="Resolution notes"),
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Resolve an incident with resolution notes.

    Requires admin role.
    """
    result = await session.execute(
        select(IncidentReport).where(IncidentReport.id == incident_id)
    )
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )

    incident.status = IncidentStatus.RESOLVED
    incident.resolution_notes = resolution_notes
    incident.resolved_at = datetime.now(timezone.utc)

    await session.commit()

    return {
        "success": True,
        "message": "Incident resolved",
        "incident_id": incident.id,
        "status": incident.status.value,
        "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/incidents/{incident_id}/photos")
async def get_incident_photos(
    incident_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get signed URLs for incident photos.

    Requires admin role.
    Returns short-lived signed URLs for each photo.
    """
    result = await session.execute(
        select(IncidentReport).where(IncidentReport.id == incident_id)
    )
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )

    if not incident.photo_keys:
        return {"photos": []}

    # Generate signed URLs for each photo
    photos = []
    for key in incident.photo_keys:
        try:
            signed_url = storage_service.generate_signed_url(
                bucket=settings.S3_BUCKET_INCIDENTS,
                key=key,
                expires_in=settings.S3_SIGNED_URL_TTL_SECONDS,
            )
            photos.append({
                "key": key,
                "url": signed_url,
            })
        except Exception as e:
            logger.error(f"Failed to generate signed URL for {key}: {e}")
            photos.append({
                "key": key,
                "url": None,
                "error": "Failed to generate URL",
            })

    return {"photos": photos}


# ============================================================
# System Settings Management
# ============================================================

from app.models.system_settings import SystemSettings, DEFAULT_SETTINGS


class SettingsListResponse(BaseModel):
    """Response for settings list."""
    settings: list
    categories: list
    total: int


class SettingUpdateRequest(BaseModel):
    """Request to update a setting."""
    value: str


class SettingCreateRequest(BaseModel):
    """Request to create a new setting."""
    setting_key: str
    setting_value: str
    display_name: str
    description: Optional[str] = None
    category: str
    value_type: str = "string"


@router.get("/settings")
async def get_all_settings(
    category: Optional[str] = Query(None, description="Filter by category"),
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get all system settings.

    Requires admin role.
    Returns all settings grouped by category.
    """
    query = select(SystemSettings).where(SystemSettings.is_active == True)

    if category:
        query = query.where(SystemSettings.category == category)

    query = query.order_by(SystemSettings.category, SystemSettings.display_name)

    result = await session.execute(query)
    settings_list = result.scalars().all()

    # Get unique categories
    categories_result = await session.execute(
        select(SystemSettings.category).distinct().where(SystemSettings.is_active == True)
    )
    categories = [row[0] for row in categories_result.fetchall()]

    return {
        "settings": [
            {
                "id": s.id,
                "key": s.setting_key,
                "value": s.setting_value if not s.is_sensitive else "********",
                "display_name": s.display_name,
                "description": s.description,
                "category": s.category,
                "value_type": s.value_type,
                "is_sensitive": s.is_sensitive,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "updated_by": s.updated_by,
            }
            for s in settings_list
        ],
        "categories": sorted(categories),
        "total": len(settings_list),
    }


@router.get("/settings/recovery-workflow-status")
async def get_recovery_workflow_status(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get the current status of the recovery workflow setting.

    Requires ops or admin role.
    Returns whether the recovery workflow is enabled or disabled.
    Used by frontend to conditionally show/hide recovery action buttons.
    """
    result = await session.execute(
        select(SystemSettings).where(
            SystemSettings.setting_key == "recovery_workflow_enabled",
            SystemSettings.is_active == True
        )
    )
    setting = result.scalar_one_or_none()

    # Default to enabled if setting doesn't exist
    if not setting:
        return {
            "recovery_workflow_enabled": True,
            "message": "Recovery workflow is enabled (default - setting not configured)",
            "setting_exists": False,
        }

    is_enabled = setting.get_typed_value()

    return {
        "recovery_workflow_enabled": is_enabled,
        "message": f"Recovery workflow is {'enabled' if is_enabled else 'disabled'}",
        "setting_exists": True,
        "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
        "updated_by": setting.updated_by,
    }


@router.get("/settings/{setting_key}")
async def get_setting(
    setting_key: str,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get a specific setting by key.

    Requires admin role.
    """
    result = await session.execute(
        select(SystemSettings).where(
            SystemSettings.setting_key == setting_key,
            SystemSettings.is_active == True
        )
    )
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{setting_key}' not found"
        )

    return {
        "id": setting.id,
        "key": setting.setting_key,
        "value": setting.setting_value if not setting.is_sensitive else "********",
        "display_name": setting.display_name,
        "description": setting.description,
        "category": setting.category,
        "value_type": setting.value_type,
        "is_sensitive": setting.is_sensitive,
        "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
        "updated_by": setting.updated_by,
    }


@router.put("/settings/{setting_key}")
async def update_setting(
    setting_key: str,
    request: SettingUpdateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Update a system setting.

    Requires admin role.
    Logs the change to audit trail.
    """
    result = await session.execute(
        select(SystemSettings).where(
            SystemSettings.setting_key == setting_key,
            SystemSettings.is_active == True
        )
    )
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{setting_key}' not found"
        )

    # Store old value for audit
    old_value = setting.setting_value

    # Validate value type
    if setting.value_type == "number":
        try:
            float(request.value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Value must be a valid number"
            )
    elif setting.value_type == "boolean":
        if request.value.lower() not in ("true", "false", "1", "0", "yes", "no"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Value must be a valid boolean (true/false)"
            )

    # Update setting
    setting.setting_value = request.value
    setting.updated_at = datetime.now(timezone.utc)
    setting.updated_by = user.email

    # Log to audit trail
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.SETTING_UPDATE,
        target_type="SystemSettings",
        target_id=str(setting.id),
        target_description=f"Setting '{setting_key}' ({setting.display_name})",
        before_state={"key": setting_key, "value": old_value if not setting.is_sensitive else "********"},
        after_state={"key": setting_key, "value": request.value if not setting.is_sensitive else "********"},
    )

    await session.commit()

    return {
        "success": True,
        "message": f"Setting '{setting_key}' updated",
        "key": setting.setting_key,
        "value": setting.setting_value if not setting.is_sensitive else "********",
        "updated_by": setting.updated_by,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/settings/seed")
async def seed_default_settings(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Seed default settings if they don't exist.

    Requires admin role.
    Only creates settings that don't already exist.
    """
    created = 0
    skipped = 0

    for default in DEFAULT_SETTINGS:
        # Check if setting already exists
        result = await session.execute(
            select(SystemSettings).where(
                SystemSettings.setting_key == default["setting_key"]
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            skipped += 1
            continue

        # Create new setting
        new_setting = SystemSettings(
            setting_key=default["setting_key"],
            setting_value=default["setting_value"],
            display_name=default["display_name"],
            description=default.get("description"),
            category=default["category"],
            value_type=default.get("value_type", "string"),
        )
        session.add(new_setting)
        created += 1

    await session.commit()

    return {
        "success": True,
        "message": f"Settings seeded: {created} created, {skipped} skipped",
        "created": created,
        "skipped": skipped,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.delete("/settings/{setting_key}")
async def delete_setting(
    setting_key: str,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Soft delete a system setting (deactivate).

    Requires admin role.
    """
    result = await session.execute(
        select(SystemSettings).where(
            SystemSettings.setting_key == setting_key,
            SystemSettings.is_active == True
        )
    )
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{setting_key}' not found"
        )

    # Soft delete
    setting.is_active = False
    setting.updated_by = user.email

    # Log to audit trail
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.SETTING_DELETE,
        target_type="SystemSettings",
        target_id=str(setting.id),
        target_description=f"Setting '{setting_key}' ({setting.display_name})",
        after_state={"key": setting_key, "deleted": True},
    )

    await session.commit()

    return {
        "success": True,
        "message": f"Setting '{setting_key}' deleted",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# FRAUD DETECTION - DUPLICATE PAYMENT PROOF ALERTS
# =============================================================================


class FlaggedInvoiceResponse(BaseModel):
    """Flagged invoice with duplicate detection info."""
    id: int
    invoice_number: str
    customer_email: str
    customer_name: Optional[str]
    amount: float
    status: str
    payment_proof_uploaded_at: Optional[datetime]
    is_duplicate_flagged: bool
    duplicate_of_invoice_id: Optional[int]
    duplicate_of_invoice_number: Optional[str]
    duplicate_flagged_at: Optional[datetime]
    payment_method: Optional[str]

    class Config:
        from_attributes = True


@router.get("/fraud-alerts/flagged-invoices", response_model=list)
async def get_flagged_invoices(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Get invoices flagged for potential duplicate payment proof.

    Requires: ops or admin role

    Returns invoices where is_duplicate_flagged = True, indicating
    the payment proof screenshot matches a previously uploaded one.
    This is a potential fraud indicator.
    """
    # Query flagged invoices with customer info
    result = await session.execute(
        select(WeeklyInvoice, CustomerProfile)
        .join(CustomerProfile, WeeklyInvoice.customer_profile_id == CustomerProfile.id)
        .where(WeeklyInvoice.is_duplicate_flagged == True)
        .order_by(WeeklyInvoice.duplicate_flagged_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()

    flagged_invoices = []
    for invoice, customer in rows:
        # Get the original invoice number if duplicate_of_invoice_id is set
        duplicate_of_invoice_number = None
        if invoice.duplicate_of_invoice_id:
            original_result = await session.execute(
                select(WeeklyInvoice.invoice_number)
                .where(WeeklyInvoice.id == invoice.duplicate_of_invoice_id)
            )
            original = original_result.scalar_one_or_none()
            duplicate_of_invoice_number = original

        flagged_invoices.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_email": customer.email,
            "customer_name": customer.full_name,
            "amount": float(invoice.total_amount),
            "status": invoice.status.value,
            "payment_proof_uploaded_at": invoice.payment_proof_uploaded_at,
            "is_duplicate_flagged": invoice.is_duplicate_flagged,
            "duplicate_of_invoice_id": invoice.duplicate_of_invoice_id,
            "duplicate_of_invoice_number": duplicate_of_invoice_number,
            "duplicate_flagged_at": invoice.duplicate_flagged_at,
            "payment_method": invoice.payment_method,
        })

    logger.info(f"Admin {user.email} retrieved {len(flagged_invoices)} flagged invoices")

    return flagged_invoices


@router.get("/fraud-alerts/summary")
async def get_fraud_alerts_summary(
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
):
    """
    Get summary of fraud detection alerts.

    Requires: ops or admin role

    Returns counts of flagged invoices by status.
    """
    # Count total flagged invoices
    total_result = await session.execute(
        select(func.count(WeeklyInvoice.id))
        .where(WeeklyInvoice.is_duplicate_flagged == True)
    )
    total_flagged = total_result.scalar() or 0

    # Count by status
    status_counts = {}
    for invoice_status in [InvoiceStatus.VERIFICATION_IN_PROGRESS, InvoiceStatus.PAID, InvoiceStatus.REJECTED]:
        result = await session.execute(
            select(func.count(WeeklyInvoice.id))
            .where(
                WeeklyInvoice.is_duplicate_flagged == True,
                WeeklyInvoice.status == invoice_status
            )
        )
        status_counts[invoice_status.value] = result.scalar() or 0

    # Get recent flagged (last 7 days)
    from datetime import timedelta
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_result = await session.execute(
        select(func.count(WeeklyInvoice.id))
        .where(
            WeeklyInvoice.is_duplicate_flagged == True,
            WeeklyInvoice.duplicate_flagged_at >= seven_days_ago
        )
    )
    recent_flagged = recent_result.scalar() or 0

    return {
        "total_flagged": total_flagged,
        "recent_flagged_7_days": recent_flagged,
        "by_status": status_counts,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/fraud-alerts/{invoice_id}/clear-flag")
async def clear_duplicate_flag(
    invoice_id: int,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    reason: str = Query(..., min_length=10, description="Reason for clearing the flag"),
):
    """
    Clear the duplicate flag on an invoice after admin review.

    Requires: admin role (ops cannot clear flags)

    This action is audit logged.
    """
    result = await session.execute(
        select(WeeklyInvoice).where(WeeklyInvoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    if not invoice.is_duplicate_flagged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is not flagged as duplicate"
        )

    # Store previous state for audit
    before_state = {
        "is_duplicate_flagged": invoice.is_duplicate_flagged,
        "duplicate_of_invoice_id": invoice.duplicate_of_invoice_id,
        "duplicate_flagged_at": invoice.duplicate_flagged_at.isoformat() if invoice.duplicate_flagged_at else None,
    }

    # Clear the flag
    invoice.is_duplicate_flagged = False
    invoice.duplicate_of_invoice_id = None
    invoice.duplicate_flagged_at = None

    # Log to audit trail
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.ADMIN_ACTION,
        target_type="WeeklyInvoice",
        target_id=str(invoice.id),
        target_description=f"Invoice {invoice.invoice_number} - duplicate flag cleared",
        before_state=before_state,
        after_state={
            "is_duplicate_flagged": False,
            "duplicate_of_invoice_id": None,
        },
        reason=reason,
    )

    await session.commit()

    logger.info(
        f"Admin {user.email} cleared duplicate flag on invoice {invoice.invoice_number}. Reason: {reason}"
    )

    return {
        "success": True,
        "message": f"Duplicate flag cleared for invoice {invoice.invoice_number}",
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "cleared_by": user.email,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }



# ============================================================================
# Vault Transit Encryption Testing (Dev/Debug only)
# ============================================================================


class VaultTestRequest(BaseModel):
    """Request for testing vault encryption."""
    plaintext: str


@router.post("/vault/test-encryption")
async def test_vault_encryption(
    request: VaultTestRequest,
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Test Vault Transit encryption/decryption cycle.

    Admin only. Returns encryption status and round-trip verification.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vault testing only available in debug mode"
        )

    plaintext = request.plaintext

    # Encrypt
    success_encrypt, ciphertext = vault_service.encrypt(plaintext)
    if not success_encrypt:
        return {
            "success": False,
            "error": f"Encryption failed: {ciphertext}",
            "vault_enabled": vault_service.enabled,
        }

    # Decrypt
    success_decrypt, decrypted = vault_service.decrypt(ciphertext)
    if not success_decrypt:
        return {
            "success": False,
            "error": f"Decryption failed: {decrypted}",
            "vault_enabled": vault_service.enabled,
            "ciphertext": ciphertext,
        }

    # Verify round-trip
    round_trip_success = (decrypted == plaintext)

    return {
        "success": round_trip_success,
        "vault_enabled": vault_service.enabled,
        "encryption_type": "vault_transit" if ciphertext.startswith("vault:v") else "dev_fallback",
        "plaintext_length": len(plaintext),
        "ciphertext_length": len(ciphertext),
        "ciphertext_preview": ciphertext[:50] + "..." if len(ciphertext) > 50 else ciphertext,
        "round_trip_verified": round_trip_success,
        "decrypted_matches": decrypted == plaintext,
    }


@router.get("/vault/status")
async def get_vault_status(
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Get Vault connection status.

    Admin only.
    """
    return {
        "vault_enabled": vault_service.enabled,
        "vault_addr": settings.VAULT_ADDR[:20] + "..." if settings.VAULT_ADDR else None,
        "transit_key_name": settings.VAULT_TRANSIT_KEY_NAME,
        "kv_path_prefix": settings.VAULT_KV_PATH_PREFIX,
        "fallback_encryption": "dev_base64" if not vault_service.enabled else None,
    }


@router.get("/vault/kv/read/{secret_path:path}")
async def read_vault_secret(
    secret_path: str,
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Read a secret from Vault KV v2.

    Admin only. Returns secret data from the configured KV mount point.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vault secret reading only available in debug mode"
        )

    if not vault_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vault is not configured or unavailable"
        )

    secret_data = vault_service.read_secret(secret_path)

    if secret_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Secret not found at path: {secret_path}"
        )

    return {
        "success": True,
        "path": secret_path,
        "data": secret_data,
    }


@router.get("/vault/health")
async def vault_health_check(
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Verify Vault integration is working by checking authentication and basic operations.

    Admin only. Used to verify Vault KV v2 integration for feature testing.
    """
    health_status = {
        "vault_configured": bool(settings.VAULT_ADDR and settings.VAULT_TOKEN),
        "vault_enabled": vault_service.enabled,
        "vault_addr": settings.VAULT_ADDR,
        "auth_method": settings.VAULT_AUTH_METHOD,
        "kv_path_prefix": settings.VAULT_KV_PATH_PREFIX,
        "transit_key_name": settings.VAULT_TRANSIT_KEY_NAME,
        "client_authenticated": False,
        "kv_accessible": False,
        "transit_accessible": False,
        "errors": [],
    }

    if not vault_service.enabled or not vault_service._client:
        health_status["errors"].append("Vault client not initialized")
        return health_status

    # Check if client is authenticated
    try:
        health_status["client_authenticated"] = vault_service._client.is_authenticated()
    except Exception as e:
        health_status["errors"].append(f"Auth check failed: {str(e)}")

    # Test KV v2 access (try to list secrets or read a known path)
    try:
        mount_point = settings.VAULT_KV_PATH_PREFIX.split("/")[0]
        # Try to list secrets at the configured path prefix
        kv_path = "/".join(settings.VAULT_KV_PATH_PREFIX.split("/")[1:])
        vault_service._client.secrets.kv.v2.list_secrets(
            path=kv_path,
            mount_point=mount_point,
        )
        health_status["kv_accessible"] = True
    except Exception as e:
        # 404 means KV engine is accessible but path doesn't exist - that's OK
        if "404" in str(e) or "not found" in str(e).lower():
            health_status["kv_accessible"] = True
        else:
            health_status["errors"].append(f"KV access check: {str(e)}")

    # Test Transit encryption (encrypt/decrypt a test value)
    try:
        success, result = vault_service.encrypt("vault-health-check-test")
        if success and result.startswith("vault:v"):
            health_status["transit_accessible"] = True
        elif success and result.startswith("dev:v"):
            health_status["errors"].append("Transit falling back to dev encryption")
        else:
            health_status["errors"].append(f"Transit encrypt failed: {result}")
    except Exception as e:
        health_status["errors"].append(f"Transit test failed: {str(e)}")

    return health_status


@router.post("/vault/token/renew")
async def renew_vault_token(
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Renew the Vault token to extend its TTL.

    Admin only. Used to verify Vault token renewal works.
    """
    if not vault_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vault is not configured or unavailable"
        )

    success, message = vault_service.renew_token()

    return {
        "success": success,
        "message": message,
    }


@router.get("/vault/token/info")
async def get_vault_token_info(
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Get information about the current Vault token.

    Admin only.
    """
    if not vault_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vault is not configured or unavailable"
        )

    token_info = vault_service.get_token_info()

    if token_info is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve token information"
        )

    return token_info


class VaultRewrapRequest(BaseModel):
    """Request for rewrapping ciphertext with latest key version."""
    ciphertext: str


@router.post("/vault/transit/rotate")
async def rotate_transit_key(
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Rotate the Transit encryption key.

    Creates a new key version. Existing encrypted data can still be decrypted.
    Admin only. Only available in debug mode.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Key rotation only available in debug mode"
        )

    if not vault_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vault is not configured or unavailable"
        )

    success, message = vault_service.rotate_key()

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Key rotation failed: {message}"
        )

    # Get updated key info
    key_info = vault_service.get_key_info()

    return {
        "success": True,
        "message": message,
        "key_info": key_info,
    }


@router.post("/vault/transit/rewrap")
async def rewrap_ciphertext(
    request: VaultRewrapRequest,
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Re-encrypt ciphertext with the latest key version.

    Use after key rotation to update encrypted data to use the new key.
    Admin only. Only available in debug mode.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rewrap only available in debug mode"
        )

    if not vault_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vault is not configured or unavailable"
        )

    success, result = vault_service.rewrap(request.ciphertext)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rewrap failed: {result}"
        )

    # Extract version info from ciphertext
    old_version = request.ciphertext.split(":")[1] if ":" in request.ciphertext else "unknown"
    new_version = result.split(":")[1] if ":" in result else "unknown"

    return {
        "success": True,
        "old_ciphertext": request.ciphertext[:50] + "..." if len(request.ciphertext) > 50 else request.ciphertext,
        "new_ciphertext": result[:50] + "..." if len(result) > 50 else result,
        "old_version": old_version,
        "new_version": new_version,
        "upgraded": old_version != new_version,
    }


@router.get("/vault/transit/key-info")
async def get_transit_key_info(
    user: AuthenticatedUser = Depends(require_admin),
):
    """
    Get information about the Transit encryption key.

    Admin only.
    """
    if not vault_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vault is not configured or unavailable"
        )

    key_info = vault_service.get_key_info()

    if key_info is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve key information"
        )

    return key_info


# =============================================================================
# INSURANCE RETENTION MANAGEMENT
# =============================================================================

from app.services.insurance_retention import get_insurance_retention_service


class InsuranceRetentionSettingsResponse(BaseModel):
    """Response for insurance retention settings."""
    retention_days: int
    auto_delete_enabled: bool


class InsuranceRetentionUpdateRequest(BaseModel):
    """Request to update insurance retention settings."""
    retention_days: Optional[int] = None
    auto_delete_enabled: Optional[bool] = None


class InsuranceDeletionRequest(BaseModel):
    """Request to delete expired insurance documents."""
    dry_run: bool = True


@router.get("/insurance/retention-settings", response_model=InsuranceRetentionSettingsResponse)
async def get_insurance_retention_settings(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Get current insurance document retention settings.

    Requires admin role.

    Returns:
    - retention_days: Days to retain insurance documents after expiration
    - auto_delete_enabled: Whether automatic deletion is enabled
    """
    service = get_insurance_retention_service(session)
    settings_data = await service.get_retention_settings()

    logger.info(f"Admin {user.email} retrieved insurance retention settings")

    return settings_data


@router.put("/insurance/retention-settings", response_model=InsuranceRetentionSettingsResponse)
async def update_insurance_retention_settings(
    request: InsuranceRetentionUpdateRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Update insurance document retention settings.

    Requires admin role.

    Parameters:
    - retention_days: Days to retain documents (optional)
    - auto_delete_enabled: Enable/disable auto-deletion (optional)
    """
    service = get_insurance_retention_service(session)

    # Validate retention_days if provided
    if request.retention_days is not None:
        if request.retention_days < 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Retention period must be at least 30 days for compliance"
            )
        if request.retention_days > 3650:  # 10 years max
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Retention period cannot exceed 10 years"
            )

    result = await service.update_retention_settings(
        retention_days=request.retention_days,
        auto_delete_enabled=request.auto_delete_enabled,
        updated_by=user.email,
    )

    # Log the setting change
    await audit_service.log_action(
        session=session,
        user=user,
        action=AuditAction.SETTING_UPDATE,
        target_type="InsuranceRetentionSettings",
        target_id="retention_policy",
        target_description="Insurance document retention policy",
        before_state=None,
        after_state={
            "retention_days": result.get("retention_days"),
            "auto_delete_enabled": result.get("auto_delete_enabled"),
        },
    )

    logger.info(
        f"Admin {user.email} updated insurance retention settings: "
        f"retention_days={result.get('retention_days')}, "
        f"auto_delete_enabled={result.get('auto_delete_enabled')}"
    )

    return {
        "retention_days": result["retention_days"],
        "auto_delete_enabled": result["auto_delete_enabled"],
    }


@router.get("/insurance/retention-preview")
async def preview_expired_insurance_documents(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Preview insurance documents eligible for deletion.

    Requires admin role.

    Returns list of documents that would be deleted based on current retention policy.
    Does not perform any actual deletion.
    """
    service = get_insurance_retention_service(session)
    result = await service.delete_expired_documents(dry_run=True)

    logger.info(
        f"Admin {user.email} previewed expired insurance documents: "
        f"{result.get('would_delete', 0)} eligible for deletion"
    )

    return result


@router.post("/insurance/delete-expired")
async def delete_expired_insurance_documents(
    request: InsuranceDeletionRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """
    Delete expired insurance documents based on retention policy.

    Requires admin role.

    Parameters:
    - dry_run: If true, only preview what would be deleted (default: true)

    When dry_run=false:
    - Deletes documents from MinIO storage
    - Clears document references in database
    - Creates audit log entries for each deletion
    - Returns deletion statistics

    Deletion is permanent and cannot be undone.
    """
    service = get_insurance_retention_service(session)

    if request.dry_run:
        result = await service.delete_expired_documents(dry_run=True)
        logger.info(
            f"Admin {user.email} performed dry-run deletion preview: "
            f"{result.get('would_delete', 0)} documents"
        )
    else:
        # Actual deletion with audit trail
        result = await service.delete_expired_documents(
            dry_run=False,
            actor_id=user.email,
        )

        # Log the deletion operation
        await audit_service.log_action(
            session=session,
            user=user,
            action=AuditAction.INSURANCE_DOCUMENT_DELETE,
            target_type="InsuranceRetentionBatch",
            target_id="batch_deletion",
            target_description=f"Batch deletion of {result.get('deleted', 0)} expired insurance documents",
            after_state={
                "deleted_count": result.get("deleted"),
                "error_count": result.get("errors"),
                "retention_days": result.get("retention_days"),
            },
            notes="Batch deletion initiated by admin via retention policy",
        )

        logger.info(
            f"Admin {user.email} deleted {result.get('deleted', 0)} expired insurance documents "
            f"with {result.get('errors', 0)} errors"
        )

    return result
