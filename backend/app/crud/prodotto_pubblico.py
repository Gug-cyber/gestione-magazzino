from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.prodotto_pubblico import ProdottoPubblico
from ..models.prodotto import Prodotto
from ..schemas.prodotto_pubblico import ProdottoPubblicoCreate, ProdottoPubblicoUpdate


def get_prodotto_pubblico(db: Session, prodotto_id: int) -> Optional[ProdottoPubblico]:
    return (
        db.query(ProdottoPubblico)
        .filter(ProdottoPubblico.prodotto_id == prodotto_id)
        .first()
    )


def get_prodotti_pubblici(
    db: Session,
    categoria_id: Optional[int] = None,
    in_evidenza: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> List[Prodotto]:
    """
    Restituisce prodotti visibili nel catalogo con stock disponibile.
    """
    query = (
        db.query(Prodotto)
        .join(ProdottoPubblico, Prodotto.id == ProdottoPubblico.prodotto_id)
        .filter(ProdottoPubblico.visibile.is_(True))
    )

    if categoria_id:
        query = query.filter(Prodotto.categoria_id == categoria_id)

    if in_evidenza:
        query = query.filter(ProdottoPubblico.in_evidenza.is_(True))

    if search:
        term = f"%{search}%"
        query = query.filter(
            (Prodotto.nome.ilike(term)) | (Prodotto.descrizione.ilike(term))
        )

    return (
        query
        .order_by(ProdottoPubblico.ordine, Prodotto.nome)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_prodotto_pubblico(
    db: Session,
    prodotto_pubblico: ProdottoPubblicoCreate
) -> ProdottoPubblico:
    db_prodotto_pubblico = ProdottoPubblico(**prodotto_pubblico.model_dump())
    db.add(db_prodotto_pubblico)
    db.commit()
    db.refresh(db_prodotto_pubblico)
    return db_prodotto_pubblico


def update_prodotto_pubblico(
    db: Session,
    prodotto_id: int,
    prodotto_pubblico: ProdottoPubblicoUpdate
) -> Optional[ProdottoPubblico]:
    db_prodotto_pubblico = get_prodotto_pubblico(db, prodotto_id)
    if not db_prodotto_pubblico:
        return None

    for field, value in prodotto_pubblico.model_dump(exclude_unset=True).items():
        setattr(db_prodotto_pubblico, field, value)

    db.commit()
    db.refresh(db_prodotto_pubblico)
    return db_prodotto_pubblico


def delete_prodotto_pubblico(db: Session, prodotto_id: int) -> bool:
    db_prodotto_pubblico = get_prodotto_pubblico(db, prodotto_id)
    if not db_prodotto_pubblico:
        return False
    db.delete(db_prodotto_pubblico)
    db.commit()
    return True
