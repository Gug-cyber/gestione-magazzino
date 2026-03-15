from sqlalchemy.orm import Session
from ..models.prodotto import Prodotto
from ..schemas.prodotto import ProdottoCreate, ProdottoUpdate
from typing import List, Optional


def get_prodotto(db: Session, prodotto_id: int) -> Optional[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()


def get_prodotto_by_sku(db: Session, sku: str) -> Optional[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.sku == sku).first()


def get_prodotti(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    categoria_id: Optional[int] = None,
    ubicazione_id: Optional[int] = None,
    stato_conservazione: Optional[str] = None,
) -> List[Prodotto]:
    query = db.query(Prodotto)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Prodotto.nome.ilike(term) | Prodotto.sku.ilike(term) | Prodotto.descrizione.ilike(term)
        )
    if categoria_id:
        query = query.filter(Prodotto.categoria_id == categoria_id)
    if ubicazione_id:
        query = query.filter(Prodotto.ubicazione_id == ubicazione_id)
    if stato_conservazione:
        query = query.filter(Prodotto.stato_conservazione == stato_conservazione)
    return query.order_by(Prodotto.nome).offset(skip).limit(limit).all()


def count_prodotti(
    db: Session,
    search: Optional[str] = None,
    categoria_id: Optional[int] = None,
    ubicazione_id: Optional[int] = None,
    stato_conservazione: Optional[str] = None,
) -> int:
    query = db.query(Prodotto)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Prodotto.nome.ilike(term) | Prodotto.sku.ilike(term) | Prodotto.descrizione.ilike(term)
        )
    if categoria_id:
        query = query.filter(Prodotto.categoria_id == categoria_id)
    if ubicazione_id:
        query = query.filter(Prodotto.ubicazione_id == ubicazione_id)
    if stato_conservazione:
        query = query.filter(Prodotto.stato_conservazione == stato_conservazione)
    return query.count()


def get_prodotti_sotto_scorta(db: Session) -> List[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.quantita < Prodotto.quantita_minima).all()


def create_prodotto(db: Session, prodotto: ProdottoCreate) -> Prodotto:
    db_prodotto = Prodotto(**prodotto.model_dump())
    db.add(db_prodotto)
    db.commit()
    db.refresh(db_prodotto)

    if db_prodotto.quantita > 0:
        from ..models.movimento import Movimento, TipoMovimento
        from datetime import datetime

        movimento = Movimento(
            prodotto_id=db_prodotto.id,
            tipo=TipoMovimento.carico,
            quantita=db_prodotto.quantita,
            data_movimento=datetime.now(),
            note="Carico iniziale alla creazione prodotto",
        )
        db.add(movimento)
        db.commit()

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
