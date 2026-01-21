"""
Weekly Vehicle Leasing Platform - File Serving API
Salvage-to-Lux Fleet Management

Serves files from local storage in development mode.
In production, files are served directly via S3/MinIO signed URLs.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.core.auth import get_current_user, AuthenticatedUser
from app.services.storage import storage_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["Files"])


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
    """
    # Validate bucket name to prevent path traversal
    allowed_buckets = [
        "fx-weekly-lease-insurance",
        "fx-weekly-lease-payments",
        "fx-weekly-lease-incidents",
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

    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=file_path.name,
    )
