"""forniture

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-13 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "forniture",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("numero_fornitura", sa.String(), nullable=False),
        sa.Column("fornitore_id", sa.Integer(), nullable=True),
        sa.Column("fornitore_nome", sa.String(), nullable=True),
        sa.Column("stato", sa.String(), nullable=False, server_default="bozza"),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("data_fornitura", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("data_ricezione", sa.DateTime(timezone=True), nullable=True),
        sa.Column("totale", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["fornitore_id"], ["fornitori.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("numero_fornitura"),
    )
    op.create_index("ix_forniture_id", "forniture", ["id"], unique=False)

    op.create_table(
        "righe_fornitura",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fornitura_id", sa.Integer(), nullable=False),
        sa.Column("prodotto_id", sa.Integer(), nullable=False),
        sa.Column("quantita", sa.Integer(), nullable=False),
        sa.Column("prezzo_unitario", sa.Float(), nullable=False),
        sa.Column("subtotale", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["fornitura_id"], ["forniture.id"]),
        sa.ForeignKeyConstraint(["prodotto_id"], ["prodotti.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_righe_fornitura_id", "righe_fornitura", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_righe_fornitura_id", table_name="righe_fornitura")
    op.drop_table("righe_fornitura")
    op.drop_index("ix_forniture_id", table_name="forniture")
    op.drop_table("forniture")
