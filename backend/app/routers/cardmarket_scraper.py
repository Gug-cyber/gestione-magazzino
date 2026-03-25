import logging
import os
import random
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx
from bs4 import BeautifulSoup

from ..database import get_db
from ..auth import get_current_active_user
from ..models.cardmarket_price import CardMarketPrice
from ..models.prodotto import Prodotto

logger = logging.getLogger(__name__)
router = APIRouter()

# Configurazione ScraperAPI
SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY", "").strip()

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

# Header migliorati per richieste dirette
IMPROVED_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    "Referer": "https://www.google.com/",
}

CACHE_DAYS = 7


def _rate_limit_sleep() -> None:
    """Sleep a random interval to avoid hammering CardMarket with direct requests."""
    time.sleep(random.uniform(10, 20))


class CardMarketPriceResponse(BaseModel):
    prodotto_id: int
    prezzo_minimo: Optional[float]
    prezzo_medio: Optional[float]
    url_cardmarket: Optional[str]
    data_aggiornamento: datetime


def _scrape_direct(url: str) -> BeautifulSoup:
    """Scraping diretto con header migliorati e rate limiting variabile."""
    _rate_limit_sleep()

    try:
        with httpx.Client(timeout=30, headers=IMPROVED_HEADERS, follow_redirects=True) as client:
            response = client.get(url)
            logger.info(f"Direct response: {response.status_code}")

            if response.status_code == 403:
                logger.error("403 Forbidden - CardMarket blocca le richieste")
                raise HTTPException(
                    status_code=403,
                    detail="CardMarket blocca le richieste. Configura SCRAPER_API_KEY per risolvere.",
                )

            response.raise_for_status()
            return BeautifulSoup(response.content, "html.parser")

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout durante la richiesta a CardMarket")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit raggiunto. Riprova tra qualche minuto.")
        raise HTTPException(status_code=502, detail=f"Errore CardMarket: {e.response.status_code}")


def _parse_cardmarket_page(soup: BeautifulSoup, search_url: str) -> dict:
    """Parsing della pagina CardMarket con selettori multipli."""

    # Trova primo risultato di ricerca
    first_result = soup.select_one("div.table-body a[href*='/Products/Singles']")
    if not first_result:
        logger.warning("Nessun risultato trovato nella ricerca")
        return {"prezzo_minimo": None, "prezzo_medio": None, "url_cardmarket": search_url}

    product_url = "https://www.cardmarket.com" + first_result.get("href", "")
    logger.info(f"Pagina prodotto trovata: {product_url}")

    # Scrape pagina prodotto
    if SCRAPER_API_KEY:
        try:
            from scraperapi_sdk import ScraperAPIClient  # type: ignore[import]

            client = ScraperAPIClient(SCRAPER_API_KEY)
            product_html = client.get(product_url, render_js=False, premium=True)
            product_soup = BeautifulSoup(product_html, "html.parser")
        except Exception as e:
            logger.error(f"Errore scraping pagina prodotto via ScraperAPI: {e}")
            return {"prezzo_minimo": None, "prezzo_medio": None, "url_cardmarket": product_url}
    else:
        try:
            with httpx.Client(timeout=30, headers=IMPROVED_HEADERS, follow_redirects=True) as client:
                product_response = client.get(product_url)
                product_response.raise_for_status()
                product_soup = BeautifulSoup(product_response.content, "html.parser")
        except Exception as e:
            logger.error(f"Errore scraping pagina prodotto: {e}")
            return {"prezzo_minimo": None, "prezzo_medio": None, "url_cardmarket": product_url}

    # Selettori multipli con fallback
    selectors_map = [
        ("span.price-from", "span.price-avg"),
        ("span.font-weight-bold.color-primary", "span.font-weight-bold.text-muted"),
        (".price-container .price-from", ".price-container .price-avg"),
        ("dd.col-6.col-xl-7", None),
    ]

    prezzo_minimo = None
    prezzo_medio = None

    for min_sel, avg_sel in selectors_map:
        if not prezzo_minimo:
            elem = product_soup.select_one(min_sel)
            if elem:
                text = elem.get_text(strip=True).replace("€", "").replace(",", ".")
                try:
                    prezzo_minimo = float(text.split()[0])
                    logger.info(f"Prezzo minimo trovato: €{prezzo_minimo}")
                except (ValueError, IndexError):
                    pass

        if not prezzo_medio and avg_sel:
            elem = product_soup.select_one(avg_sel)
            if elem:
                text = elem.get_text(strip=True).replace("€", "").replace(",", ".")
                try:
                    prezzo_medio = float(text.split()[0])
                    logger.info(f"Prezzo medio trovato: €{prezzo_medio}")
                except (ValueError, IndexError):
                    pass

        if prezzo_minimo and prezzo_medio:
            break

    if not prezzo_minimo and not prezzo_medio:
        logger.error("Nessun prezzo trovato nella pagina")

    return {
        "prezzo_minimo": prezzo_minimo,
        "prezzo_medio": prezzo_medio,
        "url_cardmarket": product_url,
    }


def _scrape_cardmarket(nome: str, condizione: Optional[str], lingua: Optional[int]) -> dict:
    """
    Scrape prezzi da CardMarket usando ScraperAPI (se configurato) o richieste dirette.
    """
    query = nome.replace(" ", "+")
    url = f"https://www.cardmarket.com/it/Magic/Products/Search?searchString={query}"

    logger.info(f"Scraping CardMarket per: {nome}")

    # Strategia A: ScraperAPI (se configurato)
    if SCRAPER_API_KEY:
        try:
            from scraperapi_sdk import ScraperAPIClient  # type: ignore[import]

            logger.info("Usando ScraperAPI (bypass 403)")
            client = ScraperAPIClient(SCRAPER_API_KEY)
            response_text = client.get(url, render_js=False, premium=True)
            soup = BeautifulSoup(response_text, "html.parser")

        except ImportError:
            logger.warning("scraperapi-sdk non installato, fallback a richieste dirette")
            soup = _scrape_direct(url)
        except Exception as e:
            logger.error(f"Errore ScraperAPI: {e}")
            raise HTTPException(status_code=502, detail=f"Errore ScraperAPI: {str(e)}")

    # Strategia B: Richieste dirette (fallback)
    else:
        logger.warning("SCRAPER_API_KEY non configurata, uso richiesta diretta (possibile 403)")
        soup = _scrape_direct(url)

    return _parse_cardmarket_page(soup, url)


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
      usato per controllare il consumo di crediti ScraperAPI in batch.
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
