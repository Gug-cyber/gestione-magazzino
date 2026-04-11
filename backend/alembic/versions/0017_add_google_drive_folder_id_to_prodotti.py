"""add google_drive_folder_id to prodotti

Revision ID: 0017
Revises: 0016
Create Date: 2026-04-11 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    if "prodotti" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("prodotti")]
        if "google_drive_folder_id" not in columns:
            op.add_column("prodotti", sa.Column("google_drive_folder_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("prodotti", "google_drive_folder_id")
