"""add footer_pages table and social links to store_settings

Revision ID: 0018
Revises: 0017
Create Date: 2026-04-13 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    tables = inspector.get_table_names()

    # Create footer_pages table
    if "footer_pages" not in tables:
        op.create_table(
            "footer_pages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("slug", sa.String(100), nullable=False),
            sa.Column("titolo", sa.String(200), nullable=False),
            sa.Column("sezione", sa.String(50), nullable=False),
            sa.Column("contenuto", sa.Text(), nullable=True),
            sa.Column("abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("ordine", sa.Integer(), nullable=True, server_default="0"),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )
        op.create_index("ix_footer_pages_id", "footer_pages", ["id"])

    # Add social link columns to store_settings if they don't exist
    if "store_settings" in tables:
        existing_cols = {c["name"] for c in inspector.get_columns("store_settings")}
        social_cols = [
            ("social_facebook_url", sa.String(500)),
            ("social_instagram_url", sa.String(500)),
            ("social_tiktok_url", sa.String(500)),
            ("social_twitch_url", sa.String(500)),
            ("social_youtube_url", sa.String(500)),
            ("social_ebay_url", sa.String(500)),
        ]
        for col_name, col_type in social_cols:
            if col_name not in existing_cols:
                op.add_column("store_settings", sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    tables = inspector.get_table_names()

    if "footer_pages" in tables:
        op.drop_index("ix_footer_pages_id", table_name="footer_pages")
        op.drop_table("footer_pages")

    if "store_settings" in tables:
        existing_cols = {c["name"] for c in inspector.get_columns("store_settings")}
        for col_name in ["social_facebook_url", "social_instagram_url", "social_tiktok_url",
                         "social_twitch_url", "social_youtube_url", "social_ebay_url"]:
            if col_name in existing_cols:
                op.drop_column("store_settings", col_name)
