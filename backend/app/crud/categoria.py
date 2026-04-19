from sqlalchemy.orm import Session
from ..models.categoria import Categoria
from ..schemas.categoria import CategoriaCreate, CategoriaUpdate
from typing import List, Optional


def get_categoria(db: Session, categoria_id: int) -> Optional[Categoria]:
    return db.query(Categoria).filter(Categoria.id == categoria_id).first()


def get_categorie(db: Session, skip: int = 0, limit: int = 1000) -> List[Categoria]:
    return db.query(Categoria).offset(skip).limit(limit).all()


def get_categorie_radice(db: Session) -> List[Categoria]:
    """Restituisce solo le categorie senza padre (livello 1)."""
    return db.query(Categoria).filter(Categoria.parent_id.is_(None)).all()


def get_figli(db: Session, parent_id: int) -> List[Categoria]:
    return db.query(Categoria).filter(Categoria.parent_id == parent_id).all()


def build_tree(db: Session) -> List[Categoria]:
    """Restituisce le radici con i figli già caricati (lazy loading SQLAlchemy)."""
    return get_categorie_radice(db)


def create_categoria(db: Session, categoria: CategoriaCreate) -> Categoria:
    db_categoria = Categoria(**categoria.model_dump())
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    return db_categoria


def update_categoria(db: Session, categoria_id: int, categoria: CategoriaUpdate) -> Optional[Categoria]:
    db_categoria = get_categoria(db, categoria_id)
    if not db_categoria:
        return None
    for field, value in categoria.model_dump(exclude_unset=True).items():
        setattr(db_categoria, field, value)
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
