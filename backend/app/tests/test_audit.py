"""
Weekly Vehicle Leasing Platform - Audit Service Tests
Salvage-to-Lux Fleet Management

Unit tests for the audit logging service.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.audit import AuditService
from app.models.audit_log import AuditAction


class MockUser:
    """Mock authenticated user for testing."""

    def __init__(
        self,
        sub: str = "user-123",
        email: str = "user@example.com",
        is_admin: bool = False,
        is_ops: bool = False,
    ):
        self.sub = sub
        self.email = email
        self.is_admin = is_admin
        self.is_ops = is_ops


class TestAuditService:
    """Tests for AuditService."""

    @pytest.fixture
    def audit_service(self) -> AuditService:
        """Create audit service instance."""
        return AuditService()

    @pytest.fixture
    def mock_session(self) -> AsyncMock:
        """Create mock database session."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        return session

    @pytest.mark.asyncio
    async def test_log_action_basic(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test basic audit log creation."""
        user = MockUser(
            sub="admin-1",
            email="admin@example.com",
            is_admin=True
        )

        result = await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.CUSTOMER_CREATE,
            target_type="customer_profile",
            target_id="123",
            target_description="Customer John Doe",
        )

        # Verify add was called
        mock_session.add.assert_called_once()
        mock_session.flush.assert_called_once()

        # Check the audit entry
        call_args = mock_session.add.call_args[0][0]
        assert call_args.actor_id == "admin-1"
        assert call_args.actor_email == "admin@example.com"
        assert call_args.actor_role == "admin"
        assert call_args.action == AuditAction.CUSTOMER_CREATE
        assert call_args.target_type == "customer_profile"
        assert call_args.target_id == "123"

    @pytest.mark.asyncio
    async def test_log_action_with_state_changes(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test audit log with before/after state."""
        user = MockUser(is_admin=True)

        before = {"status": "pending", "amount": 100.00}
        after = {"status": "paid", "amount": 100.00}

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.PAYMENT_UPDATE,
            target_type="payment",
            target_id="456",
            before_state=before,
            after_state=after,
        )

        call_args = mock_session.add.call_args[0][0]
        assert call_args.before_state == before
        assert call_args.after_state == after

    @pytest.mark.asyncio
    async def test_log_action_customer_role(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test audit log with customer role."""
        user = MockUser(
            sub="customer-1",
            email="customer@example.com",
            is_admin=False,
            is_ops=False,
        )

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.CUSTOMER_VIEW,
            target_type="profile",
            target_id="self",
        )

        call_args = mock_session.add.call_args[0][0]
        assert call_args.actor_role == "customer"

    @pytest.mark.asyncio
    async def test_log_action_ops_role(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test audit log with ops role."""
        user = MockUser(
            sub="ops-1",
            email="ops@example.com",
            is_admin=False,
            is_ops=True,
        )

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.VEHICLE_UPDATE,
            target_type="vehicle",
            target_id="789",
        )

        call_args = mock_session.add.call_args[0][0]
        assert call_args.actor_role == "ops"

    @pytest.mark.asyncio
    async def test_log_action_with_reason(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test audit log with reason for sensitive action."""
        user = MockUser(is_admin=True)

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.CUSTOMER_DELETE,
            target_type="customer_profile",
            target_id="123",
            reason="Customer requested account deletion",
            requires_reason=True,
        )

        call_args = mock_session.add.call_args[0][0]
        assert call_args.reason == "Customer requested account deletion"
        assert call_args.requires_reason is True

    @pytest.mark.asyncio
    async def test_log_action_with_request_metadata(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test audit log with request metadata."""
        user = MockUser(is_admin=True)

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.INSURANCE_DOCUMENT_VIEW,
            target_type="insurance_document",
            target_id="doc-123",
            request_id="req-abc-123",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
        )

        call_args = mock_session.add.call_args[0][0]
        assert call_args.request_id == "req-abc-123"
        assert call_args.ip_address == "192.168.1.100"
        assert call_args.user_agent == "Mozilla/5.0"

    @pytest.mark.asyncio
    async def test_log_action_failure(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test audit log for failed action."""
        user = MockUser(is_admin=True)

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.PAYMENT_CREATE,
            target_type="payment",
            target_id="pay-123",
            success=False,
            error_message="Payment gateway timeout",
        )

        call_args = mock_session.add.call_args[0][0]
        assert call_args.success is False
        assert call_args.error_message == "Payment gateway timeout"

    @pytest.mark.asyncio
    async def test_log_action_timestamp(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test that timestamp is set correctly."""
        user = MockUser(is_admin=True)
        before = datetime.now(timezone.utc)

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.INVOICE_CREATE,
            target_type="invoice",
            target_id="inv-123",
        )

        after = datetime.now(timezone.utc)
        call_args = mock_session.add.call_args[0][0]

        assert call_args.timestamp >= before
        assert call_args.timestamp <= after

    @pytest.mark.asyncio
    async def test_log_action_with_notes(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test audit log with additional notes."""
        user = MockUser(is_admin=True)

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.CUSTOMER_UPDATE,
            target_type="customer_profile",
            target_id="123",
            notes="Updated per customer phone request",
        )

        call_args = mock_session.add.call_args[0][0]
        assert call_args.notes == "Updated per customer phone request"

    @pytest.mark.asyncio
    async def test_log_action_target_id_converted_to_string(self, audit_service: AuditService, mock_session: AsyncMock):
        """Test that target_id is converted to string."""
        user = MockUser(is_admin=True)

        await audit_service.log_action(
            session=mock_session,
            user=user,
            action=AuditAction.VEHICLE_VIEW,
            target_type="vehicle",
            target_id=123,  # Integer
        )

        call_args = mock_session.add.call_args[0][0]
        assert call_args.target_id == "123"
        assert isinstance(call_args.target_id, str)
