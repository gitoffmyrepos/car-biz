"""
Weekly Vehicle Leasing Platform - Invoice Service
Salvage-to-Lux Fleet Management

Service for generating and managing weekly invoices.
"""

import logging
import hashlib
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weekly_invoice import WeeklyInvoice, InvoiceStatus
from app.models.lease import Lease, LeaseStatus
from app.models.customer_profile import CustomerProfile
from app.models.notification import NotificationType, NotificationPriority
from app.services.notification import notification_service
from app.services.email import email_service

logger = logging.getLogger(__name__)


class InvoiceService:
    """Service for generating and managing weekly invoices."""

    def __init__(self, late_fee_amount: Decimal = Decimal("25.00")):
        """
        Initialize invoice service.

        Args:
            late_fee_amount: Default late fee amount to apply
        """
        self.late_fee_amount = late_fee_amount

    def generate_invoice_number(self, lease_id: int, week_number: int) -> str:
        """
        Generate a unique invoice number.

        Format: INV-{lease_id}-W{week_number}-{timestamp_suffix}
        """
        timestamp_suffix = datetime.now(timezone.utc).strftime("%Y%m%d")
        return f"INV-{lease_id:05d}-W{week_number:03d}-{timestamp_suffix}"

    def calculate_week_number(self, lease_start: datetime, current_date: datetime) -> int:
        """
        Calculate the week number based on lease start date.

        Week 1 starts from the lease start date.
        """
        days_since_start = (current_date.replace(tzinfo=timezone.utc) - lease_start.replace(tzinfo=timezone.utc)).days
        if days_since_start < 0:
            return 0
        return (days_since_start // 7) + 1

    def calculate_period_dates(
        self, lease_start: datetime, week_number: int
    ) -> Tuple[datetime, datetime]:
        """
        Calculate the billing period start and end dates for a given week.

        Returns:
            Tuple of (period_start, period_end)
        """
        # Calculate period start based on week number
        period_start = lease_start + timedelta(weeks=week_number - 1)
        period_end = period_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        return period_start, period_end

    def calculate_due_date(self, period_end: datetime, days_after_period: int = 0) -> datetime:
        """
        Calculate the due date for an invoice.

        By default, payment is due at the end of the billing period.
        """
        return period_end + timedelta(days=days_after_period)

    async def generate_invoice_for_lease(
        self,
        db: AsyncSession,
        lease: Lease,
        week_number: Optional[int] = None,
        force: bool = False,
    ) -> Optional[WeeklyInvoice]:
        """
        Generate a weekly invoice for a specific lease.

        Args:
            db: Database session
            lease: The lease to generate invoice for
            week_number: Optional specific week number (default: current week)
            force: Force generation even if invoice exists

        Returns:
            Created WeeklyInvoice or None if invoice already exists
        """
        if lease.status != LeaseStatus.ACTIVE:
            logger.info(f"Skipping invoice generation for non-active lease {lease.id}")
            return None

        # Calculate week number if not provided
        if week_number is None:
            week_number = self.calculate_week_number(
                lease.start_date, datetime.now(timezone.utc)
            )

        if week_number < 1:
            logger.info(f"Lease {lease.id} has not started yet")
            return None

        # Check if invoice already exists for this week
        existing = await db.scalar(
            select(WeeklyInvoice).where(
                WeeklyInvoice.lease_id == lease.id,
                WeeklyInvoice.week_number == week_number
            )
        )

        if existing and not force:
            logger.info(
                f"Invoice already exists for lease {lease.id}, week {week_number}"
            )
            return None

        # Calculate period dates
        period_start, period_end = self.calculate_period_dates(
            lease.start_date, week_number
        )
        due_date = self.calculate_due_date(period_end)

        # Generate invoice number
        invoice_number = self.generate_invoice_number(lease.id, week_number)

        # Create invoice
        invoice = WeeklyInvoice(
            lease_id=lease.id,
            customer_profile_id=lease.customer_profile_id,
            invoice_number=invoice_number,
            week_number=week_number,
            amount=lease.weekly_payment,
            late_fee=Decimal("0.00"),
            total_amount=lease.weekly_payment,
            period_start=period_start,
            period_end=period_end,
            due_date=due_date,
            status=InvoiceStatus.PENDING,
        )

        db.add(invoice)
        await db.flush()
        await db.refresh(invoice)

        logger.info(
            f"Generated invoice {invoice.invoice_number} for lease {lease.id}, "
            f"week {week_number}, amount ${invoice.total_amount}"
        )

        # Create notification for customer
        try:
            await notification_service.create_notification(
                db=db,
                customer_profile_id=lease.customer_profile_id,
                notification_type=NotificationType.PAYMENT_DUE_REMINDER,
                title="New Weekly Invoice",
                message=f"Your weekly invoice #{invoice.invoice_number} for ${invoice.total_amount:.2f} is due on {due_date.strftime('%B %d, %Y')}.",
                priority=NotificationPriority.HIGH,
                action_url="/payments",
                action_label="View Invoice",
                related_entity_type="invoice",
                related_entity_id=invoice.id,
            )
        except Exception as e:
            logger.warning(f"Failed to create invoice notification: {e}")

        return invoice

    async def generate_invoices_for_all_active_leases(
        self, db: AsyncSession, week_number: Optional[int] = None
    ) -> Tuple[int, int]:
        """
        Generate weekly invoices for all active leases.

        Args:
            db: Database session
            week_number: Optional specific week number (default: current week for each lease)

        Returns:
            Tuple of (invoices_created, leases_processed)
        """
        # Get all active leases
        result = await db.execute(
            select(Lease).where(Lease.status == LeaseStatus.ACTIVE)
        )
        active_leases = result.scalars().all()

        invoices_created = 0
        leases_processed = len(active_leases)

        for lease in active_leases:
            try:
                invoice = await self.generate_invoice_for_lease(
                    db=db, lease=lease, week_number=week_number
                )
                if invoice:
                    invoices_created += 1
            except Exception as e:
                logger.error(f"Failed to generate invoice for lease {lease.id}: {e}")

        await db.commit()

        logger.info(
            f"Invoice generation complete: {invoices_created} invoices created "
            f"for {leases_processed} active leases"
        )

        return invoices_created, leases_processed

    async def mark_due_invoices(self, db: AsyncSession) -> int:
        """
        Mark pending invoices as due when their due date has arrived.

        Returns:
            Number of invoices marked as due
        """
        now = datetime.now(timezone.utc)

        result = await db.execute(
            select(WeeklyInvoice).where(
                WeeklyInvoice.status == InvoiceStatus.PENDING,
                WeeklyInvoice.due_date <= now
            )
        )
        pending_invoices = result.scalars().all()

        count = 0
        for invoice in pending_invoices:
            invoice.status = InvoiceStatus.DUE
            count += 1

        if count > 0:
            await db.commit()

        logger.info(f"Marked {count} invoices as due")
        return count

    async def apply_late_fees(self, db: AsyncSession) -> int:
        """
        Apply late fees to overdue invoices.

        Applies late fee to invoices that are past due date and not paid.

        Returns:
            Number of invoices with late fees applied
        """
        now = datetime.now(timezone.utc)
        grace_period_days = 1  # 1 day grace period

        result = await db.execute(
            select(WeeklyInvoice).where(
                WeeklyInvoice.status.in_([InvoiceStatus.DUE, InvoiceStatus.REJECTED]),
                WeeklyInvoice.is_late == False,
                WeeklyInvoice.due_date < now - timedelta(days=grace_period_days)
            )
        )
        overdue_invoices = result.scalars().all()

        count = 0
        for invoice in overdue_invoices:
            invoice.apply_late_fee(self.late_fee_amount)
            invoice.status = InvoiceStatus.LATE
            invoice.days_late = (now - invoice.due_date).days
            count += 1

            # Create notification
            try:
                await notification_service.create_notification(
                    db=db,
                    customer_profile_id=invoice.customer_profile_id,
                    notification_type=NotificationType.PAYMENT_OVERDUE,
                    title="Payment Overdue",
                    message=f"Your payment for invoice #{invoice.invoice_number} is overdue. A late fee of ${self.late_fee_amount:.2f} has been applied. New total: ${invoice.total_amount:.2f}",
                    priority=NotificationPriority.URGENT,
                    action_url="/payments",
                    action_label="Pay Now",
                    related_entity_type="invoice",
                    related_entity_id=invoice.id,
                )
            except Exception as e:
                logger.warning(f"Failed to create late payment notification: {e}")

        if count > 0:
            await db.commit()

        logger.info(f"Applied late fees to {count} overdue invoices")
        return count

    async def verify_payment(
        self,
        db: AsyncSession,
        invoice_id: int,
        verified_by: str,
        approved: bool,
        notes: Optional[str] = None,
        rejection_reason: Optional[str] = None,
    ) -> WeeklyInvoice:
        """
        Verify a payment for an invoice.

        Args:
            db: Database session
            invoice_id: Invoice ID
            verified_by: ID/email of admin who verified
            approved: Whether payment is approved or rejected
            notes: Optional verification notes
            rejection_reason: Required if rejected

        Returns:
            Updated WeeklyInvoice
        """
        invoice = await db.get(WeeklyInvoice, invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        if invoice.status != InvoiceStatus.VERIFICATION_IN_PROGRESS:
            raise ValueError(
                f"Invoice {invoice_id} is not pending verification (status: {invoice.status})"
            )

        if approved:
            invoice.mark_as_paid(verified_by=verified_by, notes=notes)
            notification_message = f"Your payment for invoice #{invoice.invoice_number} has been verified. Thank you!"
            notification_type = NotificationType.PAYMENT_VERIFIED
            notification_priority = NotificationPriority.NORMAL
        else:
            if not rejection_reason:
                raise ValueError("Rejection reason is required")
            invoice.mark_as_rejected(reason=rejection_reason, verified_by=verified_by)
            notification_message = f"Your payment proof for invoice #{invoice.invoice_number} was rejected: {rejection_reason}. Please upload a new proof."
            notification_type = NotificationType.PAYMENT_REJECTED
            notification_priority = NotificationPriority.HIGH

        await db.flush()

        # Create notification
        try:
            await notification_service.create_notification(
                db=db,
                customer_profile_id=invoice.customer_profile_id,
                notification_type=notification_type,
                title="Payment Verified" if approved else "Payment Rejected",
                message=notification_message,
                priority=notification_priority,
                action_url="/payments",
                action_label="View Invoice",
                related_entity_type="invoice",
                related_entity_id=invoice.id,
            )
        except Exception as e:
            logger.warning(f"Failed to create payment verification notification: {e}")

        return invoice

    async def send_due_date_reminders(
        self,
        db: AsyncSession,
        days_before_due: int = 2,
        include_day_of: bool = True,
    ) -> Tuple[int, int]:
        """
        Send due date reminder notifications for invoices with approaching due dates.

        Args:
            db: Database session
            days_before_due: Send reminders for invoices due within this many days
            include_day_of: Also send reminders for invoices due today

        Returns:
            Tuple of (reminders_sent, emails_sent)
        """
        now = datetime.now(timezone.utc)

        # Find invoices that need reminders:
        # - Status is PENDING or DUE (not paid, late, etc.)
        # - Due date is within days_before_due days
        # - Haven't sent reminder today (or at all)
        end_date = now + timedelta(days=days_before_due)

        # Build query for invoices needing reminders
        if include_day_of:
            # Include all invoices due from now until end_date
            query = select(WeeklyInvoice).where(
                WeeklyInvoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.DUE]),
                WeeklyInvoice.due_date <= end_date,
            )
        else:
            # Exclude invoices due today (only future due dates)
            query = select(WeeklyInvoice).where(
                WeeklyInvoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.DUE]),
                WeeklyInvoice.due_date > now,
                WeeklyInvoice.due_date <= end_date,
            )

        # Exclude invoices that already had a reminder sent today
        result = await db.execute(query)
        invoices = result.scalars().all()

        reminders_sent = 0
        emails_sent = 0

        for invoice in invoices:
            # Check if reminder was already sent today
            if invoice.reminder_sent_at:
                last_reminder_date = invoice.reminder_sent_at.date()
                if last_reminder_date == now.date():
                    logger.debug(f"Skipping invoice {invoice.id} - reminder already sent today")
                    continue

            # Get customer profile for email and name
            customer = await db.get(CustomerProfile, invoice.customer_profile_id)
            if not customer:
                logger.warning(f"Customer profile {invoice.customer_profile_id} not found for invoice {invoice.id}")
                continue

            # Calculate days until due
            days_until_due = (invoice.due_date.replace(tzinfo=timezone.utc) - now).days
            if days_until_due < 0:
                days_until_due = 0

            # Create in-app notification
            try:
                await notification_service.create_notification(
                    db=db,
                    customer_profile_id=invoice.customer_profile_id,
                    notification_type=NotificationType.PAYMENT_DUE_REMINDER,
                    title="Payment Reminder",
                    message=f"Your payment of ${invoice.total_amount:.2f} for invoice #{invoice.invoice_number} is due {f'in {days_until_due} days' if days_until_due > 1 else 'tomorrow' if days_until_due == 1 else 'today'}.",
                    priority=NotificationPriority.HIGH if days_until_due <= 1 else NotificationPriority.NORMAL,
                    action_url="/payments",
                    action_label="View Invoice",
                    related_entity_type="invoice",
                    related_entity_id=invoice.id,
                )
                reminders_sent += 1
            except Exception as e:
                logger.error(f"Failed to create reminder notification for invoice {invoice.id}: {e}")

            # Send email reminder if customer has email notifications enabled
            if customer.notification_email:
                try:
                    email_result = await email_service.send_due_date_reminder(
                        to_email=customer.email,
                        customer_name=customer.full_name or "Valued Customer",
                        invoice_number=invoice.invoice_number,
                        amount=float(invoice.total_amount),
                        due_date=invoice.due_date.strftime("%B %d, %Y"),
                        days_until_due=days_until_due,
                    )
                    if email_result.get("success"):
                        emails_sent += 1
                except Exception as e:
                    logger.error(f"Failed to send reminder email for invoice {invoice.id}: {e}")

            # Update invoice reminder tracking
            invoice.reminder_sent_at = now
            invoice.reminder_count = (invoice.reminder_count or 0) + 1

        # Commit all changes
        if reminders_sent > 0:
            await db.commit()

        logger.info(
            f"Due date reminders sent: {reminders_sent} notifications, {emails_sent} emails"
        )

        return reminders_sent, emails_sent

    def calculate_payment_hash(self, file_content: bytes) -> str:
        """
        Calculate SHA-256 hash of payment proof content for duplicate detection.

        Args:
            file_content: Raw file content

        Returns:
            Hex-encoded SHA-256 hash
        """
        return hashlib.sha256(file_content).hexdigest()

    async def check_duplicate_payment_proof(
        self, db: AsyncSession, content_hash: str, exclude_invoice_id: Optional[int] = None
    ) -> Optional[WeeklyInvoice]:
        """
        Check if a payment proof with the same hash already exists.

        Args:
            db: Database session
            content_hash: SHA-256 hash of the payment proof
            exclude_invoice_id: Optional invoice ID to exclude from check

        Returns:
            WeeklyInvoice with matching hash, or None
        """
        query = select(WeeklyInvoice).where(
            WeeklyInvoice.payment_proof_hash == content_hash
        )

        if exclude_invoice_id:
            query = query.where(WeeklyInvoice.id != exclude_invoice_id)

        result = await db.execute(query)
        return result.scalar_one_or_none()


# Singleton instance
invoice_service = InvoiceService()
