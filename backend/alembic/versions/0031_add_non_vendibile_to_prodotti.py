"""Add non_vendibile to prodotti

Revision ID: 0031
Revises: 0030
Create Date: 2026-04-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0031"
down_revision: Union[str, None] = "0030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("prodotti")]

    if "non_vendibile" not in existing_columns:
        op.add_column(
            "prodotti",
            sa.Column("non_vendibile", sa.Boolean(), nullable=False, server_default="false"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("prodotti")]

    if "non_vendibile" in existing_columns:
        op.drop_column("prodotti", "non_vendibile")
