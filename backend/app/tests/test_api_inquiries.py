"""
Weekly Vehicle Leasing Platform - Inquiry API Tests
Salvage-to-Lux Fleet Management

Unit tests for the inquiry API endpoints.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import BackgroundTasks
from fastapi.testclient import TestClient

from app.schemas.inquiry import InquiryCreate


class TestInquiryAPI:
    """Tests for inquiry API endpoints."""

    @pytest.fixture
    def mock_db(self) -> AsyncMock:
        """Create mock database session."""
        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.execute = AsyncMock()
        return db

    @pytest.fixture
    def mock_request(self) -> MagicMock:
        """Create mock request object."""
        request = MagicMock()
        request.client.host = "127.0.0.1"
        request.headers = {"user-agent": "Mozilla/5.0 Test"}
        return request

    @pytest.fixture
    def mock_background_tasks(self) -> MagicMock:
        """Create mock background tasks."""
        return MagicMock(spec=BackgroundTasks)

    @pytest.fixture
    def valid_inquiry_data(self) -> dict:
        """Create valid inquiry data."""
        return {
            "full_name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "(555) 123-4567",
            "preferred_contact": "email",
            "vehicle_type": "suv",
            "timeframe": "this_week",
            "notes": "Looking for a monthly rental."
        }

    @pytest.mark.asyncio
    async def test_create_inquiry_success(
        self,
        mock_db: AsyncMock,
        mock_request: MagicMock,
        mock_background_tasks: MagicMock,
        valid_inquiry_data: dict,
    ):
        """Test successful inquiry creation."""
        from app.api.inquiries import create_inquiry

        # Mock the inquiry object
        mock_inquiry = MagicMock()
        mock_inquiry.id = 1
        mock_inquiry.email = valid_inquiry_data["email"]
        mock_inquiry.full_name = valid_inquiry_data["full_name"]
        mock_inquiry.vehicle_type = MagicMock()
        mock_inquiry.vehicle_type.value = "suv"
        mock_inquiry.timeframe = MagicMock()
        mock_inquiry.timeframe.value = "this_week"

        # Configure refresh to set the ID
        async def mock_refresh(obj):
            obj.id = 1
            obj.email = valid_inquiry_data["email"]
            obj.full_name = valid_inquiry_data["full_name"]

        mock_db.refresh = mock_refresh

        inquiry_data = InquiryCreate(**valid_inquiry_data)

        with patch('app.api.inquiries.email_service'):
            result = await create_inquiry(
                inquiry_data=inquiry_data,
                request=mock_request,
                background_tasks=mock_background_tasks,
                db=mock_db
            )

            assert result.success is True
            assert "Thank you" in result.message
            assert result.inquiry_id is not None

            # Verify background tasks were added
            assert mock_background_tasks.add_task.call_count == 2

    @pytest.mark.asyncio
    async def test_create_inquiry_captures_client_info(
        self,
        mock_db: AsyncMock,
        mock_request: MagicMock,
        mock_background_tasks: MagicMock,
        valid_inquiry_data: dict,
    ):
        """Test that client IP and user agent are captured."""
        from app.api.inquiries import create_inquiry

        inquiry_data = InquiryCreate(**valid_inquiry_data)

        with patch('app.api.inquiries.email_service'):
            await create_inquiry(
                inquiry_data=inquiry_data,
                request=mock_request,
                background_tasks=mock_background_tasks,
                db=mock_db
            )

            # Verify db.add was called with inquiry containing client info
            call_args = mock_db.add.call_args[0][0]
            assert call_args.ip_address == "127.0.0.1"
            assert "Mozilla" in call_args.user_agent

    @pytest.mark.asyncio
    async def test_list_inquiries_pagination(self, mock_db: AsyncMock):
        """Test inquiry list pagination."""
        from app.api.inquiries import list_inquiries

        # Mock query results
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_result.scalar.return_value = 0
        mock_db.execute.return_value = mock_result

        result = await list_inquiries(
            page=1,
            per_page=20,
            status_filter=None,
            db=mock_db
        )

        assert result.page == 1
        assert result.per_page == 20
        assert result.total == 0
        assert result.items == []

    @pytest.mark.asyncio
    async def test_list_inquiries_pagination_bounds(self, mock_db: AsyncMock):
        """Test pagination bounds are enforced."""
        from app.api.inquiries import list_inquiries

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_result.scalar.return_value = 0
        mock_db.execute.return_value = mock_result

        # Test with invalid page
        result = await list_inquiries(
            page=-1,
            per_page=200,  # Exceeds max
            status_filter=None,
            db=mock_db
        )

        assert result.page == 1  # Corrected to 1
        assert result.per_page == 100  # Capped at 100

    @pytest.mark.asyncio
    async def test_get_inquiry_not_found(self, mock_db: AsyncMock):
        """Test getting a non-existent inquiry."""
        from app.api.inquiries import get_inquiry
        from fastapi import HTTPException

        # Mock not found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        with pytest.raises(HTTPException) as exc_info:
            await get_inquiry(inquiry_id=999, db=mock_db)

        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_inquiry_success(self, mock_db: AsyncMock):
        """Test getting an existing inquiry."""
        from app.api.inquiries import get_inquiry
        from datetime import datetime, timezone

        # Create mock inquiry
        mock_inquiry = MagicMock()
        mock_inquiry.id = 1
        mock_inquiry.full_name = "John Doe"
        mock_inquiry.email = "john@example.com"
        mock_inquiry.phone = None
        mock_inquiry.preferred_contact = MagicMock()
        mock_inquiry.preferred_contact.value = "email"
        mock_inquiry.vehicle_type = MagicMock()
        mock_inquiry.vehicle_type.value = "any"
        mock_inquiry.timeframe = MagicMock()
        mock_inquiry.timeframe.value = "just_browsing"
        mock_inquiry.notes = None
        mock_inquiry.status = MagicMock()
        mock_inquiry.status.value = "new"
        mock_inquiry.created_at = datetime.now(timezone.utc)
        mock_inquiry.updated_at = datetime.now(timezone.utc)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_inquiry
        mock_db.execute.return_value = mock_result

        result = await get_inquiry(inquiry_id=1, db=mock_db)

        assert result.id == 1
        assert result.full_name == "John Doe"

    @pytest.mark.asyncio
    async def test_update_inquiry_status_not_found(self, mock_db: AsyncMock):
        """Test updating status of non-existent inquiry."""
        from app.api.inquiries import update_inquiry_status
        from app.models.inquiry import InquiryStatus
        from fastapi import HTTPException

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        with pytest.raises(HTTPException) as exc_info:
            await update_inquiry_status(
                inquiry_id=999,
                new_status=InquiryStatus.CONTACTED,
                db=mock_db
            )

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_update_inquiry_status_success(self, mock_db: AsyncMock):
        """Test successful status update."""
        from app.api.inquiries import update_inquiry_status
        from app.models.inquiry import InquiryStatus
        from datetime import datetime, timezone

        # Create mock inquiry
        mock_inquiry = MagicMock()
        mock_inquiry.id = 1
        mock_inquiry.full_name = "John Doe"
        mock_inquiry.email = "john@example.com"
        mock_inquiry.phone = None
        mock_inquiry.preferred_contact = MagicMock()
        mock_inquiry.preferred_contact.value = "email"
        mock_inquiry.vehicle_type = MagicMock()
        mock_inquiry.vehicle_type.value = "any"
        mock_inquiry.timeframe = MagicMock()
        mock_inquiry.timeframe.value = "just_browsing"
        mock_inquiry.notes = None
        mock_inquiry.status = InquiryStatus.NEW
        mock_inquiry.created_at = datetime.now(timezone.utc)
        mock_inquiry.updated_at = datetime.now(timezone.utc)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_inquiry
        mock_db.execute.return_value = mock_result

        result = await update_inquiry_status(
            inquiry_id=1,
            new_status=InquiryStatus.CONTACTED,
            db=mock_db
        )

        # Verify status was updated
        assert mock_inquiry.status == InquiryStatus.CONTACTED
        mock_db.flush.assert_called_once()
