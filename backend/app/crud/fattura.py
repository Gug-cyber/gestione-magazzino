import os
from sqlalchemy.orm import Session
from ..models.fattura import Fattura
from ..schemas.fattura import FatturaCreate, FatturaUpdate
from typing import List, Optional
from datetime import date


def get_fatture(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    cliente: Optional[str] = None,
    data_da: Optional[date] = None,
    data_a: Optional[date] = None,
) -> List[Fattura]:
    query = db.query(Fattura)
    if cliente:
        query = query.filter(Fattura.cliente.ilike(f"%{cliente}%"))
    if data_da:
        query = query.filter(Fattura.data_fattura >= data_da)
    if data_a:
        query = query.filter(Fattura.data_fattura <= data_a)
    return query.order_by(Fattura.data_fattura.desc()).offset(skip).limit(limit).all()


def get_fattura(db: Session, fattura_id: int) -> Optional[Fattura]:
    return db.query(Fattura).filter(Fattura.id == fattura_id).first()


def create_fattura(
    db: Session,
    fattura_data: FatturaCreate,
    file_path: Optional[str] = None,
    nome_file: Optional[str] = None,
) -> Fattura:
    db_fattura = Fattura(
        **fattura_data.model_dump(),
        file_path=file_path,
        nome_file=nome_file,
    )
    db.add(db_fattura)
    db.commit()
    db.refresh(db_fattura)
    return db_fattura


def update_fattura(
    db: Session,
    fattura_id: int,
    fattura_update: FatturaUpdate,
) -> Optional[Fattura]:
    db_fattura = get_fattura(db, fattura_id)
    if not db_fattura:
        return None
    for field, value in fattura_update.model_dump(exclude_unset=True).items():
        setattr(db_fattura, field, value)
    db.commit()
    db.refresh(db_fattura)
    return db_fattura


def delete_fattura(db: Session, fattura_id: int) -> bool:
    db_fattura = get_fattura(db, fattura_id)
    if not db_fattura:
        return False
    if db_fattura.file_path and os.path.exists(db_fattura.file_path):
        try:
            os.remove(db_fattura.file_path)
        except OSError:
            pass
    db.delete(db_fattura)
    db.commit()
    return True


def toggle_pagata(db: Session, fattura_id: int) -> Optional[Fattura]:
    db_fattura = get_fattura(db, fattura_id)
    if not db_fattura:
        return None
    db_fattura.pagata = not db_fattura.pagata
    db.commit()
    db.refresh(db_fattura)
    return db_fattura
