import logging
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException

from ..models.ordine import Ordine, RigaOrdine, StatoOrdine
from ..models.prodotto import Prodotto
from ..models.movimento import Movimento, TipoMovimento
from ..models.cliente import Cliente
from ..schemas.ordine import OrdineCreate, OrdineUpdate, OrdineUpdateFull
from ..crud.fattura import get_fattura_by_ordine, genera_fattura_da_ordine, genera_nota_credito

logger = logging.getLogger(__name__)


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
    """
    Crea un nuovo ordine in stato bozza senza scalare lo stock.
    Lo stock verrà scalato quando l'ordine passa a 'confermato'.
    """
    if not ordine_data.righe:
        raise HTTPException(status_code=400, detail="L'ordine deve avere almeno una riga prodotto")

    # Resolve cliente_nome from cliente_id if not provided
    cliente_nome = ordine_data.cliente_nome
    if ordine_data.cliente_id and not cliente_nome:
        from ..models.cliente import Cliente
        c = db.query(Cliente).filter(Cliente.id == ordine_data.cliente_id).first()
        if c:
            cliente_nome = f"{c.nome} {c.cognome}".strip() if c.cognome else c.nome

    # ------------------------------------------------------------------ #
    # 1. Verifica prodotti esistenti (senza bloccare lo stock)            #
    # ------------------------------------------------------------------ #
    prodotti_map: dict[int, Prodotto] = {}
    for r in ordine_data.righe:
        prodotto = db.query(Prodotto).filter(Prodotto.id == r.prodotto_id).first()
        if not prodotto:
            raise HTTPException(
                status_code=404,
                detail=f"Prodotto con id {r.prodotto_id} non trovato",
            )
        prodotti_map[r.prodotto_id] = prodotto

    # ------------------------------------------------------------------ #
    # 1b. Verifica disponibilità stock al momento della creazione         #
    # ------------------------------------------------------------------ #
    for r in ordine_data.righe:
        prodotto = prodotti_map[r.prodotto_id]
        if prodotto.quantita < r.quantita:
            raise HTTPException(
                status_code=400,
                detail=f"Quantità insufficiente per '{prodotto.nome}': disponibili {prodotto.quantita}, richiesti {r.quantita}",
            )

    # ------------------------------------------------------------------ #
    # 2. Calcolo totale e struttura righe                                 #
    # ------------------------------------------------------------------ #
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

    # ------------------------------------------------------------------ #
    # 3. Creazione ordine con retry per numero univoco                    #
    # ------------------------------------------------------------------ #
    for tentativo in range(5):
        numero_ordine = _genera_numero_ordine(db)
        righe = [RigaOrdine(**rd) for rd in righe_data]
        ordine = Ordine(
            numero_ordine=numero_ordine,
            cliente_id=ordine_data.cliente_id,
            cliente_nome=cliente_nome,
            note=ordine_data.note,
            corriere=ordine_data.corriere,
            tracking_number=ordine_data.tracking_number,
            totale=totale,
            righe=righe,
            stock_scalato=False,  # lo stock viene scalato alla conferma dell'ordine
        )
        db.add(ordine)
        try:
            db.commit()
            db.refresh(ordine)
            return ordine
        except IntegrityError:
            db.rollback()
            if tentativo == 4:
                raise HTTPException(
                    status_code=500,
                    detail="Impossibile generare numero ordine univoco dopo 5 tentativi",
                )


