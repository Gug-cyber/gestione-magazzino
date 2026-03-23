import base64
import os
import time
from typing import Optional
from urllib.parse import quote_plus

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_active_user

router = APIRouter()

EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope"

# In-memory token cache to avoid requesting a new token on every call
_token_cache: dict = {
    "access_token": None,
    "expires_at": 0.0,
    "env": None,
}


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
    # Return cached token if still valid (with 60-second safety margin) and env unchanged
    if (
        _token_cache["access_token"]
        and _token_cache["expires_at"] > now + 60
        and _token_cache["env"] == current_env
    ):
        return _token_cache["access_token"]

    # Request a new token via client credentials flow
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


def _build_ebay_search_url(nome: str, marketplace: str) -> str:
    """Return a direct browser search URL for the given marketplace."""
    if marketplace == "EBAY_IT":
        return f"https://www.ebay.it/sch/i.html?_nkw={quote_plus(nome)}"
    return f"https://www.ebay.com/sch/i.html?_nkw={quote_plus(nome)}"


@router.get("/prezzi")
def get_prezzi_ebay(
    nome: str = Query(..., description="Nome del prodotto da cercare"),
    stato: Optional[str] = Query(None, description="Stato di conservazione"),
    current_user=Depends(get_current_active_user),
):
    """Restituisce il prezzo medio e il prezzo dell'annuncio più recente su eBay per un prodotto.

    Nota: i prezzi provengono da annunci attivi (FIXED_PRICE), ordinati per data di
    inserimento più recente. Non si tratta di prezzi di vendite concluse.
    """
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

    # Try Italian marketplace first, fall back to US if not available
    used_marketplace = "EBAY_IT"
    try:
        try:
            data = _search_ebay(access_token, nome, stato, "EBAY_IT")
        except httpx.HTTPStatusError as exc:
            # Fallback to US marketplace if Italian marketplace rejects the request
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

    if not items:
        return {
            "configurato": True,
            "prezzo_medio": None,
            "ultimo_prezzo": None,
            "numero_risultati": 0,
            "valuta": "EUR",
            "url_ricerca": url_ricerca,
            "stato_filtrato": stato,
        }

    prices = []
    for item in items:
        price = item.get("price", {})
        value = price.get("value")
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
            "numero_risultati": len(items),
            "valuta": "EUR",
            "url_ricerca": url_ricerca,
            "stato_filtrato": stato,
        }

    prezzo_medio = round(sum(prices) / len(prices), 2)
    # prices[0] is the most recently listed item (sort=newlyListed)
    ultimo_prezzo = round(prices[0], 2)
    valuta = items[0].get("price", {}).get("currency", "EUR")

    return {
        "configurato": True,
        "prezzo_medio": prezzo_medio,
        "ultimo_prezzo": ultimo_prezzo,
        "numero_risultati": len(items),
        "valuta": valuta,
        "url_ricerca": url_ricerca,
        "stato_filtrato": stato,
    }
