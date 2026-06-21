"""
GigWheels - Audit Log Model
Weekly car rentals for gig drivers

SQLAlchemy model for audit logging all sensitive operations.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditAction(str, PyEnum):
    """Types of auditable actions."""
    # Insurance related
    INSURANCE_DOCUMENT_VIEW = "insurance_document_view"
    INSURANCE_DOCUMENT_DOWNLOAD = "insurance_document_download"
    INSURANCE_VERIFICATION_APPROVE = "insurance_verification_approve"
    INSURANCE_VERIFICATION_REJECT = "insurance_verification_reject"
    INSURANCE_BREAK_GLASS_ACCESS = "insurance_break_glass_access"
    INSURANCE_DOCUMENT_DELETE = "insurance_document_delete"

    # Payment related
    PAYMENT_PROOF_VIEW = "payment_proof_view"
    PAYMENT_APPROVE = "payment_approve"
    PAYMENT_REJECT = "payment_reject"
    INVOICE_UPDATE = "invoice_update"

    # Vehicle related
    VEHICLE_ASSIGNMENT = "vehicle_assignment"
    VEHICLE_UNASSIGNMENT = "vehicle_unassignment"
    TRACKER_ASSIGNMENT = "tracker_assignment"
    TRACKER_UNASSIGNMENT = "tracker_unassignment"

    # Delinquency related
    DELINQUENCY_ESCALATION = "delinquency_escalation"
    RECOVERY_AUTHORIZATION = "recovery_authorization"
    TOW_ACTION = "tow_action"

    # Account related
    CUSTOMER_BAN = "customer_ban"
    CUSTOMER_UNBAN = "customer_unban"
    PROFILE_UPDATE_BY_ADMIN = "profile_update_by_admin"

    # Maintenance related
    MAINTENANCE_SCHEDULE = "maintenance_schedule"
    MAINTENANCE_UPDATE = "maintenance_update"
    MAINTENANCE_CANCEL = "maintenance_cancel"
    MAINTENANCE_DELETE = "maintenance_delete"

    # Settings related
    SETTING_UPDATE = "setting_update"
    SETTING_DELETE = "setting_delete"

    # Generic
    ADMIN_ACTION = "admin_action"
    DATA_EXPORT = "data_export"


class AuditLog(Base):
    """
    Immutable audit log for security-sensitive actions.

    Records all sensitive operations with actor, target, before/after state,
    and optional break-glass reason for high-sensitivity data access.
    """

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Actor information (who performed the action)
    actor_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)

    # Action details
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction),
        nullable=False,
        index=True
    )

    # Target entity (what was affected)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    target_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Request context
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # State change tracking (JSON)
    before_state: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    after_state: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Break-glass reason (required for sensitive data access)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requires_reason: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Additional notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Success/failure tracking
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamp (immutable once created)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action='{self.action.value}', actor='{self.actor_email}', target='{self.target_type}:{self.target_id}')>"
