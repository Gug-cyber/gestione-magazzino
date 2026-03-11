import os
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.fattura import Fattura
from ..schemas.fattura import FatturaCreate, FatturaUpdate
from typing import List, Optional
from datetime import date, datetime, timezone


def _genera_numero_fattura(db: Session) -> str:
    anno = datetime.now(timezone.utc).year
    count = db.query(func.count(Fattura.id)).filter(
        func.extract("year", Fattura.created_at) == anno,
        Fattura.tipo_documento == "fattura",
    ).scalar() or 0
    return f"FAT-{anno}-{count + 1:04d}"


def _genera_numero_nota_credito(db: Session) -> str:
    anno = datetime.now(timezone.utc).year
    count = db.query(func.count(Fattura.id)).filter(
        func.extract("year", Fattura.created_at) == anno,
        Fattura.tipo_documento == "nota_credito",
    ).scalar() or 0
    return f"NC-{anno}-{count + 1:04d}"


def get_fatture(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    cliente: Optional[str] = None,
    data_da: Optional[date] = None,
    data_a: Optional[date] = None,
    ordine_id: Optional[int] = None,
) -> List[Fattura]:
    query = db.query(Fattura)
    if cliente:
        query = query.filter(Fattura.cliente.ilike(f"%{cliente}%"))
    if data_da:
        query = query.filter(Fattura.data_fattura >= data_da)
    if data_a:
        query = query.filter(Fattura.data_fattura <= data_a)
    if ordine_id is not None:
        query = query.filter(Fattura.ordine_id == ordine_id)
    return query.order_by(Fattura.data_fattura.desc()).offset(skip).limit(limit).all()


def get_fattura(db: Session, fattura_id: int) -> Optional[Fattura]:
    return db.query(Fattura).filter(Fattura.id == fattura_id).first()


def get_fattura_by_ordine(db: Session, ordine_id: int) -> Optional[Fattura]:
    return (
        db.query(Fattura)
        .filter(Fattura.ordine_id == ordine_id, Fattura.auto_generata.is_(True), Fattura.tipo_documento == "fattura")
        .first()
    )


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


def genera_fattura_da_ordine(db: Session, ordine) -> Fattura:
    """
    Genera automaticamente una fattura attiva da un ordine completato (normativa italiana).
    Numerazione progressiva nel formato FAT-YYYY-NNNN.
    Aliquota IVA standard 22%. Data fattura = data completamento ordine.
    """
    aliquota_iva = 22.0
    imponibile = round(ordine.totale / (1 + aliquota_iva / 100), 2)
    importo_iva = round(ordine.totale - imponibile, 2)
    data_fattura = (
        ordine.data_completamento.date()
        if ordine.data_completamento
        else datetime.now(timezone.utc).date()
    )
    numero = _genera_numero_fattura(db)
    db_fattura = Fattura(
        numero_fattura=numero,
        data_fattura=data_fattura,
        cliente=ordine.cliente_nome or "Cliente",
        importo=ordine.totale,
        tipo="attiva",
        tipo_documento="fattura",
        imponibile=imponibile,
        aliquota_iva=aliquota_iva,
        importo_iva=importo_iva,
        ordine_id=ordine.id,
        auto_generata=True,
        annullata=False,
        pagata=False,
    )
    db.add(db_fattura)
    db.commit()
    db.refresh(db_fattura)
    return db_fattura


def genera_nota_credito(db: Session, fattura_originale: Fattura) -> Fattura:
    """
    Genera una nota di credito che annulla una fattura emessa (normativa italiana).
    Numerazione progressiva nel formato NC-YYYY-NNNN.
    Segna fattura_originale.annullata = True.
    """
    numero = _genera_numero_nota_credito(db)
    db_nc = Fattura(
        numero_fattura=numero,
        data_fattura=datetime.now(timezone.utc).date(),
        cliente=fattura_originale.cliente,
        importo=-fattura_originale.importo,
        tipo="attiva",
        tipo_documento="nota_credito",
        imponibile=-fattura_originale.imponibile if fattura_originale.imponibile is not None else None,
        aliquota_iva=fattura_originale.aliquota_iva,
        importo_iva=-fattura_originale.importo_iva if fattura_originale.importo_iva is not None else None,
        ordine_id=fattura_originale.ordine_id,
        nota_credito_di=fattura_originale.id,
        auto_generata=True,
        annullata=False,
        pagata=False,
        note=f"Nota di credito per annullamento ordine — fattura {fattura_originale.numero_fattura}",
    )
    db.add(db_nc)
    fattura_originale.annullata = True
    db.commit()
    db.refresh(db_nc)
    return db_nc


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
