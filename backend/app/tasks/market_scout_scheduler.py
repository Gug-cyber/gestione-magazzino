"""Processo 2 — Scouting occasioni marketplace.

Logica:
- Cadenza: ogni ora
- Ricerca generica per carte Pokémon (non legata al magazzino)
- Marketplace: Cardmarket (prezzo rivendita), eBay Italia, Subito.it, Vinted, Wallapop
- Calcolo marginalità:
    prezzo_rivendita = prezzo minimo Cardmarket
    prezzo_max_acquisto = prezzo_rivendita / 1.275 (~27.5% margine)
    occasione valida se: prezzo_listing <= prezzo_max_acquisto
- Per ogni occasione trovata: invia notifica Telegram (MARKET_BOT_TOKEN)
"""
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any

import schedule

from ..database import SessionLocal
from ..models.market_report import MarketReport
from ..services.market_telegram import send_market_message
from ..services.marketplace_scraper import scrape_all_marketplaces

logger = logging.getLogger(__name__)

_scheduler_started = False
_scheduler_lock = threading.Lock()
_last_run: datetime | None = None

# Margine target ~27.5% — divisore per calcolare prezzo_max_acquisto
_MARGIN_DIVISOR = 1.275

# Prezzi Cardmarket di riferimento per query generiche carte Pokémon
# Struttura: dict[query_lower] -> prezzo_rivendita_stimato
# Viene aggiornato ad ogni ciclo con dati reali se disponibili
_CARDMARKET_REFERENCE_CACHE: dict[str, float] = {}

# Prezzo di rivendita di default se Cardmarket non risponde (fallback conservativo)
_DEFAULT_RESALE_PRICE = 10.0


def _get_cardmarket_resale_price(nome: str) -> float | None:
    """Recupera il prezzo minimo Cardmarket come prezzo di rivendita stimato."""
    cached = _CARDMARKET_REFERENCE_CACHE.get(nome.lower())
    if cached:
        return cached

    try:
        from ..services.cardmarket_price_service import get_cardmarket_min_price
        prezzo = get_cardmarket_min_price(nome=nome)
        if prezzo and prezzo > 0:
            _CARDMARKET_REFERENCE_CACHE[nome.lower()] = prezzo
            return prezzo
    except Exception as exc:
        logger.warning("Cardmarket resale price fallito per '%s': %s", nome, exc)

    return None


def _valuta_occasione(
    listing: dict[str, Any],
    prezzo_rivendita: float,
) -> dict[str, Any] | None:
    """Valuta se un listing è un'occasione valida.

    Returns:
        dict con i dati dell'occasione, o None se non è un'occasione.
    """
    prezzo_listing = listing.get("prezzo", 0) or 0
    spedizione = listing.get("spedizione", 0) or 0
    prezzo_totale = prezzo_listing + spedizione

    if prezzo_totale <= 0:
        return None

    prezzo_max_acquisto = round(prezzo_rivendita / _MARGIN_DIVISOR, 2)

    if prezzo_totale > prezzo_max_acquisto:
        return None

    margine = round(prezzo_rivendita - prezzo_totale, 2)
    margine_pct = round((margine / prezzo_rivendita) * 100, 1)

    return {
        "titolo": listing.get("titolo", ""),
        "sito": listing.get("sito", ""),
        "url": listing.get("url", ""),
        "prezzo_listing": prezzo_listing,
        "spedizione": spedizione,
        "prezzo_totale": prezzo_totale,
        "prezzo_rivendita": prezzo_rivendita,
        "margine": margine,
        "margine_pct": margine_pct,
        "prezzo_max_acquisto": prezzo_max_acquisto,
        "scadenza_asta": listing.get("scadenza_asta"),
        "tipo": listing.get("tipo", "listing"),
    }


