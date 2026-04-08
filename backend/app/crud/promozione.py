from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime, timezone
from ..models.promozione import Promozione
from ..schemas.promozione import PromozioneCreate, PromozioneUpdate


def get_promozioni(db: Session, skip: int = 0, limit: int = 100, only_active: bool = False) -> List[Promozione]:
    query = db.query(Promozione)
    if only_active:
        now = datetime.now(timezone.utc)
        query = query.filter(
            Promozione.is_active.is_(True),
            or_(Promozione.data_inizio.is_(None), Promozione.data_inizio <= now),
            or_(Promozione.data_fine.is_(None), Promozione.data_fine >= now),
        )
    return query.offset(skip).limit(limit).all()


def get_promozione(db: Session, promozione_id: int) -> Optional[Promozione]:
    return db.query(Promozione).filter(Promozione.id == promozione_id).first()


def create_promozione(db: Session, data: PromozioneCreate) -> Promozione:
    promo = Promozione(**data.model_dump())
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


def update_promozione(db: Session, promozione_id: int, data: PromozioneUpdate) -> Optional[Promozione]:
    promo = get_promozione(db, promozione_id)
    if not promo:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(promo, field, value)
    db.commit()
    db.refresh(promo)
    return promo


def delete_promozione(db: Session, promozione_id: int) -> bool:
    promo = get_promozione(db, promozione_id)
    if not promo:
        return False
    db.delete(promo)
    db.commit()
    return True


def get_promozioni_attive_per_prodotto(db: Session, prodotto_id: int, categoria_id: Optional[int] = None) -> List[Promozione]:
    """Restituisce promozioni attive che matchano prodotto_id O categoria_id, incluse le promozioni globali."""
    now = datetime.now(timezone.utc)
    query = db.query(Promozione).filter(
        Promozione.is_active.is_(True),
        or_(Promozione.data_inizio.is_(None), Promozione.data_inizio <= now),
        or_(Promozione.data_fine.is_(None), Promozione.data_fine >= now),
    )
    # Promozioni globali (senza prodotto e categoria) OPPURE specifiche per prodotto/categoria
    filter_conditions = [
        and_(Promozione.prodotto_id.is_(None), Promozione.categoria_id.is_(None))  # globale
    ]
    if categoria_id is not None:
        filter_conditions.append(Promozione.prodotto_id == prodotto_id)
        filter_conditions.append(Promozione.categoria_id == categoria_id)
    else:
        filter_conditions.append(Promozione.prodotto_id == prodotto_id)
    query = query.filter(or_(*filter_conditions))
    return query.all()
