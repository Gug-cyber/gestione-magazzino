import logging
import os
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.fattura import Fattura
from ..models.dati_azienda import DatiAzienda
from ..schemas.fattura import FatturaCreate, FatturaUpdate
from typing import List, Optional
from datetime import date, datetime, timezone

logger = logging.getLogger(__name__)


def _genera_numero_fattura(db: Session) -> str:
    """Numerazione progressiva usando MAX per evitare duplicati in caso di cancellazioni."""
    anno = datetime.now(timezone.utc).year
    prefix = f"FAT-{anno}-"
    ultimo = db.query(func.max(Fattura.numero_fattura)).filter(
        Fattura.numero_fattura.like(f"{prefix}%"),
        Fattura.tipo_documento == "fattura",
    ).scalar()
    if ultimo:
        try:
            num = int(ultimo.split("-")[-1]) + 1
        except (ValueError, IndexError):
            num = 1
    else:
        num = 1
    return f"{prefix}{num:04d}"


def _genera_numero_nota_credito(db: Session) -> str:
    """Numerazione progressiva usando MAX per evitare duplicati in caso di cancellazioni."""
    anno = datetime.now(timezone.utc).year
    prefix = f"NC-{anno}-"
    ultimo = db.query(func.max(Fattura.numero_fattura)).filter(
        Fattura.numero_fattura.like(f"{prefix}%"),
        Fattura.tipo_documento == "nota_credito",
    ).scalar()
    if ultimo:
        try:
            num = int(ultimo.split("-")[-1]) + 1
        except (ValueError, IndexError):
            num = 1
    else:
        num = 1
    return f"{prefix}{num:04d}"


def _get_dati_azienda(db: Session) -> Optional[DatiAzienda]:
    """Restituisce il primo record DatiAzienda disponibile, o None se non configurato."""
    azienda = db.query(DatiAzienda).first()
    if azienda is None:
        logger.warning(
            "DatiAzienda non trovati nel database — la fattura verrà generata senza dati emittente."
        )
    return azienda


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


def count_fatture(
    db: Session,
    cliente: Optional[str] = None,
    data_da: Optional[date] = None,
    data_a: Optional[date] = None,
    ordine_id: Optional[int] = None,
) -> int:
    query = db.query(Fattura)
    if cliente:
        query = query.filter(Fattura.cliente.ilike(f"%{cliente}%"))
    if data_da:
        query = query.filter(Fattura.data_fattura >= data_da)
    if data_a:
        query = query.filter(Fattura.data_fattura <= data_a)
    if ordine_id is not None:
        query = query.filter(Fattura.ordine_id == ordine_id)
    return query.count()


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
    I dati dell'emittente vengono recuperati da DatiAzienda (snapshot immutabile).

    NOTA: non esegue db.commit() — il chiamante è responsabile del commit finale
    nell'ambito della stessa transazione atomica.
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

    # Recupero dati azienda emittente (snapshot immutabile)
    azienda = _get_dati_azienda(db)

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
        pagata=True,
        # Dati emittente (snapshot al momento della generazione)
        emittente_ragione_sociale=azienda.ragione_sociale if azienda else None,
        emittente_partita_iva=azienda.partita_iva if azienda else None,
        emittente_codice_fiscale=azienda.codice_fiscale if azienda else None,
        emittente_indirizzo=azienda.indirizzo if azienda else None,
        emittente_citta=azienda.citta if azienda else None,
        emittente_cap=azienda.cap if azienda else None,
        emittente_provincia=azienda.provincia if azienda else None,
        emittente_nazione=azienda.nazione if azienda else None,
        emittente_pec=azienda.pec if azienda else None,
        emittente_codice_sdi=azienda.codice_sdi if azienda else None,
        emittente_iban=azienda.iban if azienda else None,
    )
    db.add(db_fattura)
    db.flush()
    db.refresh(db_fattura)
    return db_fattura


def genera_nota_credito(db: Session, fattura_originale: Fattura) -> Fattura:
    """
    Genera una nota di credito che annulla una fattura emessa (normativa italiana).
    Numerazione progressiva nel formato NC-YYYY-NNNN.
    Segna fattura_originale.annullata = True.
    I dati emittente vengono copiati dalla fattura originale (stesso snapshot).

    NOTA: non esegue db.commit() — il chiamante è responsabile del commit finale
    nell'ambito della stessa transazione atomica.
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
        # Dati emittente: copiati dalla fattura originale (stesso snapshot)
        emittente_ragione_sociale=fattura_originale.emittente_ragione_sociale,
        emittente_partita_iva=fattura_originale.emittente_partita_iva,
        emittente_codice_fiscale=fattura_originale.emittente_codice_fiscale,
        emittente_indirizzo=fattura_originale.emittente_indirizzo,
        emittente_citta=fattura_originale.emittente_citta,
        emittente_cap=fattura_originale.emittente_cap,
        emittente_provincia=fattura_originale.emittente_provincia,
        emittente_nazione=fattura_originale.emittente_nazione,
        emittente_pec=fattura_originale.emittente_pec,
        emittente_codice_sdi=fattura_originale.emittente_codice_sdi,
        emittente_iban=fattura_originale.emittente_iban,
    )
    db.add(db_nc)
    fattura_originale.annullata = True
    db.flush()
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
