"""Remove data_conferma from ordini

Revision ID: 0013
Revises: 0012
Create Date: 2026-04-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("ordini", "data_conferma")


def downgrade() -> None:
    op.add_column("ordini", sa.Column("data_conferma", sa.DateTime(timezone=True), nullable=True))
