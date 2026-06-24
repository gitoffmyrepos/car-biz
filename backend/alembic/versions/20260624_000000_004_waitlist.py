"""Pre-launch waitlist (drivers + owners)

Revision ID: 004
Revises: 003
Create Date: 2026-06-24 00:00:00.000000

Captures interested drivers and car owners before launch. Owners declare their
vehicle(s) and which gig-business categories they'll allow their car to be used
for (JSON array). Entries sync to EspoCRM via n8n.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    waitlist_role = sa.Enum("driver", "owner", name="waitlistrole")
    waitlist_status = sa.Enum("new", "contacted", "converted", "closed", name="waitliststatus")
    op.create_table(
        "waitlist_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("role", waitlist_role, nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("vehicle_make", sa.String(length=80), nullable=True),
        sa.Column("vehicle_model", sa.String(length=80), nullable=True),
        sa.Column("vehicle_year", sa.Integer(), nullable=True),
        sa.Column("vehicle_count", sa.Integer(), nullable=True),
        sa.Column("vehicle_type", sa.String(length=40), nullable=True),
        sa.Column("business_categories", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", waitlist_status, nullable=False, server_default="new"),
        sa.Column("synced_to_crm", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("crm_lead_id", sa.String(length=80), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_waitlist_entries_email", "waitlist_entries", ["email"])
    op.create_index("ix_waitlist_entries_role", "waitlist_entries", ["role"])
    op.create_index("ix_waitlist_entries_status", "waitlist_entries", ["status"])


def downgrade() -> None:
    op.drop_index("ix_waitlist_entries_status", table_name="waitlist_entries")
    op.drop_index("ix_waitlist_entries_role", table_name="waitlist_entries")
    op.drop_index("ix_waitlist_entries_email", table_name="waitlist_entries")
    op.drop_table("waitlist_entries")
    sa.Enum(name="waitlistrole").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="waitliststatus").drop(op.get_bind(), checkfirst=True)
