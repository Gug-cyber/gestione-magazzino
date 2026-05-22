"""add_data_scarico_and_alter_fk_set_null

Revision ID: 0033
Revises: 0032
Create Date: 2026-05-22

Aggiunge la colonna `data_scarico` alla tabella `prodotti` e altera i vincoli
FK di `righe_ordine.prodotto_id`, `movimenti.prodotto_id` e
`righe_fornitura.prodotto_id` per usare ON DELETE SET NULL, rendendo le
colonne nullable dove necessario.

Questo permette la cancellazione fisica di prodotti con quantità a zero dopo
10 giorni dallo scarico (se collegati a un ordine) senza perdere la storia
degli ordini, dei movimenti e delle forniture.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0033"
down_revision: Union[str, None] = "0032"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _get_fk_name(inspector, table: str, column: str) -> str | None:
    """Restituisce il nome del primo FK constraint che coinvolge `column` in `table`."""
    for fk in inspector.get_foreign_keys(table):
        if column in fk.get("constrained_columns", []):
            return fk.get("name")
    return None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # --- 1. Aggiungi data_scarico a prodotti -----------------------------------
    existing_cols = [c["name"] for c in inspector.get_columns("prodotti")]
    if "data_scarico" not in existing_cols:
        op.add_column(
            "prodotti",
            sa.Column("data_scarico", sa.DateTime(timezone=True), nullable=True),
        )

    # SQLite non supporta ALTER CONSTRAINT — saltiamo le operazioni FK su SQLite.
    if bind.dialect.name == "sqlite":
        return

    # --- 2. righe_ordine.prodotto_id → nullable + SET NULL --------------------
    ro_cols = {c["name"]: c for c in inspector.get_columns("righe_ordine")}
    if not ro_cols.get("prodotto_id", {}).get("nullable", True):
        op.alter_column("righe_ordine", "prodotto_id", nullable=True)

    fk_name = _get_fk_name(inspector, "righe_ordine", "prodotto_id")
    if fk_name:
        op.drop_constraint(fk_name, "righe_ordine", type_="foreignkey")
    op.create_foreign_key(
        None, "righe_ordine", "prodotti", ["prodotto_id"], ["id"], ondelete="SET NULL"
    )

    # --- 3. movimenti.prodotto_id → nullable + SET NULL -----------------------
    mv_cols = {c["name"]: c for c in inspector.get_columns("movimenti")}
    if not mv_cols.get("prodotto_id", {}).get("nullable", True):
        op.alter_column("movimenti", "prodotto_id", nullable=True)

    fk_name = _get_fk_name(inspector, "movimenti", "prodotto_id")
    if fk_name:
        op.drop_constraint(fk_name, "movimenti", type_="foreignkey")
    op.create_foreign_key(
        None, "movimenti", "prodotti", ["prodotto_id"], ["id"], ondelete="SET NULL"
    )

    # --- 4. righe_fornitura.prodotto_id → SET NULL (già nullable) -------------
    fk_name = _get_fk_name(inspector, "righe_fornitura", "prodotto_id")
    if fk_name:
        op.drop_constraint(fk_name, "righe_fornitura", type_="foreignkey")
    op.create_foreign_key(
        None, "righe_fornitura", "prodotti", ["prodotto_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if bind.dialect.name != "sqlite":
        # Ripristina FK senza ondelete su righe_ordine
        fk_name = _get_fk_name(inspector, "righe_ordine", "prodotto_id")
        if fk_name:
            op.drop_constraint(fk_name, "righe_ordine", type_="foreignkey")
        op.create_foreign_key(
            None, "righe_ordine", "prodotti", ["prodotto_id"], ["id"]
        )
        op.alter_column("righe_ordine", "prodotto_id", nullable=False)

        # Ripristina FK senza ondelete su movimenti
        fk_name = _get_fk_name(inspector, "movimenti", "prodotto_id")
        if fk_name:
            op.drop_constraint(fk_name, "movimenti", type_="foreignkey")
        op.create_foreign_key(
            None, "movimenti", "prodotti", ["prodotto_id"], ["id"]
        )
        op.alter_column("movimenti", "prodotto_id", nullable=False)

        # Ripristina FK senza ondelete su righe_fornitura
        fk_name = _get_fk_name(inspector, "righe_fornitura", "prodotto_id")
        if fk_name:
            op.drop_constraint(fk_name, "righe_fornitura", type_="foreignkey")
        op.create_foreign_key(
            None, "righe_fornitura", "prodotti", ["prodotto_id"], ["id"]
        )

    # Rimuovi data_scarico
    existing_cols = [c["name"] for c in inspector.get_columns("prodotti")]
    if "data_scarico" in existing_cols:
        op.drop_column("prodotti", "data_scarico")
