from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.spesa_gestione import SpesaGestione
from ..schemas.spesa_gestione import SpesaGestioneCreate, SpesaGestioneUpdate


def get_spese(db: Session, skip: int = 0, limit: int = 100) -> List[SpesaGestione]:
    return db.query(SpesaGestione).order_by(SpesaGestione.data.desc()).offset(skip).limit(limit).all()


def get_spesa(db: Session, spesa_id: int) -> Optional[SpesaGestione]:
    return db.query(SpesaGestione).filter(SpesaGestione.id == spesa_id).first()


def create_spesa(db: Session, spesa: SpesaGestioneCreate) -> SpesaGestione:
    data = spesa.model_dump()
    db_spesa = SpesaGestione(**data)
    db.add(db_spesa)
    db.commit()
    db.refresh(db_spesa)
    return db_spesa


def update_spesa(db: Session, spesa_id: int, spesa: SpesaGestioneUpdate) -> Optional[SpesaGestione]:
    db_spesa = get_spesa(db, spesa_id)
    if not db_spesa:
        return None
    for field, value in spesa.model_dump(exclude_unset=True).items():
        setattr(db_spesa, field, value)
    db.commit()
    db.refresh(db_spesa)
    return db_spesa


def delete_spesa(db: Session, spesa_id: int) -> bool:
    db_spesa = get_spesa(db, spesa_id)
    if not db_spesa:
        return False
    db.delete(db_spesa)
    db.commit()
    return True
