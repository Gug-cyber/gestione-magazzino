from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.cliente import Cliente
from ..models.fattura import Fattura
from ..schemas.cliente import ClienteCreate, ClienteUpdate
from typing import List, Optional


def get_clienti(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
) -> List[Cliente]:
    query = db.query(Cliente)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Cliente.nome.ilike(term)
            | Cliente.cognome.ilike(term)
            | Cliente.email.ilike(term)
            | Cliente.partita_iva.ilike(term)
        )
    return query.order_by(Cliente.nome).offset(skip).limit(limit).all()


def count_clienti(
    db: Session,
    search: Optional[str] = None,
) -> int:
    query = db.query(Cliente)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Cliente.nome.ilike(term)
            | Cliente.cognome.ilike(term)
            | Cliente.email.ilike(term)
            | Cliente.partita_iva.ilike(term)
        )
    return query.count()


def get_cliente(db: Session, cliente_id: int) -> Optional[Cliente]:
    return db.query(Cliente).filter(Cliente.id == cliente_id).first()


def create_cliente(db: Session, cliente: ClienteCreate) -> Cliente:
    db_cliente = Cliente(**cliente.model_dump())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente


def update_cliente(
    db: Session,
    cliente_id: int,
    cliente_update: ClienteUpdate,
) -> Optional[Cliente]:
    db_cliente = get_cliente(db, cliente_id)
    if not db_cliente:
        return None
    for field, value in cliente_update.model_dump(exclude_unset=True).items():
        setattr(db_cliente, field, value)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente


def delete_cliente(db: Session, cliente_id: int) -> bool:
    db_cliente = get_cliente(db, cliente_id)
    if not db_cliente:
        return False
    # Fatture con questo cliente_id avranno cliente_id = NULL (ON DELETE SET NULL)
    db.delete(db_cliente)
    db.commit()
    return True


def get_cliente_storico(db: Session, cliente_id: int):
    """Restituisce il cliente con le fatture e gli ordini collegati."""
    from ..models.ordine import Ordine
    cliente = get_cliente(db, cliente_id)
    if not cliente:
        return None
    fatture = (
        db.query(Fattura)
        .filter(Fattura.cliente_id == cliente_id)
        .order_by(Fattura.data_fattura.desc())
        .all()
    )
    ordini = (
        db.query(Ordine)
        .filter(Ordine.cliente_id == cliente_id)
        .order_by(Ordine.data_ordine.desc())
        .all()
    )
    return cliente, fatture, ordini


def get_statistiche_cliente(db: Session, cliente_id: int) -> dict:
    """Calcola statistiche aggregate per il cliente."""
    result = (
        db.query(
            func.count(Fattura.id).label("num_fatture"),
            func.coalesce(func.sum(Fattura.importo), 0.0).label("totale_speso"),
            func.count(Fattura.id).filter(Fattura.pagata.is_(True)).label("num_fatture_pagate"),
            func.max(Fattura.data_fattura).label("ultima_fattura"),
        )
        .filter(Fattura.cliente_id == cliente_id)
        .first()
    )
    return {
        "num_fatture": result.num_fatture or 0,
        "totale_speso": float(result.totale_speso or 0.0),
        "num_fatture_pagate": result.num_fatture_pagate or 0,
        "ultima_fattura": str(result.ultima_fattura) if result.ultima_fattura else None,
    }


def get_statistiche_ordini_cliente(db: Session, cliente_id: int) -> dict:
    """Calcola statistiche aggregate degli ordini per il cliente."""
    from ..models.ordine import Ordine, StatoOrdine
    result = (
        db.query(
            func.count(Ordine.id).label("num_ordini"),
            func.coalesce(func.sum(Ordine.totale), 0.0).label("totale_ordini"),
            func.count(Ordine.id).filter(Ordine.stato == StatoOrdine.completato).label("num_ordini_completati"),
            func.max(Ordine.data_ordine).label("ultimo_ordine"),
        )
        .filter(Ordine.cliente_id == cliente_id)
        .first()
    )
    return {
        "num_ordini": result.num_ordini or 0,
        "totale_ordini": float(result.totale_ordini or 0.0),
        "num_ordini_completati": result.num_ordini_completati or 0,
        "ultimo_ordine": str(result.ultimo_ordine) if result.ultimo_ordine else None,
    }
