"""add prezzi_storici table

Revision ID: 0036
Revises: 0035
Create Date: 2026-06-03 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0036"
down_revision: Union[str, None] = "0035"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prezzi_storici",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("prodotto_id", sa.Integer(), nullable=False),
        sa.Column("fonte", sa.String(20), nullable=False),
        sa.Column("prezzo_minimo", sa.Float(), nullable=True),
        sa.Column("prezzo_medio", sa.Float(), nullable=True),
        sa.Column("prezzo_venduto", sa.Float(), nullable=True),
        sa.Column("numero_risultati", sa.Integer(), nullable=True),
        sa.Column("rilevato_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["prodotto_id"], ["prodotti.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prezzi_storici_id", "prezzi_storici", ["id"], unique=False)
    op.create_index("ix_prezzi_storici_prodotto_id", "prezzi_storici", ["prodotto_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_prezzi_storici_prodotto_id", table_name="prezzi_storici")
    op.drop_index("ix_prezzi_storici_id", table_name="prezzi_storici")
    op.drop_table("prezzi_storici")
