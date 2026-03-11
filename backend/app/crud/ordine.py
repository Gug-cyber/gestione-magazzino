from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException

from ..models.ordine import Ordine, RigaOrdine, StatoOrdine
from ..models.prodotto import Prodotto
from ..schemas.ordine import OrdineCreate, OrdineUpdate


def _genera_numero_ordine(db: Session) -> str:
    anno = datetime.now(timezone.utc).year
    count = db.query(func.count(Ordine.id)).filter(
        func.extract("year", Ordine.created_at) == anno
    ).scalar() or 0
    return f"ORD-{anno}-{count + 1:04d}"


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

    numero_ordine = _genera_numero_ordine(db)

    righe = []
    totale = 0.0
    for r in ordine_data.righe:
        subtotale = r.quantita * r.prezzo_unitario
        totale += subtotale
        righe.append(RigaOrdine(
            prodotto_id=r.prodotto_id,
            quantita=r.quantita,
            prezzo_unitario=r.prezzo_unitario,
            subtotale=subtotale,
        ))

    ordine = Ordine(
        numero_ordine=numero_ordine,
        cliente_id=ordine_data.cliente_id,
        cliente_nome=cliente_nome,
        note=ordine_data.note,
        totale=totale,
        righe=righe,
    )
    db.add(ordine)
    db.commit()
    db.refresh(ordine)
    return ordine


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
