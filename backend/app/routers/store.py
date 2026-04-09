import os
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..crud import prodotto as crud_prodotti
from ..crud import cliente as crud_clienti
from ..crud import ordine as crud_ordini
from ..crud import categoria as crud_categorie
from ..crud import banner as crud_banner
from ..crud import promozione as crud_promozione
from ..crud import feature_flag as crud_flags
from ..schemas.ordine import OrdineCreate, RigaOrdineCreate, OrdineResponse, OrdineUpdate, StatoOrdineSchema
from ..schemas.cliente import ClienteCreate
from ..schemas.categoria import CategoriaResponse
from ..schemas.banner import BannerResponse
from ..schemas.promozione import PromozioneResponse
from ..models.prodotto import Prodotto
from ..models.cliente import Cliente
from ..limiter import limiter
from ..services.notification_service import notification_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas pubblici store
# ---------------------------------------------------------------------------

class StoreProdottoPublic(BaseModel):
    id: int
    nome: str
    sku: Optional[str] = None
    descrizione: Optional[str] = None
    prezzo_vendita: Optional[float] = None
    quantita: int
    categoria_id: Optional[int] = None
    categoria_nome: Optional[str] = None
    foto_url: Optional[str] = None
    in_esaurimento: bool

    class Config:
        from_attributes = True


class StoreRigaCheckout(BaseModel):
    prodotto_id: int
    quantita: int
    prezzo_unitario: float


class StoreCheckoutRequest(BaseModel):
    nome: str
    email: str
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    note: Optional[str] = None
    righe: List[StoreRigaCheckout]


class StoreCheckoutResponse(BaseModel):
    ordine: OrdineResponse
    messaggio: str


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _build_foto_url(prodotto: Prodotto, request: Request) -> Optional[str]:
    if not prodotto.foto_path:
        return None
    if prodotto.foto_path.startswith("http://") or prodotto.foto_path.startswith("https://"):
        return prodotto.foto_path
    if os.path.exists(prodotto.foto_path):
        base = str(request.base_url).rstrip("/")
        return f"{base}/api/prodotti/{prodotto.id}/foto"
    return None


def _to_public(prodotto: Prodotto, request: Request) -> StoreProdottoPublic:
    categoria_nome = None
    if prodotto.categoria:
        categoria_nome = prodotto.categoria.nome

    in_esaurimento = (
        prodotto.quantita > 0
        and prodotto.quantita_minima is not None
        and prodotto.quantita <= prodotto.quantita_minima
    )

    prezzo_vendita = float(prodotto.prezzo_vendita) if prodotto.prezzo_vendita is not None else None

    return StoreProdottoPublic(
        id=prodotto.id,
        nome=prodotto.nome,
        sku=prodotto.sku,
        descrizione=prodotto.descrizione,
        prezzo_vendita=prezzo_vendita,
        quantita=prodotto.quantita,
        categoria_id=prodotto.categoria_id,
        categoria_nome=categoria_nome,
        foto_url=_build_foto_url(prodotto, request),
        in_esaurimento=in_esaurimento,
    )


def _get_or_create_cliente(db: Session, nome: str, email: str, **kwargs) -> Cliente:
    """Cerca un cliente per email. Se non esiste, lo crea."""
    existing = db.query(Cliente).filter(Cliente.email == email).first()
    if existing:
        return existing
    cliente_data = ClienteCreate(nome=nome, email=email, **kwargs)
    return crud_clienti.create_cliente(db, cliente_data)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/prodotti", response_model=List[StoreProdottoPublic])
