import base64
import hashlib
import logging
import os
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from urllib.parse import quote_plus

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_active_user, get_current_user
from ..database import get_db
from ..models.ebay_connection import EbayConnection
from ..models.ebay_listing import EbayListing
from ..models.ebay_sale import EbaySale
from ..models.prodotto import Prodotto
from ..schemas.ebay import (
    ConnectionSettingsUpdate,
    EbayConnectionStatus,
    EbayListingResponse,
    EbaySaleResponse,
    PricingPreviewResponse,
    PublishRequest,
)
from ..services.ebay_auth_service import EbayAuthService
from ..services.ebay_inventory_service import EbayInventoryService
from ..services.ebay_offer_service import EbayOfferService
from ..services.ebay_order_sync_service import EbayOrderSyncService
from ..services.inventory_sync_service import InventorySyncService
from ..services.pricing_service import PricingService

logger = logging.getLogger(__name__)

router = APIRouter()

EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope"

# In-memory token cache to avoid requesting a new token on every call
_token_cache: dict = {
    "access_token": None,  # nosec B105 – None placeholder for a cached OAuth token, not a hardcoded password
    "expires_at": 0.0,
    "env": None,
}


# === Existing app-level Browse API (client_credentials) ===
def _get_ebay_urls() -> tuple[str, str]:
    """Return (token_url, browse_api_url) for either SANDBOX or PRODUCTION environment."""
    env = _get_ebay_env()
    if env == "SANDBOX":
        return (
            "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
            "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search",
        )
    return (
        "https://api.ebay.com/identity/v1/oauth2/token",
        "https://api.ebay.com/buy/browse/v1/item_summary/search",
    )


def _get_ebay_env() -> str:
    """Return the normalised EBAY_ENV value ('SANDBOX' or 'PRODUCTION')."""
    return os.getenv("EBAY_ENV", "PRODUCTION").upper().strip()


# Mapping stato_conservazione -> eBay condition display values (Browse API filter)
CONDITION_MAP: dict = {
    "Mint": ["NEW", "LIKE_NEW"],
    "Near Mint": ["NEW", "LIKE_NEW"],
    "Excellent": ["VERY_GOOD"],
    "Good": ["GOOD"],
    "Light Played": ["GOOD"],
    "Played": ["ACCEPTABLE"],
    "Poor": ["ACCEPTABLE"],
}


def _get_credentials() -> tuple:
    client_id = os.getenv("EBAY_CLIENT_ID", "").strip()
    client_secret = os.getenv("EBAY_CLIENT_SECRET", "").strip()
    return client_id, client_secret


def _get_access_token() -> str:
    """Return a valid OAuth2 access token, refreshing from cache when needed."""
    client_id, client_secret = _get_credentials()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail="API eBay non configurata. Aggiungi EBAY_CLIENT_ID e EBAY_CLIENT_SECRET.",
        )

    token_url, _ = _get_ebay_urls()
    current_env = _get_ebay_env()

    now = time.time()
    if (
        _token_cache["access_token"]
        and _token_cache["expires_at"] > now + 60
        and _token_cache["env"] == current_env
    ):
        return _token_cache["access_token"]

    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    try:
        with httpx.Client(timeout=15) as http_client:
            resp = http_client.post(
                token_url,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "client_credentials",
                    "scope": EBAY_SCOPE,
                },
            )
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Errore autenticazione eBay: {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Errore di rete eBay: {exc}")

    data = resp.json()
    token = data.get("access_token")
    expires_in = data.get("expires_in", 7200)

    if not token:
        raise HTTPException(status_code=502, detail="Token eBay non ricevuto")

    _token_cache["access_token"] = token
    _token_cache["expires_at"] = now + expires_in
    _token_cache["env"] = current_env

    return token


def _search_ebay(access_token: str, nome: str, stato: Optional[str], marketplace: str) -> dict:
    """Perform a search on the eBay Browse API and return the JSON response."""
    _, browse_api_url = _get_ebay_urls()
    filters = ["buyingOptions:{FIXED_PRICE}"]
    conditions = CONDITION_MAP.get(stato) if stato else None
    if conditions:
        condition_filter = "|".join(conditions)
        filters.append(f"conditions:{{{condition_filter}}}")

    params = {
        "q": nome,
        "filter": ",".join(filters),
        "limit": 20,
        "sort": "newlyListed",
    }

    with httpx.Client(timeout=15) as http_client:
        resp = http_client.get(
            browse_api_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "X-EBAY-C-MARKETPLACE-ID": marketplace,
                "Content-Type": "application/json",
            },
            params=params,
        )
    resp.raise_for_status()
    return resp.json()


