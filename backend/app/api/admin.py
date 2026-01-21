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
from app.services.storage import storage_service
from app.services.audit import audit_service

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

    # Generate signed URL (valid for 5 minutes)
    signed_url = storage_service.generate_signed_url(
        bucket=settings.S3_BUCKET_INSURANCE,
        key=customer.insurance_document_key,
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
