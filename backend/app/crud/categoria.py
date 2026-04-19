import re
import unicodedata
from sqlalchemy.orm import Session, selectinload
from ..models.categoria import Categoria
from ..schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaReorder
from typing import List, Optional


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _slugify(text: str) -> str:
    """Genera uno slug da un testo, gestendo caratteri accentati italiani."""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s]+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text


def _ensure_unique_slug(db: Session, slug: str, exclude_id: Optional[int] = None) -> str:
    """Garantisce che lo slug sia unico, aggiungendo un suffisso numerico se necessario."""
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


def _would_create_cycle(db: Session, categoria_id: int, new_parent_id: int) -> bool:
    """Verifica se impostare new_parent_id come padre di categoria_id creerebbe un ciclo."""
    if categoria_id == new_parent_id:
        return True
    # Risale l'albero partendo da new_parent_id
    current_id = new_parent_id
    visited = set()
    while current_id is not None:
        if current_id in visited:
            return True
        visited.add(current_id)
        if current_id == categoria_id:
            return True
        parent = db.query(Categoria).filter(Categoria.id == current_id).first()
        if parent is None:
            break
        current_id = parent.parent_id
    return False


def _calculate_level(db: Session, parent_id: Optional[int]) -> int:
    """Calcola il livello di una categoria in base al parent."""
    if parent_id is None:
        return 0
    parent = db.query(Categoria).filter(Categoria.id == parent_id).first()
    if parent is None:
        return 0
    return parent.level + 1


def _update_subtree_levels(db: Session, categoria: Categoria) -> None:
    """Aggiorna ricorsivamente i livelli di tutti i discendenti."""
    for figlio in categoria.figli:
        figlio.level = categoria.level + 1
        _update_subtree_levels(db, figlio)


# ---------------------------------------------------------------------------
# Read operations
# ---------------------------------------------------------------------------

def get_categoria(db: Session, categoria_id: int) -> Optional[Categoria]:
    return db.query(Categoria).filter(Categoria.id == categoria_id).first()


def get_categoria_by_slug(db: Session, slug: str) -> Optional[Categoria]:
    return db.query(Categoria).filter(Categoria.slug == slug).first()


def get_categorie(
    db: Session,
    skip: int = 0,
    limit: int = 1000,
    only_active: Optional[bool] = None,
    show_in_store: Optional[bool] = None,
    show_in_warehouse: Optional[bool] = None,
) -> List[Categoria]:
    query = db.query(Categoria)
    if only_active is True:
        query = query.filter(Categoria.is_active.is_(True))
    if show_in_store is True:
        query = query.filter(Categoria.show_in_store.is_(True))
    if show_in_warehouse is True:
        query = query.filter(Categoria.show_in_warehouse.is_(True))
    return query.order_by(Categoria.sort_order, Categoria.nome).offset(skip).limit(limit).all()


def get_categorie_radice(db: Session) -> List[Categoria]:
    """Restituisce solo le categorie senza padre (livello 0)."""
    return db.query(Categoria).filter(Categoria.parent_id.is_(None)).all()


def build_tree(
    db: Session,
    only_active: Optional[bool] = None,
    show_in_store: Optional[bool] = None,
    show_in_warehouse: Optional[bool] = None,
) -> List[Categoria]:
    """Restituisce le radici con i figli già caricati (eager loading ricorsivo)."""
    query = (
        db.query(Categoria)
        .filter(Categoria.parent_id.is_(None))
        .options(
            selectinload(Categoria.figli)
            .selectinload(Categoria.figli)
            .selectinload(Categoria.figli)
        )
        .order_by(Categoria.sort_order, Categoria.nome)
    )
    if only_active is True:
        query = query.filter(Categoria.is_active.is_(True))
    if show_in_store is True:
        query = query.filter(Categoria.show_in_store.is_(True))
    if show_in_warehouse is True:
        query = query.filter(Categoria.show_in_warehouse.is_(True))
    return query.all()


def build_category_path(db: Session, categoria_id: int) -> List[Categoria]:
    """Restituisce il percorso dalla radice alla categoria (breadcrumb)."""
    path = []
    current = get_categoria(db, categoria_id)
    while current is not None:
        path.insert(0, current)
        if current.parent_id is None:
            break
        current = get_categoria(db, current.parent_id)
    return path


def get_descendant_ids(db: Session, categoria_id: int) -> List[int]:
    """Restituisce tutti gli ID discendenti di una categoria."""
    result = []
    figli = db.query(Categoria).filter(Categoria.parent_id == categoria_id).all()
    for figlio in figli:
        result.append(figlio.id)
        result.extend(get_descendant_ids(db, figlio.id))
    return result


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------

