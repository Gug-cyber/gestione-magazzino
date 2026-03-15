"""fornitore partita_iva unique index (PostgreSQL only)

Revision ID: 0006
Revises: 0005
Create Date: 2026-03-15 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
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
