"""add monitor.verify_tls

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-18

Adds a per-monitor TLS verification toggle (defaults to on). Previously the
HTTP checker hardcoded verify=False, so HTTPS monitors never validated certs.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "monitors",
        sa.Column(
            "verify_tls",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("monitors", "verify_tls")
