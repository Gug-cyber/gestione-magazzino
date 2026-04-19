"""add parent_id to categorie (hierarchical tree)

Revision ID: 0028
Revises: 0027
Create Date: 2026-04-19 00:00:00.000000

Aggiunge la colonna parent_id alla tabella categorie per supportare
la struttura ad albero a 3 livelli (Categoria → Sottocategoria → Tipo).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0028"
down_revision: Union[str, None] = "0027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("categorie")]

    if "parent_id" not in columns:
        op.add_column(
            "categorie",
            sa.Column("parent_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_categorie_parent_id",
            "categorie",
            "categorie",
            ["parent_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_index("ix_categorie_parent_id", "categorie", ["parent_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = [i["name"] for i in inspector.get_indexes("categorie")]
    columns = [c["name"] for c in inspector.get_columns("categorie")]

    if "ix_categorie_parent_id" in indexes:
        op.drop_index("ix_categorie_parent_id", table_name="categorie")
    if "parent_id" in columns:
        op.drop_constraint("fk_categorie_parent_id", "categorie", type_="foreignkey")
        op.drop_column("categorie", "parent_id")
