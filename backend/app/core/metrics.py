"""
GigWheels - Prometheus Metrics
Weekly car rentals for gig drivers

Application metrics for monitoring API latency, error rates, and business metrics.
Exposes Prometheus-compatible metrics endpoint.
"""

import time
from functools import wraps
from typing import Any, Callable

from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Request metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 0.75, 1.0, 2.5, 5.0),
)

REQUEST_IN_PROGRESS = Gauge(
    "http_requests_in_progress",
    "Number of HTTP requests in progress",
    ["method", "endpoint"],
)

# Error metrics
ERROR_COUNT = Counter(
    "http_errors_total",
    "Total HTTP errors (4xx and 5xx)",
    ["method", "endpoint", "status_code", "error_type"],
)

# Upload metrics
UPLOAD_COUNT = Counter(
    "upload_requests_total",
    "Total file upload requests",
    ["upload_type", "status"],
)

UPLOAD_SIZE = Histogram(
    "upload_size_bytes",
    "Size of uploaded files in bytes",
    ["upload_type"],
    buckets=(1024, 10240, 102400, 1048576, 5242880, 10485760),
)

# Payment metrics
PAYMENT_VERIFICATION_COUNT = Counter(
    "payment_verifications_total",
    "Total payment verification attempts",
    ["status"],  # approved, rejected, pending
)

PAYMENT_VERIFICATION_LATENCY = Histogram(
    "payment_verification_duration_seconds",
    "Time taken to verify payments",
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0),
)

# Delinquency metrics
DELINQUENCY_CASES = Gauge(
    "delinquency_cases_total",
    "Total delinquency cases by status",
    ["status"],  # active, escalated, resolved, recovered
)

PAST_DUE_INVOICES = Gauge(
    "past_due_invoices_total",
    "Number of invoices past due date",
)

# Background job metrics
BACKGROUND_JOBS = Counter(
    "background_jobs_total",
    "Total background jobs processed",
    ["job_type", "status"],  # status: success, failure
)

BACKGROUND_JOB_LATENCY = Histogram(
    "background_job_duration_seconds",
    "Time taken to process background jobs",
    ["job_type"],
    buckets=(0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 300.0),
)

EMAIL_SEND_LATENCY = Histogram(
    "email_send_duration_seconds",
    "Time taken to send emails",
    ["email_type"],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)

# Database metrics
DB_QUERY_COUNT = Counter(
    "db_queries_total",
    "Total database queries",
    ["operation"],  # select, insert, update, delete
)

