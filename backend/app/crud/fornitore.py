from sqlalchemy.orm import Session
from ..models.fornitore import Fornitore
from ..schemas.fornitore import FornitoreCreate, FornitoreUpdate
from typing import List, Optional


def get_fornitore(db: Session, fornitore_id: int) -> Optional[Fornitore]:
    return db.query(Fornitore).filter(Fornitore.id == fornitore_id).first()


def get_fornitori(db: Session, skip: int = 0, limit: int = 100) -> List[Fornitore]:
    return db.query(Fornitore).offset(skip).limit(limit).all()


def create_fornitore(db: Session, fornitore: FornitoreCreate) -> Fornitore:
    db_fornitore = Fornitore(**fornitore.model_dump())
    db.add(db_fornitore)
    db.commit()
    db.refresh(db_fornitore)
    return db_fornitore


def update_fornitore(db: Session, fornitore_id: int, fornitore: FornitoreUpdate) -> Optional[Fornitore]:
    db_fornitore = get_fornitore(db, fornitore_id)
    if not db_fornitore:
        return None
    for field, value in fornitore.model_dump(exclude_unset=True).items():
        setattr(db_fornitore, field, value)
    db.commit()
    db.refresh(db_fornitore)
    return db_fornitore


def delete_fornitore(db: Session, fornitore_id: int) -> bool:
    db_fornitore = get_fornitore(db, fornitore_id)
    if not db_fornitore:
        return False
    db.delete(db_fornitore)
    db.commit()
    return True
