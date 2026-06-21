"""
GigWheels - Audit Logging Service
Weekly car rentals for gig drivers

Service for creating immutable audit log entries for all sensitive operations.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog, AuditAction
from app.core.auth import AuthenticatedUser


logger = logging.getLogger(__name__)


class AuditService:
    """
    Service for creating audit log entries.

    All sensitive operations should be logged through this service
    to ensure consistent and complete audit trails.
    """

    async def log_action(
        self,
        session: AsyncSession,
        user: AuthenticatedUser,
        action: AuditAction,
        target_type: str,
        target_id: str,
        target_description: Optional[str] = None,
        before_state: Optional[dict] = None,
        after_state: Optional[dict] = None,
        reason: Optional[str] = None,
        requires_reason: bool = False,
        notes: Optional[str] = None,
        request_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        Create an audit log entry for a sensitive action.

        Args:
            session: Database session
            user: Authenticated user performing the action
            action: Type of action being performed
            target_type: Type of entity being affected (e.g., "customer_profile", "insurance_document")
            target_id: ID of the target entity
            target_description: Human-readable description of the target
            before_state: State before the action (for updates)
            after_state: State after the action (for updates)
            reason: Reason for the action (required for break-glass access)
            requires_reason: Whether this action requires a reason
            notes: Additional notes about the action
            request_id: Correlation ID for the request
            ip_address: IP address of the requester
            user_agent: User agent of the requester
            success: Whether the action was successful
            error_message: Error message if action failed

        Returns:
            The created AuditLog entry
        """
        # Determine actor role from user
        actor_role = "admin" if user.is_admin else ("ops" if user.is_ops else "customer")

        audit_entry = AuditLog(
            actor_id=user.sub,
            actor_email=user.email,
            actor_role=actor_role,
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            target_description=target_description,
            before_state=before_state,
            after_state=after_state,
            reason=reason,
            requires_reason=requires_reason,
            notes=notes,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message,
            timestamp=datetime.now(timezone.utc),
        )

        session.add(audit_entry)
        await session.flush()

        logger.info(
            f"Audit log created: {action.value} by {user.email} on {target_type}:{target_id}"
        )

        return audit_entry

    async def log_insurance_document_access(
        self,
        session: AsyncSession,
        user: AuthenticatedUser,
        customer_id: int,
        customer_email: str,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Log access to a customer's insurance document.

        This is a high-sensitivity operation that should always be audited.
        """
        return await self.log_action(
            session=session,
            user=user,
            action=AuditAction.INSURANCE_DOCUMENT_VIEW,
            target_type="insurance_document",
            target_id=str(customer_id),
            target_description=f"Insurance document for customer {customer_email}",
            reason=reason,
            requires_reason=True,  # Break-glass access requires reason
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def log_insurance_verification(
        self,
        session: AsyncSession,
        user: AuthenticatedUser,
        customer_id: int,
        customer_email: str,
        approved: bool,
        old_status: str,
        new_status: str,
        expiration_date: Optional[datetime] = None,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Log insurance verification decision (approve/reject).
        """
        action = (
            AuditAction.INSURANCE_VERIFICATION_APPROVE
            if approved
            else AuditAction.INSURANCE_VERIFICATION_REJECT
        )

        before_state = {"insurance_status": old_status}
        after_state = {
            "insurance_status": new_status,
            "expiration_date": expiration_date.isoformat() if expiration_date else None,
        }

        return await self.log_action(
            session=session,
            user=user,
            action=action,
            target_type="customer_profile",
            target_id=str(customer_id),
            target_description=f"Insurance verification for customer {customer_email}",
            before_state=before_state,
            after_state=after_state,
            notes=notes,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def log_payment_action(
        self,
        session: AsyncSession,
        user: AuthenticatedUser,
        action: AuditAction,
        payment_id: int,
        customer_id: int,
        before_state: Optional[dict] = None,
        after_state: Optional[dict] = None,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Log payment-related actions (approve, reject, update).
        """
        return await self.log_action(
            session=session,
            user=user,
            action=action,
            target_type="payment",
            target_id=str(payment_id),
            target_description=f"Payment for customer #{customer_id}",
            before_state=before_state,
            after_state=after_state,
            notes=notes,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def log_vehicle_assignment(
        self,
        session: AsyncSession,
        user: AuthenticatedUser,
        vehicle_id: int,
        customer_id: int,
        is_assignment: bool,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Log vehicle assignment or unassignment.
        """
        action = (
            AuditAction.VEHICLE_ASSIGNMENT
            if is_assignment
            else AuditAction.VEHICLE_UNASSIGNMENT
        )

        return await self.log_action(
            session=session,
            user=user,
            action=action,
            target_type="vehicle",
            target_id=str(vehicle_id),
            target_description=f"Vehicle assignment for customer #{customer_id}",
            after_state={"customer_id": customer_id, "assigned": is_assignment},
            notes=notes,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def log_recovery_authorization(
        self,
        session: AsyncSession,
        user: AuthenticatedUser,
        customer_id: int,
        reason: str,
        compliance_confirmed: bool,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Log recovery/tow authorization with compliance gate.

        This action REQUIRES a reason and compliance confirmation.
        """
        return await self.log_action(
            session=session,
            user=user,
            action=AuditAction.RECOVERY_AUTHORIZATION,
            target_type="customer_profile",
            target_id=str(customer_id),
            target_description=f"Recovery authorization for customer #{customer_id}",
            reason=reason,
            requires_reason=True,
            after_state={"compliance_confirmed": compliance_confirmed},
            notes=notes,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def log_customer_ban(
        self,
        session: AsyncSession,
        user: AuthenticatedUser,
        customer_id: int,
        customer_email: str,
        is_ban: bool,
        reason: str,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Log customer ban or unban action.
        """
        action = AuditAction.CUSTOMER_BAN if is_ban else AuditAction.CUSTOMER_UNBAN

        return await self.log_action(
            session=session,
            user=user,
            action=action,
            target_type="customer_profile",
            target_id=str(customer_id),
            target_description=f"Customer {customer_email}",
            reason=reason,
            requires_reason=True,
            after_state={"is_banned": is_ban},
            notes=notes,
            ip_address=ip_address,
            user_agent=user_agent,
        )


    async def log_tracker_assignment(
        self,
        session: AsyncSession,
        user: AuthenticatedUser,
        tracker_id: int,
        vehicle_id: int,
        is_assignment: bool,
        tracker_device_id: str,
        vehicle_description: str,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Log tracker assignment or unassignment to a vehicle.
        """
        action = (
            AuditAction.TRACKER_ASSIGNMENT
            if is_assignment
            else AuditAction.TRACKER_UNASSIGNMENT
        )

        return await self.log_action(
            session=session,
            user=user,
            action=action,
            target_type="tracker_device",
            target_id=str(tracker_id),
            target_description=f"Tracker {tracker_device_id} {'assigned to' if is_assignment else 'unassigned from'} {vehicle_description}",
            before_state={"assigned_vehicle_id": None if is_assignment else vehicle_id},
            after_state={"assigned_vehicle_id": vehicle_id if is_assignment else None},
            notes=notes,
            ip_address=ip_address,
            user_agent=user_agent,
        )


# Singleton instance
audit_service = AuditService()
