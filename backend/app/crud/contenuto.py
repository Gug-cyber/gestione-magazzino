from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.contenuto import Contenuto
from ..schemas.contenuto import ContenutoCreate, ContenutoUpdate


def get_contenuti(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    pubblicato: Optional[bool] = None
) -> List[Contenuto]:
    query = db.query(Contenuto)
    if pubblicato is not None:
        query = query.filter(Contenuto.pubblicato == pubblicato)
    return query.order_by(Contenuto.created_at.desc()).offset(skip).limit(limit).all()


def get_contenuto(db: Session, contenuto_id: int) -> Optional[Contenuto]:
    return db.query(Contenuto).filter(Contenuto.id == contenuto_id).first()


def get_contenuto_by_slug(db: Session, slug: str) -> Optional[Contenuto]:
    return db.query(Contenuto).filter(Contenuto.slug == slug).first()


def create_contenuto(db: Session, contenuto: ContenutoCreate, autore_id: int) -> Contenuto:
    db_contenuto = Contenuto(**contenuto.model_dump(), autore_id=autore_id)
    db.add(db_contenuto)
    db.commit()
    db.refresh(db_contenuto)
    return db_contenuto


def update_contenuto(
    db: Session,
    contenuto_id: int,
    contenuto: ContenutoUpdate
) -> Optional[Contenuto]:
    db_contenuto = get_contenuto(db, contenuto_id)
    if not db_contenuto:
        return None

    for field, value in contenuto.model_dump(exclude_unset=True).items():
        setattr(db_contenuto, field, value)

    db.commit()
    db.refresh(db_contenuto)
    return db_contenuto


def delete_contenuto(db: Session, contenuto_id: int) -> bool:
    db_contenuto = get_contenuto(db, contenuto_id)
    if not db_contenuto:
        return False
    db.delete(db_contenuto)
    db.commit()
    return True
