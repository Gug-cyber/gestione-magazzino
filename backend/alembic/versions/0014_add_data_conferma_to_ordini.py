"""Add data_conferma to ordini

Revision ID: 0014
Revises: 0013
Create Date: 2026-04-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ordini", sa.Column("data_conferma", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("ordini", "data_conferma")
