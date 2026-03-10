from sqlalchemy.orm import Session
from ..models.prodotto import Prodotto
from ..schemas.prodotto import ProdottoCreate, ProdottoUpdate
from typing import List, Optional


def get_prodotto(db: Session, prodotto_id: int) -> Optional[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()


def get_prodotto_by_sku(db: Session, sku: str) -> Optional[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.sku == sku).first()


def get_prodotti(db: Session, skip: int = 0, limit: int = 100) -> List[Prodotto]:
    return db.query(Prodotto).offset(skip).limit(limit).all()


def get_prodotti_sotto_scorta(db: Session) -> List[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.quantita < Prodotto.quantita_minima).all()


def create_prodotto(db: Session, prodotto: ProdottoCreate) -> Prodotto:
    db_prodotto = Prodotto(**prodotto.model_dump())
    db.add(db_prodotto)
    db.commit()
    db.refresh(db_prodotto)
    return db_prodotto


def update_prodotto(db: Session, prodotto_id: int, prodotto: ProdottoUpdate) -> Optional[Prodotto]:
    db_prodotto = get_prodotto(db, prodotto_id)
    if not db_prodotto:
        return None
    for field, value in prodotto.model_dump(exclude_unset=True).items():
        setattr(db_prodotto, field, value)
    db.commit()
    db.refresh(db_prodotto)
    return db_prodotto


def delete_prodotto(db: Session, prodotto_id: int) -> bool:
    db_prodotto = get_prodotto(db, prodotto_id)
    if not db_prodotto:
        return False
    db.delete(db_prodotto)
    db.commit()
    return True
