"""backup_scheduler.py — Scheduler per l'esecuzione automatica dei backup.

Programma:
  - Ogni giorno alle 02:00 → esegue backup_db.py (giornaliero/settimanale)
  - Il primo giorno del mese alle 03:00 → esegue backup_store.py (mensile)

Utilizzo:
  python scripts/backup_scheduler.py

Richiede il pacchetto `schedule` (già in requirements.txt).
Variabili d'ambiente: vedere backup_db.py e backup_store.py.

Alternativa cron (senza questo scheduler):
  0 2 * * *   /usr/bin/python3 /app/scripts/backup_db.py >> /var/log/backup_db.log 2>&1
  0 3 1 * *   /usr/bin/python3 /app/scripts/backup_store.py >> /var/log/backup_store.log 2>&1
"""

import logging
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import schedule
except ImportError:
    print("Il pacchetto 'schedule' non è installato. Esegui: pip install schedule")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

SCRIPTS_DIR = Path(__file__).parent
DB_BACKUP_SCRIPT = SCRIPTS_DIR / "backup_db.py"
STORE_BACKUP_SCRIPT = SCRIPTS_DIR / "backup_store.py"


def _run_script(script_path: Path, label: str) -> None:
    """Esegue uno script Python e logga il risultato."""
    logger.info("=== Avvio %s ===", label)
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            timeout=3600,  # 1 ora massimo
            capture_output=False,
        )
        if result.returncode == 0:
            logger.info("=== %s completato con successo ===", label)
        else:
            logger.error("=== %s terminato con errore (rc=%d) ===", label, result.returncode)
    except subprocess.TimeoutExpired:
        logger.error("=== %s ha superato il timeout di 1 ora ===", label)
    except Exception as exc:
        logger.error("=== Errore durante %s: %s ===", label, exc)


def run_db_backup() -> None:
    """Job: esegue il backup del database."""
    _run_script(DB_BACKUP_SCRIPT, "Backup DB")


def run_store_backup_if_first_day() -> None:
    """Job: esegue il backup store solo il primo giorno del mese."""
    if datetime.now().day == 1:
        _run_script(STORE_BACKUP_SCRIPT, "Backup Store/Magazzino")
    else:
        logger.debug("Oggi non è il primo del mese — skip backup store")


def main() -> None:
    logger.info("=== Scheduler backup avviato ===")
    logger.info("Programma:")
    logger.info("  - Backup DB: ogni giorno alle 02:00")
    logger.info("  - Backup Store: il 1° del mese alle 03:00")

    # Backup DB ogni giorno alle 02:00
    schedule.every().day.at("02:00").do(run_db_backup)

    # Backup Store: eseguito ogni giorno alle 03:00 ma effettivo solo il 1° del mese
    schedule.every().day.at("03:00").do(run_store_backup_if_first_day)

    logger.info("Scheduler in esecuzione. Premi Ctrl+C per fermare.")
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # controlla ogni minuto
    except KeyboardInterrupt:
        logger.info("Scheduler interrotto dall'utente")


if __name__ == "__main__":
    main()
