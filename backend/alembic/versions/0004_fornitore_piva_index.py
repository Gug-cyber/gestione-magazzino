"""fornitore partita_iva unique index

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-13 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_fornitori_partita_iva_unique "
            "ON fornitori (partita_iva) WHERE partita_iva IS NOT NULL"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_fornitori_partita_iva_unique")
