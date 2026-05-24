import logging
import re
from typing import Any, Optional
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

from ..routers.cardmarket_scraper import LINGUA_MAP as CARDMARKET_LANGUAGE_MAP
from ..routers.cardmarket_scraper import _scrape_cardmarket
from ..routers.cardtrader import get_market_prices as get_cardtrader_market_prices
from ..routers.ebay import get_prezzi_ebay


logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
}


class MarketScraperService:
    @staticmethod
    def _extract_prices(text: str) -> list[float]:
        seen: set[float] = set()
        prices: list[float] = []
        for raw in re.findall(r"(?:€\s*)?(\d{1,5}(?:[.,]\d{1,2})?)", text):
            normalized = raw.replace(",", ".")
            try:
                value = float(normalized)
            except ValueError:
                continue
            if value < 0.5 or value > 99999:
                continue
            rounded = round(value, 2)
            if rounded not in seen:
                seen.add(rounded)
                prices.append(rounded)
        return prices

    @staticmethod
    def _scrape_prices_from_url(url: str) -> dict[str, Any]:
        try:
            with httpx.Client(timeout=20, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
                resp = client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            prices = MarketScraperService._extract_prices(soup.get_text(" ", strip=True))
            return {"search_url": url, "prices": prices[:30], "error": None}
        except Exception as exc:
            logger.warning("Scraping fallito per %s: %s", url, exc)
            return {"search_url": url, "prices": [], "error": str(exc)}

    @staticmethod
    def scrape_vinted(nome: str) -> dict[str, Any]:
        url = f"https://www.vinted.it/catalog?search_text={quote_plus(nome)}"
        result = MarketScraperService._scrape_prices_from_url(url)
        result["marketplace"] = "vinted"
        return result

    @staticmethod
    def scrape_wallapop(nome: str) -> dict[str, Any]:
        url = f"https://it.wallapop.com/app/search?keywords={quote_plus(nome)}"
        result = MarketScraperService._scrape_prices_from_url(url)
        result["marketplace"] = "wallapop"
        return result

    @staticmethod
    def scrape_second_hand_eu(nome: str) -> dict[str, Any]:
        markets = {
            "subito": f"https://www.subito.it/annunci-italia/vendita/usato/?q={quote_plus(nome)}",
            "leboncoin": f"https://www.leboncoin.fr/recherche?text={quote_plus(nome)}",
            "kleinanzeigen": f"https://www.kleinanzeigen.de/s-{quote_plus(nome)}/k0",
        }
        results = {}
        for key, url in markets.items():
            results[key] = MarketScraperService._scrape_prices_from_url(url)
        return results

    @staticmethod
    def get_all_market_prices(
        nome: str,
        condizione: str,
        lingua: str,
        blueprint_id: Optional[int] = None,
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "query": {"nome": nome, "condizione": condizione, "lingua": lingua, "blueprint_id": blueprint_id},
            "sources": {},
        }

        try:
            result["sources"]["ebay"] = get_prezzi_ebay(nome=nome, stato=condizione, current_user=True)
        except Exception as exc:
            result["sources"]["ebay"] = {"error": str(exc)}

        if blueprint_id:
            try:
                result["sources"]["cardtrader"] = get_cardtrader_market_prices(
                    blueprint_id=blueprint_id,
                    condizione=condizione,
                    lingua=lingua,
                    current_user=True,
                )
            except Exception as exc:
                result["sources"]["cardtrader"] = {"error": str(exc)}
        else:
            result["sources"]["cardtrader"] = {"error": "Blueprint ID non disponibile"}

        try:
            cardmarket_raw = _scrape_cardmarket(
                nome=nome,
                condizione=condizione,
                lingua=CARDMARKET_LANGUAGE_MAP.get(lingua) if lingua else None,
            )
            result["sources"]["cardmarket"] = cardmarket_raw
        except Exception as exc:
            result["sources"]["cardmarket"] = {"error": str(exc)}

        result["sources"]["vinted"] = MarketScraperService.scrape_vinted(nome)
        result["sources"]["wallapop"] = MarketScraperService.scrape_wallapop(nome)
        result["sources"]["second_hand_eu"] = MarketScraperService.scrape_second_hand_eu(nome)

        collected: list[float] = []

        ebay = result["sources"].get("ebay") or {}
        for key in ("prezzo_medio", "ultimo_prezzo", "ultimo_prezzo_venduto"):
            value = ebay.get(key)
            if isinstance(value, (int, float)):
                collected.append(float(value))

        cardtrader = result["sources"].get("cardtrader") or {}
        for key in ("prezzo_minimo", "prezzo_medio"):
            value = cardtrader.get(key)
            if isinstance(value, (int, float)):
                collected.append(float(value))

        cardmarket = result["sources"].get("cardmarket") or {}
        for key in ("prezzo_minimo", "prezzo_medio"):
            value = cardmarket.get(key)
            if isinstance(value, (int, float)):
                collected.append(float(value))

        for key in ("vinted", "wallapop"):
            for value in (result["sources"].get(key, {}) or {}).get("prices", []):
                if isinstance(value, (int, float)):
                    collected.append(float(value))

        second_hand = result["sources"].get("second_hand_eu", {}) or {}
        for site_data in second_hand.values():
            for value in site_data.get("prices", []):
                if isinstance(value, (int, float)):
                    collected.append(float(value))

        collected = [round(v, 2) for v in collected if v > 0]
        result["summary"] = {
            "count": len(collected),
            "min": round(min(collected), 2) if collected else None,
            "max": round(max(collected), 2) if collected else None,
            "avg": round(sum(collected) / len(collected), 2) if collected else None,
            "all_prices": collected,
        }
        return result
