"""add CMS and e-commerce tables

Revision ID: 0010
Revises: 0009
Create Date: 2026-03-25 14:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "cms_sync_log" not in existing_tables:
        # Tabella sync log (tracking sincronizzazioni)
        op.create_table(
            "cms_sync_log",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("prodotto_id", sa.Integer(), nullable=False),
            sa.Column("strapi_product_id", sa.Integer(), nullable=True),
            sa.Column("sync_status", sa.String(20), nullable=False),  # success, failed, pending
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("synced_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["prodotto_id"], ["prodotti.id"], ondelete="CASCADE"),
        )
        op.create_index("ix_cms_sync_log_prodotto_id", "cms_sync_log", ["prodotto_id"])
        op.create_index("ix_cms_sync_log_status", "cms_sync_log", ["sync_status"])


def downgrade() -> None:
    op.drop_index("ix_cms_sync_log_status", table_name="cms_sync_log")
    op.drop_index("ix_cms_sync_log_prodotto_id", table_name="cms_sync_log")
    op.drop_table("cms_sync_log")
