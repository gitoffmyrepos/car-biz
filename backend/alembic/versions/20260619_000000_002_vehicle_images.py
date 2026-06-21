"""Add vehicle_images gallery table

Revision ID: 002
Revises: 001
Create Date: 2026-06-19 00:00:00.000000

Adds the vehicle_images table backing the multi-image fleet gallery:
ordered images per vehicle with a primary flag and cascade delete.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("vehicle_images"):
        op.create_table(
            "vehicle_images",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("vehicle_id", sa.Integer(), nullable=False),
            sa.Column("image_key", sa.String(length=512), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "is_primary",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["vehicle_id"],
                ["vehicles.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = inspect(bind)

    index_name = op.f("ix_vehicle_images_vehicle_id")
    existing_indexes = {index["name"] for index in inspector.get_indexes("vehicle_images")}
    if index_name not in existing_indexes:
        op.create_index(
            index_name,
            "vehicle_images",
            ["vehicle_id"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("vehicle_images"):
        return

    index_name = op.f("ix_vehicle_images_vehicle_id")
    existing_indexes = {index["name"] for index in inspector.get_indexes("vehicle_images")}
    if index_name in existing_indexes:
        op.drop_index(
            index_name,
            table_name="vehicle_images",
        )
    op.drop_table("vehicle_images")
