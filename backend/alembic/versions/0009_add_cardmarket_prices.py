"""add cardmarket_prices table

Revision ID: 0009
Revises: 0008
Create Date: 2026-03-25 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "cardmarket_prices" not in existing_tables:
        op.create_table(
            "cardmarket_prices",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("prodotto_id", sa.Integer(), nullable=False),
            sa.Column("prezzo_minimo", sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column("prezzo_medio", sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column("url_cardmarket", sa.String(length=500), nullable=True),
            sa.Column(
                "data_aggiornamento",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["prodotto_id"], ["prodotti.id"], ondelete="CASCADE"),
        )
        op.create_index(
            "ix_cardmarket_prices_prodotto_id",
            "cardmarket_prices",
            ["prodotto_id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("ix_cardmarket_prices_prodotto_id", table_name="cardmarket_prices")
    op.drop_table("cardmarket_prices")
