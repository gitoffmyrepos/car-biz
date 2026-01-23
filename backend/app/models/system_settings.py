"""
Weekly Vehicle Leasing Platform - System Settings Model
Salvage-to-Lux Fleet Management

SQLAlchemy model for configurable system settings.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SettingCategory(str, PyEnum):
    """Categories for system settings."""
    GENERAL = "general"
    PAYMENTS = "payments"
    NOTIFICATIONS = "notifications"
    RECOVERY = "recovery"
    VEHICLES = "vehicles"
    INSURANCE = "insurance"
    SECURITY = "security"


class SystemSettings(Base):
    """
    System configuration settings stored in database.

    Allows admins to configure application behavior without
    requiring environment variable changes or deployments.
    Settings are key-value pairs with metadata for UI display.
    """

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Setting identification
    setting_key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )
    setting_value: Mapped[str] = mapped_column(Text, nullable=False)

    # Metadata for UI
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Value type hints (for frontend validation)
    value_type: Mapped[str] = mapped_column(
        String(20),
        default="string",
        nullable=False
    )  # string, number, boolean, json

    # Validation constraints (JSON format for complex rules)
    validation_rules: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<SystemSettings(key='{self.setting_key}', category='{self.category}')>"

    def get_typed_value(self):
        """Return value converted to its proper type."""
        if self.value_type == "boolean":
            return self.setting_value.lower() in ("true", "1", "yes")
        elif self.value_type == "number":
            try:
                if "." in self.setting_value:
                    return float(self.setting_value)
                return int(self.setting_value)
            except ValueError:
                return 0
        elif self.value_type == "json":
            import json
            try:
                return json.loads(self.setting_value)
            except json.JSONDecodeError:
                return {}
        return self.setting_value


# Default settings to be seeded
DEFAULT_SETTINGS = [
    # General
    {
        "setting_key": "company_name",
        "setting_value": "FX Weekly Lease",
        "display_name": "Company Name",
        "description": "The company name displayed throughout the application",
        "category": "general",
        "value_type": "string",
    },
    {
        "setting_key": "contact_email",
        "setting_value": "support@fxweekly.com",
        "display_name": "Contact Email",
        "description": "Primary contact email for customer support",
        "category": "general",
        "value_type": "string",
    },
    {
        "setting_key": "contact_phone",
        "setting_value": "+1 (555) 123-4567",
        "display_name": "Contact Phone",
        "description": "Primary contact phone number",
        "category": "general",
        "value_type": "string",
    },
    # Payments
    {
        "setting_key": "late_fee_amount",
        "setting_value": "50.00",
        "display_name": "Late Fee Amount",
        "description": "Amount charged for late payments (USD)",
        "category": "payments",
        "value_type": "number",
    },
    {
        "setting_key": "payment_due_reminder_days",
        "setting_value": "2",
        "display_name": "Payment Reminder Days",
        "description": "Days before due date to send payment reminder",
        "category": "payments",
        "value_type": "number",
    },
    {
        "setting_key": "payment_verification_timeout_hours",
        "setting_value": "48",
        "display_name": "Payment Verification Timeout",
        "description": "Hours before unverified payments are flagged",
        "category": "payments",
        "value_type": "number",
    },
    # Notifications
    {
        "setting_key": "email_notifications_enabled",
        "setting_value": "true",
        "display_name": "Email Notifications Enabled",
        "description": "Enable/disable email notifications system-wide",
        "category": "notifications",
        "value_type": "boolean",
    },
    {
        "setting_key": "notification_batch_size",
        "setting_value": "100",
        "display_name": "Notification Batch Size",
        "description": "Maximum notifications to process per batch",
        "category": "notifications",
        "value_type": "number",
    },
    # Recovery
    {
        "setting_key": "recovery_workflow_enabled",
        "setting_value": "true",
        "display_name": "Recovery Workflow Enabled",
        "description": "Enable/disable the vehicle recovery workflow",
        "category": "recovery",
        "value_type": "boolean",
    },
    {
        "setting_key": "delinquency_escalation_day",
        "setting_value": "2",
        "display_name": "Delinquency Escalation Day",
        "description": "Days after late status before escalation",
        "category": "recovery",
        "value_type": "number",
    },
    {
        "setting_key": "recovery_initiation_day",
        "setting_value": "3",
        "display_name": "Recovery Initiation Day",
        "description": "Days after late status when recovery can be initiated",
        "category": "recovery",
        "value_type": "number",
    },
    # Vehicles
    {
        "setting_key": "max_vehicles_per_customer",
        "setting_value": "1",
        "display_name": "Max Vehicles Per Customer",
        "description": "Maximum active leases per customer",
        "category": "vehicles",
        "value_type": "number",
    },
    {
        "setting_key": "vehicle_request_approval_required",
        "setting_value": "true",
        "display_name": "Require Vehicle Request Approval",
        "description": "Require admin approval for vehicle requests",
        "category": "vehicles",
        "value_type": "boolean",
    },
    # Insurance
    {
        "setting_key": "insurance_expiry_warning_days",
        "setting_value": "30",
        "display_name": "Insurance Expiry Warning Days",
        "description": "Days before expiry to warn customer",
        "category": "insurance",
        "value_type": "number",
    },
    {
        "setting_key": "insurance_max_file_size_mb",
        "setting_value": "10",
        "display_name": "Insurance Max File Size (MB)",
        "description": "Maximum file size for insurance uploads",
        "category": "insurance",
        "value_type": "number",
    },
    {
        "setting_key": "insurance_retention_days",
        "setting_value": "365",
        "display_name": "Insurance Document Retention (Days)",
        "description": "Days to retain insurance documents after expiration or replacement",
        "category": "insurance",
        "value_type": "number",
    },
    {
        "setting_key": "insurance_auto_delete_enabled",
        "setting_value": "true",
        "display_name": "Auto-Delete Expired Insurance",
        "description": "Automatically delete insurance documents after retention period",
        "category": "insurance",
        "value_type": "boolean",
    },
    {
        "setting_key": "banned_customer_history_access",
        "setting_value": "true",
        "display_name": "Banned Customer History Access",
        "description": "Allow banned customers to view their historical lease and payment records",
        "category": "security",
        "value_type": "boolean",
    },
    # Security
    {
        "setting_key": "signed_url_ttl_seconds",
        "setting_value": "300",
        "display_name": "Signed URL TTL (seconds)",
        "description": "Time-to-live for signed document URLs",
        "category": "security",
        "value_type": "number",
    },
    {
        "setting_key": "break_glass_justification_required",
        "setting_value": "true",
        "display_name": "Require Break-Glass Justification",
        "description": "Require justification for sensitive document access",
        "category": "security",
        "value_type": "boolean",
    },
]
