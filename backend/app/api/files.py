"""
GigWheels - File Serving API
Weekly car rentals for gig drivers

Serves files from local storage in development mode.
In production, files are served directly via S3/MinIO signed URLs.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse

from app.core.auth import get_current_user, AuthenticatedUser
from app.services.storage import storage_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["Files"])


# Security headers for sensitive document responses
SENSITIVE_DOCUMENT_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
}


class SecureFileResponse(FileResponse):
    """FileResponse with no-cache headers for sensitive documents."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add security headers
        for header, value in SENSITIVE_DOCUMENT_HEADERS.items():
            self.headers[header] = value


@router.get("/{bucket}/{path:path}")
async def serve_file(
    bucket: str,
    path: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Serve file from local storage (development mode only).

    In production with S3/MinIO, files are served directly via signed URLs.
    This endpoint provides file serving for local development.

    Authentication is required to access files.

    Security features:
    - No-cache headers prevent browser/proxy caching of sensitive documents
    - X-Content-Type-Options prevents MIME sniffing
    - X-Frame-Options prevents clickjacking
    """
    # Validate bucket name to prevent path traversal
    allowed_buckets = [
        "gigwheels-insurance",
        "gigwheels-payments",
        "gigwheels-incidents",
        "gigwheels-vehicles",
    ]

    if bucket not in allowed_buckets:
        logger.warning(f"Invalid bucket requested: {bucket}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Sanitize path to prevent directory traversal
    if ".." in path or path.startswith("/"):
        logger.warning(f"Potential path traversal attempt: {path}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid path"
        )

    # Get file path from storage service
    file_path = storage_service.get_local_file_path(bucket, path)

    if file_path is None or not file_path.exists():
        logger.info(f"File not found: {bucket}/{path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Determine content type based on file extension
    suffix = file_path.suffix.lower()
    content_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
    }
    content_type = content_type_map.get(suffix, "application/octet-stream")

    logger.info(f"Serving file: {bucket}/{path} for user {user.email}")

    # Use SecureFileResponse with no-cache headers for sensitive documents
    # Insurance, payment proofs, and incident reports are sensitive
    return SecureFileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=file_path.name,
    )
