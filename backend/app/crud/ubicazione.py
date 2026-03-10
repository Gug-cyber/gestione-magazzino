from sqlalchemy.orm import Session
from ..models.ubicazione import Ubicazione
from ..schemas.ubicazione import UbicazioneCreate, UbicazioneUpdate
from typing import List, Optional


def get_ubicazione(db: Session, ubicazione_id: int) -> Optional[Ubicazione]:
    return db.query(Ubicazione).filter(Ubicazione.id == ubicazione_id).first()


def get_ubicazioni(db: Session, skip: int = 0, limit: int = 100) -> List[Ubicazione]:
    return db.query(Ubicazione).offset(skip).limit(limit).all()


def create_ubicazione(db: Session, ubicazione: UbicazioneCreate) -> Ubicazione:
    db_ubicazione = Ubicazione(**ubicazione.model_dump())
    db.add(db_ubicazione)
    db.commit()
    db.refresh(db_ubicazione)
    return db_ubicazione


def update_ubicazione(db: Session, ubicazione_id: int, ubicazione: UbicazioneUpdate) -> Optional[Ubicazione]:
    db_ubicazione = get_ubicazione(db, ubicazione_id)
    if not db_ubicazione:
        return None
    for field, value in ubicazione.model_dump(exclude_unset=True).items():
        setattr(db_ubicazione, field, value)
    db.commit()
    db.refresh(db_ubicazione)
    return db_ubicazione


def delete_ubicazione(db: Session, ubicazione_id: int) -> bool:
    db_ubicazione = get_ubicazione(db, ubicazione_id)
    if not db_ubicazione:
        return False
    db.delete(db_ubicazione)
    db.commit()
    return True
