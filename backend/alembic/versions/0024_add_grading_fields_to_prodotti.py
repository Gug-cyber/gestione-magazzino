"""Add grading fields to prodotti

Revision ID: 0024
Revises: 0023
Create Date: 2026-04-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0024"
down_revision: Union[str, None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("prodotti")]

    if "is_graded" not in existing_columns:
        op.add_column(
            "prodotti",
            sa.Column("is_graded", sa.Boolean(), nullable=False, server_default="false"),
        )
    if "grading_service" not in existing_columns:
        op.add_column("prodotti", sa.Column("grading_service", sa.String(50), nullable=True))
    if "grade" not in existing_columns:
        op.add_column("prodotti", sa.Column("grade", sa.String(20), nullable=True))

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("prodotti")]

    for col in ("grade", "grading_service", "is_graded"):
        if col in existing_columns:
            op.drop_column("prodotti", col)