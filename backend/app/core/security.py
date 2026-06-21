"""
GigWheels - Security Middleware
Weekly car rentals for gig drivers

Security headers and middleware for API protection.
"""

from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.

    Implements OWASP security header recommendations.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # X-Content-Type-Options: Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # X-Frame-Options: Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # X-XSS-Protection: Enable browser XSS filtering (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer-Policy: Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content-Security-Policy: Restrict content sources (API-focused)
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; "
            "frame-ancestors 'none'; "
            "form-action 'none'"
        )

        # Permissions-Policy: Disable unnecessary browser features
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "camera=(), "
            "geolocation=(), "
            "gyroscope=(), "
            "magnetometer=(), "
            "microphone=(), "
            "payment=(), "
            "usb=()"
        )

        # Cache-Control: Prevent caching of sensitive data
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        # HSTS: Enforce HTTPS (only in production)
        if settings.APP_ENV == "production" or not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response


def sanitize_input(value: object) -> object:
    """
    Sanitize user input to prevent XSS attacks.

    Escapes HTML special characters. Returns non-string values unchanged.
    """
    if not isinstance(value, str):
        return value

    escape_map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;",
    }

    for char, escaped in escape_map.items():
        value = value.replace(char, escaped)

    return value


def validate_content_type(
    content_type: str,
    allowed_types: list[str],
) -> bool:
    """
    Validate Content-Type header against allowed types.

    Args:
        content_type: The Content-Type header value
        allowed_types: List of allowed MIME types

    Returns:
        True if content type is allowed
    """
    if not content_type:
        return False

    # Extract the main type (ignore charset, boundary, etc.)
    main_type = content_type.split(";")[0].strip().lower()

    return main_type in [t.lower() for t in allowed_types]


# File upload security constants
ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
]

ALLOWED_DOCUMENT_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
]

# File magic bytes for validation
FILE_SIGNATURES = {
    b"\xff\xd8\xff": "image/jpeg",  # JPEG
    b"\x89PNG\r\n\x1a\n": "image/png",  # PNG
    b"GIF87a": "image/gif",  # GIF87a
    b"GIF89a": "image/gif",  # GIF89a
    b"%PDF": "application/pdf",  # PDF
    b"RIFF": "image/webp",  # WebP (need to check WEBP after RIFF)
}


def validate_file_magic(content: bytes, expected_type: str) -> bool:
    """
    Validate file content against its claimed MIME type using magic bytes.

    Args:
        content: File content bytes
        expected_type: The claimed MIME type

    Returns:
        True if magic bytes match expected type
    """
    if not content:
        return False

    for signature, mime_type in FILE_SIGNATURES.items():
        if content.startswith(signature):
            # Special case for WebP (RIFF....WEBP)
            if signature == b"RIFF" and len(content) >= 12:
                if content[8:12] == b"WEBP":
                    return expected_type == "image/webp"
                continue

            return expected_type == mime_type

    return False


# Maximum file sizes (in bytes)
MAX_FILE_SIZES = {
    "image": 10 * 1024 * 1024,  # 10 MB for images
    "document": 25 * 1024 * 1024,  # 25 MB for documents
    "default": 5 * 1024 * 1024,  # 5 MB default
}


def validate_file_size(size: int, file_type: str = "default") -> bool:
    """
    Validate file size against limits.

    Args:
        size: File size in bytes
        file_type: Type of file (image, document, or default)

    Returns:
        True if size is within limits
    """
    max_size = MAX_FILE_SIZES.get(file_type, MAX_FILE_SIZES["default"])
    return size <= max_size


# =============================================================================
# IDOR Prevention Utilities
# =============================================================================


class IDORProtectionError(Exception):
    """Exception raised when IDOR check fails."""

    def __init__(self, resource_type: str = "Resource"):
        self.resource_type = resource_type
        super().__init__(f"{resource_type} not found or access denied")


def check_resource_ownership(
    resource: object,
    owner_field: str,
    expected_owner_id: int,
    resource_type: str = "Resource",
) -> None:
    """
    Verify resource ownership to prevent IDOR attacks.

    This function checks that a resource belongs to the expected owner.
    On failure, it raises IDORProtectionError with a generic message
    to avoid leaking information about resource existence.

    Args:
        resource: The database resource object to check
        owner_field: The attribute name containing the owner ID
        expected_owner_id: The ID of the user who should own the resource
        resource_type: Type name for error messages (e.g., "Invoice", "Vehicle Request")

    Raises:
        IDORProtectionError: If resource is None or ownership check fails

    Example:
        check_resource_ownership(
            invoice,
            "customer_profile_id",
            current_user_profile.id,
            "Invoice"
        )
    """
    if resource is None:
        raise IDORProtectionError(resource_type)

    actual_owner_id = getattr(resource, owner_field, None)
    if actual_owner_id != expected_owner_id:
        # Log attempted unauthorized access (without revealing resource details)
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(
            f"IDOR attempt blocked: {resource_type} access denied. "
            f"Expected owner: {expected_owner_id}, Actual owner: {actual_owner_id}"
        )
        raise IDORProtectionError(resource_type)


def verify_ownership_or_404(
    resource: object,
    owner_field: str,
    expected_owner_id: int,
    resource_type: str = "Resource",
) -> object:
    """
    Verify resource ownership and return the resource, or raise HTTP 404.

    This is a convenience wrapper around check_resource_ownership that
    converts IDORProtectionError to HTTPException with 404 status.
    Using 404 instead of 403 prevents information disclosure about
    whether a resource exists.

    Args:
        resource: The database resource object to check
        owner_field: The attribute name containing the owner ID
        expected_owner_id: The ID of the user who should own the resource
        resource_type: Type name for error messages

    Returns:
        The resource if ownership check passes

    Raises:
        HTTPException: 404 if resource is None or ownership check fails

    Example:
        invoice = verify_ownership_or_404(
            db_invoice,
            "customer_profile_id",
            profile.id,
            "Invoice"
        )
    """
    from fastapi import HTTPException
    from starlette import status

    try:
        check_resource_ownership(resource, owner_field, expected_owner_id, resource_type)
        return resource
    except IDORProtectionError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_type} not found"
        )


def verify_ownership_or_403(
    resource: object,
    owner_field: str,
    expected_owner_id: int,
    resource_type: str = "Resource",
) -> object:
    """
    Verify resource ownership and return the resource, or raise HTTP 403.

    Similar to verify_ownership_or_404, but returns 403 Forbidden instead.
    Use this when you explicitly want to inform the user that access is denied
    (typically for admin/ops scenarios where hiding resource existence doesn't matter).

    Args:
        resource: The database resource object to check
        owner_field: The attribute name containing the owner ID
        expected_owner_id: The ID of the user who should own the resource
        resource_type: Type name for error messages

    Returns:
        The resource if ownership check passes

    Raises:
        HTTPException: 404 if resource is None, 403 if ownership check fails
    """
    from fastapi import HTTPException
    from starlette import status

    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_type} not found"
        )

    actual_owner_id = getattr(resource, owner_field, None)
    if actual_owner_id != expected_owner_id:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(
            f"IDOR attempt blocked: {resource_type} access denied. "
            f"Expected owner: {expected_owner_id}, Actual owner: {actual_owner_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied"
        )
