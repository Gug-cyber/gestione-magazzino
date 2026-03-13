"""initial

Revision ID: 0001
Revises:
Create Date: 2026-03-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotency guard: skip if the DB is already initialised
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "categorie" in inspector.get_table_names():
        return

    op.create_table(
        "categorie",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(100), nullable=False),
        sa.Column("descrizione", sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categorie_id", "categorie", ["id"], unique=False)

    op.create_table(
        "fornitori",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("email", sa.String(150), nullable=True),
        sa.Column("telefono", sa.String(30), nullable=True),
        sa.Column("indirizzo", sa.String(255), nullable=True),
        sa.Column("partita_iva", sa.String(20), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fornitori_id", "fornitori", ["id"], unique=False)

    op.create_table(
        "ubicazioni",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(100), nullable=False),
        sa.Column("zona", sa.String(50), nullable=True),
        sa.Column("scaffale", sa.String(50), nullable=True),
        sa.Column("piano", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ubicazioni_id", "ubicazioni", ["id"], unique=False)

    op.create_table(
        "utenti",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("is_admin", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_utenti_id", "utenti", ["id"], unique=False)
    op.create_index("ix_utenti_username", "utenti", ["username"], unique=True)

    op.create_table(
        "dati_storici",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("importo", sa.Numeric(12, 2), nullable=False),
        sa.Column("descrizione", sa.String(300), nullable=True),
        sa.Column("categoria", sa.String(100), nullable=True),
        sa.Column("creato_il", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dati_storici_id", "dati_storici", ["id"], unique=False)

    op.create_table(
        "spese_gestione",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("descrizione", sa.String(200), nullable=False),
        sa.Column("importo", sa.Numeric(10, 2), nullable=False),
        sa.Column("categoria", sa.String(100), nullable=True),
        sa.Column("ricorrente", sa.Boolean(), nullable=True),
        sa.Column("data", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_spese_gestione_id", "spese_gestione", ["id"], unique=False)

    op.create_table(
        "clienti",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("cognome", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("telefono", sa.String(), nullable=True),
        sa.Column("indirizzo", sa.String(), nullable=True),
        sa.Column("citta", sa.String(), nullable=True),
        sa.Column("cap", sa.String(), nullable=True),
        sa.Column("provincia", sa.String(), nullable=True),
        sa.Column("partita_iva", sa.String(), nullable=True),
        sa.Column("codice_fiscale", sa.String(), nullable=True),
        sa.Column("tipo", sa.String(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clienti_id", "clienti", ["id"], unique=False)

    op.create_table(
        "prodotti",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("descrizione", sa.String(500), nullable=True),
        sa.Column("sku", sa.String(100), nullable=False),
        sa.Column("quantita", sa.Integer(), nullable=False),
        sa.Column("quantita_minima", sa.Integer(), nullable=False),
        sa.Column("prezzo_acquisto", sa.Numeric(10, 2), nullable=True),
        sa.Column("prezzo_vendita", sa.Numeric(10, 2), nullable=True),
        sa.Column("categoria_id", sa.Integer(), sa.ForeignKey("categorie.id"), nullable=True),
        sa.Column("ubicazione_id", sa.Integer(), sa.ForeignKey("ubicazioni.id"), nullable=True),
        sa.Column("stato_conservazione", sa.String(50), nullable=True),
        sa.Column("lingua", sa.String(50), nullable=True),
        sa.Column("foto_path", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku"),
    )
    op.create_index("ix_prodotti_id", "prodotti", ["id"], unique=False)

    op.create_table(
        "movimenti",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("prodotto_id", sa.Integer(), sa.ForeignKey("prodotti.id"), nullable=False),
        sa.Column("tipo", sa.Enum("carico", "scarico", name="tipomovimento"), nullable=False),
        sa.Column("quantita", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column("data_movimento", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("fornitore_id", sa.Integer(), sa.ForeignKey("fornitori.id"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_movimenti_id", "movimenti", ["id"], unique=False)
    op.create_index("ix_movimenti_prodotto_data", "movimenti", ["prodotto_id", "data_movimento"])

    op.create_table(
        "reset_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("utente_id", sa.Integer(), sa.ForeignKey("utenti.id"), nullable=False),
        sa.Column("token", sa.String(36), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reset_tokens_id", "reset_tokens", ["id"], unique=False)
    op.create_index("ix_reset_tokens_token", "reset_tokens", ["token"], unique=True)

    op.create_table(
        "fatture",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("numero_fattura", sa.String(), nullable=False),
        sa.Column("data_fattura", sa.Date(), nullable=False),
        sa.Column("cliente", sa.String(), nullable=False),
        sa.Column("importo", sa.Float(), nullable=False),
        sa.Column("tipo", sa.Enum("attiva", "passiva", name="tipofattura"), nullable=False),
        sa.Column("pagata", sa.Boolean(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("file_path", sa.String(), nullable=True),
        sa.Column("nome_file", sa.String(), nullable=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clienti.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("tipo_documento", sa.String(), nullable=True),
        sa.Column("imponibile", sa.Float(), nullable=True),
        sa.Column("aliquota_iva", sa.Float(), nullable=True),
        sa.Column("importo_iva", sa.Float(), nullable=True),
        sa.Column("nota_credito_di", sa.Integer(), sa.ForeignKey("fatture.id", ondelete="SET NULL"), nullable=True),
        sa.Column("annullata", sa.Boolean(), nullable=True),
        sa.Column("auto_generata", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fatture_id", "fatture", ["id"], unique=False)

    op.create_table(
        "ordini",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("numero_ordine", sa.String(), nullable=False),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clienti.id", ondelete="SET NULL"), nullable=True),
        sa.Column("cliente_nome", sa.String(), nullable=True),
        sa.Column("stato", sa.Enum("bozza", "confermato", "spedito", "completato", "annullato", name="statoordine"), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("data_ordine", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("data_completamento", sa.DateTime(timezone=True), nullable=True),
        sa.Column("totale", sa.Float(), nullable=True),
        sa.Column("corriere", sa.String(), nullable=True),
        sa.Column("tracking_number", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("numero_ordine"),
    )
    op.create_index("ix_ordini_id", "ordini", ["id"], unique=False)

    # Aggiunge ordine_id a fatture (FK verso ordini, creato dopo ordini)
    op.add_column("fatture", sa.Column("ordine_id", sa.Integer(), sa.ForeignKey("ordini.id", ondelete="SET NULL"), nullable=True))

    op.create_table(
        "righe_ordine",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ordine_id", sa.Integer(), sa.ForeignKey("ordini.id", ondelete="CASCADE"), nullable=False),
        sa.Column("prodotto_id", sa.Integer(), sa.ForeignKey("prodotti.id"), nullable=False),
        sa.Column("quantita", sa.Integer(), nullable=False),
        sa.Column("prezzo_unitario", sa.Float(), nullable=False),
        sa.Column("subtotale", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_righe_ordine_id", "righe_ordine", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_righe_ordine_id", table_name="righe_ordine")
    op.drop_table("righe_ordine")
    op.drop_column("fatture", "ordine_id")
    op.drop_index("ix_ordini_id", table_name="ordini")
    op.drop_table("ordini")
    op.drop_index("ix_fatture_id", table_name="fatture")
    op.drop_table("fatture")
    op.drop_index("ix_reset_tokens_token", table_name="reset_tokens")
    op.drop_index("ix_reset_tokens_id", table_name="reset_tokens")
    op.drop_table("reset_tokens")
    op.drop_index("ix_movimenti_prodotto_data", table_name="movimenti")
    op.drop_index("ix_movimenti_id", table_name="movimenti")
    op.drop_table("movimenti")
    op.drop_index("ix_prodotti_id", table_name="prodotti")
    op.drop_table("prodotti")
    op.drop_index("ix_clienti_id", table_name="clienti")
    op.drop_table("clienti")
    op.drop_index("ix_spese_gestione_id", table_name="spese_gestione")
    op.drop_table("spese_gestione")
    op.drop_index("ix_dati_storici_id", table_name="dati_storici")
    op.drop_table("dati_storici")
    op.drop_index("ix_utenti_username", table_name="utenti")
    op.drop_index("ix_utenti_id", table_name="utenti")
    op.drop_table("utenti")
    op.drop_index("ix_ubicazioni_id", table_name="ubicazioni")
    op.drop_table("ubicazioni")
    op.drop_index("ix_fornitori_id", table_name="fornitori")
    op.drop_table("fornitori")
    op.drop_index("ix_categorie_id", table_name="categorie")
    op.drop_table("categorie")
    op.execute("DROP TYPE IF EXISTS tipomovimento")
    op.execute("DROP TYPE IF EXISTS tipofattura")
    op.execute("DROP TYPE IF EXISTS statoordine")
