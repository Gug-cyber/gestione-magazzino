from sqlalchemy.orm import Session
from ..models.movimento import Movimento, TipoMovimento
from ..models.prodotto import Prodotto
from ..schemas.movimento import MovimentoCreate, MovimentoUpdate
from typing import List, Optional
from fastapi import HTTPException


def get_movimento(db: Session, movimento_id: int) -> Optional[Movimento]:
    return db.query(Movimento).filter(Movimento.id == movimento_id).first()


def get_movimenti(db: Session, skip: int = 0, limit: int = 100) -> List[Movimento]:
    return db.query(Movimento).order_by(Movimento.data_movimento.desc()).offset(skip).limit(limit).all()


def get_movimenti_by_prodotto(db: Session, prodotto_id: int) -> List[Movimento]:
    return db.query(Movimento).filter(Movimento.prodotto_id == prodotto_id).all()


def create_movimento(db: Session, movimento: MovimentoCreate) -> Movimento:
    db_movimento = Movimento(**movimento.model_dump())
    db.add(db_movimento)

    prodotto = db.query(Prodotto).filter(Prodotto.id == movimento.prodotto_id).first()
    if prodotto:
        if movimento.tipo == TipoMovimento.carico:
            prodotto.quantita += movimento.quantita
        elif movimento.tipo == TipoMovimento.scarico:
            if prodotto.quantita < movimento.quantita:
                raise HTTPException(
                    status_code=400,
                    detail="Quantità insufficiente in magazzino per lo scarico"
                )
            prodotto.quantita -= movimento.quantita

    db.commit()
    db.refresh(db_movimento)
    return db_movimento


def update_movimento(db: Session, movimento_id: int, movimento: MovimentoUpdate) -> Optional[Movimento]:
    db_movimento = get_movimento(db, movimento_id)
    if not db_movimento:
        return None
    for field, value in movimento.model_dump(exclude_unset=True).items():
        setattr(db_movimento, field, value)
    db.commit()
    db.refresh(db_movimento)
    return db_movimento


def delete_movimento(db: Session, movimento_id: int) -> bool:
    db_movimento = get_movimento(db, movimento_id)
    if not db_movimento:
        return False
    db.delete(db_movimento)
    db.commit()
    return True