def update_ordine(db: Session, ordine_id: int, update: OrdineUpdate) -> Optional[Ordine]:
    """
    Aggiorna un ordine con le seguenti garanzie (unico db.commit):

    Transizione → confermato:
      - Se stock non ancora scalato: lock pessimistico, verifica disponibilità,
        decrementa stock, registra movimenti, setta stock_scalato=True.

    Transizione → completato:
      - Imposta data_completamento.
      - Genera fattura automatica (anti-duplicazione via get_fattura_by_ordine).
      - NON scala lo stock (già scalato alla conferma).

    Transizione → annullato (se stock già scalato):
      - Ripristina lo stock per ogni riga con lock FOR UPDATE.
      - Registra movimenti di carico.
      - Setta stock_scalato=False.
      - Genera nota di credito se esiste fattura auto-generata non annullata.

    Tutto in un'unica transazione con un solo db.commit() finale.
    """
    ordine = get_ordine(db, ordine_id)
    if not ordine:
        return None

    stato_precedente = ordine.stato

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(ordine, field, value)

    nuovo_stato = update.stato

    # ------------------------------------------------------------------ #
    # Transizione → CONFERMATO                                            #
    # ------------------------------------------------------------------ #
    # Scala stock quando ordine confermato
    if nuovo_stato == StatoOrdine.confermato and stato_precedente != StatoOrdine.confermato:
        logger.info(
            "Transizione a CONFERMATO per ordine %s (id=%s): stock_scalato=%s",
            ordine.numero_ordine,
            ordine_id,
            ordine.stock_scalato,
        )
        if not ordine.stock_scalato:
            for riga in ordine.righe:
                prodotto = (
                    db.execute(
                        select(Prodotto)
                        .where(Prodotto.id == riga.prodotto_id)
                        .with_for_update()
                    )
                    .scalars()
                    .first()
                )
                if not prodotto:
                    db.rollback()
                    raise HTTPException(404, "Prodotto non trovato")
                logger.debug(
                    "Prodotto '%s' (id=%s): disponibile=%s, richiesto=%s",
                    prodotto.nome,
                    prodotto.id,
                    prodotto.quantita,
                    riga.quantita,
                )
                if prodotto.quantita < riga.quantita:
                    db.rollback()
                    raise HTTPException(
                        400,
                        f"Stock insufficiente per {prodotto.nome}: "
                        f"disponibili {prodotto.quantita}, richiesti {riga.quantita}",
                    )
                prodotto.quantita -= riga.quantita
                db.add(Movimento(
                    prodotto_id=riga.prodotto_id,
                    tipo=TipoMovimento.scarico,
                    quantita=riga.quantita,
                    ordine_id=ordine.id,
                    note=f"Scarico ordine {ordine.numero_ordine}",
                ))
            ordine.stock_scalato = True
            ordine.data_conferma = datetime.now(timezone.utc)
            logger.info(
                "Stock scalato per ordine %s: stock_scalato=%s",
                ordine.numero_ordine,
                ordine.stock_scalato,
            )

    # ------------------------------------------------------------------ #
    # Transizione → COMPLETATO                                            #
    # ------------------------------------------------------------------ #
    if nuovo_stato == StatoOrdine.completato and stato_precedente != StatoOrdine.completato:
        ordine.data_completamento = datetime.now(timezone.utc)

        # Genera fattura automatica se non già presente (anti-duplicazione)
        if not get_fattura_by_ordine(db, ordine.id):
            genera_fattura_da_ordine(db, ordine)

    # ------------------------------------------------------------------ #
    # Transizione → ANNULLATO                                             #
    # ------------------------------------------------------------------ #
    elif nuovo_stato == StatoOrdine.annullato and stato_precedente != StatoOrdine.annullato:
        # Ripristina stock solo se era stato scalato
        if ordine.stock_scalato:
            for riga in ordine.righe:
                prodotto = (
                    db.execute(
                        select(Prodotto)
                        .where(Prodotto.id == riga.prodotto_id)
                        .with_for_update()
                    )
                    .scalars()
                    .first()
                )
                if prodotto:
                    prodotto.quantita += riga.quantita
                    movimento = Movimento(
                        prodotto_id=riga.prodotto_id,
                        tipo=TipoMovimento.carico,
                        quantita=riga.quantita,
                        ordine_id=ordine.id,
                        note=f"Ripristino automatico annullamento ordine {ordine.numero_ordine}",
                    )
                    db.add(movimento)
            # Segna lo stock come non più scalato
            ordine.stock_scalato = False

        # Emetti nota di credito per la fattura auto-generata, se presente
        fattura_esistente = get_fattura_by_ordine(db, ordine.id)
        if fattura_esistente and not fattura_esistente.annullata:
            genera_nota_credito(db, fattura_esistente)

    # ------------------------------------------------------------------ #
    # Commit unico per tutta la transazione                               #
    # ------------------------------------------------------------------ #
    db.commit()
    db.refresh(ordine)
    return ordine