def _search_ebay_sold(access_token: str, nome: str, stato: Optional[str], marketplace: str) -> dict:
    """Search eBay Completed/Sold Listings using the Browse API with soldItems filter."""
    _, browse_api_url = _get_ebay_urls()
    filters = ["buyingOptions:{FIXED_PRICE}", "soldItems:true"]
    conditions = CONDITION_MAP.get(stato) if stato else None
    if conditions:
        condition_filter = "|".join(conditions)
        filters.append(f"conditions:{{{condition_filter}}}")

    params = {
        "q": nome,
        "filter": ",".join(filters),
        "limit": 5,
        "sort": "newlyListed",
    }

    with httpx.Client(timeout=15) as http_client:
        resp = http_client.get(
            browse_api_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "X-EBAY-C-MARKETPLACE-ID": marketplace,
                "Content-Type": "application/json",
            },
            params=params,
        )
    resp.raise_for_status()
    return resp.json()


def _build_ebay_search_url(nome: str, marketplace: str) -> str:
    if marketplace == "EBAY_IT":
        return f"https://www.ebay.it/sch/i.html?_nkw={quote_plus(nome)}"
    return f"https://www.ebay.com/sch/i.html?_nkw={quote_plus(nome)}"


@router.get("/prezzi")
def get_prezzi_ebay(
    nome: str = Query(..., description="Nome del prodotto da cercare"),
    stato: Optional[str] = Query(None, description="Stato di conservazione"),
    current_user=Depends(get_current_active_user),
):
    client_id, _ = _get_credentials()
    if not client_id:
        return {
            "configurato": False,
            "messaggio": (
                "API eBay non configurata. Aggiungi EBAY_CLIENT_ID e "
                "EBAY_CLIENT_SECRET nelle variabili d'ambiente."
            ),
        }

    access_token = _get_access_token()

    used_marketplace = "EBAY_IT"
    try:
        try:
            data = _search_ebay(access_token, nome, stato, "EBAY_IT")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in (400, 403, 422):
                used_marketplace = "EBAY_US"
                data = _search_ebay(access_token, nome, stato, "EBAY_US")
            else:
                raise
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Errore eBay API: {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Errore di rete: {exc}")

    url_ricerca = _build_ebay_search_url(nome, used_marketplace)
    items = data.get("itemSummaries", [])

    ultimo_prezzo_venduto: Optional[float] = None
    try:
        try:
            sold_data = _search_ebay_sold(access_token, nome, stato, used_marketplace)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in (400, 403, 422):
                sold_data = _search_ebay_sold(access_token, nome, stato, "EBAY_US" if used_marketplace == "EBAY_IT" else "EBAY_IT")
            else:
                raise
        sold_items = sold_data.get("itemSummaries", [])
        if sold_items:
            sold_value = sold_items[0].get("price", {}).get("value")
            if sold_value is not None:
                ultimo_prezzo_venduto = round(float(sold_value), 2)
    except Exception as exc:
        logger.warning("Impossibile recuperare sold items eBay: %s", exc)

    if not items:
        return {
            "configurato": True,
            "prezzo_medio": None,
            "ultimo_prezzo": None,
            "ultimo_prezzo_venduto": ultimo_prezzo_venduto,
            "numero_risultati": 0,
            "valuta": "EUR",
            "url_ricerca": url_ricerca,
            "stato_filtrato": stato,
        }

    prices = []
    for item in items:
        value = item.get("price", {}).get("value")
        if value is not None:
            try:
                prices.append(float(value))
            except (ValueError, TypeError):
                pass

    if not prices:
        return {
            "configurato": True,
            "prezzo_medio": None,
            "ultimo_prezzo": None,
            "ultimo_prezzo_venduto": ultimo_prezzo_venduto,
            "numero_risultati": len(items),
            "valuta": "EUR",
            "url_ricerca": url_ricerca,
            "stato_filtrato": stato,
        }

    prezzo_medio = round(sum(prices) / len(prices), 2)
    ultimo_prezzo = round(prices[0], 2)
    valuta = items[0].get("price", {}).get("currency", "EUR")

    return {
        "configurato": True,
        "prezzo_medio": prezzo_medio,
        "ultimo_prezzo": ultimo_prezzo,
        "ultimo_prezzo_venduto": ultimo_prezzo_venduto,
        "numero_risultati": len(items),
        "valuta": valuta,
        "url_ricerca": url_ricerca,
        "stato_filtrato": stato,
    }


# === New user-level OAuth/listing/sync endpoints ===
def _get_connection(db: Session) -> Optional[EbayConnection]:
    return db.query(EbayConnection).order_by(EbayConnection.id.desc()).first()


def _listing_to_response(listing: EbayListing) -> EbayListingResponse:
    return EbayListingResponse(
        id=listing.id,
        product_id=listing.product_id,
        product_nome=listing.product.nome if listing.product else "",
        product_sku=listing.product.sku if listing.product else "",
        ebay_listing_id=listing.ebay_listing_id,
        status=listing.status,
        quantity_published=int(listing.quantity_published or 0),
        published_price=float(listing.published_price) if listing.published_price is not None else None,
        expected_net_price=float(listing.expected_net_price) if listing.expected_net_price is not None else None,
        fee_percentage=float(listing.fee_percentage) if listing.fee_percentage is not None else None,
        last_sync_at=listing.last_sync_at,
        error_message=listing.error_message,
    )


def _normalize_bearer_token(token: str) -> str:
    if token.startswith("Bearer "):
        return token.split(" ", 1)[1]
    return token


@router.get("/connect")
def ebay_connect(
    jwt_token: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    current_user=Depends(get_current_active_user),
):
    if jwt_token:
        jwt_token = _normalize_bearer_token(jwt_token)
    return EbayAuthService.get_authorization_url(jwt_token=jwt_token, state=state or "")


@router.get("/callback")
def ebay_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    try:
        cache = EbayAuthService.get_cached_state_data(state)
    except HTTPException:
        raise HTTPException(status_code=400, detail="State OAuth non valido o scaduto")

    jwt_token = cache.get("jwt_token")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Token di autenticazione mancante nella sessione OAuth")
    jwt_token = _normalize_bearer_token(jwt_token)
    try:
        current_user = get_current_user(token=jwt_token, db=db)
    except HTTPException as exc:
        logger.warning("Autenticazione callback eBay fallita: %s", exc.detail)
        raise HTTPException(status_code=401, detail="Token di autenticazione non valido o scaduto")
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Utente non attivo")

    connection = EbayAuthService.exchange_code_for_tokens(code, state, db)
    return {
        "connected": True,
        "account_id": connection.ebay_account_id,
        "status": connection.status,
    }


@router.get("/connection", response_model=EbayConnectionStatus)
def get_connection_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    connection = _get_connection(db)
    if not connection:
        return EbayConnectionStatus(
            connected=False,
            account_id=None,
            status=None,
            fee_percentage=None,
            marketplace_id=None,
            environment=None,
        )
    return EbayConnectionStatus(
        connected=True,
        account_id=connection.ebay_account_id or "Account collegato",
        status=connection.status,
        fee_percentage=float(connection.fee_percentage) if connection.fee_percentage is not None else None,
        marketplace_id=connection.marketplace_id,
        environment=connection.environment,
    )


@router.delete("/connection")
def disconnect_connection(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    connection = _get_connection(db)
    if not connection:
        return {"status": "ok"}
    EbayAuthService.revoke_connection(connection, db)
    return {"status": "ok"}


@router.patch("/connection/settings", response_model=EbayConnectionStatus)
def update_connection_settings(
    payload: ConnectionSettingsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    connection = _get_connection(db)
    if not connection:
        raise HTTPException(status_code=404, detail="Connessione eBay non trovata")

    if payload.fee_percentage is not None:
        fee = Decimal(str(payload.fee_percentage))
        if fee < 0 or fee >= 100:
            raise HTTPException(status_code=400, detail="Fee percentage non valida")
        connection.fee_percentage = fee
    if payload.marketplace_id is not None:
        connection.marketplace_id = payload.marketplace_id

    db.commit()
    db.refresh(connection)

    return EbayConnectionStatus(
        connected=True,
        account_id=connection.ebay_account_id,
        status=connection.status,
        fee_percentage=float(connection.fee_percentage) if connection.fee_percentage is not None else None,
        marketplace_id=connection.marketplace_id,
        environment=connection.environment,
    )


@router.get("/listings", response_model=list[EbayListingResponse])
def get_listings(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    listings = (
        db.query(EbayListing)
        .options(joinedload(EbayListing.product))
        .order_by(EbayListing.created_at.desc())
        .all()
    )
    return [_listing_to_response(l) for l in listings]


@router.post("/listings/publish", response_model=EbayListingResponse)
def publish_listing(
    payload: PublishRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    connection = _get_connection(db)
    if not connection or connection.status != "active":
        raise HTTPException(status_code=400, detail="Account eBay non collegato o non attivo")

    product = db.query(Prodotto).filter(Prodotto.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    if product.quantita <= 0:
        raise HTTPException(status_code=400, detail="Quantità non disponibile")
    if not (product.nome or "").strip():
        raise HTTPException(status_code=400, detail="Il prodotto non ha un nome valido")
    if not (product.descrizione or "").strip():
        raise HTTPException(status_code=400, detail="Il prodotto non ha descrizione")
    if not product.foto_path:
        raise HTTPException(status_code=400, detail="Il prodotto non ha immagini — non è possibile pubblicare")

    active_listing = (
        db.query(EbayListing)
        .filter(
            EbayListing.product_id == product.id,
            EbayListing.connection_id == connection.id,
            EbayListing.status == "active",
        )
        .first()
    )
    if active_listing and not payload.force:
        raise HTTPException(status_code=400, detail="Esiste già un listing attivo per questo prodotto")

    fee_percentage = Decimal(str(payload.fee_override if payload.fee_override is not None else connection.fee_percentage))
    if fee_percentage < 0 or fee_percentage >= 100:
        raise HTTPException(status_code=400, detail="Fee percentage non valida")

    net_price = Decimal(str(product.prezzo_vendita or 0))
    if net_price <= 0:
        raise HTTPException(status_code=400, detail="Prezzo vendita prodotto non valido")

    quantity = payload.quantity_override if payload.quantity_override is not None else product.quantita
    if quantity is None or quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantità non disponibile")
    if quantity > product.quantita:
        raise HTTPException(status_code=400, detail="La quantità da pubblicare supera la disponibilità")
    shipping_cost_value = payload.shipping_cost if payload.shipping_cost is not None else 5.90
    if shipping_cost_value < 0:
        raise HTTPException(status_code=400, detail="Spese di spedizione non valide")

    shipping_cost = Decimal(str(shipping_cost_value))

    published_price = PricingService.calculate_ebay_price(net_price, fee_percentage)
    expected_net_price = PricingService.calculate_net_from_gross(published_price, fee_percentage)

    listing = EbayListing(
        product_id=product.id,
        connection_id=connection.id,
        status="draft",
        quantity_published=quantity,
        published_price=published_price,
        expected_net_price=expected_net_price,
        fee_percentage=fee_percentage,
        shipping_cost=shipping_cost,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    try:
        token = EbayAuthService.get_valid_token(connection, db)
        EbayInventoryService.create_or_update_inventory_item(
            token,
            product.sku,
            product,
            listing,
            marketplace_id=connection.marketplace_id or "EBAY_IT",
        )
        offer_id = EbayOfferService.create_offer(
            token,
            product.sku,
            published_price,
            quantity,
            connection.marketplace_id or "EBAY_IT",
            listing,
            product.descrizione or "",
            float(shipping_cost),
        )
        ebay_listing_id = EbayOfferService.publish_offer(token, offer_id)

        listing.ebay_item_id = product.sku
        listing.ebay_offer_id = offer_id
        listing.ebay_listing_id = ebay_listing_id
        listing.status = "active"
        listing.last_sync_at = datetime.now(timezone.utc)
        listing.error_message = None
        db.commit()
        db.refresh(listing)
    except httpx.TimeoutException:
        listing.status = "error"
        listing.error_message = "Timeout durante la pubblicazione eBay - riprova tra qualche secondo"
        db.commit()
        raise HTTPException(status_code=504, detail="Timeout durante la pubblicazione eBay - riprova tra qualche secondo")
    except HTTPException as exc:
        listing.status = "error"
        listing.error_message = exc.detail if isinstance(exc.detail, str) else "Errore pubblicazione eBay"
        db.commit()
        raise
    except Exception as exc:
        listing.status = "error"
        listing.error_message = "Errore interno durante la pubblicazione eBay"
        db.commit()
        logger.exception("Errore pubblicazione listing eBay: %s", exc)
        raise HTTPException(status_code=500, detail="Errore interno durante la pubblicazione eBay")

    return _listing_to_response(listing)


@router.delete("/listings/{listing_id}")
def end_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    listing = db.query(EbayListing).options(joinedload(EbayListing.connection)).filter(EbayListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing non trovato")
    if not listing.connection:
        raise HTTPException(status_code=404, detail="Connessione eBay non trovata")

    if listing.ebay_offer_id:
        token = EbayAuthService.get_valid_token(listing.connection, db)
        EbayOfferService.end_listing(token, listing.ebay_offer_id, reason="USER_ENDED")
    listing.status = "ended"
    listing.last_sync_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.post("/listings/{listing_id}/sync", response_model=EbayListingResponse)
def sync_listing_quantity(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    listing = (
        db.query(EbayListing)
        .options(joinedload(EbayListing.product), joinedload(EbayListing.connection))
        .filter(EbayListing.id == listing_id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Listing non trovato")
    if not listing.connection:
        raise HTTPException(status_code=404, detail="Connessione eBay non trovata")

    InventorySyncService.sync_quantity_to_ebay(listing, listing.connection, db)
    InventorySyncService.check_and_handle_zero_stock(listing, listing.connection, db)
    db.refresh(listing)
    return _listing_to_response(listing)


@router.post("/sync/orders")
def sync_orders(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    connection = _get_connection(db)
    if not connection:
        raise HTTPException(status_code=404, detail="Connessione eBay non trovata")
    return EbayOrderSyncService.sync_recent_orders(connection, db)


@router.get("/sales", response_model=list[EbaySaleResponse])
def get_sales(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    sales = db.query(EbaySale).order_by(EbaySale.sold_at.desc().nullslast(), EbaySale.created_at.desc()).limit(200).all()
    return [
        EbaySaleResponse(
            id=s.id,
            product_id=s.product_id,
            ebay_order_id=s.ebay_order_id,
            quantity_sold=s.quantity_sold,
            gross_amount=float(s.gross_amount) if s.gross_amount is not None else None,
            fee_amount=float(s.fee_amount) if s.fee_amount is not None else None,
            net_amount=float(s.net_amount) if s.net_amount is not None else None,
            sale_status=s.sale_status,
            sold_at=s.sold_at,
        )
        for s in sales
    ]


@router.get("/pricing/preview", response_model=PricingPreviewResponse)
def pricing_preview(
    net_price: float = Query(..., gt=0),
    fee_percentage: float = Query(..., ge=0, lt=100),
    current_user=Depends(get_current_active_user),
):
    net = Decimal(str(net_price))
    fee = Decimal(str(fee_percentage))
    published = PricingService.calculate_ebay_price(net, fee)
    fee_amount = PricingService.calculate_fee_amount(published, fee)
    return PricingPreviewResponse(
        net_price=float(net),
        fee_percentage=float(fee),
        published_price=float(published),
        fee_amount=float(fee_amount),
    )


# === Existing account-deletion endpoints preserved ===
@router.get("/account-deletion")
def ebay_account_deletion_challenge(challenge_code: str = Query(...)):
    verification_token = os.getenv("EBAY_VERIFICATION_TOKEN", "")
    endpoint_url = os.getenv("EBAY_DELETION_ENDPOINT_URL", "")

    hash_input = challenge_code + verification_token + endpoint_url
    challenge_response = hashlib.sha256(hash_input.encode()).hexdigest()

    return {"challengeResponse": challenge_response}


@router.post("/account-deletion")
async def ebay_account_deletion_notification(request: Request):
    try:
        payload: dict = await request.json()
        notification_type = payload.get("metadata", {}).get("topic", "unknown")
        logger.info("eBay account deletion notification received (topic=%s)", notification_type)
    except Exception:
        logger.warning("eBay account deletion notification: could not parse request body")

    return JSONResponse(status_code=200, content={"status": "ok"})
