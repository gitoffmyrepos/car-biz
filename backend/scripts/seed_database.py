#!/usr/bin/env python3
"""
Weekly Vehicle Leasing Platform - Database Seeding Script
Salvage-to-Lux Fleet Management

Creates realistic test data for development and testing.
This script is idempotent - safe to run multiple times.

Usage:
    python scripts/seed_database.py [--clear]

Options:
    --clear     Clear all seeded data before reseeding
"""

import asyncio
import argparse
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models import (
    CustomerProfile,
    InsuranceStatus,
    Vehicle,
    VehicleStatus,
    VehicleCondition,
    Lease,
    LeaseStatus,
    TrackerDevice,
    TrackerStatus,
    WeeklyInvoice,
    InvoiceStatus,
    DelinquencyCase,
    Notification,
    NotificationType,
    NotificationPriority,
    AuditLog,
    AuditAction,
    Inquiry,
    InquiryStatus,
    PreferredContactMethod,
    Timeframe,
    VehicleType,
    MaintenanceSchedule,
    VehicleConditionReport,
)


# =============================================================================
# SEED DATA CONSTANTS
# =============================================================================

# Prefix for seeded data to enable easy identification and cleanup
SEED_PREFIX = "SEED-"

# For VINs, we use a special marker at the end (VINs must be exactly 17 chars)
# Format: TST + 14 characters (TST = Test Seed)
VIN_PREFIX = "TST"

# Test Keycloak IDs (these should match your test Keycloak users)
ADMIN_KEYCLOAK_ID = "test-admin-001"
CUSTOMER_KEYCLOAK_IDS = [
    "test-customer-001",
    "test-customer-002",
    "test-customer-003",
    "test-customer-004",
    "test-customer-005",
]


# =============================================================================
# CUSTOMER PROFILES
# =============================================================================

CUSTOMER_PROFILES = [
    {
        "keycloak_id": "test-customer-001",
        "email": "john.doe@example.com",
        "full_name": "John Doe",
        "phone": "+1 (555) 123-4567",
        "address_line1": "123 Main Street",
        "address_line2": "Apt 4B",
        "city": "Los Angeles",
        "state": "CA",
        "zip_code": "90001",
        "drivers_license_number": "D1234567",
        "drivers_license_state": "CA",
        "insurance_status": InsuranceStatus.APPROVED,
        "is_verified": True,
        "gps_consent": True,
    },
    {
        "keycloak_id": "test-customer-002",
        "email": "jane.smith@example.com",
        "full_name": "Jane Smith",
        "phone": "+1 (555) 234-5678",
        "address_line1": "456 Oak Avenue",
        "city": "San Diego",
        "state": "CA",
        "zip_code": "92101",
        "drivers_license_number": "D2345678",
        "drivers_license_state": "CA",
        "insurance_status": InsuranceStatus.APPROVED,
        "is_verified": True,
        "gps_consent": True,
    },
    {
        "keycloak_id": "test-customer-003",
        "email": "bob.wilson@example.com",
        "full_name": "Bob Wilson",
        "phone": "+1 (555) 345-6789",
        "address_line1": "789 Pine Drive",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94102",
        "insurance_status": InsuranceStatus.PENDING,
        "is_verified": False,
        "gps_consent": False,
    },
    {
        "keycloak_id": "test-customer-004",
        "email": "alice.johnson@example.com",
        "full_name": "Alice Johnson",
        "phone": "+1 (555) 456-7890",
        "address_line1": "321 Elm Boulevard",
        "city": "Sacramento",
        "state": "CA",
        "zip_code": "95814",
        "drivers_license_number": "D4567890",
        "drivers_license_state": "CA",
        "insurance_status": InsuranceStatus.APPROVED,
        "is_verified": True,
        "gps_consent": True,
    },
    {
        "keycloak_id": "test-customer-005",
        "email": "charlie.brown@example.com",
        "full_name": "Charlie Brown",
        "phone": "+1 (555) 567-8901",
        "address_line1": "654 Maple Court",
        "city": "Oakland",
        "state": "CA",
        "zip_code": "94601",
        "insurance_status": InsuranceStatus.REJECTED,
        "is_verified": False,
        "gps_consent": True,
    },
]


# =============================================================================
# VEHICLES
# =============================================================================

