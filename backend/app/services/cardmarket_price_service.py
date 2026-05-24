"""Scraping prezzi Cardmarket per carte Pokémon.

Recupera il prezzo minimo per lingua e condizione tramite la funzione
_scrape_cardmarket già presente nel router cardmarket_scraper.
"""
import logging
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

_REQUEST_DELAY = 1.5  # secondi tra le richieste


def get_cardmarket_min_price(
    nome: str,
    lingua: Optional[str] = None,
    condizione: Optional[str] = None,
) -> Optional[float]:
    """Recupera il prezzo minimo da Cardmarket per un prodotto.

    Args:
        nome: nome della carta (es. "Charizard ex")
        lingua: lingua della carta (es. "italiano", "inglese")
        condizione: condizione della carta (es. "Near Mint", "Excellent")

    Returns:
        Prezzo minimo come float, o None se non disponibile.
    """
    try:
        from ..routers.cardmarket_scraper import _scrape_cardmarket, LINGUA_MAP

        lingua_code = None
        if lingua:
            lingua_lower = lingua.lower()
            for code, label in LINGUA_MAP.items():
                if label.lower() == lingua_lower or code.lower() == lingua_lower:
                    lingua_code = code
                    break
            if lingua_code is None:
                lingua_code = lingua

        result = _scrape_cardmarket(
            nome=nome,
            lingua=lingua_code,
            condizione=condizione,
        )

        if not result:
            return None

        prezzi = result.get("prezzi", [])
        if not prezzi:
            return None

        validi = [p for p in prezzi if isinstance(p, (int, float)) and p > 0]
        if not validi:
            return None

        return round(min(validi), 2)

    except Exception as exc:
        logger.warning(
            "cardmarket_scraper: errore recupero prezzo per '%s': %s", nome, exc
        )
        return None
    finally:
        time.sleep(_REQUEST_DELAY)


def get_cardmarket_prices_batch(
    prodotti: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Recupera prezzi Cardmarket per una lista di prodotti.

    Args:
        prodotti: lista di dict con chiavi 'nome', 'lingua' (opz.), 'condizione' (opz.)

    Returns:
        Lista di dict arricchiti con 'prezzo_cardmarket_min'.
    """
    risultati = []
    for prodotto in prodotti:
        nome = prodotto.get("nome", "")
        if not nome:
            risultati.append({**prodotto, "prezzo_cardmarket_min": None})
            continue

        prezzo = get_cardmarket_min_price(
            nome=nome,
            lingua=prodotto.get("lingua"),
            condizione=prodotto.get("condizione") or prodotto.get("stato_conservazione"),
        )
        risultati.append({**prodotto, "prezzo_cardmarket_min": prezzo})

    return risultati
