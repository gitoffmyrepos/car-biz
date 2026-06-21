"""
GigWheels - Insurance Retention Service
Weekly car rentals for gig drivers

Service for managing insurance document retention policy.
Handles automatic deletion of expired insurance documents.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer_profile import CustomerProfile, InsuranceStatus
from app.models.system_settings import SystemSettings
from app.models.audit_log import AuditLog, AuditAction
from app.services.storage import storage_service
from app.core.config import settings


logger = logging.getLogger(__name__)


class InsuranceRetentionService:
    """
    Service for managing insurance document retention.

    Provides functionality to:
    - Get retention policy settings
    - Identify documents eligible for deletion
    - Delete expired documents
    - Audit all deletion operations
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_retention_settings(self) -> dict:
        """
        Get current retention policy settings.

        Returns:
            dict with retention_days and auto_delete_enabled
        """
        # Get retention days setting
        result = await self.db.execute(
            select(SystemSettings).where(
                SystemSettings.setting_key == "insurance_retention_days"
            )
        )
        retention_setting = result.scalar_one_or_none()
        retention_days = 365  # default
        if retention_setting:
            retention_days = retention_setting.get_typed_value()

        # Get auto-delete setting
        result = await self.db.execute(
            select(SystemSettings).where(
                SystemSettings.setting_key == "insurance_auto_delete_enabled"
            )
        )
        auto_delete_setting = result.scalar_one_or_none()
        auto_delete_enabled = True  # default
        if auto_delete_setting:
            auto_delete_enabled = auto_delete_setting.get_typed_value()

        return {
            "retention_days": int(retention_days) if retention_days else 365,
            "auto_delete_enabled": bool(auto_delete_enabled),
        }

    async def get_documents_for_deletion(
        self,
        retention_days: Optional[int] = None,
    ) -> List[CustomerProfile]:
        """
        Get insurance documents that are past their retention period.

        Args:
            retention_days: Override retention period (uses setting if not provided)

        Returns:
            List of CustomerProfile objects with expired insurance
        """
        if retention_days is None:
            settings_data = await self.get_retention_settings()
            retention_days = settings_data["retention_days"]

        # Calculate cutoff date
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=int(retention_days))

        # Find profiles with insurance documents that have:
        # 1. Expired insurance (expiration date before cutoff)
        # 2. Or status is EXPIRED and document exists
        result = await self.db.execute(
            select(CustomerProfile).where(
                CustomerProfile.insurance_document_key.isnot(None),
                (
                    # Insurance expired before retention cutoff
                    (CustomerProfile.insurance_expiration_date < cutoff_date) |
                    # Or status is expired/rejected and updated before cutoff
                    (
                        CustomerProfile.insurance_status.in_([
                            InsuranceStatus.EXPIRED,
                            InsuranceStatus.REJECTED,
                        ])
                        & (CustomerProfile.updated_at < cutoff_date)
                    )
                )
            )
        )

        return list(result.scalars().all())

    async def _create_deletion_audit_log(
        self,
        customer_id: int,
        customer_email: str,
        document_key: str,
        retention_days: int,
        actor_id: str = "system",
    ) -> AuditLog:
        """Create audit log entry for insurance document deletion."""
        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_email="system@fxweekly.com" if actor_id == "system" else actor_id,
            actor_role="system" if actor_id == "system" else "admin",
            action=AuditAction.INSURANCE_DOCUMENT_DELETE,
            target_type="insurance_document",
            target_id=str(customer_id),
            target_description=f"Insurance document for customer {customer_email}",
            before_state={"document_key": document_key},
            after_state={"document_key": None},
            reason=f"Retention policy: {retention_days} days after expiration",
            requires_reason=False,
            notes=f"Automated deletion by retention policy",
            success=True,
            timestamp=datetime.now(timezone.utc),
        )
        self.db.add(audit_entry)
        return audit_entry

    async def delete_expired_documents(
        self,
        dry_run: bool = False,
        actor_id: Optional[str] = None,
    ) -> dict:
        """
        Delete insurance documents that are past their retention period.

        Args:
            dry_run: If True, only report what would be deleted without deleting
            actor_id: ID of the user/system initiating the deletion

        Returns:
            dict with deletion results
        """
        settings_data = await self.get_retention_settings()

        if not settings_data["auto_delete_enabled"] and not dry_run:
            logger.info("Insurance auto-deletion is disabled")
            return {
                "success": True,
                "deleted": 0,
                "errors": 0,
                "message": "Auto-deletion is disabled in settings",
            }

        documents = await self.get_documents_for_deletion(
            retention_days=settings_data["retention_days"]
        )

        if dry_run:
            return {
                "success": True,
                "would_delete": len(documents),
                "retention_days": settings_data["retention_days"],
                "documents": [
                    {
                        "customer_id": doc.id,
                        "email": doc.email,
                        "document_key": doc.insurance_document_key,
                        "expiration_date": doc.insurance_expiration_date.isoformat() if doc.insurance_expiration_date else None,
                        "status": doc.insurance_status.value,
                    }
                    for doc in documents
                ],
            }

        deleted = 0
        errors = 0
        error_details = []

        for profile in documents:
            try:
                # Delete from storage
                bucket = settings.S3_BUCKET_INSURANCE
                key = profile.insurance_document_key

                if key is None:
                    continue

                success = await storage_service.delete_file(bucket, key)

                if success:
                    # Clear the document reference in database
                    old_key = profile.insurance_document_key
                    profile.insurance_document_key = None

                    # Create audit log entry
                    await self._create_deletion_audit_log(
                        customer_id=profile.id,
                        customer_email=profile.email,
                        document_key=old_key or "",
                        retention_days=settings_data["retention_days"],
                        actor_id=actor_id or "system",
                    )

                    deleted += 1
                    logger.info(
                        f"Deleted insurance document for customer {profile.id}: {old_key}"
                    )
                else:
                    errors += 1
                    error_details.append({
                        "customer_id": profile.id,
                        "error": "Failed to delete from storage",
                    })
                    logger.error(
                        f"Failed to delete insurance document for customer {profile.id}"
                    )

            except Exception as e:
                errors += 1
                error_details.append({
                    "customer_id": profile.id,
                    "error": str(e),
                })
                logger.exception(
                    f"Error deleting insurance document for customer {profile.id}: {e}"
                )

        # Commit database changes
        await self.db.commit()

        return {
            "success": errors == 0,
            "deleted": deleted,
            "errors": errors,
            "error_details": error_details if error_details else None,
            "retention_days": settings_data["retention_days"],
        }

    async def update_retention_settings(
        self,
        retention_days: Optional[int] = None,
        auto_delete_enabled: Optional[bool] = None,
        updated_by: Optional[str] = None,
    ) -> dict:
        """
        Update retention policy settings.

        Args:
            retention_days: New retention period in days
            auto_delete_enabled: Enable/disable auto-deletion
            updated_by: ID of user making the change

        Returns:
            dict with updated settings
        """
        updated = []

        if retention_days is not None:
            result = await self.db.execute(
                select(SystemSettings).where(
                    SystemSettings.setting_key == "insurance_retention_days"
                )
            )
            setting = result.scalar_one_or_none()
            if setting:
                setting.setting_value = str(retention_days)
                setting.updated_by = updated_by
                updated.append("retention_days")

        if auto_delete_enabled is not None:
            result = await self.db.execute(
                select(SystemSettings).where(
                    SystemSettings.setting_key == "insurance_auto_delete_enabled"
                )
            )
            setting = result.scalar_one_or_none()
            if setting:
                setting.setting_value = str(auto_delete_enabled).lower()
                setting.updated_by = updated_by
                updated.append("auto_delete_enabled")

        await self.db.commit()

        # Return current settings
        return {
            **await self.get_retention_settings(),
            "updated_fields": updated,
        }


def get_insurance_retention_service(db: AsyncSession) -> InsuranceRetentionService:
    """Factory function to create InsuranceRetentionService."""
    return InsuranceRetentionService(db)