VEHICLES = [
    {
        "vin": "TSTBH41JXMN109186",  # 17 chars: TST + 14 unique
        "license_plate": "SEED001",
        "make": "Honda",
        "model": "Accord",
        "year": 2023,
        "color": "Midnight Blue",
        "body_type": "sedan",
        "engine": "1.5L Turbo 4-Cylinder",
        "transmission": "CVT",
        "mileage": 15000,
        "weekly_rate": Decimal("175.00"),
        "security_deposit": Decimal("500.00"),
        "status": VehicleStatus.LEASED,
        "condition": VehicleCondition.EXCELLENT,
        "acquisition_source": "Copart",
        "acquisition_cost": Decimal("12500.00"),
        "repair_cost": Decimal("3200.00"),
        "show_on_fleet_page": True,
    },
    {
        "vin": "TSTDK4KC7DBA12345",  # 17 chars
        "license_plate": "SEED002",
        "make": "Ford",
        "model": "Edge",
        "year": 2022,
        "color": "Obsidian Black",
        "body_type": "suv",
        "engine": "2.0L EcoBoost I-4",
        "transmission": "8-Speed Automatic",
        "mileage": 28000,
        "weekly_rate": Decimal("225.00"),
        "security_deposit": Decimal("750.00"),
        "status": VehicleStatus.LEASED,
        "condition": VehicleCondition.GOOD,
        "acquisition_source": "IAAI",
        "acquisition_cost": Decimal("18900.00"),
        "repair_cost": Decimal("4100.00"),
        "show_on_fleet_page": True,
    },
    {
        "vin": "TSTDX7AJ0DM098765",  # 17 chars
        "license_plate": "SEED003",
        "make": "Volkswagen",
        "model": "Jetta",
        "year": 2023,
        "color": "Pearl White",
        "body_type": "sedan",
        "engine": "1.4L TSI",
        "transmission": "8-Speed Automatic",
        "mileage": 8500,
        "weekly_rate": Decimal("165.00"),
        "security_deposit": Decimal("450.00"),
        "status": VehicleStatus.AVAILABLE,
        "condition": VehicleCondition.EXCELLENT,
        "acquisition_source": "Copart",
        "acquisition_cost": Decimal("11200.00"),
        "repair_cost": Decimal("2800.00"),
        "show_on_fleet_page": True,
    },
    {
        "vin": "TSTBF1FK5GU543210",  # 17 chars
        "license_plate": "SEED004",
        "make": "Toyota",
        "model": "Camry",
        "year": 2022,
        "color": "Celestial Silver",
        "body_type": "sedan",
        "engine": "2.5L 4-Cylinder",
        "transmission": "8-Speed Automatic",
        "mileage": 35000,
        "weekly_rate": Decimal("185.00"),
        "security_deposit": Decimal("550.00"),
        "status": VehicleStatus.MAINTENANCE,
        "condition": VehicleCondition.FAIR,
        "acquisition_source": "IAAI",
        "acquisition_cost": Decimal("14500.00"),
        "repair_cost": Decimal("5500.00"),
        "show_on_fleet_page": False,
        "notes": "In shop for brake replacement",
    },
    {
        "vin": "TSTZU3LB5NG234567",  # 17 chars
        "license_plate": "SEED005",
        "make": "Hyundai",
        "model": "Tucson",
        "year": 2023,
        "color": "Amazon Gray",
        "body_type": "suv",
        "engine": "2.5L GDI",
        "transmission": "8-Speed Automatic",
        "mileage": 12000,
        "weekly_rate": Decimal("210.00"),
        "security_deposit": Decimal("650.00"),
        "status": VehicleStatus.AVAILABLE,
        "condition": VehicleCondition.EXCELLENT,
        "acquisition_source": "Copart",
        "acquisition_cost": Decimal("19800.00"),
        "repair_cost": Decimal("3900.00"),
        "show_on_fleet_page": True,
    },
    {
        "vin": "TSTBL4BV5NC876543",  # 17 chars
        "license_plate": "SEED006",
        "make": "Nissan",
        "model": "Altima",
        "year": 2022,
        "color": "Gun Metallic",
        "body_type": "sedan",
        "engine": "2.5L 4-Cylinder",
        "transmission": "CVT",
        "mileage": 22000,
        "weekly_rate": Decimal("155.00"),
        "security_deposit": Decimal("400.00"),
        "status": VehicleStatus.LEASED,
        "condition": VehicleCondition.GOOD,
        "acquisition_source": "IAAI",
        "acquisition_cost": Decimal("10500.00"),
        "repair_cost": Decimal("2400.00"),
        "show_on_fleet_page": True,
    },
    {
        "vin": "TSTAXUEV7NL111222",  # 17 chars
        "license_plate": "SEED007",
        "make": "Chevrolet",
        "model": "Equinox",
        "year": 2023,
        "color": "Summit White",
        "body_type": "suv",
        "engine": "1.5L Turbo",
        "transmission": "6-Speed Automatic",
        "mileage": 5000,
        "weekly_rate": Decimal("195.00"),
        "security_deposit": Decimal("600.00"),
        "status": VehicleStatus.AVAILABLE,
        "condition": VehicleCondition.EXCELLENT,
        "acquisition_source": "Copart",
        "acquisition_cost": Decimal("16200.00"),
        "repair_cost": Decimal("2100.00"),
        "show_on_fleet_page": True,
    },
    {
        "vin": "TSTENAF44KN333444",  # 17 chars
        "license_plate": "SEED008",
        "make": "Audi",
        "model": "A4",
        "year": 2021,
        "color": "Brilliant Black",
        "body_type": "sedan",
        "engine": "2.0L TFSI",
        "transmission": "7-Speed S tronic",
        "mileage": 42000,
        "weekly_rate": Decimal("275.00"),
        "security_deposit": Decimal("1000.00"),
        "status": VehicleStatus.PENDING_INSPECTION,
        "condition": VehicleCondition.GOOD,
        "acquisition_source": "Copart",
        "acquisition_cost": Decimal("22500.00"),
        "repair_cost": Decimal("6800.00"),
        "show_on_fleet_page": False,
        "notes": "Awaiting final inspection after engine work",
    },
]


