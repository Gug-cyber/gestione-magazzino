"""add index movimenti prodotto data

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-12 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # L'indice è già creato in 0001_initial per le nuove installazioni.
    # Questa migration garantisce che esista anche su database pre-esistenti.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_movimenti_prodotto_data "
        "ON movimenti (prodotto_id, data_movimento)"
    )


def downgrade() -> None:
    op.drop_index("ix_movimenti_prodotto_data", table_name="movimenti")