def update_ordine_full(db: Session, ordine_id: int, update: OrdineUpdateFull) -> Optional[Ordine]:
    """
    Aggiorna completamente un ordine in bozza, incluse le righe.
    """
    ordine = get_ordine(db, ordine_id)
    if not ordine:
        return None

    if ordine.stato != StatoOrdine.bozza:
        raise HTTPException(
            status_code=400,
            detail=f"Impossibile modificare l'ordine: solo gli ordini in stato 'bozza' possono essere modificati (stato attuale: {ordine.stato})",
        )

    # Aggiorna campi base
    if update.cliente_id is not None:
        ordine.cliente_id = update.cliente_id
        # Resolve nome se non fornito
        if not update.cliente_nome:
            c = db.query(Cliente).filter(Cliente.id == update.cliente_id).first()
            if c:
                ordine.cliente_nome = f"{c.nome} {c.cognome}".strip() if c.cognome else c.nome
    if update.cliente_nome is not None:
        ordine.cliente_nome = update.cliente_nome
    if update.note is not None:
        ordine.note = update.note
    if update.corriere is not None:
        ordine.corriere = update.corriere
    if update.tracking_number is not None:
        ordine.tracking_number = update.tracking_number

    # Aggiorna righe se fornite
    if update.righe is not None:
        if not update.righe:
            raise HTTPException(status_code=400, detail="L'ordine deve avere almeno una riga prodotto")

        for r in update.righe:
            if r.quantita <= 0:
                raise HTTPException(status_code=400, detail="Quantità deve essere maggiore di 0")
            if r.prezzo_unitario < 0:
                raise HTTPException(status_code=400, detail="Prezzo unitario deve essere maggiore o uguale a 0")

        # Rimuovi righe esistenti
        for riga in ordine.righe:
            db.delete(riga)

        # Aggiungi nuove righe
        totale = 0.0
        for r in update.righe:
            prodotto = db.query(Prodotto).filter(Prodotto.id == r.prodotto_id).first()
            if not prodotto:
                raise HTTPException(status_code=404, detail=f"Prodotto con id {r.prodotto_id} non trovato")

            subtotale = r.quantita * r.prezzo_unitario
            totale += subtotale

            nuova_riga = RigaOrdine(
                ordine_id=ordine_id,
                prodotto_id=r.prodotto_id,
                quantita=r.quantita,
                prezzo_unitario=r.prezzo_unitario,
                subtotale=subtotale,
            )
            db.add(nuova_riga)

        ordine.totale = totale

    db.commit()
    db.refresh(ordine)
    return ordine


def delete_ordine(db: Session, ordine_id: int) -> bool:
    ordine = get_ordine(db, ordine_id)
    if not ordine:
        return False
    if ordine.stato == StatoOrdine.completato:
        raise HTTPException(status_code=400, detail="Non è possibile eliminare un ordine completato")
    # Se lo stock era stato scalato (completato poi tornato indietro non dovrebbe succedere,
    # ma per sicurezza) ripristiniamo lo stock
    if ordine.stock_scalato:
        for riga in ordine.righe:
            prodotto = (
                db.execute(
                    select(Prodotto)
                    .where(Prodotto.id == riga.prodotto_id)
                    .with_for_update()
                )
                .scalars()
                .first()
            )
            if prodotto:
                prodotto.quantita += riga.quantita
    db.delete(ordine)
    db.commit()
    return True