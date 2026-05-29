import logging
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

from ..database import get_db
from ..auth import get_current_active_user
from ..models.cardmarket_price import CardMarketPrice
from ..models.prodotto import Prodotto

logger = logging.getLogger(__name__)
router = APIRouter()

# Configurazione RapidAPI CardMarket
RAPIDAPI_CARDMARKET_HOST = "cardmarket-api-tcg.p.rapidapi.com"
RAPIDAPI_BASE_URL = f"https://{RAPIDAPI_CARDMARKET_HOST}"

# Mapping condizioni
CONDIZIONE_MAP = {
    "Mint": "MT",
    "Near Mint": "NM",
    "Quasi Perfetto": "NM",
    "Ottimo": "EX",
    "Excellent": "EX",
    "Good": "GD",
    "Buono": "GD",
    "Light Played": "LP",
    "Giocato": "LP",
    "Poor": "PO",
    "Rovinato": "PO",
}

# Mapping lingue
LINGUA_MAP = {
    "Inglese": 1,
    "Italiano": 2,
    "Francese": 3,
    "Tedesco": 4,
    "Spagnolo": 5,
    "Giapponese": 6,
    "Portoghese": 7,
    "Russo": 8,
    "Coreano": 9,
    "Cinese": 10,
}

CACHE_DAYS = 7


def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        normalized = value.replace("€", "").replace(",", ".").strip()
        try:
            return float(normalized)
        except ValueError:
            return None
    return None


def _get_first_product(payload: object) -> Optional[dict]:
    if isinstance(payload, list):
        return next((item for item in payload if isinstance(item, dict)), None)
    if isinstance(payload, dict):
        for key in ("products", "results", "items", "data"):
            value = payload.get(key)
            found = _get_first_product(value)
            if found:
                return found
    return None


def _find_value(payload: object, keys: set[str]):
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key.lower() in keys:
                return value
        for value in payload.values():
            found = _find_value(value, keys)
            if found is not None:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = _find_value(item, keys)
            if found is not None:
                return found
    return None


class CardMarketPriceResponse(BaseModel):
    prodotto_id: int
    prezzo_minimo: Optional[float]
    prezzo_medio: Optional[float]
    url_cardmarket: Optional[str]
    data_aggiornamento: datetime


def _scrape_cardmarket(nome: str, condizione: Optional[str], lingua: Optional[int]) -> dict:
    """Recupera prezzi CardMarket tramite API RapidAPI."""
    rapidapi_key = os.getenv("RAPIDAPI_CARDMARKET_KEY", "").strip()
    if not rapidapi_key:
        raise HTTPException(status_code=400, detail="RAPIDAPI_CARDMARKET_KEY non configurata")

    params = {"name": nome}
    if condizione:
        params["condition"] = condizione
    if lingua is not None:
        params["languageId"] = lingua

    headers = {
        "X-RapidAPI-Key": rapidapi_key,
        "X-RapidAPI-Host": RAPIDAPI_CARDMARKET_HOST,
    }

    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(f"{RAPIDAPI_BASE_URL}/products/search", params=params, headers=headers)
            response.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout durante la richiesta a CardMarket")
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit raggiunto. Riprova tra qualche minuto.")
        raise HTTPException(status_code=502, detail=f"Errore CardMarket: {exc.response.status_code}")
    except httpx.RequestError as exc:
        logger.error("Errore richiesta RapidAPI CardMarket: %s", exc)
        raise HTTPException(status_code=502, detail="Errore durante il recupero dei dati da CardMarket")

    payload = response.json()
    product = _get_first_product(payload)
    if not product:
        logger.warning("Nessun risultato trovato nella ricerca CardMarket per '%s'", nome)
        return {"prezzo_minimo": None, "prezzo_medio": None, "url_cardmarket": str(response.url)}

    prezzo_minimo = _to_float(_find_value(product, {"minprice", "pricemin", "prezzo_minimo", "lowestprice", "fromprice"}))
    prezzo_medio = _to_float(_find_value(product, {"avgprice", "priceavg", "prezzo_medio", "averageprice", "trendprice"}))

    url_cardmarket = _find_value(product, {"url", "producturl", "product_url", "cardmarketurl", "href"})
    if isinstance(url_cardmarket, str) and url_cardmarket.startswith("/"):
        url_cardmarket = f"https://www.cardmarket.com{url_cardmarket}"
    if not isinstance(url_cardmarket, str):
        url_cardmarket = str(response.url)

    return {
        "prezzo_minimo": prezzo_minimo,
        "prezzo_medio": prezzo_medio,
        "url_cardmarket": url_cardmarket,
    }