def _format_occasione_message(occasione: dict[str, Any]) -> str:
    """Formatta il messaggio Telegram per una singola occasione."""
    titolo = occasione.get("titolo", "?")
    sito = occasione.get("sito", "?")
    url = occasione.get("url", "")
    prezzo_listing = occasione.get("prezzo_totale", 0)
    prezzo_rivendita = occasione.get("prezzo_rivendita", 0)
    margine = occasione.get("margine", 0)
    margine_pct = occasione.get("margine_pct", 0)
    prezzo_max = occasione.get("prezzo_max_acquisto", 0)
    scadenza = occasione.get("scadenza_asta")

    lines = [
        "🎯 *Occasione trovata\\!*",
        "",
        f"🃏 *Prodotto*: {titolo}",
        f"🏪 *Sito*: {sito}",
    ]

    if url:
        lines.append(f"🔗 [Vedi annuncio]({url})")

    lines += [
        f"💸 *Prezzo listing*: €{prezzo_listing:.2f}",
        f"💰 *Prezzo rivendita stimato*: €{prezzo_rivendita:.2f} (Cardmarket min)",
        f"📈 *Margine potenziale*: €{margine:.2f} ({margine_pct}%)",
        f"🛒 *Prezzo max acquisto* (25-30% margine): €{prezzo_max:.2f}",
    ]

    if scadenza:
        lines.append(f"⏰ *Scadenza asta*: {scadenza}")

    return "\n".join(lines)


def run_market_scout() -> dict[str, Any]:
    """Esegue la scansione dei marketplace e notifica le occasioni trovate.

    Può essere chiamata direttamente (es. dai test o dall'endpoint di trigger).
    """
    global _last_run

    logger.info("Avvio scouting occasioni marketplace")
    db = SessionLocal()

    occasioni_trovate: list[dict[str, Any]] = []

    try:
        # Scarica tutti i listing dai marketplace
        listings = scrape_all_marketplaces("carte pokemon")
        logger.info("Listing totali trovati: %d", len(listings))

        for listing in listings:
            titolo = listing.get("titolo", "")
            if not titolo:
                continue

            # Cerca prezzo Cardmarket per il prodotto
            prezzo_rivendita = _get_cardmarket_resale_price(titolo)
            if not prezzo_rivendita:
                # Fallback: usa prezzo medio generico carte Pokémon
                prezzo_rivendita = _get_cardmarket_resale_price("Pokemon")
            if not prezzo_rivendita:
                prezzo_rivendita = _DEFAULT_RESALE_PRICE

            occasione = _valuta_occasione(listing, prezzo_rivendita)
            if occasione is None:
                continue

            occasioni_trovate.append(occasione)

            # Invia notifica Telegram per ogni occasione
            try:
                msg = _format_occasione_message(occasione)
                send_market_message(msg, parse_mode="MarkdownV2")
            except Exception as exc:
                logger.warning("Errore invio Telegram per occasione: %s", exc)

        # Salva le occasioni nel DB come report
        if occasioni_trovate:
            report = MarketReport(
                report_type="scout_opportunity",
                data={
                    "data": datetime.now(timezone.utc).isoformat(),
                    "occasioni": occasioni_trovate,
                    "totale": len(occasioni_trovate),
                },
                sent_telegram=len(occasioni_trovate) > 0,
            )
            db.add(report)
            db.commit()

        _last_run = datetime.now(timezone.utc)
        logger.info("Scouting completato — occasioni trovate: %d", len(occasioni_trovate))
        return {
            "data": _last_run.isoformat(),
            "occasioni": occasioni_trovate,
            "totale": len(occasioni_trovate),
        }

    except Exception as exc:
        logger.error("Errore run_market_scout: %s", exc)
        db.rollback()
        return {"error": str(exc)}
    finally:
        db.close()


def _scheduler_loop() -> None:
    """Loop del thread di scheduling — gira ogni ora."""
    schedule.every().hour.do(run_market_scout)
    logger.info("Scheduler scouting occasioni avviato — cadenza ogni ora")
    while True:
        schedule.run_pending()
        time.sleep(60)


def start_market_scout_scheduler() -> None:
    """Avvia il thread dello scheduler (idempotente)."""
    global _scheduler_started

    with _scheduler_lock:
        if _scheduler_started:
            return
        thread = threading.Thread(
            target=_scheduler_loop,
            name="market-scout-scheduler",
            daemon=True,
        )
        thread.start()
        _scheduler_started = True
        logger.info("Thread market-scout-scheduler avviato.")


def get_scheduler_status() -> dict[str, Any]:
    """Restituisce lo stato dello scheduler."""
    return {
        "scheduler": "market_scout",
        "started": _scheduler_started,
        "last_run": _last_run.isoformat() if _last_run else None,
        "interval": "ogni ora",
    }
