"""Add CMS tables (contenuti, banner, prodotti_pubblici)

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-03
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "contenuti" not in existing_tables:
        op.create_table(
            "contenuti",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("titolo", sa.String(200), nullable=False),
            sa.Column("slug", sa.String(200), nullable=False),
            sa.Column("tipo", sa.String(50), nullable=False),
            sa.Column("contenuto_html", sa.Text(), nullable=True),
            sa.Column("meta_description", sa.String(300), nullable=True),
            sa.Column("meta_keywords", sa.String(300), nullable=True),
            sa.Column("pubblicato", sa.Boolean(), nullable=True),
            sa.Column("data_pubblicazione", sa.DateTime(timezone=True), nullable=True),
            sa.Column("autore_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["autore_id"], ["utenti.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_contenuti_id", "contenuti", ["id"], unique=False)
        op.create_index("ix_contenuti_slug", "contenuti", ["slug"], unique=True)

    if "banner" not in existing_tables:
        op.create_table(
            "banner",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("titolo", sa.String(200), nullable=False),
            sa.Column("descrizione", sa.String(500), nullable=True),
            sa.Column("immagine_url", sa.String(500), nullable=False),
            sa.Column("link_url", sa.String(500), nullable=True),
            sa.Column("ordine", sa.Integer(), nullable=True),
            sa.Column("attivo", sa.Boolean(), nullable=True),
            sa.Column("data_inizio", sa.DateTime(timezone=True), nullable=True),
            sa.Column("data_fine", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_banner_id", "banner", ["id"], unique=False)

    if "prodotti_pubblici" not in existing_tables:
        op.create_table(
            "prodotti_pubblici",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("prodotto_id", sa.Integer(), nullable=False),
            sa.Column("visibile", sa.Boolean(), nullable=True),
            sa.Column("in_evidenza", sa.Boolean(), nullable=True),
            sa.Column("ordine", sa.Integer(), nullable=True),
            sa.Column("descrizione_estesa", sa.Text(), nullable=True),
            sa.Column("immagini", sa.JSON(), nullable=True),
            sa.Column("seo_title", sa.String(200), nullable=True),
            sa.Column("seo_description", sa.String(300), nullable=True),
            sa.ForeignKeyConstraint(["prodotto_id"], ["prodotti.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_prodotti_pubblici_id", "prodotti_pubblici", ["id"], unique=False)
        op.create_index(
            "ix_prodotti_pubblici_prodotto_id",
            "prodotti_pubblici",
            ["prodotto_id"],
            unique=True,
        )


def downgrade() -> None:
    op.drop_index("ix_prodotti_pubblici_prodotto_id", table_name="prodotti_pubblici")
    op.drop_index("ix_prodotti_pubblici_id", table_name="prodotti_pubblici")
    op.drop_table("prodotti_pubblici")
    op.drop_index("ix_banner_id", table_name="banner")
    op.drop_table("banner")
    op.drop_index("ix_contenuti_slug", table_name="contenuti")
    op.drop_index("ix_contenuti_id", table_name="contenuti")
    op.drop_table("contenuti")
