"""
GigWheels - Alembic Environment Configuration
Weekly car rentals for gig drivers

Async migration support for PostgreSQL with SQLAlchemy.
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import the application config and database models
import sys
from pathlib import Path

# Add the backend directory to sys.path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.database import Base

# Import all models to ensure they're registered with Base.metadata
# noqa: F401 - imports required for model registration
from app.models import (  # noqa: F401
    Inquiry,
    CustomerProfile,
    AuditLog,
    VehicleRequest,
    Lease,
    Notification,
    IncidentReport,
    WeeklyInvoice,
    Vehicle,
    VehicleImage,
    VehicleConditionReport,
    TrackerDevice,
    MaintenanceSchedule,
    DelinquencyCase,
    RecoveryAction,
    SystemSettings,
    BanRecord,
)

# Suppress unused import warnings - models must be imported for metadata
__models__ = [
    Inquiry, CustomerProfile, AuditLog, VehicleRequest, Lease,
    Notification, IncidentReport, WeeklyInvoice, Vehicle, VehicleImage,
    VehicleConditionReport, TrackerDevice, MaintenanceSchedule,
    DelinquencyCase, RecoveryAction, SystemSettings, BanRecord,
]

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the target metadata for autogenerate
target_metadata = Base.metadata

# Override sqlalchemy.url with the actual database URL from settings
# Convert async URL to sync for Alembic operations
sync_database_url = settings.DATABASE_URL.replace(
    "postgresql+asyncpg://", "postgresql://"
)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine,
    though an Engine is acceptable here as well. By skipping the Engine
    creation we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = sync_database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations using the provided connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using async engine.

    Creates an async engine and runs migrations in a transaction.
    """
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = sync_database_url.replace(
        "postgresql://", "postgresql+asyncpg://"
    )

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
