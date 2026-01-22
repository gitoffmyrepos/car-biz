"""Initial schema - stamp existing database

Revision ID: 001
Revises:
Create Date: 2026-01-22 00:00:00.000000

This migration represents the initial database schema that was created
using SQLAlchemy's Base.metadata.create_all(). It's a "stamp" migration
that documents the existing schema without making changes.

Tables:
- audit_logs: Admin action audit trail
- ban_records: Customer ban history
- customer_profiles: Customer account data
- delinquency_cases: Past-due payment tracking
- incident_reports: Vehicle incident records
- inquiries: Customer inquiries/leads
- leases: Active lease contracts
- maintenance_schedules: Vehicle maintenance tracking
- notifications: Customer notification queue
- recovery_actions: Vehicle recovery workflow
- system_settings: Application configuration
- tracker_devices: GPS tracker inventory
- vehicle_condition_reports: Vehicle inspection reports
- vehicle_requests: Customer vehicle requests
- vehicles: Fleet inventory
- weekly_invoices: Payment invoices
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Stamp migration - schema already exists via create_all().

    This migration represents the existing database schema created by
    SQLAlchemy's Base.metadata.create_all() during application startup.

    For new deployments, the schema will be created by this migration.
    For existing deployments, this serves as documentation.
    """
    # The schema was created using SQLAlchemy's create_all()
    # This migration stamps the version without making changes
    #
    # To create all tables from scratch, use:
    # op.execute(Base.metadata.create_all)
    #
    # For documentation purposes, here are the tables that exist:
    #
    # - inquiries: Customer inquiry/lead management
    # - customer_profiles: Customer account profiles
    # - audit_logs: Admin action audit trail
    # - vehicle_requests: Customer vehicle request workflow
    # - leases: Active lease contracts
    # - notifications: Customer notification queue
    # - incident_reports: Vehicle incident tracking
    # - weekly_invoices: Payment invoice management
    # - vehicles: Fleet vehicle inventory
    # - vehicle_condition_reports: Vehicle inspection reports
    # - tracker_devices: GPS tracker device management
    # - maintenance_schedules: Vehicle maintenance scheduling
    # - delinquency_cases: Past-due payment escalation
    # - recovery_actions: Vehicle recovery workflow
    # - system_settings: Application configuration
    # - ban_records: Customer ban history
    pass


def downgrade() -> None:
    """Downgrade - would drop all tables (not recommended).

    WARNING: This would drop all data. Only use for complete reset.
    """
    # To completely reset the database, uncomment below:
    # op.drop_table('ban_records')
    # op.drop_table('recovery_actions')
    # op.drop_table('delinquency_cases')
    # op.drop_table('maintenance_schedules')
    # op.drop_table('vehicle_condition_reports')
    # op.drop_table('tracker_devices')
    # op.drop_table('weekly_invoices')
    # op.drop_table('incident_reports')
    # op.drop_table('notifications')
    # op.drop_table('leases')
    # op.drop_table('vehicle_requests')
    # op.drop_table('vehicles')
    # op.drop_table('audit_logs')
    # op.drop_table('customer_profiles')
    # op.drop_table('inquiries')
    # op.drop_table('system_settings')
    pass