@router.post("/scrape-prezzi/{prodotto_id}", response_model=CardMarketPriceResponse)
def scrape_prezzi(
    prodotto_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Scrape prezzi CardMarket per un prodotto specifico.
    Se force=False, usa la cache se disponibile (<7 giorni).
    """
    prodotto = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    # Controlla cache
    existing = db.query(CardMarketPrice).filter(
        CardMarketPrice.prodotto_id == prodotto_id
    ).first()

    if existing and not force:
        age = datetime.now(timezone.utc) - existing.data_aggiornamento.replace(tzinfo=timezone.utc)
        if age.days < CACHE_DAYS:
            logger.info(f"Usando cache CardMarket per prodotto {prodotto_id} (age: {age.days} days)")
            return CardMarketPriceResponse(
                prodotto_id=prodotto_id,
                prezzo_minimo=float(existing.prezzo_minimo) if existing.prezzo_minimo else None,
                prezzo_medio=float(existing.prezzo_medio) if existing.prezzo_medio else None,
                url_cardmarket=existing.url_cardmarket,
                data_aggiornamento=existing.data_aggiornamento,
            )

    # Scrape nuovi prezzi
    condizione = CONDIZIONE_MAP.get(prodotto.stato_conservazione)
    lingua = LINGUA_MAP.get(prodotto.lingua)

    scraped = _scrape_cardmarket(prodotto.nome, condizione, lingua)

    # Salva/aggiorna database
    now = datetime.now(timezone.utc)
    if existing:
        existing.prezzo_minimo = Decimal(str(scraped["prezzo_minimo"])) if scraped["prezzo_minimo"] is not None else None
        existing.prezzo_medio = Decimal(str(scraped["prezzo_medio"])) if scraped["prezzo_medio"] is not None else None
        existing.url_cardmarket = scraped["url_cardmarket"]
        existing.data_aggiornamento = now
        db.commit()
        db.refresh(existing)
        result = existing
    else:
        new_price = CardMarketPrice(
            prodotto_id=prodotto_id,
            prezzo_minimo=Decimal(str(scraped["prezzo_minimo"])) if scraped["prezzo_minimo"] is not None else None,
            prezzo_medio=Decimal(str(scraped["prezzo_medio"])) if scraped["prezzo_medio"] is not None else None,
            url_cardmarket=scraped["url_cardmarket"],
            data_aggiornamento=now,
        )
        db.add(new_price)
        db.commit()
        db.refresh(new_price)
        result = new_price

    return CardMarketPriceResponse(
        prodotto_id=prodotto_id,
        prezzo_minimo=float(result.prezzo_minimo) if result.prezzo_minimo else None,
        prezzo_medio=float(result.prezzo_medio) if result.prezzo_medio else None,
        url_cardmarket=result.url_cardmarket,
        data_aggiornamento=result.data_aggiornamento,
    )


@router.get("/prezzi-cached/{prodotto_id}", response_model=Optional[CardMarketPriceResponse])
def get_prezzi_cached(
    prodotto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Restituisce prezzi CardMarket dalla cache (se disponibili)."""
    price = db.query(CardMarketPrice).filter(CardMarketPrice.prodotto_id == prodotto_id).first()
    if not price:
        return None

    return CardMarketPriceResponse(
        prodotto_id=prodotto_id,
        prezzo_minimo=float(price.prezzo_minimo) if price.prezzo_minimo else None,
        prezzo_medio=float(price.prezzo_medio) if price.prezzo_medio else None,
        url_cardmarket=price.url_cardmarket,
        data_aggiornamento=price.data_aggiornamento,
    )


@router.post("/update-all-prices")
def update_all_prices(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Aggiorna i prezzi CardMarket per tutti i prodotti con dati vecchi (>7 giorni).
    Solo per admin.

    - **limit**: numero massimo di prodotti da aggiornare per chiamata (default 50);
      usato per controllare il consumo di chiamate API in batch.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Solo admin")

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=CACHE_DAYS)

    old_prices = db.query(CardMarketPrice).filter(
        CardMarketPrice.data_aggiornamento < cutoff_date
    ).limit(limit).all()

    aggiornati = 0
    errori = []

    for price in old_prices:
        try:
            prodotto = db.query(Prodotto).filter(Prodotto.id == price.prodotto_id).first()
            if not prodotto:
                continue

            condizione = CONDIZIONE_MAP.get(prodotto.stato_conservazione)
            lingua = LINGUA_MAP.get(prodotto.lingua)

            scraped = _scrape_cardmarket(prodotto.nome, condizione, lingua)

            price.prezzo_minimo = Decimal(str(scraped["prezzo_minimo"])) if scraped["prezzo_minimo"] is not None else None
            price.prezzo_medio = Decimal(str(scraped["prezzo_medio"])) if scraped["prezzo_medio"] is not None else None
            price.url_cardmarket = scraped["url_cardmarket"]
            price.data_aggiornamento = datetime.now(timezone.utc)

            db.commit()
            aggiornati += 1

        except Exception as e:
            logger.error(f"Errore aggiornamento prezzo prodotto {price.prodotto_id}: {e}")
            errori.append(f"Prodotto {price.prodotto_id}: {str(e)}")

    return {
        "aggiornati": aggiornati,
        "errori": errori,
        "totale_processati": len(old_prices),
    }
