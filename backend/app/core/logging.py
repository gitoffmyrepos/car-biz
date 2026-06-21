"""
GigWheels - Structured Logging
Weekly car rentals for gig drivers

Provides structured JSON logging with:
- Correlation/request ID tracking
- Sensitive data redaction
- ISO 8601 timestamps
- Log level filtering
"""

import json
import logging
import re
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


# Context variable for request correlation ID
_correlation_id: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> Optional[str]:
    """Get the current request correlation ID."""
    return _correlation_id.get()


def set_correlation_id(correlation_id: Optional[str]) -> None:
    """Set the current request correlation ID."""
    _correlation_id.set(correlation_id)


# Patterns for sensitive data detection
SENSITIVE_PATTERNS = [
    # Email addresses
    (re.compile(r'([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)'), r'***@\2'),
    # Phone numbers (various formats)
    (re.compile(r'\b(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'), r'***-***-\4'),
    # SSN
    (re.compile(r'\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b'), '***-**-****'),
    # Credit card numbers (basic pattern)
    (re.compile(r'\b[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b'), '****-****-****-****'),
    # API keys / tokens (common formats)
    (re.compile(r'\b(sk_live_|sk_test_|pk_live_|pk_test_|bearer\s+)[a-zA-Z0-9]{20,}\b', re.IGNORECASE), r'\1***REDACTED***'),
    # AWS-style access keys
    (re.compile(r'\b(AKIA|ASIA)[A-Z0-9]{16}\b'), '***REDACTED***'),
    # JWT tokens (basic pattern)
    (re.compile(r'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*'), '***JWT_REDACTED***'),
]

# Field names that should always be redacted
SENSITIVE_FIELD_NAMES = {
    'password', 'passwd', 'secret', 'token', 'api_key', 'apikey',
    'access_token', 'refresh_token', 'authorization', 'auth',
    'ssn', 'social_security', 'credit_card', 'card_number',
    'cvv', 'cvc', 'pin', 'private_key', 'secret_key',
    'driver_license', 'license_number', 'insurance_policy',
}


def redact_sensitive_data(value: Any) -> Any:
    """
    Redact sensitive data from a value.

    Args:
        value: Value to potentially redact (string, dict, list, etc.)

    Returns:
        Value with sensitive data redacted
    """
    if isinstance(value, str):
        # Apply pattern-based redaction
        result = value
        for pattern, replacement in SENSITIVE_PATTERNS:
            result = pattern.sub(replacement, result)
        return result

    elif isinstance(value, dict):
        return {
            k: '***REDACTED***' if k.lower() in SENSITIVE_FIELD_NAMES
            else redact_sensitive_data(v)
            for k, v in value.items()
        }

    elif isinstance(value, list):
        return [redact_sensitive_data(item) for item in value]

    return value


class SensitiveDataFilter(logging.Filter):
    """
    Logging filter that redacts sensitive data from log messages and arguments.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Redact the message
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_data(record.msg)

        # Redact format arguments
        if record.args:
            if isinstance(record.args, dict):
                record.args = redact_sensitive_data(record.args)
            elif isinstance(record.args, tuple):
                record.args = tuple(redact_sensitive_data(arg) for arg in record.args)

        # Redact extra fields (stored in record's __dict__)
        extra = getattr(record, '__dict__', {})
        if extra:
            for key in list(extra.keys()):
                if key not in {
                    'name', 'msg', 'args', 'created', 'filename', 'funcName',
                    'levelname', 'levelno', 'lineno', 'module', 'msecs',
                    'pathname', 'process', 'processName', 'relativeCreated',
                    'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                    'message'
                }:
                    extra[key] = redact_sensitive_data(extra[key])

        return True


class JSONFormatter(logging.Formatter):
    """
    Formatter that outputs log records as JSON with structured fields.

    Output format:
    {
        "timestamp": "2026-01-22T20:30:00.000000+00:00",
        "level": "INFO",
        "logger": "app.services.email",
        "message": "Email sent successfully",
        "correlation_id": "abc123",
        "extra": {...}
    }
    """

    def format(self, record: logging.LogRecord) -> str:
        # Build the base log entry
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add correlation ID if available
        correlation_id = get_correlation_id()
        if correlation_id:
            log_entry["correlation_id"] = correlation_id

        # Add request_id alias for correlation_id (common convention)
        if correlation_id:
            log_entry["request_id"] = correlation_id

        # Add source location for errors and warnings
        if record.levelno >= logging.WARNING:
            log_entry["source_file"] = record.pathname
            log_entry["source_line"] = record.lineno
            log_entry["source_function"] = record.funcName

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Add any extra fields
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in {
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'pathname', 'process', 'processName', 'relativeCreated',
                'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                'message', 'extra'
            }:
                extra_fields[key] = redact_sensitive_data(value)

        if extra_fields:
            log_entry["extra"] = extra_fields

        # Redact any sensitive data in the message
        log_entry["message"] = redact_sensitive_data(log_entry["message"])

        return json.dumps(log_entry, default=str)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds correlation ID to each request.

    The correlation ID is extracted from the X-Correlation-ID header if present,
    otherwise a new UUID is generated.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Get or generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())

        # Set in context
        set_correlation_id(correlation_id)

        # Process request
        response = await call_next(request)

        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = correlation_id

        # Clear context
        set_correlation_id(None)

        return response


def setup_logging(
    log_level: str = "INFO",
    json_format: bool = True,
    enable_sensitive_filter: bool = True,
) -> None:
    """
    Configure application logging with structured JSON format.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Whether to use JSON format (True) or plain text (False)
        enable_sensitive_filter: Whether to enable sensitive data redaction
    """
    # Get the root logger
    root_logger = logging.getLogger()

    # Clear existing handlers
    root_logger.handlers.clear()

    # Set log level
    level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(level)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    # Set formatter
    if json_format:
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z"
        )
    console_handler.setFormatter(formatter)

    # Add sensitive data filter
    if enable_sensitive_filter:
        sensitive_filter = SensitiveDataFilter()
        console_handler.addFilter(sensitive_filter)

    # Add handler to root logger
    root_logger.addHandler(console_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # Log setup complete
    logger = logging.getLogger(__name__)
    logger.info(
        "Logging configured",
        extra={
            "log_level": log_level,
            "json_format": json_format,
            "sensitive_filter": enable_sensitive_filter,
        }
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.

    This is a convenience function that ensures consistent logger naming.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


# Convenience function for structured logging with extra context
def log_with_context(
    logger: logging.Logger,
    level: int,
    message: str,
    **extra_fields
) -> None:
    """
    Log a message with additional context fields.

    Args:
        logger: Logger instance
        level: Log level (logging.INFO, logging.ERROR, etc.)
        message: Log message
        **extra_fields: Additional fields to include in the log entry
    """
    logger.log(level, message, extra=extra_fields)