DB_QUERY_LATENCY = Histogram(
    "db_query_duration_seconds",
    "Database query latency",
    ["operation"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)

# Auth metrics
AUTH_ATTEMPTS = Counter(
    "auth_attempts_total",
    "Total authentication attempts",
    ["status"],  # success, failure
)


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect HTTP request metrics."""

    # Endpoints to exclude from metrics
    EXCLUDED_PATHS = {"/health", "/metrics", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip metrics for excluded paths
        path = request.url.path
        if path in self.EXCLUDED_PATHS:
            return await call_next(request)

        # Normalize path to group dynamic segments
        normalized_path = self._normalize_path(path)
        method = request.method

        # Track in-progress requests
        REQUEST_IN_PROGRESS.labels(method=method, endpoint=normalized_path).inc()

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
            status_code = response.status_code

            # Record latency
            duration = time.perf_counter() - start_time
            REQUEST_LATENCY.labels(method=method, endpoint=normalized_path).observe(duration)

            # Record request count
            REQUEST_COUNT.labels(
                method=method, endpoint=normalized_path, status_code=status_code
            ).inc()

            # Record errors (4xx and 5xx)
            if status_code >= 400:
                error_type = "client_error" if status_code < 500 else "server_error"
                ERROR_COUNT.labels(
                    method=method,
                    endpoint=normalized_path,
                    status_code=status_code,
                    error_type=error_type,
                ).inc()

            return response
        except Exception:
            # Record unhandled exception
            duration = time.perf_counter() - start_time
            REQUEST_LATENCY.labels(method=method, endpoint=normalized_path).observe(duration)
            REQUEST_COUNT.labels(method=method, endpoint=normalized_path, status_code=500).inc()
            ERROR_COUNT.labels(
                method=method,
                endpoint=normalized_path,
                status_code=500,
                error_type="unhandled_exception",
            ).inc()
            raise
        finally:
            REQUEST_IN_PROGRESS.labels(method=method, endpoint=normalized_path).dec()

    @staticmethod
    def _normalize_path(path: str) -> str:
        """
        Normalize paths to group dynamic segments.
        E.g., /api/customers/123 -> /api/customers/{id}
        """
        parts = path.strip("/").split("/")
        normalized_parts = []

        for part in parts:
            # Check if this looks like an ID (UUID or numeric)
            if part.isdigit():
                normalized_parts.append("{id}")
            elif len(part) == 36 and part.count("-") == 4:
                # UUID pattern
                normalized_parts.append("{uuid}")
            else:
                normalized_parts.append(part)

        return "/" + "/".join(normalized_parts) if normalized_parts else "/"


def get_metrics_response() -> Response:
    """Generate Prometheus metrics response."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


def track_upload(upload_type: str, success: bool, size_bytes: int = 0) -> None:
    """Track file upload metrics."""
    status = "success" if success else "failure"
    UPLOAD_COUNT.labels(upload_type=upload_type, status=status).inc()
    if success and size_bytes > 0:
        UPLOAD_SIZE.labels(upload_type=upload_type).observe(size_bytes)


def track_payment_verification(status: str, duration_seconds: float | None = None) -> None:
    """Track payment verification metrics."""
    PAYMENT_VERIFICATION_COUNT.labels(status=status).inc()
    if duration_seconds is not None:
        PAYMENT_VERIFICATION_LATENCY.observe(duration_seconds)


def track_background_job(job_type: str, success: bool, duration_seconds: float | None = None) -> None:
    """Track background job metrics."""
    status = "success" if success else "failure"
    BACKGROUND_JOBS.labels(job_type=job_type, status=status).inc()
    if duration_seconds is not None:
        BACKGROUND_JOB_LATENCY.labels(job_type=job_type).observe(duration_seconds)


def track_email_send(email_type: str, duration_seconds: float) -> None:
    """Track email send latency."""
    EMAIL_SEND_LATENCY.labels(email_type=email_type).observe(duration_seconds)


def track_db_query(operation: str, duration_seconds: float) -> None:
    """Track database query metrics."""
    DB_QUERY_COUNT.labels(operation=operation).inc()
    DB_QUERY_LATENCY.labels(operation=operation).observe(duration_seconds)


def track_auth_attempt(success: bool) -> None:
    """Track authentication attempt."""
    status = "success" if success else "failure"
    AUTH_ATTEMPTS.labels(status=status).inc()


def update_delinquency_metrics(
    active: int = 0, escalated: int = 0, resolved: int = 0, recovered: int = 0
) -> None:
    """Update delinquency case gauges."""
    DELINQUENCY_CASES.labels(status="active").set(active)
    DELINQUENCY_CASES.labels(status="escalated").set(escalated)
    DELINQUENCY_CASES.labels(status="resolved").set(resolved)
    DELINQUENCY_CASES.labels(status="recovered").set(recovered)


def update_past_due_count(count: int) -> None:
    """Update past due invoice gauge."""
    PAST_DUE_INVOICES.set(count)


def timed_operation(metric_histogram: Histogram, labels: dict[str, str] | None = None):
    """Decorator to time a function and record to histogram."""
    labels = labels or {}

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            start_time = time.perf_counter()
            try:
                return await func(*args, **kwargs)
            finally:
                duration = time.perf_counter() - start_time
                metric_histogram.labels(**labels).observe(duration)

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            start_time = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                duration = time.perf_counter() - start_time
                metric_histogram.labels(**labels).observe(duration)

        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
