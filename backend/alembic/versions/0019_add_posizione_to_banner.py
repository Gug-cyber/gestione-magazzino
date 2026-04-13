"""Add posizione column to banner table

Revision ID: 0019
Revises: 0018
Create Date: 2026-04-13
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("banner")]

    if "posizione" not in existing_columns:
        op.add_column(
            "banner",
            sa.Column("posizione", sa.String(50), nullable=True, server_default="top"),
        )


def downgrade() -> None:
    op.drop_column("banner", "posizione")
