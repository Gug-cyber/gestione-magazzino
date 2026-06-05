"""add gioco to prodotti

Revision ID: 0037
Revises: 0036
Create Date: 2026-06-05 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0037"
down_revision: Union[str, None] = "0036"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("prodotti", sa.Column("gioco", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("prodotti", "gioco")
