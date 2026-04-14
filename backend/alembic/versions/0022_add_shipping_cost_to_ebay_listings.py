"""Add shipping_cost to ebay_listings

Revision ID: 0022
Revises: 0021
Create Date: 2026-04-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("ebay_listings")]

    if "shipping_cost" not in existing_columns:
        op.add_column("ebay_listings", sa.Column("shipping_cost", sa.Numeric(8, 2), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("ebay_listings")]

    if "shipping_cost" in existing_columns:
        op.drop_column("ebay_listings", "shipping_cost")
