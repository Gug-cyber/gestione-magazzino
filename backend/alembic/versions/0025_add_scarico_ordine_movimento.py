"""add_scarico_ordine_to_tipo_movimento

Revision ID: 0025
Revises: 0024
Create Date: 2026-04-16 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0025"
down_revision: Union[str, None] = "0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE tipomovimento ADD VALUE IF NOT EXISTS 'scarico_ordine'")
    # SQLite: niente da fare, enum non nativo

def downgrade() -> None:
    pass  # Non è possibile rimuovere valori da enum PostgreSQL senza ricreare