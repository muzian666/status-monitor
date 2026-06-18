"""timezone-aware timestamps

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-18

Switches all DateTime columns to timezone-aware, and drops the naive
CURRENT_TIMESTAMP server default on monitors.created_at/updated_at (the app
now writes aware UTC via Python defaults). Fixes mixed naive/aware timestamps
that broke display when the host timezone was not UTC.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # monitors.created_at / updated_at: tz-aware + drop CURRENT_TIMESTAMP default.
    with op.batch_alter_table("monitors", schema=None) as batch_op:
        batch_op.alter_column(
            "created_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_server_default=sa.text("(CURRENT_TIMESTAMP)"),
            server_default=None,
        )
        batch_op.alter_column(
            "updated_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_server_default=sa.text("(CURRENT_TIMESTAMP)"),
            server_default=None,
        )

    with op.batch_alter_table("check_results", schema=None) as batch_op:
        batch_op.alter_column(
            "checked_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
        )

    with op.batch_alter_table("traceroute_runs", schema=None) as batch_op:
        batch_op.alter_column(
            "started_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
        )
        batch_op.alter_column(
            "completed_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
        )


def downgrade() -> None:
    with op.batch_alter_table("traceroute_runs", schema=None) as batch_op:
        batch_op.alter_column("completed_at", existing_type=sa.DateTime(timezone=True), type_=sa.DateTime())
        batch_op.alter_column("started_at", existing_type=sa.DateTime(timezone=True), type_=sa.DateTime())
    with op.batch_alter_table("check_results", schema=None) as batch_op:
        batch_op.alter_column("checked_at", existing_type=sa.DateTime(timezone=True), type_=sa.DateTime())
    with op.batch_alter_table("monitors", schema=None) as batch_op:
        batch_op.alter_column(
            "updated_at",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        )
        batch_op.alter_column(
            "created_at",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        )