# =============================================================================
# TRACKER DEVICES
# =============================================================================

TRACKERS = [
    {
        "device_id": f"{SEED_PREFIX}TRK-001",
        "serial_number": f"{SEED_PREFIX}SN-2024-001",
        "model": "Teltonika FMC130",
        "manufacturer": "Teltonika",
        "firmware_version": "03.27.09.Rev.00",
        "sim_number": "8901260012345678901",
        "sim_carrier": "T-Mobile",
        "imei": "352099001761481",
        "provider_name": "GPS Trackit",
        "status": TrackerStatus.ASSIGNED,
    },
    {
        "device_id": f"{SEED_PREFIX}TRK-002",
        "serial_number": f"{SEED_PREFIX}SN-2024-002",
        "model": "Teltonika FMC130",
        "manufacturer": "Teltonika",
        "firmware_version": "03.27.09.Rev.00",
        "sim_number": "8901260012345678902",
        "sim_carrier": "T-Mobile",
        "imei": "352099001761482",
        "provider_name": "GPS Trackit",
        "status": TrackerStatus.ASSIGNED,
    },
    {
        "device_id": f"{SEED_PREFIX}TRK-003",
        "serial_number": f"{SEED_PREFIX}SN-2024-003",
        "model": "Teltonika FMC130",
        "manufacturer": "Teltonika",
        "firmware_version": "03.27.09.Rev.00",
        "sim_number": "8901260012345678903",
        "sim_carrier": "Verizon",
        "imei": "352099001761483",
        "provider_name": "GPS Trackit",
        "status": TrackerStatus.AVAILABLE,
    },
    {
        "device_id": f"{SEED_PREFIX}TRK-004",
        "serial_number": f"{SEED_PREFIX}SN-2024-004",
        "model": "Queclink GV55",
        "manufacturer": "Queclink",
        "firmware_version": "12.00.01",
        "sim_number": "8901260012345678904",
        "sim_carrier": "AT&T",
        "imei": "352099001761484",
        "provider_name": "GPS Trackit",
        "status": TrackerStatus.AVAILABLE,
    },
    {
        "device_id": f"{SEED_PREFIX}TRK-005",
        "serial_number": f"{SEED_PREFIX}SN-2024-005",
        "model": "Queclink GV55",
        "manufacturer": "Queclink",
        "firmware_version": "12.00.01",
        "sim_number": "8901260012345678905",
        "sim_carrier": "AT&T",
        "imei": "352099001761485",
        "provider_name": "GPS Trackit",
        "status": TrackerStatus.ASSIGNED,
    },
    {
        "device_id": f"{SEED_PREFIX}TRK-006",
        "serial_number": f"{SEED_PREFIX}SN-2024-006",
        "model": "Teltonika FMC130",
        "manufacturer": "Teltonika",
        "firmware_version": "03.27.09.Rev.00",
        "sim_number": "8901260012345678906",
        "sim_carrier": "Verizon",
        "imei": "352099001761486",
        "provider_name": "GPS Trackit",
        "status": TrackerStatus.MAINTENANCE,
        "notes": "Battery replacement needed",
    },
]


# =============================================================================
# INQUIRIES
# =============================================================================

