"""add barcode columns to prodotti

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-17 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # Add barcode column if not present
    inspector = sa.inspect(bind)
    existing_columns = [c["name"] for c in inspector.get_columns("prodotti")]

    if "barcode" not in existing_columns:
        op.add_column("prodotti", sa.Column("barcode", sa.String(100), nullable=True))

    if "barcode_generated_at" not in existing_columns:
        op.add_column(
            "prodotti",
            sa.Column("barcode_generated_at", sa.DateTime(timezone=True), nullable=True),
        )

    # Create partial unique index (only for non-null values)
    if bind.dialect.name == "postgresql":
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_prodotti_barcode "
            "ON prodotti(barcode) WHERE barcode IS NOT NULL"
        )
    else:
        # SQLite treats NULLs as distinct in UNIQUE indexes, so multiple NULLs
        # are allowed — the effective behaviour matches the PostgreSQL partial index.
        existing_indexes = [i["name"] for i in inspector.get_indexes("prodotti")]
        if "ix_prodotti_barcode" not in existing_indexes:
            op.create_index("ix_prodotti_barcode", "prodotti", ["barcode"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_prodotti_barcode")
    else:
        op.drop_index("ix_prodotti_barcode", table_name="prodotti")
    op.drop_column("prodotti", "barcode_generated_at")
    op.drop_column("prodotti", "barcode")
