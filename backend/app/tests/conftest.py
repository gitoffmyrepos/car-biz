"""
GigWheels - Test Configuration
Weekly car rentals for gig drivers

Pytest fixtures and configuration for backend tests.
"""

import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Test database URL (in-memory SQLite for fast tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_db_session() -> AsyncMock:
    """Create a mock database session for unit tests."""
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.add = MagicMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def mock_storage_service() -> MagicMock:
    """Create a mock storage service."""
    storage = MagicMock()
    storage.delete_file = AsyncMock(return_value=True)
    storage.upload_file = AsyncMock(return_value="uploads/test-key.pdf")
    storage.get_signed_url = AsyncMock(return_value="https://example.com/signed-url")
    return storage


@pytest.fixture
def mock_email_service() -> MagicMock:
    """Create a mock email service."""
    email = MagicMock()
    email.send_email = AsyncMock(return_value=True)
    email.send_invoice_email = AsyncMock(return_value=True)
    email.send_payment_reminder = AsyncMock(return_value=True)
    return email


@pytest.fixture
def mock_vault_service() -> MagicMock:
    """Create a mock vault service."""
    vault = MagicMock()
    vault.encrypt = MagicMock(return_value="encrypted_data")
    vault.decrypt = MagicMock(return_value="decrypted_data")
    vault.get_secret = MagicMock(return_value={"key": "value"})
    vault.put_secret = MagicMock(return_value=True)
    return vault


@pytest.fixture
def sample_customer_profile() -> dict:
    """Create a sample customer profile for testing."""
    return {
        "id": 1,
        "email": "customer@example.com",
        "full_name": "John Doe",
        "phone": "+15551234567",
        "address_line1": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zip_code": "90210",
        "insurance_document_key": "insurance/customer-1/policy.pdf",
        "insurance_expiration_date": datetime(2024, 1, 1, tzinfo=timezone.utc),
        "insurance_status": "expired",
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def sample_vehicle() -> dict:
    """Create a sample vehicle for testing."""
    return {
        "id": 1,
        "vin": "1HGBH41JXMN109186",
        "make": "Honda",
        "model": "Accord",
        "year": 2023,
        "color": "Silver",
        "license_plate": "ABC123",
        "mileage": 15000,
        "weekly_rate": 150.00,
        "status": "available",
        "condition": "excellent",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def sample_invoice() -> dict:
    """Create a sample invoice for testing."""
    return {
        "id": 1,
        "customer_id": 1,
        "vehicle_id": 1,
        "invoice_number": "INV-2024-0001",
        "amount": 150.00,
        "tax": 12.38,
        "total": 162.38,
        "status": "pending",
        "due_date": datetime(2024, 1, 15, tzinfo=timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def sample_inquiry() -> dict:
    """Create a sample inquiry for testing."""
    return {
        "full_name": "Jane Smith",
        "email": "jane.smith@example.com",
        "phone": "(555) 987-6543",
        "preferred_contact": "email",
        "vehicle_type": "suv",
        "timeframe": "this_week",
        "notes": "Looking for a luxury SUV for a month.",
    }


@pytest.fixture
def sample_audit_log() -> dict:
    """Create a sample audit log entry for testing."""
    return {
        "id": 1,
        "actor_id": "admin-1",
        "actor_email": "admin@example.com",
        "actor_role": "admin",
        "action": "customer_update",
        "target_type": "customer",
        "target_id": "1",
        "target_description": "Customer John Doe",
        "before_state": {"status": "pending"},
        "after_state": {"status": "active"},
        "reason": "Verified customer identity",
        "ip_address": "192.168.1.1",
        "timestamp": datetime.now(timezone.utc),
    }
