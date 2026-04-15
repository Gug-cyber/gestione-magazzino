"""backup_db.py — Backup PostgreSQL giornaliero/settimanale con upload su Google Drive.

Strategia:
- Ogni domenica: backup FULL (label "full")
- Gli altri giorni: backup compresso con label "incremental"
  (pg_dump non supporta incrementale nativo; si fa un dump completo compresso
   con una etichetta differente per distinguerlo dai backup full settimanali)

Variabili d'ambiente richieste:
  DATABASE_URL                    — URL PostgreSQL (es. postgresql://user:pass@host/db)
  GOOGLE_SERVICE_ACCOUNT_JSON     — JSON del Service Account Google
  BACKUP_GOOGLE_DRIVE_FOLDER_ID   — ID cartella Drive dove caricare i backup DB
  BACKUP_RETENTION_DAYS           — Giorni di retention (default: 30)

Opzionale:
  DOTENV_PATH                     — Percorso file .env (default: backend/.env)
"""

import gzip
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

BACKUP_DIR = Path("/tmp/backups")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def _load_dotenv():
    """Carica variabili da file .env se python-dotenv è disponibile."""
    dotenv_path = os.getenv("DOTENV_PATH", str(Path(__file__).parent.parent / "backend" / ".env"))
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path)
        logger.debug("Variabili caricate da %s", dotenv_path)
    except ImportError:
        pass


def _get_drive_client():
    """Restituisce il client Google Drive autenticato o None."""
    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not sa_json:
        logger.warning("GOOGLE_SERVICE_ACCOUNT_JSON non configurata — upload Drive disabilitato")
        return None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        info = json.loads(sa_json)
        scopes = ["https://www.googleapis.com/auth/drive"]
        credentials = service_account.Credentials.from_service_account_info(info, scopes=scopes)
        service = build("drive", "v3", credentials=credentials, cache_discovery=False)
        return service
    except Exception as exc:
        logger.error("Impossibile inizializzare il client Google Drive: %s", exc)
        return None


def _upload_to_drive(service, file_path: Path, folder_id: str) -> str | None:
    """Carica un file su Google Drive nella cartella specificata.

    Restituisce l'ID del file caricato, o None in caso di errore.
    """
    try:
        from googleapiclient.http import MediaFileUpload

        file_metadata = {
            "name": file_path.name,
            "parents": [folder_id],
        }
        media = MediaFileUpload(str(file_path), resumable=True)
        result = service.files().create(body=file_metadata, media_body=media, fields="id").execute()
        file_id = result.get("id")
        logger.info("File caricato su Drive: %s (id=%s)", file_path.name, file_id)
        return file_id
    except Exception as exc:
        logger.error("Errore upload Drive per %s: %s", file_path.name, exc)
        return None


def _apply_retention(service, folder_id: str, retention_days: int) -> None:
    """Elimina da Drive i file più vecchi di retention_days giorni."""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        query = f"'{folder_id}' in parents and trashed=false"
        page_token = None
        deleted = 0

        while True:
            kwargs = {"q": query, "fields": "nextPageToken,files(id,name,createdTime)", "pageSize": 100}
            if page_token:
                kwargs["pageToken"] = page_token
            result = service.files().list(**kwargs).execute()
            files = result.get("files", [])

            for f in files:
                created_str = f.get("createdTime", "")
                try:
                    created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                    if created < cutoff:
                        service.files().delete(fileId=f["id"]).execute()
                        logger.info("Drive: eliminato file vecchio %s (creato %s)", f["name"], created_str)
                        deleted += 1
                except Exception as exc:
                    logger.warning("Errore parsing data file Drive %s: %s", f["name"], exc)

            page_token = result.get("nextPageToken")
            if not page_token:
                break

        logger.info("Retention applicata: %d file eliminati (soglia %d giorni)", deleted, retention_days)
    except Exception as exc:
        logger.error("Errore applicazione retention Drive: %s", exc)


