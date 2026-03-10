from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import List, Optional
from ..models.dato_storico import DatoStorico
from ..schemas.dato_storico import DatoStoricoCreate


def get_dati_storici(
    db: Session,
    tipo: Optional[str] = None,
    anno: Optional[int] = None,
    skip: int = 0,
    limit: int = 10000,
) -> List[DatoStorico]:
    query = db.query(DatoStorico)
    if tipo:
        query = query.filter(DatoStorico.tipo == tipo)
    if anno:
        query = query.filter(extract("year", DatoStorico.data) == anno)
    return query.order_by(DatoStorico.data.desc()).offset(skip).limit(limit).all()


def create_dato_storico(db: Session, dato: DatoStoricoCreate) -> DatoStorico:
    db_dato = DatoStorico(**dato.model_dump())
    db.add(db_dato)
    db.commit()
    db.refresh(db_dato)
    return db_dato


def create_dati_storici_bulk(db: Session, dati: List[DatoStoricoCreate]) -> List[DatoStorico]:
    db_dati = [DatoStorico(**d.model_dump()) for d in dati]
    db.add_all(db_dati)
    db.commit()
    return db_dati


def delete_dati_storici_by_tipo(db: Session, tipo: str) -> int:
    deleted = db.query(DatoStorico).filter(DatoStorico.tipo == tipo).delete()
    db.commit()
    return deleted
