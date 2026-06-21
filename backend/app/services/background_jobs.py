"""
GigWheels - Background Job Service
Weekly car rentals for gig drivers

Redis-backed background job queue for async processing of tasks like email notifications.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Optional

from redis import asyncio as aioredis

from app.core.config import settings


logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Status of a background job."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobType(str, Enum):
    """Types of background jobs."""
    EMAIL_WELCOME = "email_welcome"
    EMAIL_INQUIRY_RESPONSE = "email_inquiry_response"
    EMAIL_ADMIN_NOTIFICATION = "email_admin_notification"
    EMAIL_PAYMENT_PENDING = "email_payment_pending"
    EMAIL_PAYMENT_APPROVED = "email_payment_approved"
    EMAIL_PAYMENT_REJECTED = "email_payment_rejected"
    EMAIL_DUE_DATE_REMINDER = "email_due_date_reminder"
    EMAIL_LATE_NOTICE = "email_late_notice"
    EMAIL_ESCALATION_NOTICE = "email_escalation_notice"
    EMAIL_TERMINATION_NOTICE = "email_termination_notice"
    EMAIL_BAN_NOTICE = "email_ban_notice"


class BackgroundJobService:
    """
    Redis-backed background job service.

    Uses Redis lists as a simple job queue with job metadata stored in hashes.
    Supports job enqueueing, processing, and status tracking.
    """

    QUEUE_KEY = "background_jobs:queue"
    JOB_PREFIX = "background_jobs:job:"
    PROCESSED_KEY = "background_jobs:processed"

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None
        self._job_handlers: dict[str, Callable] = {}

    async def _get_redis(self) -> aioredis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    def register_handler(self, job_type: str, handler: Callable):
        """
        Register a handler function for a job type.

        Args:
            job_type: The type of job to handle
            handler: Async function to process the job
        """
        self._job_handlers[job_type] = handler
        logger.info(f"Registered handler for job type: {job_type}")

    async def enqueue(
        self,
        job_type: str,
        payload: dict[str, Any],
        priority: int = 0,
    ) -> str:
        """
        Add a job to the background queue.

        Args:
            job_type: Type of job (from JobType enum)
            payload: Job data/parameters
            priority: Job priority (higher = processed first, default 0)

        Returns:
            Job ID for tracking
        """
        redis = await self._get_redis()

        job_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        job_data = {
            "id": job_id,
            "type": job_type,
            "payload": json.dumps(payload),
            "status": JobStatus.PENDING.value,
            "priority": priority,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "attempts": 0,
            "max_attempts": 3,
            "error": "",
        }

        # Store job metadata
        job_key = f"{self.JOB_PREFIX}{job_id}"
        await redis.hset(job_key, mapping=job_data)
        await redis.expire(job_key, 86400)  # 24 hour TTL

        # Add to queue (using LPUSH for FIFO with RPOP)
        await redis.lpush(self.QUEUE_KEY, job_id)

        logger.info(
            f"Job queued: id={job_id}, type={job_type}",
            extra={
                "job_id": job_id,
                "job_type": job_type,
                "payload_keys": list(payload.keys()),
            }
        )

        return job_id

    async def get_job_status(self, job_id: str) -> Optional[dict[str, Any]]:
        """
        Get the current status of a job.

        Args:
            job_id: The job ID to check

        Returns:
            Job data dict or None if not found
        """
        redis = await self._get_redis()
        job_key = f"{self.JOB_PREFIX}{job_id}"

        job_data = await redis.hgetall(job_key)
        if not job_data:
            return None

        # Parse JSON payload
        if "payload" in job_data:
            try:
                job_data["payload"] = json.loads(job_data["payload"])
            except json.JSONDecodeError:
                pass

        return job_data

    async def _update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        error: str = "",
        result: Optional[dict] = None,
    ):
        """Update job status in Redis."""
        redis = await self._get_redis()
        job_key = f"{self.JOB_PREFIX}{job_id}"

        updates = {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "error": error,
        }

        if result:
            updates["result"] = json.dumps(result)

        await redis.hset(job_key, mapping=updates)

    async def _process_job(self, job_id: str) -> bool:
        """
        Process a single job.

        Args:
            job_id: The job ID to process

        Returns:
            True if processed successfully, False otherwise
        """
        redis = await self._get_redis()
        job_key = f"{self.JOB_PREFIX}{job_id}"

        # Get job data
        job_data = await redis.hgetall(job_key)
        if not job_data:
            logger.warning(f"Job not found: {job_id}")
            return False

        job_type = job_data.get("type", "")
        attempts = int(job_data.get("attempts", 0))
        max_attempts = int(job_data.get("max_attempts", 3))

        # Check if already processed
        if job_data.get("status") == JobStatus.COMPLETED.value:
            logger.debug(f"Job already completed: {job_id}")
            return True

        # Check attempts
        if attempts >= max_attempts:
            logger.error(f"Job exceeded max attempts: {job_id}")
            await self._update_job_status(
                job_id, JobStatus.FAILED, "Max retry attempts exceeded"
            )
            return False

        # Get handler
        handler = self._job_handlers.get(job_type)
        if not handler:
            logger.error(f"No handler registered for job type: {job_type}")
            await self._update_job_status(
                job_id, JobStatus.FAILED, f"No handler for type: {job_type}"
            )
            return False

        # Update status to processing
        await redis.hincrby(job_key, "attempts", 1)
        await self._update_job_status(job_id, JobStatus.PROCESSING)

        # Parse payload
        try:
            payload = json.loads(job_data.get("payload", "{}"))
        except json.JSONDecodeError:
            payload = {}

        # Execute handler
        start_time = datetime.now(timezone.utc)
        try:
            result = await handler(payload)

            # Mark completed
            await self._update_job_status(
                job_id, JobStatus.COMPLETED, result=result
            )

            # Track in processed set
            await redis.zadd(
                self.PROCESSED_KEY,
                {job_id: datetime.now(timezone.utc).timestamp()}
            )

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(
                f"Job completed: id={job_id}, type={job_type}, duration={duration:.2f}s",
                extra={
                    "job_id": job_id,
                    "job_type": job_type,
                    "duration_seconds": duration,
                    "status": "completed",
                }
            )
            return True

        except Exception as e:
            error_msg = str(e)
            logger.error(
                f"Job failed: id={job_id}, type={job_type}, error={error_msg}",
                extra={
                    "job_id": job_id,
                    "job_type": job_type,
                    "error": error_msg,
                    "status": "failed",
                }
            )

            # Check if should retry
            current_attempts = attempts + 1
            if current_attempts < max_attempts:
                # Re-queue for retry
                await redis.lpush(self.QUEUE_KEY, job_id)
                await self._update_job_status(
                    job_id, JobStatus.PENDING, f"Retry after error: {error_msg}"
                )
            else:
                await self._update_job_status(
                    job_id, JobStatus.FAILED, error_msg
                )

            return False

    async def process_pending_jobs(self, max_jobs: int = 10) -> int:
        """
        Process pending jobs from the queue.

        Args:
            max_jobs: Maximum number of jobs to process in this batch

        Returns:
            Number of jobs processed
        """
        redis = await self._get_redis()
        processed = 0

        for _ in range(max_jobs):
            # Get next job from queue (RPOP for FIFO)
            job_id = await redis.rpop(self.QUEUE_KEY)
            if not job_id:
                break

            await self._process_job(job_id)
            processed += 1

        return processed

    async def start_worker(self, poll_interval: float = 1.0):
        """
        Start the background worker loop.

        Args:
            poll_interval: Seconds between queue checks
        """
        self._running = True
        logger.info("Background job worker started")

        while self._running:
            try:
                processed = await self.process_pending_jobs(max_jobs=10)
                if processed > 0:
                    logger.debug(f"Processed {processed} jobs")
            except Exception as e:
                logger.error(f"Worker error: {e}")

            await asyncio.sleep(poll_interval)

        logger.info("Background job worker stopped")

    def stop_worker(self):
        """Signal the worker to stop."""
        self._running = False
        logger.info("Background job worker stopping...")

    async def get_queue_stats(self) -> dict[str, Any]:
        """Get statistics about the job queue."""
        redis = await self._get_redis()

        queue_length = await redis.llen(self.QUEUE_KEY)
        processed_count = await redis.zcard(self.PROCESSED_KEY)

        return {
            "queue_length": queue_length,
            "processed_total": processed_count,
            "registered_handlers": list(self._job_handlers.keys()),
        }

    async def close(self):
        """Close Redis connection."""
        self.stop_worker()
        if self._redis:
            await self._redis.close()
            self._redis = None


# Singleton instance
background_job_service = BackgroundJobService()
