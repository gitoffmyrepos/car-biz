"""
GigWheels - Background Jobs API
Weekly car rentals for gig drivers

API endpoints for managing and testing background jobs.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.services.background_jobs import background_job_service, JobType


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


class TestEmailJobRequest(BaseModel):
    """Request to enqueue a test email job."""
    job_type: str
    to_email: EmailStr
    customer_name: str
    # Optional fields for different email types
    inquiry_id: int | None = None
    invoice_number: str | None = None
    amount: float | None = None


class JobStatusResponse(BaseModel):
    """Response for job status check."""
    job_id: str
    status: str
    job_type: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    error: str | None = None


class QueueStatsResponse(BaseModel):
    """Response for queue statistics."""
    queue_length: int
    processed_total: int
    registered_handlers: list[str]


@router.post("/enqueue/test-email", response_model=dict[str, Any])
async def enqueue_test_email(request: TestEmailJobRequest) -> dict[str, Any]:
    """
    Enqueue a test email job for background processing.

    This endpoint is for testing the background job system.
    It queues an email job and returns the job ID for status tracking.
    """
    # Build payload based on job type
    payload: dict[str, Any] = {
        "to_email": request.to_email,
        "customer_name": request.customer_name,
    }

    # Validate job type and add required fields
    if request.job_type == JobType.EMAIL_WELCOME.value:
        pass  # Only needs to_email and customer_name

    elif request.job_type == JobType.EMAIL_INQUIRY_RESPONSE.value:
        if request.inquiry_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="inquiry_id is required for inquiry response email"
            )
        payload["inquiry_id"] = request.inquiry_id

    elif request.job_type == JobType.EMAIL_PAYMENT_PENDING.value:
        if not request.invoice_number or request.amount is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invoice_number and amount are required for payment pending email"
            )
        payload["invoice_number"] = request.invoice_number
        payload["amount"] = request.amount
        payload["uploaded_at"] = datetime.now(timezone.utc).isoformat()

    elif request.job_type == JobType.EMAIL_DUE_DATE_REMINDER.value:
        if not request.invoice_number or request.amount is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invoice_number and amount are required for due date reminder email"
            )
        payload["invoice_number"] = request.invoice_number
        payload["amount"] = request.amount
        payload["due_date"] = (datetime.now(timezone.utc)).strftime("%Y-%m-%d")
        payload["days_until_due"] = 3

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or unsupported job_type: {request.job_type}. "
                   f"Supported types for testing: {JobType.EMAIL_WELCOME.value}, "
                   f"{JobType.EMAIL_INQUIRY_RESPONSE.value}, {JobType.EMAIL_PAYMENT_PENDING.value}, "
                   f"{JobType.EMAIL_DUE_DATE_REMINDER.value}"
        )

    # Enqueue the job
    try:
        job_id = await background_job_service.enqueue(
            job_type=request.job_type,
            payload=payload,
        )

        logger.info(
            f"Test email job queued: job_id={job_id}, type={request.job_type}, to={request.to_email}"
        )

        return {
            "success": True,
            "message": "Job queued successfully",
            "job_id": job_id,
            "job_type": request.job_type,
            "queued_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to enqueue test email job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue job: {str(e)}"
        )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """
    Get the status of a background job by its ID.

    Returns job status, type, timestamps, and any error message.
    """
    job_data = await background_job_service.get_job_status(job_id)

    if not job_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found: {job_id}"
        )

    return JobStatusResponse(
        job_id=job_id,
        status=job_data.get("status", "unknown"),
        job_type=job_data.get("type"),
        created_at=job_data.get("created_at"),
        updated_at=job_data.get("updated_at"),
        error=job_data.get("error") if job_data.get("error") else None,
    )


@router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats() -> QueueStatsResponse:
    """
    Get statistics about the background job queue.

    Returns queue length, total processed count, and registered handlers.
    """
    stats = await background_job_service.get_queue_stats()

    return QueueStatsResponse(
        queue_length=stats.get("queue_length", 0),
        processed_total=stats.get("processed_total", 0),
        registered_handlers=stats.get("registered_handlers", []),
    )


@router.post("/process-now", response_model=dict[str, Any])
async def process_jobs_now(max_jobs: int = 10) -> dict[str, Any]:
    """
    Manually trigger processing of pending jobs.

    This is useful for testing - triggers immediate processing of up to
    max_jobs pending jobs without waiting for the poll interval.
    """
    if max_jobs < 1 or max_jobs > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_jobs must be between 1 and 100"
        )

    processed_count = await background_job_service.process_pending_jobs(max_jobs=max_jobs)

    return {
        "success": True,
        "message": f"Processed {processed_count} jobs",
        "processed_count": processed_count,
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }
