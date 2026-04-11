"""Google Drive service — autentica con Service Account e gestisce cartelle/immagini prodotti.

Se GOOGLE_SERVICE_ACCOUNT_JSON non è configurata, il servizio opera in modalità no-op:
tutte le funzioni restituiscono valori vuoti/default senza lanciare eccezioni.
"""

import json
import logging
import os
import time
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Cache in-memory: folder_id -> (List[str], timestamp)
_image_cache: Dict[str, Tuple[List[str], float]] = {}
_CACHE_TTL = 300  # 5 minuti


def _get_drive_client():
    """Inizializza e restituisce il client autenticato delle Google Drive API v3.

    Restituisce None se le credenziali non sono configurate.
    """
    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not sa_json:
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
        logger.warning("Google Drive: impossibile inizializzare il client — %s", exc)
        return None


class GoogleDriveService:
    """Wrapper per le operazioni Google Drive usate dal magazzino/store."""

    def __init__(self):
        self._client = None
        self._initialized = False

    def _get_client(self):
        if not self._initialized:
            self._client = _get_drive_client()
            self._initialized = True
        return self._client

    def list_images_in_folder(self, folder_id: str) -> List[str]:
        """Restituisce la lista di URL pubblici delle immagini nella cartella Drive.

        Usa una cache in-memory con TTL di 5 minuti.
        In caso di errore restituisce lista vuota (no crash).
        """
        now = time.time()
        if folder_id in _image_cache:
            urls, ts = _image_cache[folder_id]
            if now - ts < _CACHE_TTL:
                return urls

        service = self._get_client()
        if service is None:
            return []

        try:
            query = f"'{folder_id}' in parents and mimeType contains 'image/' and trashed=false"
            result = (
                service.files()
                .list(q=query, fields="files(id,name)", pageSize=50)
                .execute()
            )
            files = result.get("files", [])
            urls = [
                f"https://drive.google.com/uc?export=view&id={f['id']}"
                for f in files
            ]
            _image_cache[folder_id] = (urls, now)
            return urls
        except Exception as exc:
            logger.warning("Google Drive list_images_in_folder(%s) fallita — %s", folder_id, exc)
            return []

    def create_folder(self, name: str, parent_folder_id: Optional[str] = None) -> str:
        """Crea una cartella Drive con il nome dato.

        Se parent_folder_id è fornito, la crea come sotto-cartella.
        Restituisce l'ID della cartella creata.
        Lancia ValueError se il client non è disponibile.
        """
        service = self._get_client()
        if service is None:
            raise ValueError(
                "Google Drive non configurato: imposta GOOGLE_SERVICE_ACCOUNT_JSON"
            )

        metadata = {
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent_folder_id:
            metadata["parents"] = [parent_folder_id]

        folder = service.files().create(body=metadata, fields="id").execute()
        return folder["id"]

    def share_folder_publicly(self, folder_id: str) -> None:
        """Imposta i permessi della cartella a 'anyone with the link can view'.

        In caso di errore logga il warning senza lanciare eccezioni.
        """
        service = self._get_client()
        if service is None:
            logger.warning("Google Drive non configurato: impossibile condividere la cartella %s", folder_id)
            return

        try:
            permission = {"type": "anyone", "role": "reader"}
            service.permissions().create(fileId=folder_id, body=permission).execute()
        except Exception as exc:
            logger.warning("Google Drive share_folder_publicly(%s) fallita — %s", folder_id, exc)


# Singleton globale
drive_service = GoogleDriveService()
