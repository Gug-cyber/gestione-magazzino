"""Task schedulato per aggiornamento automatico tracking spedizioni."""
import logging
import os
import time

import schedule

from ..database import SessionLocal
from ..routers.tracking import _update_all_active_tracking

logger = logging.getLogger(__name__)


def run_tracking_updates() -> None:
    """Esegue aggiornamento tracking di tutte le spedizioni attive."""
    logger.info("Avvio aggiornamento tracking schedulato")
    db = SessionLocal()
    try:
        _update_all_active_tracking(db)
        logger.info("Aggiornamento tracking completato")
    except Exception as e:
        logger.error("Errore aggiornamento tracking: %s", e)
    finally:
        db.close()


def start_scheduler() -> None:
    """Avvia lo scheduler per aggiornamenti periodici."""
    interval_hours = int(os.getenv("TRACKING_UPDATE_INTERVAL_HOURS", "2"))

    schedule.every(interval_hours).hours.do(run_tracking_updates)

    # Esegui immediatamente all'avvio
    run_tracking_updates()

    logger.info("Scheduler tracking avviato - aggiornamenti ogni %d ore", interval_hours)

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    start_scheduler()
