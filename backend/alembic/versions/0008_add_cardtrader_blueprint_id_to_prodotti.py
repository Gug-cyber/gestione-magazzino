"""add cardtrader_blueprint_id to prodotti

Revision ID: 0008
Revises: 0007
Create Date: 2026-03-24 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [c["name"] for c in inspector.get_columns("prodotti")]

    if "cardtrader_blueprint_id" not in existing_columns:
        op.add_column(
            "prodotti",
            sa.Column("cardtrader_blueprint_id", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("prodotti", "cardtrader_blueprint_id")
