"""
recover_db.py — Recovery PostgreSQL da backup su Google Drive.

Scarica il backup più recente (o uno specifico) da Google Drive
e lo ripristina sul database configurato.

Variabili d'ambiente:
  DATABASE_URL                  — URL PostgreSQL target
  GOOGLE_SERVICE_ACCOUNT_JSON   — JSON Service Account Google
  BACKUP_GOOGLE_DRIVE_FOLDER_ID — ID cartella Drive con i backup
  RECOVERY_FILE_ID              — (opzionale) ID specifico del file da ripristinare
  RECOVERY_DRY_RUN              — se "1" simula senza applicare (default: "1")
  DOTENV_PATH                   — percorso .env opzionale

ATTENZIONE: se RECOVERY_DRY_RUN != "1" il database viene SOVRASCRITTO.
"""

import gzip
import json
import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

BACKUP_DIR = Path("/tmp/recovery")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def _load_dotenv():
    dotenv_path = os.getenv("DOTENV_PATH", str(Path(__file__).parent.parent / "backend" / ".env"))
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path)
    except ImportError:
        pass


def _get_drive_client():
    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not sa_json:
        logger.error("GOOGLE_SERVICE_ACCOUNT_JSON non configurata")
        return None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        info = json.loads(sa_json)
        credentials = service_account.Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/drive"]
        )
        return build("drive", "v3", credentials=credentials, cache_discovery=False)
    except Exception as exc:
        logger.error("Errore init Drive client: %s", exc)
        return None


def _find_latest_backup(service, folder_id: str) -> tuple[str, str] | None:
    """
    Trova il backup DB più recente nella cartella Drive.
    Restituisce (file_id, file_name) o None.
    """
    try:
        result = service.files().list(
            q=f"'{folder_id}' in parents and name contains 'db_' and trashed=false",
            fields="files(id,name,createdTime)",
            orderBy="createdTime desc",
            pageSize=1,
        ).execute()
        files = result.get("files", [])
        if not files:
            logger.error("Nessun backup trovato nella cartella Drive")
            return None
        f = files[0]
        logger.info("Backup più recente trovato: %s (id=%s, creato=%s)", f["name"], f["id"], f.get("createdTime"))
        return f["id"], f["name"]
    except Exception as exc:
        logger.error("Errore ricerca backup su Drive: %s", exc)
        return None


def _download_from_drive(service, file_id: str, dest_path: Path) -> bool:
    """Scarica un file da Drive in dest_path."""
    try:
        from googleapiclient.http import MediaIoBaseDownload

        request = service.files().get_media(fileId=file_id)
        with open(dest_path, "wb") as fh:
            downloader = MediaIoBaseDownload(fh, request, chunksize=10 * 1024 * 1024)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    logger.info("Download: %.0f%%", status.progress() * 100)

        size_mb = dest_path.stat().st_size / (1024 * 1024)
        logger.info("Download completato: %s (%.2f MB)", dest_path.name, size_mb)
        return True
    except Exception as exc:
        logger.error("Errore download da Drive: %s", exc)
        return False


def _decompress_backup(compressed_path: Path, sql_path: Path) -> bool:
    """Decomprime il file .sql.gz in .sql."""
    try:
        logger.info("Decompressione %s ...", compressed_path.name)
        with gzip.open(compressed_path, "rb") as f_in, open(sql_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        size_mb = sql_path.stat().st_size / (1024 * 1024)
        logger.info("Decompressione completata: %s (%.2f MB)", sql_path.name, size_mb)
        return True
    except Exception as exc:
        logger.error("Errore decompressione: %s", exc)
        return False


def _restore_database(database_url: str, sql_path: Path, dry_run: bool) -> bool:
    """
    Esegue psql per ripristinare il database.
    Se dry_run=True, esegue solo una verifica della sintassi senza applicare.
    """
    psql = shutil.which("psql")
    if not psql:
        logger.error("psql non trovato nel PATH")
        return False

    if dry_run:
        logger.info("=== DRY RUN: verifica sintassi SQL senza applicare al database ===")
        size_mb = sql_path.stat().st_size / (1024 * 1024)
        with open(sql_path, encoding="utf-8", errors="ignore") as f_sql:
            line_count = sum(1 for _ in f_sql)
        logger.info("File SQL: %.2f MB, %d righe", size_mb, line_count)
        logger.info("DRY RUN completato — nessuna modifica applicata al database")
        return True

    logger.warning("=== INIZIO RESTORE REALE — IL DATABASE VERRÀ SOVRASCRITTO ===")
    logger.info("Database target: %s", database_url.split("@")[-1] if "@" in database_url else database_url)

    try:
        with open(sql_path, "r", encoding="utf-8", errors="ignore") as f_in:
            result = subprocess.run(
                [psql, "--no-password", "--echo-errors", database_url],
                stdin=f_in,
                stderr=subprocess.PIPE,
                stdout=subprocess.PIPE,
                timeout=3600,
            )

        if result.returncode != 0:
            logger.error(
                "psql terminato con errore (rc=%d):\nSTDOUT: %s\nSTDERR: %s",
                result.returncode,
                result.stdout.decode()[:500],
                result.stderr.decode()[:500],
            )
            return False

        logger.info("=== RESTORE COMPLETATO CON SUCCESSO ===")
        return True

    except subprocess.TimeoutExpired:
        logger.error("psql timeout dopo 3600s")
        return False
    except Exception as exc:
        logger.error("Errore durante restore: %s", exc)
        return False


def main() -> int:
    _load_dotenv()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL non configurata")
        return 1

    folder_id = os.getenv("BACKUP_GOOGLE_DRIVE_FOLDER_ID")
    if not folder_id:
        logger.error("BACKUP_GOOGLE_DRIVE_FOLDER_ID non configurata")
        return 1

    specific_file_id = os.getenv("RECOVERY_FILE_ID", "").strip() or None
    dry_run = os.getenv("RECOVERY_DRY_RUN", "1") != "0"

    logger.info("=== AVVIO RECOVERY DATABASE ===")
    logger.info("Modalità: %s", "DRY RUN (simulazione)" if dry_run else "⚠️  RECOVERY REALE")
    if specific_file_id:
        logger.info("File specifico: %s", specific_file_id)
    else:
        logger.info("Utilizzo backup più recente")

    service = _get_drive_client()
    if not service:
        return 1

    if specific_file_id:
        try:
            meta = service.files().get(fileId=specific_file_id, fields="id,name").execute()
            file_id, file_name = meta["id"], meta["name"]
            logger.info("File specificato: %s", file_name)
        except Exception as exc:
            logger.error("File ID non trovato su Drive: %s — %s", specific_file_id, exc)
            return 1
    else:
        result = _find_latest_backup(service, folder_id)
        if not result:
            return 1
        file_id, file_name = result

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    compressed_path = BACKUP_DIR / f"recovery_{timestamp}.sql.gz"
    sql_path = BACKUP_DIR / f"recovery_{timestamp}.sql"

    logger.info("Download in corso...")
    if not _download_from_drive(service, file_id, compressed_path):
        return 1

    if not _decompress_backup(compressed_path, sql_path):
        return 1

    compressed_path.unlink(missing_ok=True)

    success = _restore_database(database_url, sql_path, dry_run)

    sql_path.unlink(missing_ok=True)

    if not success:
        logger.error("=== RECOVERY FALLITO ===")
        return 1

    logger.info("=== RECOVERY COMPLETATO (%s) ===", "DRY RUN" if dry_run else "REALE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
