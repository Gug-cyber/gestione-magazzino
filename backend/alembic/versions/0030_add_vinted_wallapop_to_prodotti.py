"""Add su_vinted and su_wallapop to prodotti

Revision ID: 0030
Revises: 0029
Create Date: 2026-04-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0030"
down_revision: Union[str, None] = "0029"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("prodotti")]

    if "su_vinted" not in existing_columns:
        op.add_column(
            "prodotti",
            sa.Column("su_vinted", sa.Boolean(), nullable=False, server_default="false"),
        )
    if "su_wallapop" not in existing_columns:
        op.add_column(
            "prodotti",
            sa.Column("su_wallapop", sa.Boolean(), nullable=False, server_default="false"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("prodotti")]

    for col in ("su_wallapop", "su_vinted"):
        if col in existing_columns:
            op.drop_column("prodotti", col)
