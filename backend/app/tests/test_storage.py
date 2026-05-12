"""
Weekly Vehicle Leasing Platform - Storage Service Tests
Salvage-to-Lux Fleet Management

Unit tests for the file storage service.
"""

from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestStorageServiceValidation:
    """Tests for storage service file validation."""

    def test_validate_file_size_exceeded(self):
        """Test that oversized files are rejected."""
        # Import here to avoid initialization issues
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            from app.services.storage import StorageService, MAX_FILE_SIZE

            service = StorageService()

            # Create content larger than max size
            large_content = b"x" * (MAX_FILE_SIZE + 1)

            is_valid, error, mime_type = service.validate_file(
                file_content=large_content,
                filename="large_file.pdf",
            )

            assert is_valid is False
            assert "too large" in error.lower()
            assert mime_type is None

    def test_validate_empty_file(self):
        """Test that empty files are rejected."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            from app.services.storage import StorageService

            service = StorageService()

            is_valid, error, mime_type = service.validate_file(
                file_content=b"",
                filename="empty.pdf",
            )

            assert is_valid is False
            assert "empty" in error.lower()

    @patch('app.services.storage.magic')
    def test_validate_invalid_mime_type(self, mock_magic):
        """Test that invalid MIME types are rejected."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            # Mock magic to return an executable type
            mock_mime = MagicMock()
            mock_mime.from_buffer.return_value = "application/x-executable"
            mock_magic.Magic.return_value = mock_mime

            from app.services.storage import StorageService

            service = StorageService()

            is_valid, error, mime_type = service.validate_file(
                file_content=b"MZ\x90\x00",  # PE header
                filename="malware.exe",
            )

            assert is_valid is False
            assert "invalid file type" in error.lower()
            assert mime_type == "application/x-executable"

    @patch('app.services.storage.magic')
    def test_validate_valid_pdf(self, mock_magic):
        """Test that valid PDF files are accepted."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            mock_mime = MagicMock()
            mock_mime.from_buffer.return_value = "application/pdf"
            mock_magic.Magic.return_value = mock_mime

            from app.services.storage import StorageService

            service = StorageService()

            is_valid, error, mime_type = service.validate_file(
                file_content=b"%PDF-1.4 content here",
                filename="insurance.pdf",
            )

            assert is_valid is True
            assert error == ""
            assert mime_type == "application/pdf"

    @patch('app.services.storage.magic')
    def test_validate_valid_jpeg(self, mock_magic):
        """Test that valid JPEG images are accepted."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            mock_mime = MagicMock()
            mock_mime.from_buffer.return_value = "image/jpeg"
            mock_magic.Magic.return_value = mock_mime

            from app.services.storage import StorageService

            service = StorageService()

            # JPEG magic bytes
            jpeg_content = b"\xff\xd8\xff\xe0\x00\x10JFIF"

            is_valid, error, mime_type = service.validate_file(
                file_content=jpeg_content,
                filename="photo.jpg",
            )

            assert is_valid is True
            assert mime_type == "image/jpeg"


class TestStorageServiceKeyGeneration:
    """Tests for storage key generation."""

    def test_generate_storage_key_format(self):
        """Test storage key generation format."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            from app.services.storage import StorageService

            service = StorageService()

            key = service.generate_storage_key(
                user_id="user-123",
                document_type="insurance",
                original_filename="my_policy.pdf",
                mime_type="application/pdf",
            )

            assert key.startswith("user-123/insurance/")
            assert key.endswith(".pdf")
            assert "my_policy" in key

    def test_generate_storage_key_sanitizes_filename(self):
        """Test that dangerous characters are removed from filename."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            from app.services.storage import StorageService

            service = StorageService()

            key = service.generate_storage_key(
                user_id="user-123",
                document_type="insurance",
                original_filename="../../../etc/passwd",
                mime_type="application/pdf",
            )

            # Should not contain path traversal characters
            assert "../" not in key
            assert "etc/passwd" not in key
            assert key.startswith("user-123/insurance/")

    def test_generate_storage_key_truncates_long_filename(self):
        """Test that very long filenames are truncated."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            from app.services.storage import StorageService

            service = StorageService()

            long_name = "a" * 200 + ".pdf"

            key = service.generate_storage_key(
                user_id="user-123",
                document_type="insurance",
                original_filename=long_name,
                mime_type="application/pdf",
            )

            # Should be reasonable length
            assert len(key) < 300


class TestStorageServiceHashComputation:
    """Tests for file hash computation."""

    def test_compute_file_hash(self):
        """Test file hash computation."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            from app.services.storage import StorageService

            service = StorageService()

            content = b"test file content"
            hash1 = service.compute_file_hash(content)

            # Hash should be consistent
            hash2 = service.compute_file_hash(content)
            assert hash1 == hash2

            # Hash should be 64 characters (SHA256 hex)
            assert len(hash1) == 64

    def test_compute_file_hash_different_content(self):
        """Test that different content produces different hashes."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""

            from app.services.storage import StorageService

            service = StorageService()

            hash1 = service.compute_file_hash(b"content 1")
            hash2 = service.compute_file_hash(b"content 2")

            assert hash1 != hash2


class TestStorageServiceLocalStorage:
    """Tests for local filesystem storage fallback."""

    def test_local_storage_initialized_when_s3_not_configured(self):
        """Test local storage is used when S3 is not configured."""
        with patch('app.services.storage.settings') as mock_settings:
            mock_settings.S3_ENDPOINT = ""
            mock_settings.S3_ACCESS_KEY = ""
            mock_settings.S3_SECRET_KEY = ""
            mock_settings.S3_BUCKET_INSURANCE = "test-insurance"
            mock_settings.S3_BUCKET_PAYMENTS = "test-payments"
            mock_settings.S3_BUCKET_INCIDENTS = "test-incidents"
            mock_settings.S3_BUCKET_CONDITION_REPORTS = "test-condition"

            from app.services.storage import StorageService

            service = StorageService()

            assert service.use_s3 is False
            assert service._local_storage_path is not None
