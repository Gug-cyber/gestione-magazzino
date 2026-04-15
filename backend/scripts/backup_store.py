"""backup_store.py — Backup mensile dei dati store/magazzino su Google Drive.

Esegue un dump completo delle tabelle principali dello store e del magazzino,
lo comprime e lo carica su Google Drive, **eliminando prima tutti i backup
precedenti** nella cartella di destinazione (si mantiene solo l'ultimo).

Variabili d'ambiente richieste:
  DATABASE_URL                          — URL PostgreSQL
  GOOGLE_SERVICE_ACCOUNT_JSON           — JSON del Service Account Google
  BACKUP_STORE_GOOGLE_DRIVE_FOLDER_ID   — ID cartella Drive per backup store

Opzionale:
  DOTENV_PATH — Percorso file .env (default: backend/.env)
"""

import gzip
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

BACKUP_DIR = Path("/tmp/backups")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# Tabelle da includere nel backup store/magazzino
STORE_TABLES = [
    "prodotti",
    "categorie",
    "ubicazioni",
    "movimenti",
    "fornitori",
    "fatture",
    "clienti",
    "ordini",
    "righe_ordine",
    "banner",
    "contenuti",
    "prodotti_pubblici",
    "store_settings",
]


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


def _clear_drive_folder(service, folder_id: str) -> None:
    """Elimina TUTTI i file presenti nella cartella Drive specificata."""
    try:
        query = f"'{folder_id}' in parents and trashed=false"
        page_token = None
        deleted = 0

        while True:
            kwargs = {"q": query, "fields": "nextPageToken,files(id,name)", "pageSize": 100}
            if page_token:
                kwargs["pageToken"] = page_token
            result = service.files().list(**kwargs).execute()
            files = result.get("files", [])

            for f in files:
                service.files().delete(fileId=f["id"]).execute()
                logger.info("Drive: eliminato backup precedente %s", f["name"])
                deleted += 1

            page_token = result.get("nextPageToken")
            if not page_token:
                break

        logger.info("Cartella Drive svuotata: %d file eliminati", deleted)
    except Exception as exc:
        logger.error("Errore pulizia cartella Drive: %s", exc)


def _upload_to_drive(service, file_path: Path, folder_id: str) -> str | None:
    """Carica un file su Google Drive nella cartella specificata."""
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


def _run_pg_dump_tables(database_url: str, tables: list[str], output_path: Path) -> bool:
    """Esegue pg_dump delle tabelle specificate e comprime in un file .sql.gz."""
    pg_dump = shutil.which("pg_dump")
    if not pg_dump:
        logger.error("pg_dump non trovato nel PATH — impossibile eseguire il backup")
        return False

    try:
        with tempfile.NamedTemporaryFile(suffix=".sql", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        table_args = []
        for table in tables:
            table_args.extend(["-t", table])

        cmd = [
            pg_dump,
            "--no-password",
            "--format=plain",
            "--no-owner",
            "--no-privileges",
        ] + table_args + [database_url]

        logger.info("Esecuzione pg_dump per %d tabelle ...", len(tables))
        with open(tmp_path, "wb") as stdout_file:
            result = subprocess.run(
                cmd,
                stdout=stdout_file,
                stderr=subprocess.PIPE,
                timeout=1800,
            )

        if result.returncode != 0:
            logger.error("pg_dump terminato con errore (rc=%d): %s", result.returncode, result.stderr.decode())
            tmp_path.unlink(missing_ok=True)
            return False

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
    if not database_url:
        logger.error("DATABASE_URL non configurata")
        return 1

    folder_id = os.getenv("BACKUP_STORE_GOOGLE_DRIVE_FOLDER_ID")

    now = datetime.now()
    filename = f"store_backup_{now.strftime('%Y%m')}.sql.gz"
    output_path = BACKUP_DIR / filename

    logger.info("=== Avvio backup mensile store/magazzino ===")
    logger.info("Tabelle: %s", ", ".join(STORE_TABLES))

    success = _run_pg_dump_tables(database_url, STORE_TABLES, output_path)
    if not success:
        return 1

    if not folder_id:
        logger.warning("BACKUP_STORE_GOOGLE_DRIVE_FOLDER_ID non configurata — salto upload Drive")
        logger.info("Backup salvato localmente: %s", output_path)
        return 0

    service = _get_drive_client()
    if service:
        # Elimina tutti i backup precedenti prima di caricare il nuovo
        logger.info("Pulizia backup precedenti nella cartella Drive ...")
        _clear_drive_folder(service, folder_id)

        file_id = _upload_to_drive(service, output_path, folder_id)
        if not file_id:
            logger.warning("Upload su Drive fallito — backup salvato solo localmente: %s", output_path)
    else:
        logger.warning("Client Drive non disponibile — backup salvato solo localmente: %s", output_path)

    logger.info("=== Backup store/magazzino completato ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
