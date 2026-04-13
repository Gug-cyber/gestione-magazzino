"""Add store_sfondo_url to store_settings

Revision ID: 0020
Revises: 0019
Create Date: 2026-04-13
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("store_settings")]

    if "store_sfondo_url" not in existing_columns:
        op.add_column(
            "store_settings",
            sa.Column("store_sfondo_url", sa.String(500), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("store_settings")]

    if "store_sfondo_url" in existing_columns:
        op.drop_column("store_settings", "store_sfondo_url")
