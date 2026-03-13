from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException

from ..models.ordine import Ordine, RigaOrdine, StatoOrdine
from ..models.prodotto import Prodotto
from ..schemas.ordine import OrdineCreate, OrdineUpdate
from ..crud.fattura import get_fattura_by_ordine, genera_fattura_da_ordine, genera_nota_credito


def _genera_numero_ordine(db: Session) -> str:
    anno = datetime.now(timezone.utc).year
    prefix = f"ORD-{anno}-"
    # Usa MAX invece di COUNT: i buchi per cancellazioni non causano duplicati
    ultimo = db.query(func.max(Ordine.numero_ordine)).filter(
        Ordine.numero_ordine.like(f"{prefix}%")
    ).scalar()
    if ultimo:
        try:
            num = int(ultimo.split("-")[-1]) + 1
        except (ValueError, IndexError):
            num = 1
    else:
        num = 1
    return f"{prefix}{num:04d}"


def get_ordini(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    stato: Optional[str] = None,
    cliente_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[Ordine]:
    query = db.query(Ordine)
    if stato:
        query = query.filter(Ordine.stato == stato)
    if cliente_id:
        query = query.filter(Ordine.cliente_id == cliente_id)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Ordine.numero_ordine.ilike(term) | Ordine.cliente_nome.ilike(term)
        )
    return query.order_by(Ordine.created_at.desc()).offset(skip).limit(limit).all()


def count_ordini(
    db: Session,
    stato: Optional[str] = None,
    cliente_id: Optional[int] = None,
    search: Optional[str] = None,
) -> int:
    query = db.query(Ordine)
    if stato:
        query = query.filter(Ordine.stato == stato)
    if cliente_id:
        query = query.filter(Ordine.cliente_id == cliente_id)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Ordine.numero_ordine.ilike(term) | Ordine.cliente_nome.ilike(term)
        )
    return query.count()


def get_ordine(db: Session, ordine_id: int) -> Optional[Ordine]:
    return (
        db.query(Ordine)
        .options(joinedload(Ordine.righe).joinedload(RigaOrdine.prodotto))
        .filter(Ordine.id == ordine_id)
        .first()
    )


def create_ordine(db: Session, ordine_data: OrdineCreate) -> Ordine:
    if not ordine_data.righe:
        raise HTTPException(status_code=400, detail="L'ordine deve avere almeno una riga prodotto")

    # Resolve cliente_nome from cliente_id if not provided
    cliente_nome = ordine_data.cliente_nome
    if ordine_data.cliente_id and not cliente_nome:
        from ..models.cliente import Cliente
        c = db.query(Cliente).filter(Cliente.id == ordine_data.cliente_id).first()
        if c:
            cliente_nome = f"{c.nome} {c.cognome}".strip() if c.cognome else c.nome

    # Controllo disponibilità su tutte le righe prima di creare l'ordine
    for r in ordine_data.righe:
        prodotto = db.query(Prodotto).filter(Prodotto.id == r.prodotto_id).first()
        if not prodotto:
            raise HTTPException(status_code=404, detail=f"Prodotto con id {r.prodotto_id} non trovato")
        if prodotto.quantita < r.quantita:
            raise HTTPException(
                status_code=400,
                detail=f"Quantità insufficiente per '{prodotto.nome}': disponibili {prodotto.quantita}, richiesti {r.quantita}"
            )

    righe_data = []
    totale = 0.0
    for r in ordine_data.righe:
        subtotale = r.quantita * r.prezzo_unitario
        totale += subtotale
        righe_data.append({
            "prodotto_id": r.prodotto_id,
            "quantita": r.quantita,
            "prezzo_unitario": r.prezzo_unitario,
            "subtotale": subtotale,
        })

    for tentativo in range(5):
        numero_ordine = _genera_numero_ordine(db)
        righe = [RigaOrdine(**rd) for rd in righe_data]
        ordine = Ordine(
            numero_ordine=numero_ordine,
            cliente_id=ordine_data.cliente_id,
            cliente_nome=cliente_nome,
            note=ordine_data.note,
            totale=totale,
            righe=righe,
        )
        db.add(ordine)
        try:
            db.commit()
            db.refresh(ordine)
            return ordine
        except IntegrityError:
            db.rollback()
            if tentativo == 4:
                raise HTTPException(status_code=500, detail="Impossibile generare numero ordine univoco dopo 5 tentativi")


def update_ordine(db: Session, ordine_id: int, update: OrdineUpdate) -> Optional[Ordine]:
    ordine = get_ordine(db, ordine_id)
    if not ordine:
        return None

    stato_precedente = ordine.stato

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(ordine, field, value)

    # Scarico magazzino quando l'ordine passa a completato
    if update.stato == StatoOrdine.completato and stato_precedente != StatoOrdine.completato:
        ordine.data_completamento = datetime.now(timezone.utc)
        from ..models.movimento import Movimento, TipoMovimento
        for riga in ordine.righe:
            prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
            if prodotto:
                if prodotto.quantita < riga.quantita:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Quantità insufficiente per '{prodotto.nome}': disponibili {prodotto.quantita}, richiesti {riga.quantita}"
                    )
                prodotto.quantita -= riga.quantita
                movimento = Movimento(
                    prodotto_id=riga.prodotto_id,
                    tipo=TipoMovimento.scarico,
                    quantita=riga.quantita,
                    note=f"Scarico automatico ordine {ordine.numero_ordine}",
                )
                db.add(movimento)
        db.flush()
        # Genera fattura automatica se non già presente
        if not get_fattura_by_ordine(db, ordine.id):
            genera_fattura_da_ordine(db, ordine)

    # Ripristino magazzino quando l'ordine viene annullato dopo essere stato completato
    elif update.stato == StatoOrdine.annullato and stato_precedente == StatoOrdine.completato:
        from ..models.movimento import Movimento, TipoMovimento
        for riga in ordine.righe:
            prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
            if prodotto:
                prodotto.quantita += riga.quantita
                movimento = Movimento(
                    prodotto_id=riga.prodotto_id,
                    tipo=TipoMovimento.carico,
                    quantita=riga.quantita,
                    note=f"Ripristino automatico annullamento ordine {ordine.numero_ordine}",
                )
                db.add(movimento)
        db.flush()
        # Emetti nota di credito per la fattura auto-generata, se presente
        fattura_esistente = get_fattura_by_ordine(db, ordine.id)
        if fattura_esistente and not fattura_esistente.annullata:
            genera_nota_credito(db, fattura_esistente)

    db.commit()
    db.refresh(ordine)
    return ordine


def delete_ordine(db: Session, ordine_id: int) -> bool:
    ordine = get_ordine(db, ordine_id)
    if not ordine:
        return False
    if ordine.stato == StatoOrdine.completato:
        raise HTTPException(status_code=400, detail="Non è possibile eliminare un ordine completato")
    db.delete(ordine)
    db.commit()
    return True
