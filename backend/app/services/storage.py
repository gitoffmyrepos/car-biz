"""
Weekly Vehicle Leasing Platform - Storage Service
Salvage-to-Lux Fleet Management

MinIO/S3 storage service for file uploads with local filesystem fallback for development.
"""

import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple
from uuid import uuid4

import magic

from app.core.config import settings

logger = logging.getLogger(__name__)

# Allowed MIME types for insurance documents
ALLOWED_INSURANCE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


class StorageService:
    """
    Storage service for file uploads.

    Uses MinIO/S3 when configured, falls back to local filesystem for development.
    """

    def __init__(self):
        self.use_s3 = bool(settings.S3_ENDPOINT and settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY)
        self._s3_client = None
        self._local_storage_path = Path("/tmp/fx-weekly-lease-uploads")

        if self.use_s3:
            self._init_s3_client()
        else:
            logger.info("S3/MinIO not configured - using local filesystem storage")
            self._init_local_storage()

    def _init_s3_client(self):
        """Initialize S3/MinIO client."""
        try:
            import boto3
            from botocore.config import Config

            self._s3_client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                region_name=settings.S3_REGION,
                config=Config(signature_version="s3v4"),
            )
            logger.info(f"S3 client initialized with endpoint: {settings.S3_ENDPOINT}")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self.use_s3 = False
            self._init_local_storage()

    def _init_local_storage(self):
        """Initialize local storage directories."""
        # Create bucket directories
        for bucket in [
            settings.S3_BUCKET_INSURANCE,
            settings.S3_BUCKET_PAYMENTS,
            settings.S3_BUCKET_INCIDENTS,
            settings.S3_BUCKET_CONDITION_REPORTS,
        ]:
            bucket_path = self._local_storage_path / bucket
            bucket_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created local storage directory: {bucket_path}")

    def validate_file(
        self,
        file_content: bytes,
        filename: str,
        allowed_types: dict = ALLOWED_INSURANCE_TYPES,
        max_size: int = MAX_FILE_SIZE,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Validate uploaded file.

        Returns: (is_valid, error_message, detected_mime_type)
        """
        # Check file size
        if len(file_content) > max_size:
            max_mb = max_size / (1024 * 1024)
            return False, f"File too large. Maximum size is {max_mb:.0f}MB", None

        # Check file is not empty
        if len(file_content) == 0:
            return False, "File is empty", None

        # Detect MIME type using magic bytes
        try:
            mime = magic.Magic(mime=True)
            detected_type = mime.from_buffer(file_content)
        except Exception as e:
            logger.error(f"Failed to detect file type: {e}")
            return False, "Could not determine file type", None

        # Validate MIME type
        if detected_type not in allowed_types:
            allowed_str = ", ".join(allowed_types.keys())
            return False, f"Invalid file type: {detected_type}. Allowed types: {allowed_str}", detected_type

        return True, "", detected_type

    def generate_storage_key(
        self,
        user_id: str,
        document_type: str,
        original_filename: str,
        mime_type: str,
    ) -> str:
        """Generate unique storage key for a file."""
        extension = ALLOWED_INSURANCE_TYPES.get(mime_type, "")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        unique_id = uuid4().hex[:8]

        # Sanitize filename
        safe_name = "".join(c for c in original_filename if c.isalnum() or c in "._-")[:50]

        return f"{user_id}/{document_type}/{timestamp}_{unique_id}_{safe_name}{extension}"

    def compute_file_hash(self, file_content: bytes) -> str:
        """Compute SHA256 hash of file content for duplicate detection."""
        return hashlib.sha256(file_content).hexdigest()

    async def upload_file(
        self,
        file_content: bytes,
        bucket: str,
        key: str,
        content_type: str,
    ) -> bool:
        """
        Upload file to storage.

        Returns True if successful, False otherwise.
        """
        if self.use_s3:
            return await self._upload_to_s3(file_content, bucket, key, content_type)
        else:
            return self._upload_to_local(file_content, bucket, key)

    async def _upload_to_s3(
        self,
        file_content: bytes,
        bucket: str,
        key: str,
        content_type: str,
    ) -> bool:
        """Upload file to S3/MinIO."""
        try:
            from io import BytesIO

            self._s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=BytesIO(file_content),
                ContentType=content_type,
            )
            logger.info(f"Uploaded file to S3: {bucket}/{key}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload to S3: {e}")
            return False

    def _upload_to_local(
        self,
        file_content: bytes,
        bucket: str,
        key: str,
    ) -> bool:
        """Upload file to local filesystem."""
        try:
            file_path = self._local_storage_path / bucket / key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(file_content)
            logger.info(f"Saved file locally: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save file locally: {e}")
            return False

    def generate_signed_url(
        self,
        bucket: str,
        key: str,
        expires_in: int = None,
    ) -> Optional[str]:
        """
        Generate signed URL for file access.

        For local storage, returns a direct path (would need a file serving endpoint).
        For S3, generates a presigned URL.
        """
        if expires_in is None:
            expires_in = settings.S3_SIGNED_URL_TTL_SECONDS

        if self.use_s3:
            try:
                url = self._s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": key},
                    ExpiresIn=expires_in,
                )
                return url
            except Exception as e:
                logger.error(f"Failed to generate signed URL: {e}")
                return None
        else:
            # For local storage, return path that can be served by an endpoint
            return f"/api/files/{bucket}/{key}"

    async def delete_file(self, bucket: str, key: str) -> bool:
        """Delete file from storage."""
        if self.use_s3:
            try:
                self._s3_client.delete_object(Bucket=bucket, Key=key)
                logger.info(f"Deleted file from S3: {bucket}/{key}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete from S3: {e}")
                return False
        else:
            try:
                file_path = self._local_storage_path / bucket / key
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"Deleted local file: {file_path}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete local file: {e}")
                return False

    def get_local_file_path(self, bucket: str, key: str) -> Optional[Path]:
        """Get path to local file (for serving in dev mode)."""
        if self.use_s3:
            return None

        file_path = self._local_storage_path / bucket / key
        if file_path.exists():
            return file_path
        return None


# Singleton instance
storage_service = StorageService()
