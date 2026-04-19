"""add unique constraint to prodotti.barcode

Revision ID: 0027
Revises: 0026
Create Date: 2026-04-19 00:00:00.000000

Aggiunge un constraint UNIQUE sul campo barcode della tabella prodotti
(tramite partial unique index su PostgreSQL per gestire correttamente i NULL).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0027"
down_revision: Union[str, None] = "0026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = [i["name"] for i in inspector.get_indexes("prodotti")]

    if bind.dialect.name == "postgresql":
        # Drop the plain index created by migration 0007 if it exists without UNIQUE
        if "ix_prodotti_barcode" in existing_indexes:
            op.drop_index("ix_prodotti_barcode", table_name="prodotti")
        # Create partial unique index (NULLs are excluded, so multiple NULLs allowed)
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_prodotti_barcode "
            "ON prodotti(barcode) WHERE barcode IS NOT NULL"
        )
    else:
        # SQLite already has a UNIQUE index from migration 0007 — nothing to do.
        if "ix_prodotti_barcode" not in existing_indexes:
            op.create_index("ix_prodotti_barcode", "prodotti", ["barcode"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_prodotti_barcode")
        op.create_index("ix_prodotti_barcode", "prodotti", ["barcode"], unique=False)
    else:
        # SQLite: migration 0007 already created ix_prodotti_barcode as UNIQUE.
        # This migration added no new indexes on SQLite, so there is nothing to undo.
        pass
