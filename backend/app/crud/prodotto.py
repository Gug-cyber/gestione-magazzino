from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from ..models.prodotto import Prodotto
from ..models.manual_listing import ManualListing
from ..models.movimento import Movimento, TipoMovimento
from ..schemas.prodotto import (
    MANUAL_LISTING_STATUSES,
    ProdottoCreate,
    ProdottoUpdate,
)
from ..barcode_utils import generate_barcode_value
from typing import List, Optional


def _sync_manual_listings(db_prodotto: Prodotto, manual_listings_data: List[dict]) -> None:
    by_platform = {listing.platform: listing for listing in (db_prodotto.manual_listings or [])}

    for raw in manual_listings_data:
        listing_data = dict(raw)
        platform = listing_data.pop("platform")
        listing_data.pop("id", None)

        listing = by_platform.get(platform)
        if listing is None:
            listing = ManualListing(product_id=db_prodotto.id, platform=platform)
            db_prodotto.manual_listings.append(listing)
            by_platform[platform] = listing

        for field, value in listing_data.items():
            setattr(listing, field, value)

        if listing.active and not listing.status:
            listing.status = "da_pubblicare"
        elif not listing.active and not listing.status:
            listing.status = "non_pubblicare"

        if listing.status not in MANUAL_LISTING_STATUSES:
            listing.status = "non_pubblicare"

    db_prodotto.su_vinted = bool(by_platform.get("vinted") and by_platform["vinted"].active)
    db_prodotto.su_wallapop = bool(by_platform.get("wallapop") and by_platform["wallapop"].active)


def get_prodotto(db: Session, prodotto_id: int) -> Optional[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()


def get_prodotto_by_sku(db: Session, sku: str) -> Optional[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.sku == sku).first()


def get_prodotto_by_barcode(db: Session, barcode: str) -> Optional[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.barcode == barcode).first()


def get_prodotti(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    categoria_id: Optional[int] = None,
    ubicazione_id: Optional[int] = None,
    stato_conservazione: Optional[str] = None,
    disponibili_only: bool = False,
    store_only: bool = False,
) -> List[Prodotto]:
    query = db.query(Prodotto)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Prodotto.nome.ilike(term) | Prodotto.sku.ilike(term) |
            Prodotto.descrizione.ilike(term) | Prodotto.barcode.ilike(term)
        )
    if categoria_id:
        query = query.filter(Prodotto.categoria_id == categoria_id)
    if ubicazione_id:
        query = query.filter(Prodotto.ubicazione_id == ubicazione_id)
    if stato_conservazione:
        query = query.filter(Prodotto.stato_conservazione == stato_conservazione)
    if disponibili_only:
        query = query.filter(Prodotto.quantita > 0)
    if store_only:
        query = query.filter(Prodotto.non_vendibile == False)  # noqa: E712
        query = query.filter(Prodotto.prezzo_vendita.isnot(None))
        query = query.filter(Prodotto.prezzo_vendita > 0)
        query = query.filter(
            (Prodotto.foto_path.isnot(None)) |
            (Prodotto.foto_aggiuntive.isnot(None))
        )
    return query.order_by(Prodotto.nome).offset(skip).limit(limit).all()


def count_prodotti(
    db: Session,
    search: Optional[str] = None,
    categoria_id: Optional[int] = None,
    ubicazione_id: Optional[int] = None,
    stato_conservazione: Optional[str] = None,
    disponibili_only: bool = False,
    store_only: bool = False,
) -> int:
    query = db.query(Prodotto)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Prodotto.nome.ilike(term) | Prodotto.sku.ilike(term) |
            Prodotto.descrizione.ilike(term) | Prodotto.barcode.ilike(term)
        )
    if categoria_id:
        query = query.filter(Prodotto.categoria_id == categoria_id)
    if ubicazione_id:
        query = query.filter(Prodotto.ubicazione_id == ubicazione_id)
    if stato_conservazione:
        query = query.filter(Prodotto.stato_conservazione == stato_conservazione)
    if disponibili_only:
        query = query.filter(Prodotto.quantita > 0)
    if store_only:
        query = query.filter(Prodotto.non_vendibile == False)  # noqa: E712
        query = query.filter(Prodotto.prezzo_vendita.isnot(None))
        query = query.filter(Prodotto.prezzo_vendita > 0)
        query = query.filter(
            (Prodotto.foto_path.isnot(None)) |
            (Prodotto.foto_aggiuntive.isnot(None))
        )
    return query.count()


def get_prodotti_sotto_scorta(db: Session) -> List[Prodotto]:
    return db.query(Prodotto).filter(Prodotto.quantita < Prodotto.quantita_minima).all()


def create_prodotto(db: Session, prodotto: ProdottoCreate) -> Prodotto:
    prodotto_data = prodotto.model_dump()
    manual_listings_data = prodotto_data.pop("manual_listings", None)
    db_prodotto = Prodotto(**prodotto_data)
    db.add(db_prodotto)
    try:
        db.flush()  # get the id without committing yet
    except IntegrityError:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise RuntimeError(f"Errore DB durante la creazione del prodotto: {e}") from e

    if db_prodotto.quantita > 0:
        movimento = Movimento(
            prodotto_id=db_prodotto.id,
            tipo=TipoMovimento.carico,
            quantita=db_prodotto.quantita,
            data_movimento=datetime.now(),
            note="Carico iniziale alla creazione prodotto",
        )
        db.add(movimento)

    if manual_listings_data:
        _sync_manual_listings(db_prodotto, manual_listings_data)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise RuntimeError(f"Errore DB durante il salvataggio del prodotto: {e}") from e

    db.refresh(db_prodotto)
    return db_prodotto


def update_prodotto(db: Session, prodotto_id: int, prodotto: ProdottoUpdate) -> Optional[Prodotto]:
    db_prodotto = get_prodotto(db, prodotto_id)
    if not db_prodotto:
        return None
    update_data = prodotto.model_dump(exclude_unset=True)
    manual_listings_data = update_data.pop("manual_listings", None)

    for field, value in update_data.items():
        setattr(db_prodotto, field, value)

    if manual_listings_data is not None:
        _sync_manual_listings(db_prodotto, manual_listings_data)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise RuntimeError(f"Errore DB durante l'aggiornamento del prodotto: {e}") from e
    db.refresh(db_prodotto)
    return db_prodotto


def delete_prodotto(db: Session, prodotto_id: int) -> bool:
    db_prodotto = get_prodotto(db, prodotto_id)
    if not db_prodotto:
        return False
    db.delete(db_prodotto)
    db.commit()
    return True


def generate_barcode_for_prodotto(db: Session, prodotto_id: int) -> Optional[Prodotto]:
    """
    Genera (o rigenera) il valore barcode per un prodotto.
    Usa lo SKU normalizzato CODE39. Se già in uso da un altro prodotto,
    aggiunge il suffisso -<id> per garantire unicità.
    """
    db_prodotto = get_prodotto(db, prodotto_id)
    if not db_prodotto:
        return None

    barcode_value = generate_barcode_value(db_prodotto.sku)

    # Verifica unicità: se già usato da un altro prodotto, aggiungi suffisso
    existing = (
        db.query(Prodotto)
        .filter(Prodotto.barcode == barcode_value, Prodotto.id != prodotto_id)
        .first()
    )
    if existing:
        barcode_value = f"{barcode_value}-{prodotto_id}"

    db_prodotto.barcode = barcode_value
    db_prodotto.barcode_generated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_prodotto)
    return db_prodotto
