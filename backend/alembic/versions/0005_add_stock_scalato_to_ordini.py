"""add_stock_scalato_to_ordini

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-15 00:00:00.000000

Aggiunge la colonna `stock_scalato` alla tabella `ordini`.
Questa colonna traccia se lo stock è già stato decrementato per l'ordine,
evita doppi scarichi di magazzino in caso di modifica dello stato.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Idempotency: skip if column already exists (added via runtime migration)
    existing_cols = [col["name"] for col in inspector.get_columns("ordini")]
    if "stock_scalato" in existing_cols:
        return

    op.add_column(
        "ordini",
        sa.Column(
            "stock_scalato",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
    )

    # Backfill: mark as already scaled for orders that are confirmed/shipped/completed
    op.execute(
        """
        UPDATE ordini
        SET stock_scalato = TRUE
        WHERE stato IN ('confermato', 'spedito', 'completato')
        """
    )

def downgrade() -> None:
    op.drop_column("ordini", "stock_scalato")