def _run_pg_dump(database_url: str, output_path: Path) -> bool:
    """Esegue pg_dump e comprime l'output in un file .sql.gz.

    Restituisce True se il dump è andato a buon fine.
    """
    pg_dump = shutil.which("pg_dump")
    if not pg_dump:
        logger.error("pg_dump non trovato nel PATH — impossibile eseguire il backup")
        return False

    try:
        with tempfile.NamedTemporaryFile(suffix=".sql", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        logger.info("Esecuzione pg_dump su %s ...", output_path.name)
        with open(tmp_path, "wb") as stdout_file:
            result = subprocess.run(
                [pg_dump, "--no-password", "--format=plain", "--no-owner", "--no-privileges", database_url],
                stdout=stdout_file,
                stderr=subprocess.PIPE,
                timeout=1800,  # 30 minuti
            )

        if result.returncode != 0:
            logger.error("pg_dump terminato con errore (rc=%d): %s", result.returncode, result.stderr.decode())
            tmp_path.unlink(missing_ok=True)
            return False

        # Comprimi con gzip
        logger.info("Compressione gzip in corso ...")
        with open(tmp_path, "rb") as f_in, gzip.open(output_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)

        tmp_path.unlink(missing_ok=True)
        size_mb = output_path.stat().st_size / (1024 * 1024)
        logger.info("Dump completato: %s (%.2f MB)", output_path.name, size_mb)
        return True

    except subprocess.TimeoutExpired:
        logger.error("pg_dump ha superato il timeout di 30 minuti")
        return False
    except Exception as exc:
        logger.error("Errore durante pg_dump: %s", exc)
        return False


def main() -> int:
    _load_dotenv()

    database_url = os.getenv("DATABASE_URL")
    logger.info(
        "Config: DATABASE_URL=%s, BACKUP_RETENTION_DAYS=%r, BACKUP_GOOGLE_DRIVE_FOLDER_ID=%s",
        "***" if database_url else "NON CONFIGURATA",
        os.getenv("BACKUP_RETENTION_DAYS", "(non impostata)"),
        "configurata" if os.getenv("BACKUP_GOOGLE_DRIVE_FOLDER_ID") else "NON CONFIGURATA",
    )
    if not database_url:
        logger.error("DATABASE_URL non configurata")
        return 1

    folder_id = os.getenv("BACKUP_GOOGLE_DRIVE_FOLDER_ID")
    _raw_retention = os.getenv("BACKUP_RETENTION_DAYS", "30").strip()
    try:
        retention_days = int(_raw_retention)
        if retention_days <= 0:
            raise ValueError("deve essere positivo")
    except ValueError:
        logger.error(
            "BACKUP_RETENTION_DAYS ha un valore non valido (%r) — uso default 30 giorni. "
            "Verifica la variabile d'ambiente su Render.",
            _raw_retention,
        )
        retention_days = 30

    now = datetime.now()
    is_sunday = now.weekday() == 6  # 0=lunedì … 6=domenica
    label = "full" if is_sunday else "incremental"
    filename = f"db_{label}_{now.strftime('%Y%m%d_%H%M%S')}.sql.gz"
    output_path = BACKUP_DIR / filename

    logger.info("=== Avvio backup DB (%s) ===", label.upper())
    logger.info("Database: %s", database_url.split("@")[-1] if "@" in database_url else database_url)

    success = _run_pg_dump(database_url, output_path)
    if not success:
        return 1

    if not folder_id:
        logger.warning("BACKUP_GOOGLE_DRIVE_FOLDER_ID non configurata — salto upload Drive")
        logger.info("Backup salvato localmente: %s", output_path)
        return 0

    service = _get_drive_client()
    if service:
        file_id = _upload_to_drive(service, output_path, folder_id)
        if file_id:
            _apply_retention(service, folder_id, retention_days)
        else:
            logger.warning("Upload fallito — il backup rimane disponibile localmente: %s", output_path)
    else:
        logger.warning("Client Drive non disponibile — backup solo locale: %s", output_path)

    logger.info("=== Backup DB completato ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
