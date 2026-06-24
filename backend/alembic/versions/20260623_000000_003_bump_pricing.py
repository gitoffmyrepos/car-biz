"""Bump weekly rate 150 -> 350 (new pricing)

Revision ID: 003
Revises: 002
Create Date: 2026-06-23 00:00:00.000000

New baseline pricing is $350/week (plus a $55/day daily option handled in app
copy, not per-row). Vehicles still sitting at the old $150 default are moved to
$350; intentionally-priced rows (any other value) are left untouched.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE vehicles SET weekly_rate = 350.00 WHERE weekly_rate = 150.00")


def downgrade() -> None:
    op.execute("UPDATE vehicles SET weekly_rate = 150.00 WHERE weekly_rate = 350.00")
