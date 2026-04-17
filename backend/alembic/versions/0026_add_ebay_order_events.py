"""add_ebay_order_events

Revision ID: 0026
Revises: 0025
Create Date: 2026-04-17 00:00:00.000000

Aggiunge la tabella ebay_order_events per tracciare gli eventi eBay già processati
e garantire idempotenza nella gestione delle vendite eBay in arrivo.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0026"
down_revision: Union[str, None] = "0025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ebay_order_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ebay_order_id", sa.String(length=255), nullable=False),
        sa.Column("sku", sa.String(length=255), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ebay_order_id"),
    )
    op.create_index(
        "ix_ebay_order_events_ebay_order_id",
        "ebay_order_events",
        ["ebay_order_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_ebay_order_events_ebay_order_id", table_name="ebay_order_events")
    op.drop_table("ebay_order_events")
