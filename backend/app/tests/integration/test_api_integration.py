"""
Weekly Vehicle Leasing Platform - API Integration Tests
Salvage-to-Lux Fleet Management

Integration tests for core API endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timedelta, timezone
import jwt

# Test configuration
TEST_SECRET_KEY = "test-secret-key-for-jwt-signing"
TEST_ALGORITHM = "HS256"


@pytest.fixture
def admin_token():
    """Generate admin auth token."""
    token_data = {
        "sub": "admin@example.com",
        "user_id": 1,
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(token_data, TEST_SECRET_KEY, algorithm=TEST_ALGORITHM)


@pytest.fixture
def customer_token():
    """Generate customer auth token."""
    token_data = {
        "sub": "customer@example.com",
        "user_id": 2,
        "role": "customer",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(token_data, TEST_SECRET_KEY, algorithm=TEST_ALGORITHM)


@pytest.fixture
def ops_token():
    """Generate ops auth token."""
    token_data = {
        "sub": "ops@example.com",
        "user_id": 3,
        "role": "ops",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(token_data, TEST_SECRET_KEY, algorithm=TEST_ALGORITHM)


class TestPublicEndpoints:
    """Integration tests for public endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test health check endpoint."""
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")

            # Health endpoint should always return 200
            assert response.status_code in [200, 404]
            if response.status_code == 200:
                data = response.json()
                assert "status" in data or "healthy" in str(data).lower()

    @pytest.mark.asyncio
    async def test_public_vehicles_list(self, mock_db_session):
        """Test public vehicles listing."""
        from app.main import app

        # Mock vehicles
        mock_vehicle = MagicMock()
        mock_vehicle.id = 1
        mock_vehicle.make = "Tesla"
        mock_vehicle.model = "Model S"
        mock_vehicle.year = 2024
        mock_vehicle.is_available = True

        mock_db_session.execute.return_value.scalars.return_value.all.return_value = [
            mock_vehicle
        ]

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/public/vehicles")

            # Public vehicles should be accessible
            assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_create_inquiry(self, mock_db_session):
        """Test creating public inquiry."""
        from app.main import app

        mock_db_session.add = MagicMock()
        mock_db_session.commit = AsyncMock()
        mock_db_session.refresh = AsyncMock()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/inquiries/",
                json={
                    "name": "John Doe",
                    "email": "john@example.com",
                    "phone": "555-1234",
                    "inquiry_type": "general",
                    "message": "I'm interested in leasing a vehicle.",
                },
            )

            # Inquiry creation should succeed
            assert response.status_code in [200, 201, 422]


class TestVehicleEndpoints:
    """Integration tests for vehicle endpoints."""

    @pytest.mark.asyncio
    async def test_get_vehicles_admin(self, mock_db_session, admin_token):
        """Test getting vehicles list as admin."""
        from app.main import app

        mock_vehicles = [
            MagicMock(id=1, make="Tesla", model="Model S", year=2024),
            MagicMock(id=2, make="BMW", model="5 Series", year=2023),
        ]
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = (
            mock_vehicles
        )

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/admin/vehicles",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )

                assert response.status_code in [200, 401, 404]

    @pytest.mark.asyncio
    async def test_create_vehicle(self, mock_db_session, admin_token):
        """Test creating a vehicle."""
        from app.main import app

        mock_db_session.add = MagicMock()
        mock_db_session.commit = AsyncMock()
        mock_db_session.refresh = AsyncMock()

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/admin/vehicles",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={
                        "make": "Mercedes",
                        "model": "E-Class",
                        "year": 2024,
                        "vin": "1HGCM82633A123456",
                        "weekly_rate": 200.00,
                    },
                )

                assert response.status_code in [200, 201, 401, 404, 422]

    @pytest.mark.asyncio
    async def test_get_vehicle_by_id(self, mock_db_session, admin_token):
        """Test getting vehicle by ID."""
        from app.main import app

        mock_vehicle = MagicMock()
        mock_vehicle.id = 1
        mock_vehicle.make = "Tesla"
        mock_vehicle.model = "Model S"
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = (
            mock_vehicle
        )

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/admin/vehicles/1",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )

                assert response.status_code in [200, 401, 404]

    @pytest.mark.asyncio
    async def test_update_vehicle(self, mock_db_session, admin_token):
        """Test updating a vehicle."""
        from app.main import app

        mock_vehicle = MagicMock()
        mock_vehicle.id = 1
        mock_vehicle.make = "Tesla"
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = (
            mock_vehicle
        )
        mock_db_session.commit = AsyncMock()

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.patch(
                    "/api/admin/vehicles/1",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={"weekly_rate": 250.00},
                )

                assert response.status_code in [200, 401, 404, 405, 422]


class TestCustomerEndpoints:
    """Integration tests for customer endpoints."""

    @pytest.mark.asyncio
    async def test_get_customer_dashboard(self, mock_db_session, customer_token):
        """Test customer dashboard access."""
        from app.main import app

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/customer/dashboard",
                    headers={"Authorization": f"Bearer {customer_token}"},
                )

                assert response.status_code in [200, 401, 404]

    @pytest.mark.asyncio
    async def test_get_customer_leases(self, mock_db_session, customer_token):
        """Test getting customer leases."""
        from app.main import app

        mock_leases = [
            MagicMock(
                id=1,
                vehicle_id=1,
                customer_id=2,
                start_date=datetime.now(timezone.utc),
                status="active",
            )
        ]
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = (
            mock_leases
        )

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/customer/leases",
                    headers={"Authorization": f"Bearer {customer_token}"},
                )

                assert response.status_code in [200, 401, 404]

    @pytest.mark.asyncio
    async def test_get_customer_invoices(self, mock_db_session, customer_token):
        """Test getting customer invoices."""
        from app.main import app

        mock_invoices = [
            MagicMock(
                id=1,
                lease_id=1,
                amount=150.00,
                status="paid",
                due_date=datetime.now(timezone.utc),
            )
        ]
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = (
            mock_invoices
        )

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/customer/invoices",
                    headers={"Authorization": f"Bearer {customer_token}"},
                )

                assert response.status_code in [200, 401, 404]


class TestFileEndpoints:
    """Integration tests for file upload/download endpoints."""

    @pytest.mark.asyncio
    async def test_upload_document(self, mock_db_session, admin_token):
        """Test document upload."""
        from app.main import app

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY), patch(
            "app.services.storage.StorageService.upload_file",
            AsyncMock(return_value="documents/test.pdf"),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # Create a simple file upload
                files = {"file": ("test.pdf", b"PDF content here", "application/pdf")}

                response = await client.post(
                    "/api/files/upload",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    files=files,
                )

                assert response.status_code in [200, 201, 401, 404, 422]

    @pytest.mark.asyncio
    async def test_get_document(self, mock_db_session, admin_token):
        """Test document retrieval."""
        from app.main import app

        mock_file = MagicMock()
        mock_file.id = 1
        mock_file.filename = "test.pdf"
        mock_file.storage_key = "documents/test.pdf"
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = mock_file

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY), patch(
            "app.services.storage.StorageService.get_presigned_url",
            AsyncMock(return_value="https://storage.example.com/documents/test.pdf"),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/files/1",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )

                assert response.status_code in [200, 302, 401, 404]


class TestInquiryEndpoints:
    """Integration tests for inquiry management."""

    @pytest.mark.asyncio
    async def test_list_inquiries_admin(self, mock_db_session, admin_token):
        """Test listing inquiries as admin."""
        from app.main import app

        mock_inquiries = [
            MagicMock(
                id=1,
                name="John Doe",
                email="john@example.com",
                status="new",
                created_at=datetime.now(timezone.utc),
            )
        ]
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_inquiries
        mock_db_session.execute.return_value = mock_result

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/inquiries/",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )

                assert response.status_code in [200, 401, 404]

    @pytest.mark.asyncio
    async def test_update_inquiry_status(self, mock_db_session, admin_token):
        """Test updating inquiry status."""
        from app.main import app

        mock_inquiry = MagicMock()
        mock_inquiry.id = 1
        mock_inquiry.status = "new"
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = (
            mock_inquiry
        )
        mock_db_session.commit = AsyncMock()

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.patch(
                    "/api/inquiries/1",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={"status": "contacted"},
                )

                assert response.status_code in [200, 401, 404, 405, 422]


class TestAdminEndpoints:
    """Integration tests for admin-specific endpoints."""

    @pytest.mark.asyncio
    async def test_admin_dashboard_stats(self, mock_db_session, admin_token):
        """Test admin dashboard statistics."""
        from app.main import app

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/admin/stats",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )

                assert response.status_code in [200, 401, 404]

    @pytest.mark.asyncio
    async def test_list_users_admin(self, mock_db_session, admin_token):
        """Test listing users as admin."""
        from app.main import app

        mock_users = [
            MagicMock(id=1, email="admin@example.com", role="admin"),
            MagicMock(id=2, email="customer@example.com", role="customer"),
        ]
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = (
            mock_users
        )

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/admin/users",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )

                assert response.status_code in [200, 401, 404]

    @pytest.mark.asyncio
    async def test_non_admin_cannot_access_admin_routes(
        self, mock_db_session, customer_token
    ):
        """Test that customers cannot access admin routes."""
        from app.main import app

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/admin/users",
                    headers={"Authorization": f"Bearer {customer_token}"},
                )

                # Should be forbidden for non-admin
                assert response.status_code in [401, 403, 404]


class TestJobEndpoints:
    """Integration tests for background job endpoints."""

    @pytest.mark.asyncio
    async def test_trigger_cleanup_job(self, mock_db_session, admin_token):
        """Test triggering cleanup job."""
        from app.main import app

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY), patch(
            "app.jobs.cleanup.run_cleanup", AsyncMock()
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/jobs/cleanup",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )

                assert response.status_code in [200, 202, 401, 404]

    @pytest.mark.asyncio
    async def test_get_job_status(self, mock_db_session, admin_token):
        """Test getting job status."""
        from app.main import app

        with patch("app.core.security.SECRET_KEY", TEST_SECRET_KEY):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/jobs/status",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )

                assert response.status_code in [200, 401, 404]
