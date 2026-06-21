"""
GigWheels - Insurance Retention Service Tests
Weekly car rentals for gig drivers

Unit tests for the insurance document retention service.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.insurance_retention import InsuranceRetentionService


class TestInsuranceRetentionService:
    """Tests for InsuranceRetentionService."""

    @pytest.fixture
    def mock_db(self) -> AsyncMock:
        """Create a mock database session."""
        db = AsyncMock()
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        db.add = MagicMock()
        return db

    @pytest.fixture
    def service(self, mock_db: AsyncMock) -> InsuranceRetentionService:
        """Create service instance with mock db."""
        return InsuranceRetentionService(mock_db)

    @pytest.mark.asyncio
    async def test_get_retention_settings_defaults(self, service: InsuranceRetentionService, mock_db: AsyncMock):
        """Test getting retention settings with defaults."""
        # Mock empty result (no settings in DB)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        settings = await service.get_retention_settings()

        assert settings["retention_days"] == 365
        assert settings["auto_delete_enabled"] is True

    @pytest.mark.asyncio
    async def test_get_retention_settings_from_db(self, service: InsuranceRetentionService, mock_db: AsyncMock):
        """Test getting retention settings from database."""
        # Mock retention days setting
        retention_setting = MagicMock()
        retention_setting.get_typed_value.return_value = 180

        # Mock auto-delete setting
        auto_delete_setting = MagicMock()
        auto_delete_setting.get_typed_value.return_value = False

        # Configure mock to return different settings
        call_count = [0]

        def mock_execute(*args, **kwargs):
            result = MagicMock()
            if call_count[0] == 0:
                result.scalar_one_or_none.return_value = retention_setting
            else:
                result.scalar_one_or_none.return_value = auto_delete_setting
            call_count[0] += 1
            return result

        mock_db.execute = AsyncMock(side_effect=mock_execute)

        settings = await service.get_retention_settings()

        assert settings["retention_days"] == 180
        assert settings["auto_delete_enabled"] is False

    @pytest.mark.asyncio
    async def test_get_documents_for_deletion_empty(self, service: InsuranceRetentionService, mock_db: AsyncMock):
        """Test getting documents when none are expired."""
        # Mock settings
        with patch.object(service, 'get_retention_settings', new_callable=AsyncMock) as mock_settings:
            mock_settings.return_value = {"retention_days": 365, "auto_delete_enabled": True}

            # Mock empty result
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = []
            mock_db.execute.return_value = mock_result

            documents = await service.get_documents_for_deletion()

            assert documents == []

    @pytest.mark.asyncio
    async def test_get_documents_for_deletion_with_custom_retention(
        self, service: InsuranceRetentionService, mock_db: AsyncMock
    ):
        """Test getting documents with custom retention period."""
        # Create mock expired customer profiles
        mock_profile1 = MagicMock()
        mock_profile1.id = 1
        mock_profile1.email = "customer1@example.com"
        mock_profile1.insurance_document_key = "insurance/1/policy.pdf"
        mock_profile1.insurance_expiration_date = datetime.now(timezone.utc) - timedelta(days=400)

        mock_profile2 = MagicMock()
        mock_profile2.id = 2
        mock_profile2.email = "customer2@example.com"
        mock_profile2.insurance_document_key = "insurance/2/policy.pdf"
        mock_profile2.insurance_expiration_date = datetime.now(timezone.utc) - timedelta(days=500)

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_profile1, mock_profile2]
        mock_db.execute.return_value = mock_result

        documents = await service.get_documents_for_deletion(retention_days=365)

        assert len(documents) == 2
        assert documents[0].id == 1
        assert documents[1].id == 2

    @pytest.mark.asyncio
    async def test_delete_expired_documents_dry_run(self, service: InsuranceRetentionService, mock_db: AsyncMock):
        """Test dry run mode doesn't actually delete documents."""
        # Create mock expired profile
        mock_profile = MagicMock()
        mock_profile.id = 1
        mock_profile.email = "customer@example.com"
        mock_profile.insurance_document_key = "insurance/1/policy.pdf"
        mock_profile.insurance_expiration_date = datetime.now(timezone.utc) - timedelta(days=400)
        mock_profile.insurance_status = MagicMock()
        mock_profile.insurance_status.value = "expired"

        with patch.object(service, 'get_retention_settings', new_callable=AsyncMock) as mock_settings:
            mock_settings.return_value = {"retention_days": 365, "auto_delete_enabled": True}

            with patch.object(service, 'get_documents_for_deletion', new_callable=AsyncMock) as mock_docs:
                mock_docs.return_value = [mock_profile]

                result = await service.delete_expired_documents(dry_run=True)

                assert result["success"] is True
                assert result["would_delete"] == 1
                assert result["retention_days"] == 365
                assert len(result["documents"]) == 1
                assert result["documents"][0]["customer_id"] == 1

                # Verify no actual deletion occurred
                mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_expired_documents_disabled(self, service: InsuranceRetentionService, mock_db: AsyncMock):
        """Test deletion is skipped when auto-delete is disabled."""
        with patch.object(service, 'get_retention_settings', new_callable=AsyncMock) as mock_settings:
            mock_settings.return_value = {"retention_days": 365, "auto_delete_enabled": False}

            result = await service.delete_expired_documents(dry_run=False)

            assert result["success"] is True
            assert result["deleted"] == 0
            assert "disabled" in result["message"].lower()

    @pytest.mark.asyncio
    @patch('app.services.insurance_retention.storage_service')
    async def test_delete_expired_documents_success(
        self, mock_storage: MagicMock, service: InsuranceRetentionService, mock_db: AsyncMock
    ):
        """Test successful document deletion."""
        # Create mock profile
        mock_profile = MagicMock()
        mock_profile.id = 1
        mock_profile.email = "customer@example.com"
        mock_profile.insurance_document_key = "insurance/1/policy.pdf"

        # Mock storage deletion success
        mock_storage.delete_file = AsyncMock(return_value=True)

        with patch.object(service, 'get_retention_settings', new_callable=AsyncMock) as mock_settings:
            mock_settings.return_value = {"retention_days": 365, "auto_delete_enabled": True}

            with patch.object(service, 'get_documents_for_deletion', new_callable=AsyncMock) as mock_docs:
                mock_docs.return_value = [mock_profile]

                with patch.object(service, '_create_deletion_audit_log', new_callable=AsyncMock):
                    result = await service.delete_expired_documents()

                    assert result["success"] is True
                    assert result["deleted"] == 1
                    assert result["errors"] == 0
                    assert mock_profile.insurance_document_key is None
                    mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.services.insurance_retention.storage_service')
    async def test_delete_expired_documents_storage_error(
        self, mock_storage: MagicMock, service: InsuranceRetentionService, mock_db: AsyncMock
    ):
        """Test handling of storage deletion errors."""
        # Create mock profile
        mock_profile = MagicMock()
        mock_profile.id = 1
        mock_profile.email = "customer@example.com"
        mock_profile.insurance_document_key = "insurance/1/policy.pdf"

        # Mock storage deletion failure
        mock_storage.delete_file = AsyncMock(return_value=False)

        with patch.object(service, 'get_retention_settings', new_callable=AsyncMock) as mock_settings:
            mock_settings.return_value = {"retention_days": 365, "auto_delete_enabled": True}

            with patch.object(service, 'get_documents_for_deletion', new_callable=AsyncMock) as mock_docs:
                mock_docs.return_value = [mock_profile]

                result = await service.delete_expired_documents()

                assert result["success"] is False
                assert result["deleted"] == 0
                assert result["errors"] == 1
                assert result["error_details"] is not None

    @pytest.mark.asyncio
    async def test_update_retention_settings(self, service: InsuranceRetentionService, mock_db: AsyncMock):
        """Test updating retention settings."""
        # Mock existing setting
        mock_setting = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_setting
        mock_db.execute.return_value = mock_result

        with patch.object(service, 'get_retention_settings', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"retention_days": 180, "auto_delete_enabled": True}

            result = await service.update_retention_settings(
                retention_days=180,
                updated_by="admin@example.com"
            )

            assert result["retention_days"] == 180
            assert "retention_days" in result["updated_fields"]
            mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_skip_null_document_keys(self, service: InsuranceRetentionService, mock_db: AsyncMock):
        """Test that profiles with null document keys are skipped."""
        # Create mock profile with no document
        mock_profile = MagicMock()
        mock_profile.id = 1
        mock_profile.email = "customer@example.com"
        mock_profile.insurance_document_key = None

        with patch.object(service, 'get_retention_settings', new_callable=AsyncMock) as mock_settings:
            mock_settings.return_value = {"retention_days": 365, "auto_delete_enabled": True}

            with patch.object(service, 'get_documents_for_deletion', new_callable=AsyncMock) as mock_docs:
                mock_docs.return_value = [mock_profile]

                result = await service.delete_expired_documents()

                # Should complete without errors, but nothing deleted
                assert result["deleted"] == 0