INQUIRIES = [
    {
        "full_name": "Michael Chen",
        "email": "michael.chen@example.com",
        "phone": "+1 (555) 678-9012",
        "preferred_contact": PreferredContactMethod.EMAIL,
        "vehicle_type": VehicleType.SEDAN,
        "timeframe": Timeframe.THIS_WEEK,
        "notes": "Looking for a reliable sedan for daily commute. Prefer something fuel-efficient.",
        "status": InquiryStatus.NEW,
    },
    {
        "full_name": "Sarah Davis",
        "email": "sarah.davis@example.com",
        "phone": "+1 (555) 789-0123",
        "preferred_contact": PreferredContactMethod.PHONE,
        "vehicle_type": VehicleType.SUV,
        "timeframe": Timeframe.THIS_MONTH,
        "notes": "Family of 4, need an SUV with good cargo space. Budget around $200/week.",
        "status": InquiryStatus.CONTACTED,
    },
    {
        "full_name": "David Martinez",
        "email": "david.martinez@example.com",
        "phone": "+1 (555) 890-1234",
        "preferred_contact": PreferredContactMethod.EITHER,
        "vehicle_type": VehicleType.LUXURY,
        "timeframe": Timeframe.JUST_BROWSING,
        "notes": "Interested in premium vehicles. Would like to test drive an Audi or BMW if available.",
        "status": InquiryStatus.NEW,
    },
]


# =============================================================================
# SEEDING FUNCTIONS
# =============================================================================

async def clear_seed_data(session: AsyncSession) -> None:
    """Clear all seeded data from the database."""
    print("\n=== Clearing existing seed data ===")

    # Clear in reverse dependency order
    tables_to_clear = [
        (AuditLog, "audit_logs"),
        (Notification, "notifications"),
        (DelinquencyCase, "delinquency_cases"),
        (WeeklyInvoice, "weekly_invoices"),
        (Lease, "leases"),
        (MaintenanceSchedule, "maintenance_schedules"),
        (VehicleConditionReport, "vehicle_condition_reports"),
        (TrackerDevice, "tracker_devices"),
        (Vehicle, "vehicles"),
        (CustomerProfile, "customer_profiles"),
        (Inquiry, "inquiries"),
    ]

    for model, name in tables_to_clear:
        try:
            # For vehicles and trackers, use the SEED prefix
            if model == Vehicle:
                result = await session.execute(
                    delete(Vehicle).where(Vehicle.vin.like(f"{VIN_PREFIX}%"))
                )
                print(f"  Cleared {result.rowcount} seeded {name}")
            elif model == TrackerDevice:
                result = await session.execute(
                    delete(TrackerDevice).where(TrackerDevice.device_id.like(f"{SEED_PREFIX}%"))
                )
                print(f"  Cleared {result.rowcount} seeded {name}")
            elif model == CustomerProfile:
                result = await session.execute(
                    delete(CustomerProfile).where(CustomerProfile.keycloak_id.like("test-%"))
                )
                print(f"  Cleared {result.rowcount} seeded {name}")
            elif model == Inquiry:
                result = await session.execute(
                    delete(Inquiry).where(Inquiry.email.like("%@example.com"))
                )
                print(f"  Cleared {result.rowcount} seeded {name}")
            elif model == WeeklyInvoice:
                result = await session.execute(
                    delete(WeeklyInvoice).where(WeeklyInvoice.invoice_number.like(f"{SEED_PREFIX}%"))
                )
                print(f"  Cleared {result.rowcount} seeded {name}")
            elif model == DelinquencyCase:
                result = await session.execute(
                    delete(DelinquencyCase).where(DelinquencyCase.case_number.like(f"{SEED_PREFIX}%"))
                )
                print(f"  Cleared {result.rowcount} seeded {name}")
        except Exception as e:
            print(f"  Warning: Could not clear {name}: {e}")

    await session.commit()
    print("Seed data cleared.\n")


