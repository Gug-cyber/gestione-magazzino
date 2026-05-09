"""Add manual_listings table

Revision ID: 0032
Revises: 0031
Create Date: 2026-05-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0032"
down_revision: Union[str, None] = "0031"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "manual_listings" not in existing_tables:
        op.create_table(
            "manual_listings",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("prodotti.id", ondelete="CASCADE"), nullable=False),
            sa.Column("platform", sa.String(length=20), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="non_pubblicare"),
            sa.Column("platform_price", sa.Numeric(10, 2), nullable=True),
            sa.Column("listing_url", sa.String(length=500), nullable=True),
            sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("sold_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.CheckConstraint("platform IN ('vinted', 'wallapop')", name="ck_manual_listings_platform"),
            sa.CheckConstraint(
                "status IN ('non_pubblicare', 'da_pubblicare', 'pubblicato', 'venduto', 'rimosso', 'da_controllare')",
                name="ck_manual_listings_status",
            ),
            sa.UniqueConstraint("product_id", "platform", name="uq_manual_listings_product_platform"),
        )
        op.create_index("ix_manual_listings_id", "manual_listings", ["id"])
        op.create_index("ix_manual_listings_product_id", "manual_listings", ["product_id"])
        op.create_index("ix_manual_listings_platform", "manual_listings", ["platform"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "manual_listings" in existing_tables:
        op.drop_index("ix_manual_listings_platform", table_name="manual_listings")
        op.drop_index("ix_manual_listings_product_id", table_name="manual_listings")
        op.drop_index("ix_manual_listings_id", table_name="manual_listings")
        op.drop_table("manual_listings")
