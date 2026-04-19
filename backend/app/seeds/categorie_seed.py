"""
Seed data per le categorie TCG e Videogiochi.

Eseguire con:
    python -m app.seeds.categorie_seed
"""
import re
import unicodedata
import sys
import os

# Aggiungi il path del backend al sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.categoria import Categoria


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s]+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text


def _ensure_unique_slug(db, slug: str, exclude_id=None) -> str:
    base_slug = slug
    counter = 1
    while True:
        query = db.query(Categoria).filter(Categoria.slug == slug)
        if exclude_id is not None:
            query = query.filter(Categoria.id != exclude_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def get_or_create(db, nome: str, parent_id=None, sort_order: int = 0, metadata: dict = None) -> Categoria:
    slug = _slugify(nome)
    existing = db.query(Categoria).filter(Categoria.slug == slug).first()
    if existing:
        print(f"  [skip] '{nome}' (slug: {slug}) — già esistente")
        return existing

    slug = _ensure_unique_slug(db, slug)
    level = 0
    if parent_id is not None:
        parent = db.query(Categoria).filter(Categoria.id == parent_id).first()
        if parent:
            level = parent.level + 1

    cat = Categoria(
        nome=nome,
        slug=slug,
        parent_id=parent_id,
        level=level,
        sort_order=sort_order,
        is_active=True,
        show_in_store=True,
        show_in_warehouse=True,
    )
    cat.set_metadata(metadata or {})
    db.add(cat)
    db.flush()
    print(f"  [create] '{nome}' (slug: {slug}, level: {level})")
    return cat


SEED_DATA = [
    {
        "nome": "Carte collezionabili",
        "sort_order": 1,
        "metadata": {"tipo": "tcg", "icona": "🃏"},
        "figli": [
            {
                "nome": "Pokémon",
                "sort_order": 1,
                "metadata": {"brand": "pokemon", "icona": "⚡"},
                "figli": [
                    {"nome": "Prodotti sigillati", "sort_order": 1, "metadata": {"tipo": "sealed"}},
                    {"nome": "Carte singole", "sort_order": 2, "metadata": {"tipo": "singles"}},
                    {"nome": "Carte gradate", "sort_order": 3, "metadata": {"tipo": "graded"}},
                ],
            },
            {
                "nome": "Magic",
                "sort_order": 2,
                "metadata": {"brand": "magic", "icona": "✨"},
                "figli": [
                    {"nome": "Prodotti sigillati", "sort_order": 1, "metadata": {"tipo": "sealed"}},
                    {"nome": "Carte singole", "sort_order": 2, "metadata": {"tipo": "singles"}},
                    {"nome": "Carte gradate", "sort_order": 3, "metadata": {"tipo": "graded"}},
                ],
            },
            {
                "nome": "Yu-Gi-Oh!",
                "sort_order": 3,
                "metadata": {"brand": "yugioh", "icona": "🎴"},
                "figli": [
                    {"nome": "Prodotti sigillati", "sort_order": 1, "metadata": {"tipo": "sealed"}},
                    {"nome": "Carte singole", "sort_order": 2, "metadata": {"tipo": "singles"}},
                    {"nome": "Carte gradate", "sort_order": 3, "metadata": {"tipo": "graded"}},
                ],
            },
        ],
    },
    {
        "nome": "Videogiochi",
        "sort_order": 2,
        "metadata": {"tipo": "videogames", "icona": "🎮"},
        "figli": [
            {"nome": "PlayStation", "sort_order": 1, "metadata": {"brand": "sony", "piattaforma": "PS1"}},
            {"nome": "PlayStation 2", "sort_order": 2, "metadata": {"brand": "sony", "piattaforma": "PS2"}},
            {"nome": "Nintendo", "sort_order": 3, "metadata": {"brand": "nintendo"}},
        ],
    },
]


def seed_recursive(db, items, parent_id=None):
    for item in items:
        cat = get_or_create(
            db,
            nome=item["nome"],
            parent_id=parent_id,
            sort_order=item.get("sort_order", 0),
            metadata=item.get("metadata"),
        )
        if item.get("figli"):
            seed_recursive(db, item["figli"], parent_id=cat.id)


def main():
    db = SessionLocal()
    try:
        print("Seeding categorie...")
        seed_recursive(db, SEED_DATA)
        db.commit()
        print("✅ Seed completato!")
    except Exception as e:
        db.rollback()
        print(f"❌ Errore: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
