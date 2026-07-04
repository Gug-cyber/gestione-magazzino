import os
import logging
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
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
from ..crud import store_settings as crud_store_settings
from ..crud import footer_page as crud_footer
from ..schemas.store_settings import StoreSettingsResponse, StoreSettingsPublicResponse
from ..schemas.footer_page import FooterPageResponse
from ..schemas.ordine import OrdineCreate, RigaOrdineCreate, OrdineResponse, OrdineUpdate, StatoOrdineSchema
from ..schemas.cliente import ClienteCreate
from ..schemas.categoria import CategoriaResponse, CategoriaTree
from ..schemas.banner import BannerResponse
from ..schemas.promozione import PromozioneResponse
from ..models.prodotto import Prodotto
from ..models.cliente import Cliente
from ..limiter import limiter
from ..services.notification_service import notification_service
from ..services.email_cliente_service import send_email_conferma_ordine

logger = logging.getLogger(__name__)

router = APIRouter()


def _sync_platforms_after_store_checkout(prodotto_ids: list[int]) -> None:
    """Background task: sincronizza le piattaforme dopo un checkout store."""
    from ..database import SessionLocal
    from ..services.multi_platform_sync_service import MultiPlatformSyncService

    db = SessionLocal()
    try:
        for pid in prodotto_ids:
            try:
                MultiPlatformSyncService.sync_after_order(db, pid)
                db.commit()
            except Exception as exc:
                logger.error(
                    "Errore sync piattaforme per prodotto_id=%s dopo checkout store: %s",
                    pid,
                    exc,
                )
                db.rollback()
    finally:
        db.close()


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
    immagini: List[str] = []
    google_drive_folder_id: Optional[str] = None

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
    spese_spedizione: Optional[float] = 0.0
    metodo_pagamento: Optional[str] = None


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
    foto_url = _build_foto_url(prodotto, request)

    # Usa foto_aggiuntive come sorgente principale delle immagini
    foto_aggiuntive: List[str] = list(prodotto.foto_aggiuntive or [])

    # Costruisci la lista immagini: foto principale + foto aggiuntive
    immagini: List[str] = []
    if foto_url:
        immagini = [foto_url] + foto_aggiuntive
    elif foto_aggiuntive:
        immagini = foto_aggiuntive

    return StoreProdottoPublic(
        id=prodotto.id,
        nome=prodotto.nome,
        sku=prodotto.sku,
        descrizione=prodotto.descrizione,
        prezzo_vendita=prezzo_vendita,
        quantita=prodotto.quantita,
        categoria_id=prodotto.categoria_id,
        categoria_nome=categoria_nome,
        foto_url=foto_url,
        in_esaurimento=in_esaurimento,
        immagini=immagini,
        google_drive_folder_id=prodotto.google_drive_folder_id,
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
    include_descendants: bool = Query(False),
    search: Optional[str] = Query(None),
    disponibili_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    """Restituisce la lista prodotti pubblica (senza dati sensibili)."""
    # Se include_descendants è True, espandi la categoria ai discendenti
    if include_descendants and categoria_id is not None:
        descendant_ids = crud_categorie.get_descendant_ids(db, categoria_id)
        all_ids = [categoria_id] + descendant_ids
        from ..models.prodotto import Prodotto as ProdottoModel
        query = db.query(ProdottoModel).filter(ProdottoModel.categoria_id.in_(all_ids))
        if search:
            term = f"%{search}%"
            from sqlalchemy import or_
            query = query.filter(
                or_(
                    ProdottoModel.nome.ilike(term),
                    ProdottoModel.sku.ilike(term),
                    ProdottoModel.descrizione.ilike(term),
                )
            )
        if disponibili_only:
            query = query.filter(ProdottoModel.quantita > 0)
        # Escludi prodotti non vendibili, senza prezzo o senza foto
        query = query.filter(ProdottoModel.non_vendibile == False)  # noqa: E712
        query = query.filter(ProdottoModel.prezzo_vendita.isnot(None))
        query = query.filter(ProdottoModel.prezzo_vendita > 0)
        query = query.filter(
            (ProdottoModel.foto_path.isnot(None)) |
            (ProdottoModel.foto_aggiuntive.isnot(None))
        )
        prodotti = query.order_by(ProdottoModel.nome).offset(skip).limit(limit).all()
    else:
        prodotti = crud_prodotti.get_prodotti(
            db,
            skip=skip,
            limit=limit,
            search=search,
            categoria_id=categoria_id,
            disponibili_only=disponibili_only,
            store_only=True,
        )
    return [_to_public(p, request) for p in prodotti]


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
    # Stessi filtri della lista: non_vendibile, senza prezzo, senza foto
    ha_foto = bool(prodotto.foto_path or prodotto.foto_aggiuntive)
    ha_prezzo = prodotto.prezzo_vendita is not None and float(prodotto.prezzo_vendita) > 0
    if prodotto.non_vendibile or not ha_prezzo or not ha_foto:
        raise HTTPException(status_code=404, detail="Prodotto non disponibile")
    return _to_public(prodotto, request)


@router.get("/categorie/tree", response_model=List[CategoriaTree])
def get_store_categorie_tree(db: Session = Depends(get_db)):
    """Restituisce l'albero completo delle categorie (pubblico, no auth)."""
    from ..routers.categorie import _to_tree
    roots = crud_categorie.build_tree(db, only_active=True, show_in_store=True)
    return [_to_tree(r) for r in roots]


@router.get("/categorie", response_model=List[CategoriaResponse])
def get_store_categorie(db: Session = Depends(get_db)):
    """Restituisce tutte le categorie."""
    from ..routers.categorie import _to_response
    cats = crud_categorie.get_categorie(db, only_active=True, show_in_store=True)
    return [_to_response(c) for c in cats]


@router.post("/checkout", response_model=StoreCheckoutResponse)
@limiter.limit("5/minute")
def store_checkout(
    request: Request,
    body: StoreCheckoutRequest,
    background_tasks: BackgroundTasks,
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

    spese_spedizione = body.spese_spedizione or 0.0

    ordine_create = OrdineCreate(
        cliente_id=cliente.id,
        cliente_nome=body.nome,
        note=body.note,
        indirizzo_spedizione=f"{body.indirizzo}, {body.cap} {body.citta}".strip(", ") if body.indirizzo else None,
        spese_spedizione=spese_spedizione,
        metodo_pagamento=body.metodo_pagamento,
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

    background_tasks.add_task(send_email_conferma_ordine, ordine, cliente)

    # Sincronizza stock e annunci su tutte le piattaforme in background
    prodotto_ids = [r.prodotto_id for r in body.righe]
    background_tasks.add_task(_sync_platforms_after_store_checkout, prodotto_ids)

    return StoreCheckoutResponse(
        ordine=OrdineResponse.model_validate(ordine),
        messaggio=f"Ordine confermato con successo! Numero ordine: {ordine.numero_ordine}",
    )


# ---------------------------------------------------------------------------
# Endpoint pubblici: banners, promozioni, feature-flags
# ---------------------------------------------------------------------------

PUBLIC_FLAGS = {
    "store_enabled", "checkout_enabled", "discounts_enabled", "banners_enabled",
    "analytics_channel_instagram", "analytics_channel_facebook", "analytics_channel_tiktok",
    "analytics_channel_twitch", "analytics_channel_youtube", "analytics_channel_google",
    "analytics_channel_bing", "analytics_channel_yahoo", "analytics_channel_ebay",
    "analytics_channel_direct", "analytics_channel_other",
}


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


@router.get("/store-settings", response_model=StoreSettingsPublicResponse)
def get_store_settings_pubblici(db: Session = Depends(get_db)):
    """Endpoint pubblico per leggere le impostazioni dello store (spedizione, pagamento, nome)."""
    return crud_store_settings.get_settings(db)


@router.get("/footer-pages", response_model=List[FooterPageResponse])
def get_footer_pages_pubblici(db: Session = Depends(get_db)):
    """Endpoint pubblico: restituisce solo le pagine footer abilitate."""
    return crud_footer.get_enabled_pages(db)


@router.get("/footer-pages/{slug}", response_model=FooterPageResponse)
def get_footer_page_by_slug(slug: str, db: Session = Depends(get_db)):
    """Endpoint pubblico: restituisce una singola pagina footer abilitata."""
    page = crud_footer.get_page_by_slug(db, slug)
    if not page or not page.abilitato:
        raise HTTPException(status_code=404, detail="Pagina non trovata")
    return page