def create_categoria(db: Session, data: CategoriaCreate) -> Categoria:
    # Genera slug
    slug = data.slug or _slugify(data.nome)
    slug = _ensure_unique_slug(db, slug)

    # Calcola level
    level = _calculate_level(db, data.parent_id)

    db_categoria = Categoria(
        nome=data.nome,
        descrizione=data.descrizione,
        parent_id=data.parent_id,
        slug=slug,
        level=level,
        sort_order=data.sort_order,
        is_active=data.is_active,
        show_in_store=data.show_in_store,
        show_in_warehouse=data.show_in_warehouse,
    )
    db_categoria.set_metadata(data.metadata)
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    return db_categoria


def update_categoria(db: Session, categoria_id: int, data: CategoriaUpdate) -> Optional[Categoria]:
    db_categoria = get_categoria(db, categoria_id)
    if not db_categoria:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # Gestisci slug
    if "nome" in update_data and "slug" not in update_data:
        new_slug = _slugify(update_data["nome"])
        update_data["slug"] = _ensure_unique_slug(db, new_slug, exclude_id=categoria_id)
    elif "slug" in update_data and update_data["slug"]:
        update_data["slug"] = _ensure_unique_slug(db, update_data["slug"], exclude_id=categoria_id)

    # Controlla cicli se si cambia parent
    if "parent_id" in update_data and update_data["parent_id"] is not None:
        if _would_create_cycle(db, categoria_id, update_data["parent_id"]):
            raise ValueError("L'operazione creerebbe un ciclo nella gerarchia delle categorie")

    # Gestisci metadata
    if "metadata" in update_data:
        meta = update_data.pop("metadata")
        db_categoria.set_metadata(meta or {})

    for field, value in update_data.items():
        setattr(db_categoria, field, value)

    # Ricalcola level se parent è cambiato
    if "parent_id" in update_data:
        db_categoria.level = _calculate_level(db, db_categoria.parent_id)
        db.flush()
        # Aggiorna livelli discendenti
        db.refresh(db_categoria)
        _update_subtree_levels(db, db_categoria)

    db.commit()
    db.refresh(db_categoria)
    return db_categoria


def delete_categoria(db: Session, categoria_id: int) -> bool:
    db_categoria = get_categoria(db, categoria_id)
    if not db_categoria:
        return False
    db.delete(db_categoria)
    db.commit()
    return True


def reorder_categoria(db: Session, categoria_id: int, data: CategoriaReorder) -> Optional[Categoria]:
    """Cambia il parent e/o il sort_order di una categoria."""
    db_categoria = get_categoria(db, categoria_id)
    if not db_categoria:
        return None

    # Controlla cicli
    if data.new_parent_id is not None:
        if _would_create_cycle(db, categoria_id, data.new_parent_id):
            raise ValueError("L'operazione creerebbe un ciclo nella gerarchia delle categorie")

    db_categoria.parent_id = data.new_parent_id
    db_categoria.sort_order = data.new_sort_order
    db_categoria.level = _calculate_level(db, data.new_parent_id)
    db.flush()
    db.refresh(db_categoria)
    _update_subtree_levels(db, db_categoria)

    db.commit()
    db.refresh(db_categoria)
    return db_categoria


def validate_tree(db: Session) -> List[str]:
    """Valida l'integrità dell'albero categorie. Restituisce una lista di errori."""
    errors = []
    all_categorie = db.query(Categoria).all()
    id_set = {c.id for c in all_categorie}
    slug_seen: dict = {}

    for cat in all_categorie:
        # Controlla parent_id valido
        if cat.parent_id is not None and cat.parent_id not in id_set:
            errors.append(f"Categoria ID={cat.id} '{cat.nome}': parent_id={cat.parent_id} non esiste")

        # Controlla slug duplicati
        if cat.slug:
            if cat.slug in slug_seen:
                errors.append(f"Slug duplicato '{cat.slug}': ID={cat.id} e ID={slug_seen[cat.slug]}")
            else:
                slug_seen[cat.slug] = cat.id

        # Controlla cicli (percorso verso radice)
        visited = set()
        current = cat
        while current.parent_id is not None:
            if current.id in visited:
                errors.append(f"Ciclo rilevato a partire dalla categoria ID={cat.id} '{cat.nome}'")
                break
            visited.add(current.id)
            parent = db.query(Categoria).filter(Categoria.id == current.parent_id).first()
            if parent is None:
                break
            current = parent

    return errors

