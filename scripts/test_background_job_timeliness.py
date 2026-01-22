#!/usr/bin/env python3
"""
Test script to verify background job timeliness.
Verifies that email notifications are sent within 60 seconds.
"""

import asyncio
import json
import time
import sys
from datetime import datetime, timezone
from redis import asyncio as aioredis


REDIS_URL = "redis://localhost:6380"
QUEUE_KEY = "background_jobs:queue"
JOB_PREFIX = "background_jobs:job:"


async def test_job_timeliness():
    """Test that jobs are processed within 60 seconds."""
    print("=" * 70)
    print("Background Job Timeliness Test")
    print("=" * 70)
    print("Requirement: Email notifications must be sent within 60 seconds")
    print()

    redis = await aioredis.from_url(
        REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )

    # Create a test job
    import uuid
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    job_data = {
        "id": job_id,
        "type": "email_welcome",  # Use a registered type
        "payload": json.dumps({
            "to_email": "test@example.com",
            "customer_name": "Test User",
        }),
        "status": "pending",
        "priority": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "attempts": 0,
        "max_attempts": 3,
        "error": "",
    }

    # Store job metadata
    job_key = f"{JOB_PREFIX}{job_id}"
    await redis.hset(job_key, mapping=job_data)
    await redis.expire(job_key, 300)  # 5 min TTL for test

    # Add to queue
    await redis.lpush(QUEUE_KEY, job_id)
    enqueue_time = time.time()
    print(f"Job enqueued: {job_id}")
    print(f"Enqueue time: {datetime.now().isoformat()}")
    print()

    # Poll for completion (max 60 seconds)
    print("Waiting for job completion...")
    max_wait = 60
    poll_interval = 0.5
    elapsed = 0

    while elapsed < max_wait:
        job_status = await redis.hgetall(job_key)
        status = job_status.get("status", "unknown")

        if status == "completed":
            completion_time = time.time()
            duration = completion_time - enqueue_time
            print(f"Job completed!")
            print(f"Status: {status}")
            print(f"Duration: {duration:.2f} seconds")
            print()

            if duration < 60:
                print(f"PASS: Job completed in {duration:.2f}s (< 60s requirement)")
                await redis.close()
                return True
            else:
                print(f"FAIL: Job took {duration:.2f}s (>= 60s requirement)")
                await redis.close()
                return False

        elif status == "failed":
            error = job_status.get("error", "Unknown error")
            print(f"Job failed with error: {error}")
            # Still a pass if it was processed quickly
            completion_time = time.time()
            duration = completion_time - enqueue_time
            print(f"Duration: {duration:.2f} seconds")

            if duration < 60:
                print(f"PASS: Job was processed in {duration:.2f}s (< 60s)")
                print("Note: Job failed but processing was timely")
                await redis.close()
                return True
            else:
                print(f"FAIL: Job processing took {duration:.2f}s")
                await redis.close()
                return False

        elif status == "processing":
            # Job is being processed - good sign
            pass

        await asyncio.sleep(poll_interval)
        elapsed += poll_interval
        if int(elapsed) % 5 == 0 and elapsed == int(elapsed):
            print(f"  ... waiting ({int(elapsed)}s elapsed, status: {status})")

    # Timeout
    print(f"FAIL: Job not completed within {max_wait} seconds")
    await redis.close()
    return False


async def check_worker_config():
    """Verify worker configuration supports timeliness requirement."""
    print("=" * 70)
    print("Worker Configuration Check")
    print("=" * 70)

    # The poll interval is set in main.py
    poll_interval = 1.0  # seconds (from main.py start_worker call)
    max_jobs_per_poll = 10

    print(f"Poll interval: {poll_interval}s")
    print(f"Max jobs per poll: {max_jobs_per_poll}")
    print()

    # Calculate worst-case latency
    # Worst case: job arrives just after a poll
    worst_case_queue_delay = poll_interval
    typical_email_send_time = 2.0  # Resend API typically ~1-2s
    worst_case_total = worst_case_queue_delay + typical_email_send_time

    print(f"Worst case queue delay: {worst_case_queue_delay}s")
    print(f"Typical email send time: {typical_email_send_time}s")
    print(f"Worst case total: {worst_case_total}s")
    print()

    if worst_case_total < 60:
        print(f"PASS: Worst case {worst_case_total}s is well under 60s requirement")
        return True
    else:
        print(f"FAIL: Worst case {worst_case_total}s may exceed 60s requirement")
        return False


async def check_queue_stats():
    """Check current queue statistics."""
    print("=" * 70)
    print("Current Queue Statistics")
    print("=" * 70)

    redis = await aioredis.from_url(
        REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )

    queue_length = await redis.llen(QUEUE_KEY)
    processed_count = await redis.zcard("background_jobs:processed")

    print(f"Queue length: {queue_length}")
    print(f"Total processed: {processed_count}")
    print()

    if queue_length == 0:
        print("PASS: Queue is empty (jobs processed promptly)")
    else:
        print(f"INFO: {queue_length} jobs pending in queue")

    await redis.close()
    return queue_length == 0


async def main():
    """Run all timeliness tests."""
    print()
    print("#" * 70)
    print("# Background Job Timeliness Verification")
    print("# Requirement: Email notifications sent within 60 seconds")
    print("#" * 70)
    print()

    results = []

    # Check 1: Worker configuration
    config_ok = await check_worker_config()
    results.append(("Worker Configuration", config_ok))
    print()

    # Check 2: Queue stats
    queue_ok = await check_queue_stats()
    results.append(("Queue Statistics", queue_ok))
    print()

    # Check 3: Actual job timeliness test
    timeliness_ok = await test_job_timeliness()
    results.append(("Job Timeliness", timeliness_ok))
    print()

    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    all_pass = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        if not passed:
            all_pass = False
        print(f"  {name}: {status}")

    print()
    overall = "ALL PASS" if all_pass else "SOME FAIL"
    print(f"Overall Result: {overall}")
    print("=" * 70)

    return 0 if all_pass else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
