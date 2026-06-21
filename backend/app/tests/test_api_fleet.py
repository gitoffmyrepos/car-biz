"""
GigWheels - Fleet API Tests
Weekly car rentals for gig drivers

Tests for the public fleet inventory API and admin vehicle-image endpoints.

Uses an in-memory SQLite database with the real models/routers, overrides the
DB and auth dependencies, and mocks the storage service at its boundary only.
"""

from datetime import datetime, timezone
from decimal import Decimal
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.auth import AuthenticatedUser, require_ops
from app.core.database import Base, get_db
from app.main import app
from app.models.vehicle import Vehicle, VehicleCondition, VehicleStatus
from app.models.vehicle_image import VehicleImage

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


def _fake_ops_user() -> AuthenticatedUser:
    return AuthenticatedUser(
        sub="ops-1",
        email="ops@example.com",
        name="Ops User",
        preferred_username="ops",
        roles=["ops"],
        email_verified=True,
        mfa_verified=True,
    )


@pytest_asyncio.fixture
async def session_factory():
    """Create a fresh in-memory SQLite schema per test."""
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest_asyncio.fixture
async def client(session_factory):
    """Async client with DB + auth dependency overrides."""

    async def _override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[require_ops] = _fake_ops_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


def _make_vehicle(**overrides) -> Vehicle:
    defaults = dict(
        vin=overrides.pop("vin", "VIN0000000000000A"),
        make="Honda",
        model="Accord",
        year=2022,
        body_type="sedan",
        transmission="automatic",
        mileage=30000,
        weekly_rate=Decimal("200.00"),
        security_deposit=Decimal("500.00"),
        status=VehicleStatus.AVAILABLE,
        condition=VehicleCondition.GOOD,
        is_active=True,
        show_on_fleet_page=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Vehicle(**defaults)


async def _seed(session_factory, *vehicles) -> None:
    async with session_factory() as session:
        for v in vehicles:
            session.add(v)
        await session.commit()


# ---------------------------------------------------------------------------
# Public fleet listing
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fleet_returns_only_visible_active(client, session_factory):
    """Only is_active AND show_on_fleet_page vehicles are returned."""
    await _seed(
        session_factory,
        _make_vehicle(vin="VIN_VISIBLE_0001A", make="Tesla"),
        _make_vehicle(vin="VIN_HIDDEN_00001B", show_on_fleet_page=False),
        _make_vehicle(vin="VIN_INACTIVE_001C", is_active=False),
    )

    resp = await client.get("/api/public/fleet")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["make"] == "Tesla"
    assert data[0]["weekly_rate"] == "200.00"


@pytest.mark.asyncio
async def test_fleet_body_type_filter(client, session_factory):
    await _seed(
        session_factory,
        _make_vehicle(vin="VIN_SEDAN_00001A", body_type="sedan"),
        _make_vehicle(vin="VIN_SUV_000001B", body_type="suv"),
    )

    resp = await client.get("/api/public/fleet", params={"body_type": "suv"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["body_type"] == "suv"


@pytest.mark.asyncio
async def test_fleet_rate_range_filter(client, session_factory):
    await _seed(
        session_factory,
        _make_vehicle(vin="VIN_CHEAP_00001A", weekly_rate=Decimal("100.00")),
        _make_vehicle(vin="VIN_MID_000001B", weekly_rate=Decimal("250.00")),
        _make_vehicle(vin="VIN_LUX_000001C", weekly_rate=Decimal("500.00")),
    )

    resp = await client.get(
        "/api/public/fleet", params={"min_rate": 150, "max_rate": 300}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["weekly_rate"] == "250.00"


@pytest.mark.asyncio
async def test_fleet_sort_price_asc_and_desc(client, session_factory):
    await _seed(
        session_factory,
        _make_vehicle(vin="VIN_A0000000001A", weekly_rate=Decimal("300.00")),
        _make_vehicle(vin="VIN_B0000000001B", weekly_rate=Decimal("100.00")),
        _make_vehicle(vin="VIN_C0000000001C", weekly_rate=Decimal("200.00")),
    )

    asc = (await client.get("/api/public/fleet", params={"sort": "price_asc"})).json()
    assert [r["weekly_rate"] for r in asc] == ["100.00", "200.00", "300.00"]

    desc = (await client.get("/api/public/fleet", params={"sort": "price_desc"})).json()
    assert [r["weekly_rate"] for r in desc] == ["300.00", "200.00", "100.00"]


@pytest.mark.asyncio
async def test_fleet_sort_year_desc(client, session_factory):
    await _seed(
        session_factory,
        _make_vehicle(vin="VIN_Y2019000001A", year=2019),
        _make_vehicle(vin="VIN_Y2024000001B", year=2024),
        _make_vehicle(vin="VIN_Y2021000001C", year=2021),
    )

    data = (await client.get("/api/public/fleet", params={"sort": "year_desc"})).json()
    assert [r["year"] for r in data] == [2024, 2021, 2019]


# ---------------------------------------------------------------------------
# Public fleet detail + gallery ordering
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fleet_detail_gallery_ordering(client, session_factory, monkeypatch):
    from app.services import storage as storage_module

    monkeypatch.setattr(
        storage_module.storage_service,
        "generate_public_url",
        lambda bucket, key: f"https://cdn.test/{bucket}/{key}",
    )

    async with session_factory() as session:
        vehicle = _make_vehicle(vin="VIN_GALLERY_001A")
        session.add(vehicle)
        await session.flush()
        session.add_all(
            [
                VehicleImage(
                    vehicle_id=vehicle.id,
                    image_key="b.jpg",
                    sort_order=1,
                    is_primary=False,
                ),
                VehicleImage(
                    vehicle_id=vehicle.id,
                    image_key="a.jpg",
                    sort_order=0,
                    is_primary=True,
                ),
                VehicleImage(
                    vehicle_id=vehicle.id,
                    image_key="c.jpg",
                    sort_order=2,
                    is_primary=False,
                ),
            ]
        )
        await session.commit()
        vehicle_id = vehicle.id

    resp = await client.get(f"/api/public/fleet/{vehicle_id}")
    assert resp.status_code == 200
    detail = resp.json()
    # Ordered by sort_order
    assert [img["url"].split("/")[-1] for img in detail["images"]] == [
        "a.jpg",
        "b.jpg",
        "c.jpg",
    ]
    # Primary surfaced at top level
    assert detail["primary_image_url"].endswith("a.jpg")


@pytest.mark.asyncio
async def test_fleet_detail_hidden_returns_404(client, session_factory):
    await _seed(
        session_factory,
        _make_vehicle(vin="VIN_HIDDEN_404_1A", show_on_fleet_page=False),
    )
    # The hidden vehicle is the only one; id 1.
    resp = await client.get("/api/public/fleet/1")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Admin image upload validation
# ---------------------------------------------------------------------------

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _patch_storage_upload(monkeypatch):
    from app.services import storage as storage_module

    svc = storage_module.storage_service
    monkeypatch.setattr(svc, "upload_file", AsyncMock(return_value=True))
    monkeypatch.setattr(svc, "delete_file", AsyncMock(return_value=True))
    monkeypatch.setattr(
        svc,
        "generate_public_url",
        lambda bucket, key: f"https://cdn.test/{bucket}/{key}",
    )
    return svc


@pytest.mark.asyncio
async def test_image_upload_rejects_bad_content_type(
    client, session_factory, monkeypatch
):
    _patch_storage_upload(monkeypatch)
    await _seed(session_factory, _make_vehicle(vin="VIN_UPLOAD_BAD1A"))

    files = {"file": ("evil.txt", BytesIO(b"this is plain text, not an image"), "text/plain")}
    resp = await client.post("/api/admin/vehicles/1/images", files=files)
    assert resp.status_code == 400
    assert "type" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_image_upload_rejects_oversize(client, session_factory, monkeypatch):
    from app.services import storage as storage_module

    _patch_storage_upload(monkeypatch)
    # Shrink the limit so we don't allocate 8MB in the test.
    monkeypatch.setattr(storage_module, "MAX_VEHICLE_IMAGE_SIZE", 10)
    # admin_vehicle_images imported the constant by value; patch its reference too.
    from app.api import admin_vehicle_images as avi

    monkeypatch.setattr(avi, "MAX_VEHICLE_IMAGE_SIZE", 10)

    await _seed(session_factory, _make_vehicle(vin="VIN_UPLOAD_BIG1A"))

    big = PNG_BYTES + b"\x00" * 100
    files = {"file": ("big.png", BytesIO(big), "image/png")}
    resp = await client.post("/api/admin/vehicles/1/images", files=files)
    assert resp.status_code == 400
    assert "large" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_image_upload_accepts_png_and_sets_primary(
    client, session_factory, monkeypatch
):
    _patch_storage_upload(monkeypatch)
    await _seed(session_factory, _make_vehicle(vin="VIN_UPLOAD_OK01A"))

    files = {"file": ("photo.png", BytesIO(PNG_BYTES), "image/png")}
    resp = await client.post("/api/admin/vehicles/1/images", files=files)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["is_primary"] is True
    assert body["sort_order"] == 0
    assert body["url"].startswith("https://cdn.test/")


# ---------------------------------------------------------------------------
# Admin set-primary / delete
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_set_primary_moves_flag(client, session_factory, monkeypatch):
    _patch_storage_upload(monkeypatch)

    async with session_factory() as session:
        vehicle = _make_vehicle(vin="VIN_SETPRIM_01A")
        session.add(vehicle)
        await session.flush()
        img1 = VehicleImage(
            vehicle_id=vehicle.id, image_key="one.jpg", sort_order=0, is_primary=True
        )
        img2 = VehicleImage(
            vehicle_id=vehicle.id, image_key="two.jpg", sort_order=1, is_primary=False
        )
        session.add_all([img1, img2])
        await session.commit()
        vehicle_id, img2_id = vehicle.id, img2.id

    resp = await client.patch(
        f"/api/admin/vehicles/{vehicle_id}/images/{img2_id}",
        json={"is_primary": True},
    )
    assert resp.status_code == 200
    assert resp.json()["is_primary"] is True

    # Verify the other image lost primary and vehicle.image_key updated.
    async with session_factory() as session:
        from sqlalchemy import select

        rows = (
            (
                await session.execute(
                    select(VehicleImage).where(
                        VehicleImage.vehicle_id == vehicle_id
                    )
                )
            )
            .scalars()
            .all()
        )
        primaries = [r.image_key for r in rows if r.is_primary]
        assert primaries == ["two.jpg"]

        veh = (
            await session.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
        ).scalar_one()
        assert veh.image_key == "two.jpg"


@pytest.mark.asyncio
async def test_delete_image_removes_row_and_object(client, session_factory, monkeypatch):
    svc = _patch_storage_upload(monkeypatch)

    async with session_factory() as session:
        vehicle = _make_vehicle(vin="VIN_DELIMG_001A")
        session.add(vehicle)
        await session.flush()
        img1 = VehicleImage(
            vehicle_id=vehicle.id, image_key="keep.jpg", sort_order=0, is_primary=False
        )
        img2 = VehicleImage(
            vehicle_id=vehicle.id, image_key="gone.jpg", sort_order=1, is_primary=True
        )
        session.add_all([img1, img2])
        await session.commit()
        vehicle_id, img2_id = vehicle.id, img2.id

    resp = await client.delete(f"/api/admin/vehicles/{vehicle_id}/images/{img2_id}")
    assert resp.status_code == 204

    # Object delete was attempted at the boundary.
    svc.delete_file.assert_awaited()

    async with session_factory() as session:
        from sqlalchemy import select

        rows = (
            (
                await session.execute(
                    select(VehicleImage).where(
                        VehicleImage.vehicle_id == vehicle_id
                    )
                )
            )
            .scalars()
            .all()
        )
        assert [r.image_key for r in rows] == ["keep.jpg"]
        # Primary was promoted to the remaining image.
        assert rows[0].is_primary is True
