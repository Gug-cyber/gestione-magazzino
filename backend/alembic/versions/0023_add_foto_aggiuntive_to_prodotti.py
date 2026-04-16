"""Add foto_aggiuntive to prodotti

Revision ID: 0023
Revises: 0022
Create Date: 2026-04-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("prodotti")]

    if "foto_aggiuntive" not in existing_columns:
        op.add_column("prodotti", sa.Column("foto_aggiuntive", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("prodotti")]

    if "foto_aggiuntive" in existing_columns:
        op.drop_column("prodotti", "foto_aggiuntive")