def get_store_prodotti(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    categoria_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    disponibili_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    """Restituisce la lista prodotti pubblica (senza dati sensibili)."""
    prodotti = crud_prodotti.get_prodotti(
        db,
        skip=skip,
        limit=limit,
        search=search,
        categoria_id=categoria_id,
    )
    result = []
    for p in prodotti:
        if disponibili_only and p.quantita <= 0:
            continue
        result.append(_to_public(p, request))
    return result


@router.get("/prodotti/{prodotto_id}", response_model=StoreProdottoPublic)
def get_store_prodotto(
    prodotto_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Restituisce un singolo prodotto pubblico."""
    prodotto = crud_prodotti.get_prodotto(db, prodotto_id)
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return _to_public(prodotto, request)


@router.get("/categorie", response_model=List[CategoriaResponse])
def get_store_categorie(db: Session = Depends(get_db)):
    """Restituisce tutte le categorie."""
    return crud_categorie.get_categorie(db)


@router.post("/checkout", response_model=StoreCheckoutResponse)
@limiter.limit("5/minute")
def store_checkout(
    request: Request,
    body: StoreCheckoutRequest,
    db: Session = Depends(get_db),
):
    """
    Crea un ordine da un checkout pubblico.
    1. Cerca/crea il cliente per email.
    2. Verifica disponibilità stock.
    3. Crea l'ordine in stato 'bozza', poi lo conferma (scalando lo stock).
    4. Ritorna OrdineResponse + messaggio di conferma.
    """
    if not body.righe:
        raise HTTPException(status_code=400, detail="Il carrello è vuoto")

    # 1. Cerca o crea il cliente
    cliente = _get_or_create_cliente(
        db,
        nome=body.nome,
        email=body.email,
        telefono=body.telefono,
        indirizzo=body.indirizzo,
        citta=body.citta,
        cap=body.cap,
        note=body.note,
    )

    # 2. Verifica disponibilità stock
    for riga in body.righe:
        prodotto = crud_prodotti.get_prodotto(db, riga.prodotto_id)
        if not prodotto:
            raise HTTPException(
                status_code=404,
                detail=f"Prodotto con id {riga.prodotto_id} non trovato",
            )
        if prodotto.quantita < riga.quantita:
            raise HTTPException(
                status_code=400,
                detail=f"Quantità insufficiente per '{prodotto.nome}': disponibili {prodotto.quantita}, richiesti {riga.quantita}",
            )

    # 3. Crea l'ordine in stato bozza
    righe_ordine = [
        RigaOrdineCreate(
            prodotto_id=r.prodotto_id,
            quantita=r.quantita,
            prezzo_unitario=r.prezzo_unitario,
        )
        for r in body.righe
    ]

    ordine_create = OrdineCreate(
        cliente_id=cliente.id,
        cliente_nome=body.nome,
        note=body.note,
        righe=righe_ordine,
    )

    ordine = crud_ordini.create_ordine(db, ordine_create)

    # 4. Conferma l'ordine (scala lo stock)
    ordine = crud_ordini.update_ordine(
        db,
        ordine.id,
        OrdineUpdate(stato=StatoOrdineSchema.confermato),
    )

    # Notifica nuovo ordine (non critico: non interrompe il checkout se fallisce)
    try:
        notification_service.send_new_order_notification(ordine)
    except Exception as e:
        logger.warning("Notifica ordine fallita (non critico): %s", e)

    return StoreCheckoutResponse(
        ordine=OrdineResponse.model_validate(ordine),
        messaggio=f"Ordine confermato con successo! Numero ordine: {ordine.numero_ordine}",
    )


# ---------------------------------------------------------------------------
# Endpoint pubblici: banners, promozioni, feature-flags
# ---------------------------------------------------------------------------

PUBLIC_FLAGS = {"store_enabled", "checkout_enabled", "discounts_enabled", "banners_enabled"}


@router.get("/banners", response_model=List[BannerResponse])
def get_store_banners(db: Session = Depends(get_db)):
    """Restituisce banner pubblici attivi e validi per data (no auth)."""
    return crud_banner.get_banners_pubblici(db)


@router.get("/promozioni", response_model=List[PromozioneResponse])
def get_store_promozioni(db: Session = Depends(get_db)):
    """Restituisce promozioni attive e valide per data (no auth)."""
    promos = crud_promozione.get_promozioni(db, only_active=True)
    result = []
    for p in promos:
        result.append(PromozioneResponse(
            id=p.id,
            nome=p.nome,
            tipo=p.tipo,
            valore=float(p.valore),
            prodotto_id=p.prodotto_id,
            categoria_id=p.categoria_id,
            data_inizio=p.data_inizio,
            data_fine=p.data_fine,
            is_active=p.is_active,
            created_at=p.created_at,
            prodotto_nome=p.prodotto.nome if p.prodotto else None,
            categoria_nome=p.categoria.nome if p.categoria else None,
        ))
    return result


@router.get("/feature-flags")
def get_store_feature_flags(db: Session = Depends(get_db)):
    """Restituisce i flag pubblici: store_enabled, checkout_enabled, discounts_enabled, banners_enabled (no auth)."""
    flags = crud_flags.get_all_flags(db)
    return {f.key: f.enabled for f in flags if f.key in PUBLIC_FLAGS}
