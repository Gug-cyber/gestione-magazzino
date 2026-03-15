from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException

from ..models.ordine import Ordine, RigaOrdine, StatoOrdine
from ..models.prodotto import Prodotto
from ..models.movimento import Movimento, TipoMovimento
from ..schemas.ordine import OrdineCreate, OrdineUpdate
from ..crud.fattura import get_fattura_by_ordine, genera_fattura_da_ordine, genera_nota_credito

# Stati che hanno già effettuato lo scarico di magazzino
_STATI_CON_STOCK_SCALATO = {
    StatoOrdine.confermato,
    StatoOrdine.spedito,
    StatoOrdine.completato,
}


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
    Crea un nuovo ordine con le seguenti garanzie transazionali:
    - Verifica disponibilità stock per ogni riga (con lock FOR UPDATE per evitare race conditions).
    - Decrementa lo stock immediatamente alla creazione.
    - Registra un movimento di magazzino in uscita per ogni riga.
    - Tutto in un'unica transazione atomica.
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
    # 1. Lock pessimistico + verifica disponibilità su tutti i prodotti   #
    # ------------------------------------------------------------------ #
    prodotti_map: dict[int, Prodotto] = {}
    for r in ordine_data.righe:
        prodotto = (
            db.execute(
                select(Prodotto)
                .where(Prodotto.id == r.prodotto_id)
                .with_for_update()
            )
            .scalars()
            .first()
        )
        if not prodotto:
            raise HTTPException(
                status_code=404,
                detail=f"Prodotto con id {r.prodotto_id} non trovato",
            )
        if prodotto.quantita < r.quantita:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Quantità insufficiente per '{prodotto.nome}': "
                    f"disponibili {prodotto.quantita}, richiesti {r.quantita}"
                ),
            )
        prodotti_map[r.prodotto_id] = prodotto

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
    # 3. Creazione ordine (con retry per numero univoco)                  #
    # ------------------------------------------------------------------ #
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
            db.flush()  # ottieni ordine.id senza ancora fare commit
            break
        except IntegrityError:
            db.rollback()
            if tentativo == 4:
                raise HTTPException(
                    status_code=500,
                    detail="Impossibile generare numero ordine univoco dopo 5 tentativi",
                )

    # ------------------------------------------------------------------ #
    # 4. Scarico stock + movimenti di magazzino in uscita                 #
    # ------------------------------------------------------------------ #
    for riga in ordine.righe:
        prodotto = prodotti_map[riga.prodotto_id]
        prodotto.quantita -= riga.quantita
        movimento = Movimento(
            prodotto_id=riga.prodotto_id,
            tipo=TipoMovimento.scarico,
            quantita=riga.quantita,
            ordine_id=ordine.id,
            note=f"Scarico automatico creazione ordine {numero_ordine}",
        )
        db.add(movimento)

    # ------------------------------------------------------------------ #
    # 5. Commit unico per tutta la transazione                            #
    # ------------------------------------------------------------------ #
    db.commit()
    db.refresh(ordine)
    return ordine


def update_ordine(db: Session, ordine_id: int, update: OrdineUpdate) -> Optional[Ordine]:
    """
    Aggiorna un ordine con le seguenti garanzie:

    Transizione → completato:
      - Imposta data_completamento.
      - Genera fattura automatica (anti-duplicazione via get_fattura_by_ordine).
      - NON scala di nuovo lo stock (già scalato alla creazione).

    Transizione → annullato (da stato con stock già scalato):
      - Ripristina lo stock per ogni riga.
      - Registra movimenti di carico.
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
    # Transizione → COMPLETATO                                            #
    # ------------------------------------------------------------------ #
    if nuovo_stato == StatoOrdine.completato and stato_precedente != StatoOrdine.completato:
        ordine.data_completamento = datetime.now(timezone.utc)

        # Genera fattura automatica se non già presente (anti-duplicazione)
        if not get_fattura_by_ordine(db, ordine.id):
            genera_fattura_da_ordine(db, ordine)

    # ------------------------------------------------------------------ #
    # Transizione → ANNULLATO (solo se lo stock era già stato scalato)    #
    # ------------------------------------------------------------------ #
    elif nuovo_stato == StatoOrdine.annullato and stato_precedente != StatoOrdine.annullato:
        if stato_precedente in _STATI_CON_STOCK_SCALATO:
            # Ripristino stock + movimenti di carico
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


def delete_ordine(db: Session, ordine_id: int) -> bool:
    ordine = get_ordine(db, ordine_id)
    if not ordine:
        return False
    if ordine.stato == StatoOrdine.completato:
        raise HTTPException(status_code=400, detail="Non è possibile eliminare un ordine completato")
    # Se l'ordine aveva scalato lo stock, ripristinarlo prima di eliminare
    if ordine.stato in _STATI_CON_STOCK_SCALATO:
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
