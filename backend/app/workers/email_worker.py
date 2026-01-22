"""
Weekly Vehicle Leasing Platform - Email Worker
Salvage-to-Lux Fleet Management

Background worker for processing email notification jobs via Redis queue.
"""

import logging
from typing import Any

from app.services.background_jobs import JobType, background_job_service
from app.services.email import email_service


logger = logging.getLogger(__name__)


async def handle_welcome_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle welcome email job."""
    logger.info(f"Processing welcome email for: {payload.get('to_email')}")
    result = await email_service.send_welcome_email(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
    )
    logger.info(f"Welcome email job completed: success={result.get('success')}")
    return result


async def handle_inquiry_response_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle inquiry auto-response email job."""
    logger.info(f"Processing inquiry response email for: {payload.get('to_email')}")
    result = await email_service.send_inquiry_auto_response(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        inquiry_id=payload["inquiry_id"],
    )
    logger.info(f"Inquiry response email job completed: success={result.get('success')}")
    return result


async def handle_admin_notification_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle admin notification email job."""
    logger.info(f"Processing admin notification for inquiry: {payload.get('inquiry_id')}")
    result = await email_service.send_admin_notification(
        inquiry_id=payload["inquiry_id"],
        customer_name=payload["customer_name"],
        customer_email=payload["customer_email"],
        vehicle_type=payload["vehicle_type"],
        timeframe=payload["timeframe"],
    )
    logger.info(f"Admin notification email job completed: success={result.get('success')}")
    return result


async def handle_payment_pending_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle payment verification pending email job."""
    logger.info(f"Processing payment pending email for: {payload.get('to_email')}")
    result = await email_service.send_payment_verification_pending(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        invoice_number=payload["invoice_number"],
        amount=payload["amount"],
        uploaded_at=payload["uploaded_at"],
    )
    logger.info(f"Payment pending email job completed: success={result.get('success')}")
    return result


async def handle_payment_approved_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle payment approved email job."""
    logger.info(f"Processing payment approved email for: {payload.get('to_email')}")
    result = await email_service.send_payment_approved_email(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        invoice_number=payload["invoice_number"],
        amount=payload["amount"],
        payment_date=payload["payment_date"],
        next_due_date=payload.get("next_due_date"),
    )
    logger.info(f"Payment approved email job completed: success={result.get('success')}")
    return result


async def handle_payment_rejected_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle payment rejected email job."""
    logger.info(f"Processing payment rejected email for: {payload.get('to_email')}")
    result = await email_service.send_payment_rejected_email(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        invoice_number=payload["invoice_number"],
        amount=payload["amount"],
        rejection_reason=payload["rejection_reason"],
    )
    logger.info(f"Payment rejected email job completed: success={result.get('success')}")
    return result


async def handle_due_date_reminder_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle due date reminder email job."""
    logger.info(f"Processing due date reminder email for: {payload.get('to_email')}")
    result = await email_service.send_due_date_reminder(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        invoice_number=payload["invoice_number"],
        amount=payload["amount"],
        due_date=payload["due_date"],
        days_until_due=payload.get("days_until_due", 3),
    )
    logger.info(f"Due date reminder email job completed: success={result.get('success')}")
    return result


async def handle_late_notice_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle late payment notice email job."""
    logger.info(f"Processing late notice email for: {payload.get('to_email')}")
    result = await email_service.send_late_payment_notice(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        invoice_number=payload["invoice_number"],
        amount_owed=payload["amount_owed"],
        late_fee=payload["late_fee"],
        total_owed=payload["total_owed"],
        case_number=payload["case_number"],
    )
    logger.info(f"Late notice email job completed: success={result.get('success')}")
    return result


async def handle_escalation_notice_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle escalation notice email job."""
    logger.info(f"Processing escalation notice email for: {payload.get('to_email')}")
    result = await email_service.send_escalation_notice(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        case_number=payload["case_number"],
        amount_owed=payload["amount_owed"],
        late_fees=payload["late_fees"],
        total_owed=payload["total_owed"],
        days_delinquent=payload["days_delinquent"],
        escalation_level=payload.get("escalation_level", "level_2"),
    )
    logger.info(f"Escalation notice email job completed: success={result.get('success')}")
    return result


async def handle_termination_notice_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle lease termination notice email job."""
    logger.info(f"Processing termination notice email for: {payload.get('to_email')}")
    result = await email_service.send_lease_termination_notice(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        vehicle_info=payload["vehicle_info"],
        termination_reason=payload["termination_reason"],
        case_number=payload["case_number"],
        amount_owed=payload["amount_owed"],
        recovery_action_number=payload["recovery_action_number"],
    )
    logger.info(f"Termination notice email job completed: success={result.get('success')}")
    return result


async def handle_ban_notice_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle ban notice email job."""
    logger.info(f"Processing ban notice email for: {payload.get('to_email')}")
    result = await email_service.send_ban_notice(
        to_email=payload["to_email"],
        customer_name=payload["customer_name"],
        ban_number=payload["ban_number"],
        ban_reason=payload["ban_reason"],
        case_number=payload.get("case_number"),
        amount_owed=payload.get("amount_owed"),
    )
    logger.info(f"Ban notice email job completed: success={result.get('success')}")
    return result


def register_email_handlers():
    """Register all email job handlers with the background job service."""
    logger.info("Registering email job handlers...")

    background_job_service.register_handler(
        JobType.EMAIL_WELCOME.value,
        handle_welcome_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_INQUIRY_RESPONSE.value,
        handle_inquiry_response_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_ADMIN_NOTIFICATION.value,
        handle_admin_notification_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_PAYMENT_PENDING.value,
        handle_payment_pending_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_PAYMENT_APPROVED.value,
        handle_payment_approved_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_PAYMENT_REJECTED.value,
        handle_payment_rejected_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_DUE_DATE_REMINDER.value,
        handle_due_date_reminder_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_LATE_NOTICE.value,
        handle_late_notice_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_ESCALATION_NOTICE.value,
        handle_escalation_notice_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_TERMINATION_NOTICE.value,
        handle_termination_notice_email
    )
    background_job_service.register_handler(
        JobType.EMAIL_BAN_NOTICE.value,
        handle_ban_notice_email
    )

    logger.info(f"Registered {len(JobType)} email job handlers")
