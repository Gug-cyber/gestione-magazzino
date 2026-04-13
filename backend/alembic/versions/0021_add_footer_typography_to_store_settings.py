"""Add footer typography fields to store_settings

Revision ID: 0021
Revises: 0020
Create Date: 2026-04-13
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("store_settings")]

    if "footer_font_family" not in existing_columns:
        op.add_column("store_settings", sa.Column("footer_font_family", sa.String(200), nullable=True))
    if "footer_font_size" not in existing_columns:
        op.add_column("store_settings", sa.Column("footer_font_size", sa.Integer(), nullable=True))
    if "footer_text_color" not in existing_columns:
        op.add_column("store_settings", sa.Column("footer_text_color", sa.String(20), nullable=True))
    if "footer_bg_color" not in existing_columns:
        op.add_column("store_settings", sa.Column("footer_bg_color", sa.String(20), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("store_settings")]

    for col in ["footer_bg_color", "footer_text_color", "footer_font_size", "footer_font_family"]:
        if col in existing_columns:
            op.drop_column("store_settings", col)
