from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException

from ..models.fornitura import Fornitura, RigaFornitura, StatoFornitura
from ..models.prodotto import Prodotto
from ..schemas.fornitura import FornituraCreate, FornituraUpdate


def _genera_numero_fornitura(db: Session) -> str:
    anno = datetime.now(timezone.utc).year
    prefix = f"FOR-{anno}-"
    # Usa MAX invece di COUNT: i buchi per cancellazioni non causano duplicati
    ultimo = db.query(func.max(Fornitura.numero_fornitura)).filter(
        Fornitura.numero_fornitura.like(f"{prefix}%")
    ).scalar()
    if ultimo:
        try:
            num = int(ultimo.split("-")[-1]) + 1
        except (ValueError, IndexError):
            num = 1
    else:
        num = 1
    return f"{prefix}{num:04d}"


def get_forniture(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    stato: Optional[str] = None,
    fornitore_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[Fornitura]:
    query = db.query(Fornitura)
    if stato:
        query = query.filter(Fornitura.stato == stato)
    if fornitore_id:
        query = query.filter(Fornitura.fornitore_id == fornitore_id)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Fornitura.numero_fornitura.ilike(term) | Fornitura.fornitore_nome.ilike(term)
        )
    return query.order_by(Fornitura.created_at.desc()).offset(skip).limit(limit).all()


def count_forniture(
    db: Session,
    stato: Optional[str] = None,
    fornitore_id: Optional[int] = None,
    search: Optional[str] = None,
) -> int:
    query = db.query(Fornitura)
    if stato:
        query = query.filter(Fornitura.stato == stato)
    if fornitore_id:
        query = query.filter(Fornitura.fornitore_id == fornitore_id)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Fornitura.numero_fornitura.ilike(term) | Fornitura.fornitore_nome.ilike(term)
        )
    return query.count()


def get_fornitura(db: Session, fornitura_id: int) -> Optional[Fornitura]:
    return (
        db.query(Fornitura)
        .options(joinedload(Fornitura.righe).joinedload(RigaFornitura.prodotto))
        .filter(Fornitura.id == fornitura_id)
        .first()
    )


def create_fornitura(db: Session, fornitura_data: FornituraCreate) -> Fornitura:
    if not fornitura_data.righe:
        raise HTTPException(status_code=400, detail="La fornitura deve avere almeno una riga prodotto")

    # Resolve fornitore_nome from fornitore_id if not provided
    fornitore_nome = fornitura_data.fornitore_nome
    if fornitura_data.fornitore_id and not fornitore_nome:
        from ..models.fornitore import Fornitore
        f = db.query(Fornitore).filter(Fornitore.id == fornitura_data.fornitore_id).first()
        if f:
            fornitore_nome = f.nome

    righe_data = []
    totale = 0.0
    for r in fornitura_data.righe:
        prodotto = db.query(Prodotto).filter(Prodotto.id == r.prodotto_id).first()
        if not prodotto:
            raise HTTPException(status_code=404, detail=f"Prodotto con id {r.prodotto_id} non trovato")
        subtotale = r.quantita * r.prezzo_unitario
        totale += subtotale
        righe_data.append({
            "prodotto_id": r.prodotto_id,
            "quantita": r.quantita,
            "prezzo_unitario": r.prezzo_unitario,
            "subtotale": subtotale,
        })

    for tentativo in range(5):
        numero_fornitura = _genera_numero_fornitura(db)
        righe = [RigaFornitura(**rd) for rd in righe_data]
        fornitura = Fornitura(
            numero_fornitura=numero_fornitura,
            fornitore_id=fornitura_data.fornitore_id,
            fornitore_nome=fornitore_nome,
            note=fornitura_data.note,
            corriere=fornitura_data.corriere,
            tracking_number=fornitura_data.tracking_number,
            totale=totale,
            righe=righe,
        )
        db.add(fornitura)
        try:
            db.commit()
            db.refresh(fornitura)
            return fornitura
        except IntegrityError:
            db.rollback()
            if tentativo == 4:
                raise HTTPException(status_code=500, detail="Impossibile generare numero fornitura univoco dopo 5 tentativi")


def update_fornitura(db: Session, fornitura_id: int, update: FornituraUpdate) -> Optional[Fornitura]:
    fornitura = get_fornitura(db, fornitura_id)
    if not fornitura:
        return None

    stato_precedente = fornitura.stato

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(fornitura, field, value)

    # Carico magazzino quando la fornitura passa a ricevuto (solo se non già caricato)
    if update.stato == StatoFornitura.ricevuto and stato_precedente != StatoFornitura.ricevuto and not fornitura.stock_caricato:
        fornitura.data_ricezione = datetime.now(timezone.utc)
        from ..models.movimento import Movimento, TipoMovimento
        for riga in fornitura.righe:
            prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
            if prodotto:
                prodotto.quantita += riga.quantita
                movimento = Movimento(
                    prodotto_id=riga.prodotto_id,
                    tipo=TipoMovimento.carico,
                    quantita=riga.quantita,
                    note=f"Carico automatico fornitura {fornitura.numero_fornitura}",
                    fornitore_id=fornitura.fornitore_id,
                )
                db.add(movimento)
        fornitura.stock_caricato = True
        db.flush()

    # Rollback magazzino quando la fornitura viene annullata dopo essere stata ricevuta
    elif update.stato == StatoFornitura.annullato and fornitura.stock_caricato:
        from ..models.movimento import Movimento, TipoMovimento
        for riga in fornitura.righe:
            prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
            if prodotto:
                prodotto.quantita -= riga.quantita
                movimento = Movimento(
                    prodotto_id=riga.prodotto_id,
                    tipo=TipoMovimento.scarico,
                    quantita=riga.quantita,
                    note=f"Storno automatico annullamento fornitura {fornitura.numero_fornitura}",
                    fornitore_id=fornitura.fornitore_id,
                )
                db.add(movimento)
        fornitura.stock_caricato = False
        db.flush()

    db.commit()
    db.refresh(fornitura)
    return fornitura


def delete_fornitura(db: Session, fornitura_id: int) -> bool:
    fornitura = get_fornitura(db, fornitura_id)
    if not fornitura:
        return False
    if fornitura.stato == StatoFornitura.ricevuto:
        raise HTTPException(status_code=400, detail="Non è possibile eliminare una fornitura già ricevuta")
    db.delete(fornitura)
    db.commit()
    return True
