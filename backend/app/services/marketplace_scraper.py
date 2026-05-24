"""Scraping occasioni dai marketplace: eBay Italia, Subito.it, Vinted, Wallapop.

Ogni funzione restituisce una lista di dict con le chiavi:
  - titolo: str
  - prezzo: float
  - url: str
  - sito: str
  - spedizione: float (stima, 0 se gratuita)
  - scadenza_asta: str | None  (solo eBay aste)
  - tipo: "listing" | "asta"

Ogni scraper è indipendente e usa try/except per non bloccare gli altri.
"""
import logging
import re
import time
from typing import Any
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
}

_REQUEST_DELAY = 2.0  # secondi tra le richieste
_TIMEOUT = 20.0


def _parse_price(text: str) -> float | None:
    """Estrae il primo prezzo da una stringa."""
    cleaned = re.sub(r"[€$£\s]", "", text.replace(",", "."))
    match = re.search(r"\d+(?:\.\d{1,2})?", cleaned)
    if match:
        try:
            return float(match.group())
        except ValueError:
            return None
    return None


def _get_page(url: str) -> BeautifulSoup | None:
    """Scarica una pagina e restituisce un oggetto BeautifulSoup."""
    try:
        with httpx.Client(
            timeout=_TIMEOUT,
            headers=_DEFAULT_HEADERS,
            follow_redirects=True,
        ) as client:
            response = client.get(url)
            response.raise_for_status()
            return BeautifulSoup(response.text, "lxml")
    except Exception as exc:
        logger.warning("_get_page fallito per %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# eBay Italia
# ---------------------------------------------------------------------------

def scrape_ebay_pokemon(query: str = "carte pokemon") -> list[dict[str, Any]]:
    """Cerca listing e aste carte Pokémon su eBay Italia (site_id=101).

    Cerca sia listing a prezzo fisso sia aste in scadenza.
    """
    risultati: list[dict[str, Any]] = []

    # Listing a prezzi fissi
    try:
        url_buy = (
            f"https://www.ebay.it/sch/i.html?_nkw={quote_plus(query)}"
            f"&_sacat=2536&LH_BIN=1&_sop=12&_pgn=1"
        )
        soup = _get_page(url_buy)
        time.sleep(_REQUEST_DELAY)
        if soup:
            items = soup.select("li.s-item")
            for item in items[:20]:
                titolo_el = item.select_one(".s-item__title")
                prezzo_el = item.select_one(".s-item__price")
                url_el = item.select_one("a.s-item__link")
                spedizione_el = item.select_one(".s-item__shipping")

                if not (titolo_el and prezzo_el and url_el):
                    continue

                titolo = titolo_el.get_text(strip=True)
                if "shop on ebay" in titolo.lower():
                    continue

                prezzo = _parse_price(prezzo_el.get_text(strip=True))
                if prezzo is None:
                    continue

                spedizione = 0.0
                if spedizione_el:
                    ship_text = spedizione_el.get_text(strip=True).lower()
                    if "gratis" in ship_text or "gratuita" in ship_text or "free" in ship_text:
                        spedizione = 0.0
                    else:
                        spedizione = _parse_price(ship_text) or 0.0

                risultati.append({
                    "titolo": titolo,
                    "prezzo": prezzo,
                    "url": url_el.get("href", ""),
                    "sito": "eBay Italia",
                    "spedizione": spedizione,
                    "scadenza_asta": None,
                    "tipo": "listing",
                })
    except Exception as exc:
        logger.warning("scrape_ebay_pokemon (listing): %s", exc)

    # Aste in scadenza
    try:
        url_aste = (
            f"https://www.ebay.it/sch/i.html?_nkw={quote_plus(query)}"
            f"&_sacat=2536&LH_Auction=1&_sop=1&_pgn=1"
        )
        soup_aste = _get_page(url_aste)
        time.sleep(_REQUEST_DELAY)
        if soup_aste:
            items = soup_aste.select("li.s-item")
            for item in items[:20]:
                titolo_el = item.select_one(".s-item__title")
                prezzo_el = item.select_one(".s-item__price")
                url_el = item.select_one("a.s-item__link")
                scadenza_el = item.select_one(".s-item__time-end, .s-item__time-left")
                spedizione_el = item.select_one(".s-item__shipping")

                if not (titolo_el and prezzo_el and url_el):
                    continue

                titolo = titolo_el.get_text(strip=True)
                if "shop on ebay" in titolo.lower():
                    continue

                prezzo = _parse_price(prezzo_el.get_text(strip=True))
                if prezzo is None:
                    continue

                spedizione = 0.0
                if spedizione_el:
                    ship_text = spedizione_el.get_text(strip=True).lower()
                    if "gratis" in ship_text or "gratuita" in ship_text or "free" in ship_text:
                        spedizione = 0.0
                    else:
                        spedizione = _parse_price(ship_text) or 0.0

                scadenza = scadenza_el.get_text(strip=True) if scadenza_el else None

                risultati.append({
                    "titolo": titolo,
                    "prezzo": prezzo,
                    "url": url_el.get("href", ""),
                    "sito": "eBay Italia",
                    "spedizione": spedizione,
                    "scadenza_asta": scadenza,
                    "tipo": "asta",
                })
    except Exception as exc:
        logger.warning("scrape_ebay_pokemon (aste): %s", exc)

    return risultati


# ---------------------------------------------------------------------------
# Subito.it
# ---------------------------------------------------------------------------

def scrape_subito_pokemon(query: str = "carte pokemon") -> list[dict[str, Any]]:
    """Cerca annunci carte Pokémon su Subito.it."""
    risultati: list[dict[str, Any]] = []
    try:
        url = (
            f"https://www.subito.it/annunci-italia/vendita/usato/"
            f"?q={quote_plus(query)}&t=s"
        )
        soup = _get_page(url)
        time.sleep(_REQUEST_DELAY)
        if not soup:
            return risultati

        items = soup.select("div.item-key-data, article.item-card")
        if not items:
            items = soup.select("[class*='ItemCard'], [class*='item-card']")

        for item in items[:20]:
            titolo_el = (
                item.select_one("h2.item-title")
                or item.select_one("[class*='ItemTitle']")
                or item.select_one("h2")
            )
            prezzo_el = (
                item.select_one("p.price, span.price")
                or item.select_one("[class*='Price']")
                or item.select_one("[class*='price']")
            )
            url_el = item.select_one("a[href]") or item.find_parent("a")

            if not (titolo_el and prezzo_el):
                continue

            titolo = titolo_el.get_text(strip=True)
            prezzo = _parse_price(prezzo_el.get_text(strip=True))
            if prezzo is None:
                continue

            link = ""
            if url_el:
                href = url_el.get("href", "")
                link = href if href.startswith("http") else f"https://www.subito.it{href}"

            risultati.append({
                "titolo": titolo,
                "prezzo": prezzo,
                "url": link,
                "sito": "Subito.it",
                "spedizione": 0.0,
                "scadenza_asta": None,
                "tipo": "listing",
            })
    except Exception as exc:
        logger.warning("scrape_subito_pokemon: %s", exc)

    return risultati


# ---------------------------------------------------------------------------
# Vinted (best effort)
# ---------------------------------------------------------------------------

def scrape_vinted_pokemon(query: str = "carte pokemon") -> list[dict[str, Any]]:
    """Cerca annunci carte Pokémon su Vinted (best effort, può fallire)."""
    risultati: list[dict[str, Any]] = []
    try:
        url = f"https://www.vinted.it/catalog?search_text={quote_plus(query)}"
        soup = _get_page(url)
        time.sleep(_REQUEST_DELAY)
        if not soup:
            return risultati

        items = soup.select("[data-testid='regular-item-box'], .feed-grid__item")
        if not items:
            items = soup.select("[class*='ItemBox'], [class*='item-box']")

        for item in items[:20]:
            titolo_el = (
                item.select_one("[data-testid='item-box-title'], .item-title")
                or item.select_one("[class*='Title']")
            )
            prezzo_el = (
                item.select_one("[data-testid='item-box-price'], .item-price")
                or item.select_one("[class*='Price']")
            )
            url_el = item.select_one("a[href]")

            if not (titolo_el and prezzo_el):
                continue

            titolo = titolo_el.get_text(strip=True)
            prezzo = _parse_price(prezzo_el.get_text(strip=True))
            if prezzo is None:
                continue

            link = ""
            if url_el:
                href = url_el.get("href", "")
                link = href if href.startswith("http") else f"https://www.vinted.it{href}"

            risultati.append({
                "titolo": titolo,
                "prezzo": prezzo,
                "url": link,
                "sito": "Vinted",
                "spedizione": 0.0,
                "scadenza_asta": None,
                "tipo": "listing",
            })
    except Exception as exc:
        logger.warning("scrape_vinted_pokemon: %s", exc)

    return risultati


# ---------------------------------------------------------------------------
# Wallapop (best effort)
# ---------------------------------------------------------------------------

def scrape_wallapop_pokemon(query: str = "carte pokemon") -> list[dict[str, Any]]:
    """Cerca annunci carte Pokémon su Wallapop (best effort, può fallire)."""
    risultati: list[dict[str, Any]] = []
    try:
        url = (
            f"https://it.wallapop.com/app/search?"
            f"keywords={quote_plus(query)}&category_ids=15000"
        )
        soup = _get_page(url)
        time.sleep(_REQUEST_DELAY)
        if not soup:
            return risultati

        items = soup.select(
            "[class*='ItemCard'], [class*='item-card'], "
            "tsl-item-card, [data-testid='ItemCard']"
        )

        for item in items[:20]:
            titolo_el = (
                item.select_one("[class*='Title'], [class*='title']")
                or item.select_one("p, span")
            )
            prezzo_el = item.select_one("[class*='Price'], [class*='price']")
            url_el = item.select_one("a[href]")

            if not (titolo_el and prezzo_el):
                continue

            titolo = titolo_el.get_text(strip=True)
            prezzo = _parse_price(prezzo_el.get_text(strip=True))
            if prezzo is None:
                continue

            link = ""
            if url_el:
                href = url_el.get("href", "")
                link = href if href.startswith("http") else f"https://it.wallapop.com{href}"

            risultati.append({
                "titolo": titolo,
                "prezzo": prezzo,
                "url": link,
                "sito": "Wallapop",
                "spedizione": 0.0,
                "scadenza_asta": None,
                "tipo": "listing",
            })
    except Exception as exc:
        logger.warning("scrape_wallapop_pokemon: %s", exc)

    return risultati


# ---------------------------------------------------------------------------
# Aggregatore
# ---------------------------------------------------------------------------

def scrape_all_marketplaces(query: str = "carte pokemon") -> list[dict[str, Any]]:
    """Aggrega i risultati di tutti i marketplace.

    Ogni scraper viene eseguito indipendentemente — il fallimento di uno
    non blocca gli altri.
    """
    tutti: list[dict[str, Any]] = []

    for scraper_fn in [
        scrape_ebay_pokemon,
        scrape_subito_pokemon,
        scrape_vinted_pokemon,
        scrape_wallapop_pokemon,
    ]:
        try:
            risultati = scraper_fn(query)
            tutti.extend(risultati)
            logger.info("%s: %d annunci trovati", scraper_fn.__name__, len(risultati))
        except Exception as exc:
            logger.warning("scrape_all_marketplaces — %s fallito: %s", scraper_fn.__name__, exc)

    return tutti