async def seed_customer_profiles(session: AsyncSession) -> dict[str, int]:
    """Seed customer profiles and return mapping of keycloak_id to profile_id."""
    print("\n=== Seeding Customer Profiles ===")
    profile_map = {}

    for customer_data in CUSTOMER_PROFILES:
        # Check if already exists
        result = await session.execute(
            select(CustomerProfile).where(
                CustomerProfile.keycloak_id == customer_data["keycloak_id"]
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"  Skipping {customer_data['email']} (already exists)")
            profile_map[customer_data["keycloak_id"]] = existing.id
            continue

        profile = CustomerProfile(
            keycloak_id=customer_data["keycloak_id"],
            email=customer_data["email"],
            full_name=customer_data["full_name"],
            phone=customer_data.get("phone"),
            address_line1=customer_data.get("address_line1"),
            address_line2=customer_data.get("address_line2"),
            city=customer_data.get("city"),
            state=customer_data.get("state"),
            zip_code=customer_data.get("zip_code"),
            drivers_license_number=customer_data.get("drivers_license_number"),
            drivers_license_state=customer_data.get("drivers_license_state"),
            insurance_status=customer_data.get("insurance_status", InsuranceStatus.NOT_UPLOADED),
            is_verified=customer_data.get("is_verified", False),
            gps_consent=customer_data.get("gps_consent", False),
            gps_consent_date=datetime.now(timezone.utc) if customer_data.get("gps_consent") else None,
        )
        session.add(profile)
        await session.flush()
        profile_map[customer_data["keycloak_id"]] = profile.id
        print(f"  Created customer: {customer_data['email']}")

    await session.commit()
    print(f"Seeded {len(profile_map)} customer profiles.\n")
    return profile_map


async def seed_vehicles(session: AsyncSession) -> dict[str, int]:
    """Seed vehicles and return mapping of VIN to vehicle_id."""
    print("\n=== Seeding Vehicles ===")
    vehicle_map = {}

    for vehicle_data in VEHICLES:
        # Check if already exists
        result = await session.execute(
            select(Vehicle).where(Vehicle.vin == vehicle_data["vin"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"  Skipping {vehicle_data['make']} {vehicle_data['model']} (already exists)")
            vehicle_map[vehicle_data["vin"]] = existing.id
            continue

        vehicle = Vehicle(
            vin=vehicle_data["vin"],
            license_plate=vehicle_data.get("license_plate"),
            make=vehicle_data["make"],
            model=vehicle_data["model"],
            year=vehicle_data["year"],
            color=vehicle_data.get("color"),
            body_type=vehicle_data.get("body_type"),
            engine=vehicle_data.get("engine"),
            transmission=vehicle_data.get("transmission"),
            mileage=vehicle_data.get("mileage"),
            weekly_rate=vehicle_data.get("weekly_rate", Decimal("150.00")),
            security_deposit=vehicle_data.get("security_deposit"),
            status=vehicle_data.get("status", VehicleStatus.AVAILABLE),
            condition=vehicle_data.get("condition", VehicleCondition.GOOD),
            acquisition_source=vehicle_data.get("acquisition_source"),
            acquisition_cost=vehicle_data.get("acquisition_cost"),
            repair_cost=vehicle_data.get("repair_cost"),
            acquisition_date=datetime.now(timezone.utc) - timedelta(days=90),
            show_on_fleet_page=vehicle_data.get("show_on_fleet_page", True),
            notes=vehicle_data.get("notes"),
        )
        session.add(vehicle)
        await session.flush()
        vehicle_map[vehicle_data["vin"]] = vehicle.id
        print(f"  Created vehicle: {vehicle_data['year']} {vehicle_data['make']} {vehicle_data['model']}")

    await session.commit()
    print(f"Seeded {len(vehicle_map)} vehicles.\n")
    return vehicle_map


async def seed_trackers(session: AsyncSession, vehicle_map: dict[str, int]) -> dict[str, int]:
    """Seed tracker devices and return mapping of device_id to tracker_id."""
    print("\n=== Seeding Tracker Devices ===")
    tracker_map = {}

    # Map trackers to vehicles
    vehicle_assignments = [
        (f"{SEED_PREFIX}TRK-001", "TSTBH41JXMN109186"),  # Honda Accord
        (f"{SEED_PREFIX}TRK-002", "TSTDK4KC7DBA12345"),  # Ford Edge
        (f"{SEED_PREFIX}TRK-005", "TSTBL4BV5NC876543"),  # Nissan Altima
    ]
    assignment_map = dict(vehicle_assignments)

    for tracker_data in TRACKERS:
        # Check if already exists
        result = await session.execute(
            select(TrackerDevice).where(
                TrackerDevice.device_id == tracker_data["device_id"]
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"  Skipping {tracker_data['device_id']} (already exists)")
            tracker_map[tracker_data["device_id"]] = existing.id
            continue

        # Check if this tracker should be assigned to a vehicle
        assigned_vin = assignment_map.get(tracker_data["device_id"])
        assigned_vehicle_id = vehicle_map.get(assigned_vin) if assigned_vin else None

        tracker = TrackerDevice(
            device_id=tracker_data["device_id"],
            serial_number=tracker_data["serial_number"],
            model=tracker_data["model"],
            manufacturer=tracker_data.get("manufacturer"),
            firmware_version=tracker_data.get("firmware_version"),
            sim_number=tracker_data.get("sim_number"),
            sim_carrier=tracker_data.get("sim_carrier"),
            imei=tracker_data.get("imei"),
            provider_name=tracker_data.get("provider_name"),
            status=tracker_data.get("status", TrackerStatus.AVAILABLE),
            assigned_vehicle_id=assigned_vehicle_id,
            assigned_at=datetime.now(timezone.utc) if assigned_vehicle_id else None,
            notes=tracker_data.get("notes"),
            purchase_date=datetime.now(timezone.utc) - timedelta(days=180),
        )
        session.add(tracker)
        await session.flush()
        tracker_map[tracker_data["device_id"]] = tracker.id
        print(f"  Created tracker: {tracker_data['device_id']}")

        # Update vehicle with tracker reference
        if assigned_vehicle_id:
            result = await session.execute(
                select(Vehicle).where(Vehicle.id == assigned_vehicle_id)
            )
            vehicle = result.scalar_one()
            vehicle.current_tracker_id = tracker.id

    await session.commit()
    print(f"Seeded {len(tracker_map)} trackers.\n")
    return tracker_map


async def seed_leases(
    session: AsyncSession,
    profile_map: dict[str, int],
    vehicle_map: dict[str, int]
) -> dict[str, int]:
    """Seed leases and return mapping."""
    print("\n=== Seeding Leases ===")
    lease_map = {}

    # Create leases for verified customers with leased vehicles
    lease_configs = [
        {
            "customer_keycloak_id": "test-customer-001",
            "vehicle_vin": "TSTBH41JXMN109186",  # Honda Accord
            "weekly_payment": Decimal("175.00"),
            "start_offset_days": -60,
            "status": LeaseStatus.ACTIVE,
        },
        {
            "customer_keycloak_id": "test-customer-002",
            "vehicle_vin": "TSTDK4KC7DBA12345",  # Ford Edge
            "weekly_payment": Decimal("225.00"),
            "start_offset_days": -45,
            "status": LeaseStatus.ACTIVE,
        },
        {
            "customer_keycloak_id": "test-customer-004",
            "vehicle_vin": "TSTBL4BV5NC876543",  # Nissan Altima
            "weekly_payment": Decimal("155.00"),
            "start_offset_days": -30,
            "status": LeaseStatus.ACTIVE,
        },
    ]

    for config in lease_configs:
        customer_id = profile_map.get(config["customer_keycloak_id"])
        vehicle_id = vehicle_map.get(config["vehicle_vin"])

        if not customer_id or not vehicle_id:
            print(f"  Skipping lease - missing customer or vehicle")
            continue

        # Get vehicle details
        result = await session.execute(
            select(Vehicle).where(Vehicle.id == vehicle_id)
        )
        vehicle = result.scalar_one()

        # Check if lease already exists
        result = await session.execute(
            select(Lease).where(
                Lease.customer_profile_id == customer_id,
                Lease.vehicle_vin == vehicle.vin,
                Lease.status == LeaseStatus.ACTIVE
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"  Skipping lease for {vehicle.make} {vehicle.model} (already exists)")
            lease_map[f"{config['customer_keycloak_id']}:{config['vehicle_vin']}"] = existing.id
            continue

        start_date = datetime.now(timezone.utc) + timedelta(days=config["start_offset_days"])

        lease = Lease(
            customer_profile_id=customer_id,
            vehicle_make=vehicle.make,
            vehicle_model=vehicle.model,
            vehicle_year=vehicle.year,
            vehicle_vin=vehicle.vin,
            vehicle_color=vehicle.color,
            vehicle_license_plate=vehicle.license_plate,
            weekly_payment=config["weekly_payment"],
            security_deposit=vehicle.security_deposit,
            status=config["status"],
            start_date=start_date,
        )
        session.add(lease)
        await session.flush()

        # Update vehicle with lease reference
        vehicle.current_lease_id = lease.id

        lease_map[f"{config['customer_keycloak_id']}:{config['vehicle_vin']}"] = lease.id
        print(f"  Created lease: {vehicle.year} {vehicle.make} {vehicle.model} -> Customer {customer_id}")

    await session.commit()
    print(f"Seeded {len(lease_map)} leases.\n")
    return lease_map


async def seed_invoices(
    session: AsyncSession,
    lease_map: dict[str, int],
    profile_map: dict[str, int]
) -> dict[str, int]:
    """Seed weekly invoices with various statuses."""
    print("\n=== Seeding Weekly Invoices ===")
    invoice_map = {}
    invoice_counter = 1

    for lease_key, lease_id in lease_map.items():
        customer_keycloak_id = lease_key.split(":")[0]
        customer_id = profile_map.get(customer_keycloak_id)

        if not customer_id:
            continue

        # Get lease details
        result = await session.execute(
            select(Lease).where(Lease.id == lease_id)
        )
        lease = result.scalar_one()

        # Calculate how many weeks the lease has been active
        days_active = (datetime.now(timezone.utc) - lease.start_date).days
        weeks_active = max(1, days_active // 7)

        # Create invoices for each week
        for week in range(1, min(weeks_active + 1, 10)):  # Cap at 9 weeks
            invoice_number = f"{SEED_PREFIX}INV-{datetime.now(timezone.utc).year}-{invoice_counter:06d}"

            # Check if already exists
            result = await session.execute(
                select(WeeklyInvoice).where(
                    WeeklyInvoice.invoice_number == invoice_number
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                invoice_map[invoice_number] = existing.id
                invoice_counter += 1
                continue

            period_start = lease.start_date + timedelta(weeks=week - 1)
            period_end = period_start + timedelta(days=6)
            due_date = period_end + timedelta(days=1)

            # Determine status based on week
            if week <= weeks_active - 2:
                status = InvoiceStatus.PAID
                verified_at = due_date + timedelta(hours=12)
                paid_at = verified_at
            elif week == weeks_active - 1:
                status = InvoiceStatus.VERIFICATION_IN_PROGRESS
                verified_at = None
                paid_at = None
            else:
                status = InvoiceStatus.PENDING
                verified_at = None
                paid_at = None

            invoice = WeeklyInvoice(
                lease_id=lease_id,
                customer_profile_id=customer_id,
                invoice_number=invoice_number,
                week_number=week,
                amount=lease.weekly_payment,
                late_fee=Decimal("0.00"),
                total_amount=lease.weekly_payment,
                period_start=period_start,
                period_end=period_end,
                due_date=due_date,
                status=status,
                verified_at=verified_at,
                verified_by_id="test-admin-001" if status == InvoiceStatus.PAID else None,
                paid_at=paid_at,
            )
            session.add(invoice)
            await session.flush()
            invoice_map[invoice_number] = invoice.id
            invoice_counter += 1
            print(f"  Created invoice: {invoice_number} (Week {week}, {status.value})")

    await session.commit()
    print(f"Seeded {len(invoice_map)} invoices.\n")
    return invoice_map


async def seed_inquiries(session: AsyncSession) -> None:
    """Seed customer inquiries."""
    print("\n=== Seeding Inquiries ===")

    for inquiry_data in INQUIRIES:
        # Check if already exists
        result = await session.execute(
            select(Inquiry).where(Inquiry.email == inquiry_data["email"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"  Skipping {inquiry_data['email']} (already exists)")
            continue

        inquiry = Inquiry(
            full_name=inquiry_data["full_name"],
            email=inquiry_data["email"],
            phone=inquiry_data.get("phone"),
            preferred_contact=inquiry_data.get("preferred_contact", PreferredContactMethod.EMAIL),
            vehicle_type=inquiry_data.get("vehicle_type", VehicleType.SEDAN),
            timeframe=inquiry_data.get("timeframe", Timeframe.JUST_BROWSING),
            notes=inquiry_data.get("notes"),
            status=inquiry_data.get("status", InquiryStatus.NEW),
        )
        session.add(inquiry)
        print(f"  Created inquiry: {inquiry_data['full_name']}")

    await session.commit()
    print(f"Seeded {len(INQUIRIES)} inquiries.\n")


async def seed_notifications(
    session: AsyncSession,
    profile_map: dict[str, int]
) -> None:
    """Seed sample notifications for customers."""
    print("\n=== Seeding Notifications ===")
    notification_count = 0

    for keycloak_id, profile_id in profile_map.items():
        # Create a few notifications for each customer
        notifications_data = [
            {
                "type": NotificationType.WELCOME,
                "title": "Welcome to FX Weekly Lease!",
                "message": "Your account has been created. Complete your profile to get started.",
                "priority": NotificationPriority.LOW,
                "is_read": True,
            },
            {
                "type": NotificationType.GENERAL_INFO,
                "title": "Profile Verification Reminder",
                "message": "Please upload your driver's license and insurance documents to complete verification.",
                "priority": NotificationPriority.NORMAL,
                "is_read": False,
            },
        ]

        # Add payment notification for verified customers
        if keycloak_id in ["test-customer-001", "test-customer-002", "test-customer-004"]:
            notifications_data.append({
                "type": NotificationType.PAYMENT_DUE_REMINDER,
                "title": "Payment Reminder",
                "message": "Your weekly payment is due in 3 days. Please upload payment proof.",
                "priority": NotificationPriority.HIGH,
                "is_read": False,
            })

        for notif_data in notifications_data:
            notification = Notification(
                customer_profile_id=profile_id,
                notification_type=notif_data["type"],
                title=notif_data["title"],
                message=notif_data["message"],
                priority=notif_data["priority"],
                is_read=notif_data["is_read"],
            )
            session.add(notification)
            notification_count += 1

    await session.commit()
    print(f"Seeded {notification_count} notifications.\n")


async def seed_audit_logs(session: AsyncSession, profile_map: dict[str, int]) -> None:
    """Seed sample audit log entries."""
    print("\n=== Seeding Audit Logs ===")

    audit_entries = [
        {
            "actor_id": "test-admin-001",
            "actor_email": "admin@fxweekly.com",
            "actor_role": "admin",
            "action": AuditAction.INSURANCE_VERIFICATION_APPROVE,
            "target_type": "customer_profile",
            "target_id": str(profile_map.get("test-customer-001", 1)),
            "target_description": "Verified customer John Doe",
            "reason": "Documents verified successfully",
        },
        {
            "actor_id": "test-admin-001",
            "actor_email": "admin@fxweekly.com",
            "actor_role": "admin",
            "action": AuditAction.VEHICLE_ASSIGNMENT,
            "target_type": "vehicle",
            "target_id": "1",
            "target_description": "Assigned vehicle 2023 Honda Accord to customer",
            "reason": "New lease created",
        },
        {
            "actor_id": "test-admin-001",
            "actor_email": "admin@fxweekly.com",
            "actor_role": "admin",
            "action": AuditAction.PAYMENT_APPROVE,
            "target_type": "weekly_invoice",
            "target_id": "1",
            "target_description": "Approved payment for invoice INV-2026-000001",
            "reason": "Payment proof verified",
        },
    ]

    for entry in audit_entries:
        audit_log = AuditLog(
            actor_id=entry["actor_id"],
            actor_email=entry["actor_email"],
            actor_role=entry["actor_role"],
            action=entry["action"],
            target_type=entry["target_type"],
            target_id=entry["target_id"],
            target_description=entry.get("target_description"),
            reason=entry.get("reason"),
            ip_address="127.0.0.1",
            user_agent="Seed Script",
            request_id=str(uuid4()),
        )
        session.add(audit_log)
        print(f"  Created audit log: {entry['action'].value}")

    await session.commit()
    print(f"Seeded {len(audit_entries)} audit logs.\n")


async def verify_seed_data(session: AsyncSession) -> bool:
    """Verify that seed data was created correctly."""
    print("\n=== Verifying Seed Data ===")

    checks = [
        ("Customer Profiles", select(CustomerProfile).where(CustomerProfile.keycloak_id.like("test-%"))),
        ("Vehicles", select(Vehicle).where(Vehicle.vin.like(f"{VIN_PREFIX}%"))),
        ("Trackers", select(TrackerDevice).where(TrackerDevice.device_id.like(f"{SEED_PREFIX}%"))),
        ("Leases", select(Lease)),
        ("Weekly Invoices", select(WeeklyInvoice).where(WeeklyInvoice.invoice_number.like(f"{SEED_PREFIX}%"))),
        ("Inquiries", select(Inquiry).where(Inquiry.email.like("%@example.com"))),
    ]

    all_passed = True
    for name, query in checks:
        result = await session.execute(query)
        count = len(result.all())
        status = "OK" if count > 0 else "MISSING"
        if count == 0:
            all_passed = False
        print(f"  {name}: {count} records [{status}]")

    return all_passed


async def run_seed(clear_first: bool = False) -> None:
    """Run the database seeding process."""
    print("\n" + "=" * 60)
    print("FX Weekly Lease - Database Seeding Script")
    print("=" * 60)

    async with async_session_maker() as session:
        try:
            # Optionally clear existing seed data
            if clear_first:
                await clear_seed_data(session)

            # Seed data in dependency order
            profile_map = await seed_customer_profiles(session)
            vehicle_map = await seed_vehicles(session)
            tracker_map = await seed_trackers(session, vehicle_map)
            lease_map = await seed_leases(session, profile_map, vehicle_map)
            await seed_invoices(session, lease_map, profile_map)
            await seed_inquiries(session)
            await seed_notifications(session, profile_map)
            await seed_audit_logs(session, profile_map)

            # Verify
            success = await verify_seed_data(session)

            print("\n" + "=" * 60)
            if success:
                print("DATABASE SEEDING COMPLETED SUCCESSFULLY!")
            else:
                print("DATABASE SEEDING COMPLETED WITH WARNINGS")
            print("=" * 60 + "\n")

        except Exception as e:
            print(f"\nERROR during seeding: {e}")
            await session.rollback()
            raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Seed the database with test data for development"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all seeded data before reseeding"
    )
    args = parser.parse_args()

    asyncio.run(run_seed(clear_first=args.clear))


if __name__ == "__main__":
    main()
