"""Processo 1 — Report giornaliero prezzi magazzino.

Logica:
- Cadenza: ogni giorno alle 08:00
- Fonte dati: prodotti nel magazzino con quantita >= 1
- Riferimento prezzi: Cardmarket (prezzo minimo per lingua e condizione)
- Per ogni prodotto: calcola la differenza tra prezzo di vendita e prezzo Cardmarket
- Classifica: in_linea, sopra_mercato, sotto_mercato
- Salva il report nel DB (MarketReport) e invia su Telegram (MARKET_BOT_TOKEN)
"""
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any

import schedule

from ..database import SessionLocal
from ..models.market_report import MarketReport
from ..models.prodotto import Prodotto
from ..services.market_telegram import send_market_message

logger = logging.getLogger(__name__)

_scheduler_started = False
_scheduler_lock = threading.Lock()
_last_run: datetime | None = None
_next_run: str = "08:00"


def _classifica_prodotto(prezzo_vendita: float, prezzo_mercato: float) -> str:
    """Classifica il prodotto rispetto al mercato."""
    if prezzo_mercato <= 0:
        return "in_linea"
    diff_pct = (prezzo_vendita - prezzo_mercato) / prezzo_mercato
    if diff_pct > 0.10:
        return "sopra_mercato"
    if diff_pct < -0.10:
        return "sotto_mercato"
    return "in_linea"


def run_daily_price_report() -> dict[str, Any]:
    """Esegue il report giornaliero prezzi e lo salva nel DB.

    Può essere chiamata direttamente (es. dai test o dall'endpoint di trigger).
    """
    global _last_run

    logger.info("Avvio report giornaliero prezzi magazzino")
    db = SessionLocal()

    try:
        # Carica prodotti con almeno 1 unità
        prodotti = db.query(Prodotto).filter(Prodotto.quantita >= 1).all()
        logger.info("Prodotti trovati con quantita >= 1: %d", len(prodotti))

        report_items: list[dict[str, Any]] = []
        in_linea = 0
        sopra_mercato = 0
        sotto_mercato = 0
        differenze: list[dict[str, Any]] = []

        for prodotto in prodotti:
            prezzo_vendita = float(prodotto.prezzo_vendita) if prodotto.prezzo_vendita else None
            prezzo_cardmarket = _get_cardmarket_price(prodotto)

            classificazione = "dati_insufficienti"
            differenza = None

            if prezzo_vendita is not None and prezzo_cardmarket is not None and prezzo_cardmarket > 0:
                classificazione = _classifica_prodotto(prezzo_vendita, prezzo_cardmarket)
                differenza = round(prezzo_vendita - prezzo_cardmarket, 2)

                if classificazione == "in_linea":
                    in_linea += 1
                elif classificazione == "sopra_mercato":
                    sopra_mercato += 1
                elif classificazione == "sotto_mercato":
                    sotto_mercato += 1

                if differenza is not None:
                    differenze.append({
                        "nome": prodotto.nome,
                        "differenza": differenza,
                        "prezzo_vendita": prezzo_vendita,
                        "prezzo_mercato": prezzo_cardmarket,
                    })

            report_items.append({
                "prodotto_id": prodotto.id,
                "nome": prodotto.nome,
                "quantita": prodotto.quantita,
                "lingua": prodotto.lingua,
                "condizione": prodotto.stato_conservazione,
                "prezzo_vendita": prezzo_vendita,
                "prezzo_cardmarket_min": prezzo_cardmarket,
                "differenza": differenza,
                "classificazione": classificazione,
            })

        # Ordina per valore assoluto differenza
        differenze.sort(key=lambda x: abs(x["differenza"]), reverse=True)
        top3 = differenze[:3]

        report_data = {
            "data": datetime.now(timezone.utc).isoformat(),
            "totale_prodotti": len(prodotti),
            "in_linea": in_linea,
            "sopra_mercato": sopra_mercato,
            "sotto_mercato": sotto_mercato,
            "prodotti": report_items,
            "top_differenze": top3,
        }

        # Salva nel DB
        market_report = MarketReport(
            report_type="daily_price",
            data=report_data,
            sent_telegram=False,
        )
        db.add(market_report)
        db.commit()
        db.refresh(market_report)

        # Invia Telegram
        tg_text = _format_telegram_message(report_data)
        sent = send_market_message(tg_text)
        if sent:
            market_report.sent_telegram = True
            db.commit()

        _last_run = datetime.now(timezone.utc)
        logger.info(
            "Report giornaliero completato — in_linea=%d sopra=%d sotto=%d",
            in_linea,
            sopra_mercato,
            sotto_mercato,
        )
        return report_data

    except Exception as exc:
        logger.error("Errore run_daily_price_report: %s", exc)
        db.rollback()
        return {"error": str(exc)}
    finally:
        db.close()


def _get_cardmarket_price(prodotto) -> float | None:
    """Recupera il prezzo minimo Cardmarket per il prodotto (con fallback silenzioso)."""
    try:
        from ..services.cardmarket_price_service import get_cardmarket_min_price
        return get_cardmarket_min_price(
            nome=prodotto.nome,
            lingua=prodotto.lingua,
            condizione=prodotto.stato_conservazione,
        )
    except Exception as exc:
        logger.warning("Prezzo Cardmarket non recuperabile per '%s': %s", prodotto.nome, exc)
        return None


def _format_telegram_message(report: dict[str, Any]) -> str:
    """Formatta il messaggio Telegram per il report giornaliero."""
    data_str = ""
    try:
        dt = datetime.fromisoformat(report["data"])
        data_str = dt.strftime("%d/%m/%Y")
    except Exception:
        data_str = report.get("data", "")

    lines = [
        "📊 *Report Prezzi Magazzino*",
        f"Data: {data_str}",
        "",
        f"✅ In linea col mercato: {report.get('in_linea', 0)} prodotti",
        f"📈 Sopra mercato: {report.get('sopra_mercato', 0)} prodotti",
        f"📉 Sotto mercato: {report.get('sotto_mercato', 0)} prodotti",
    ]

    top3 = report.get("top_differenze", [])
    if top3:
        lines.append("")
        lines.append("Top differenze:")
        for item in top3:
            nome = item.get("nome", "?")
            diff = item.get("differenza", 0)
            pv = item.get("prezzo_vendita", 0)
            pm = item.get("prezzo_mercato", 0)
            segno = "+" if diff >= 0 else ""
            lines.append(
                f"• {nome}: {segno}€{diff:.2f} (vendi €{pv:.2f}, mercato €{pm:.2f})"
            )

    return "\n".join(lines)


def _scheduler_loop() -> None:
    """Loop del thread di scheduling — gira ogni giorno alle 08:00."""
    schedule.every().day.at("08:00").do(run_daily_price_report)
    logger.info("Scheduler report giornaliero avviato — prossima esecuzione alle 08:00")
    while True:
        schedule.run_pending()
        time.sleep(60)


def start_market_price_scheduler() -> None:
    """Avvia il thread dello scheduler (idempotente)."""
    global _scheduler_started

    with _scheduler_lock:
        if _scheduler_started:
            return
        thread = threading.Thread(
            target=_scheduler_loop,
            name="market-price-scheduler",
            daemon=True,
        )
        thread.start()
        _scheduler_started = True
        logger.info("Thread market-price-scheduler avviato.")


def get_scheduler_status() -> dict[str, Any]:
    """Restituisce lo stato dello scheduler (ultimo run, prossimo run)."""
    return {
        "scheduler": "market_price",
        "started": _scheduler_started,
        "last_run": _last_run.isoformat() if _last_run else None,
        "scheduled_time": _next_run,
    }
