"""Task schedulato per la cancellazione automatica dei prodotti a zero stock.

Logica:
  1. Ogni giorno cerca prodotti con:
     - quantita = 0
     - data_scarico impostata e <= oggi - 10 giorni
     - almeno una RigaOrdine collegata (il prodotto era associato a un ordine)
  2. Cancella fisicamente quei prodotti dal database.
  3. I FK su righe_ordine, movimenti e righe_fornitura sono configurati con
     ON DELETE SET NULL, quindi la storia degli ordini e dei movimenti rimane
     intatta (prodotto_id diventa NULL).
  4. Costi e ricavi (DatoStorico, SpesaGestione) non hanno FK verso prodotti
     e rimangono invariati.
"""
import logging
import os
import threading
import time
from datetime import datetime, timedelta, timezone

from ..database import SessionLocal
from ..models.prodotto import Prodotto
from ..models.ordine import RigaOrdine

logger = logging.getLogger(__name__)

_scheduler_started = False
_scheduler_lock = threading.Lock()

# Numero di giorni dopo i quali un prodotto a quantità zero (e collegato a un ordine)
# viene cancellato fisicamente. Configurabile via env var.
_GIORNI_ATTESA = int(os.getenv("CLEANUP_ZERO_STOCK_DAYS", "10"))
# Intervallo in secondi tra un'esecuzione e l'altra (default: 24 ore)
_INTERVALLO_SECONDI = int(os.getenv("CLEANUP_SCHEDULER_INTERVAL_SECONDS", str(24 * 3600)))


def run_cleanup(db=None) -> dict:
    """Esegue la pulizia dei prodotti a zero stock collegati a ordini.

    Può essere chiamata direttamente (passando una sessione) per i test,
    oppure dal loop interno che apre la propria sessione.

    Returns:
        dict con le chiavi 'eliminati' (int) e 'ids' (list[int]).
    """
    owns_session = db is None
    if owns_session:
        db = SessionLocal()

    eliminati = 0
    eliminati_ids: list[int] = []

    try:
        soglia = datetime.now(timezone.utc) - timedelta(days=_GIORNI_ATTESA)

        # Prodotti con quantità zero e data_scarico abbastanza vecchia
        candidati = (
            db.query(Prodotto)
            .filter(
                Prodotto.quantita == 0,
                Prodotto.data_scarico.isnot(None),
                Prodotto.data_scarico <= soglia,
            )
            .all()
        )

        for prodotto in candidati:
            # Verifica che il prodotto sia effettivamente collegato a un ordine
            ha_ordine = (
                db.query(RigaOrdine)
                .filter(RigaOrdine.prodotto_id == prodotto.id)
                .first()
            )
            if not ha_ordine:
                logger.debug(
                    "Prodotto id=%s ('%s') ignorato: nessun ordine collegato.",
                    prodotto.id,
                    prodotto.nome,
                )
                continue

            logger.info(
                "Cancellazione prodotto id=%s sku='%s' nome='%s' "
                "data_scarico=%s (soglia=%s)",
                prodotto.id,
                prodotto.sku,
                prodotto.nome,
                prodotto.data_scarico.isoformat() if prodotto.data_scarico else None,
                soglia.isoformat(),
            )
            eliminati_ids.append(prodotto.id)
            db.delete(prodotto)
            eliminati += 1

        if eliminati > 0:
            db.commit()
            logger.info(
                "Pulizia prodotti completata: %d prodotto/i eliminato/i (ids=%s)",
                eliminati,
                eliminati_ids,
            )
        else:
            logger.info("Pulizia prodotti: nessun prodotto da eliminare.")

    except Exception as exc:
        db.rollback()
        logger.error("Errore durante la pulizia prodotti: %s", exc)
    finally:
        if owns_session:
            db.close()

    return {"eliminati": eliminati, "ids": eliminati_ids}


def _scheduler_loop() -> None:
    """Loop del thread di pulizia: esegue run_cleanup ogni _INTERVALLO_SECONDI."""
    logger.info(
        "Scheduler pulizia prodotti avviato — intervallo=%ds, soglia=%d giorni",
        _INTERVALLO_SECONDI,
        _GIORNI_ATTESA,
    )
    # Prima esecuzione all'avvio
    run_cleanup()
    while True:
        time.sleep(_INTERVALLO_SECONDI)
        run_cleanup()


def start_product_cleanup_scheduler() -> None:
    """Avvia il thread di pulizia in background (idempotente)."""
    global _scheduler_started

    with _scheduler_lock:
        if _scheduler_started:
            return
        thread = threading.Thread(
            target=_scheduler_loop,
            name="product-cleanup-scheduler",
            daemon=True,
        )
        thread.start()
        _scheduler_started = True
        logger.info("Thread pulizia prodotti avviato.")
