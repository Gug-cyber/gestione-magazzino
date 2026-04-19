"""enhance categorie hierarchy with slug, level, sort_order, visibility, metadata

Revision ID: 0029
Revises: 0028
Create Date: 2026-04-19 00:00:00.000000

Aggiunge i campi per il sistema di categorie gerarchiche completo:
slug, level, sort_order, is_active, show_in_store, show_in_warehouse, metadata_json.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0029"
down_revision: Union[str, None] = "0028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("categorie")]
    indexes = [i["name"] for i in inspector.get_indexes("categorie")]

    if "slug" not in columns:
        op.add_column("categorie", sa.Column("slug", sa.String(200), nullable=True))

    if "level" not in columns:
        op.add_column("categorie", sa.Column("level", sa.Integer(), nullable=False, server_default="0"))

    if "sort_order" not in columns:
        op.add_column("categorie", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))

    if "is_active" not in columns:
        op.add_column("categorie", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))

    if "show_in_store" not in columns:
        op.add_column("categorie", sa.Column("show_in_store", sa.Boolean(), nullable=False, server_default=sa.true()))

    if "show_in_warehouse" not in columns:
        op.add_column("categorie", sa.Column("show_in_warehouse", sa.Boolean(), nullable=False, server_default=sa.true()))

    if "metadata_json" not in columns:
        op.add_column("categorie", sa.Column("metadata_json", sa.Text(), nullable=True))

    if "ix_categorie_slug" not in indexes:
        op.create_index("ix_categorie_slug", "categorie", ["slug"], unique=False)

    if "ix_categorie_sort_order" not in indexes:
        op.create_index("ix_categorie_sort_order", "categorie", ["sort_order"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = [i["name"] for i in inspector.get_indexes("categorie")]
    columns = [c["name"] for c in inspector.get_columns("categorie")]

    if "ix_categorie_sort_order" in indexes:
        op.drop_index("ix_categorie_sort_order", table_name="categorie")
    if "ix_categorie_slug" in indexes:
        op.drop_index("ix_categorie_slug", table_name="categorie")

    for col in ["metadata_json", "show_in_warehouse", "show_in_store", "is_active", "sort_order", "level", "slug"]:
        if col in columns:
            op.drop_column("categorie", col)
