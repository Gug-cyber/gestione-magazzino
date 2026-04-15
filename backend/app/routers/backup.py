"""
backup.py — Router per backup e recovery automatico.

Endpoint protetti da X-Backup-Secret (non JWT) perché vengono chiamati
da GitHub Actions senza sessione utente.

Endpoint:
  POST /api/backup/run-db      — esegue backup_db.py
  POST /api/backup/run-store   — esegue backup_store.py
  POST /api/backup/recover     — esegue recover_db.py
  GET  /api/backup/list        — lista backup disponibili su Drive (richiede JWT admin)
  GET  /api/backup/status      — stato ultimo backup (richiede JWT admin)
  GET  /api/backup/diag        — diagnostica path script (richiede JWT admin)
"""

import asyncio
import logging
import os
import subprocess
import sys
from datetime import datetime, timezone
from hmac import compare_digest
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from ..dependencies import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["backup"])


def _scripts_dir_candidates(file_location: Optional[Path] = None, cwd: Optional[Path] = None) -> list[Path]:
    """
    Costruisce i path candidati per la directory `scripts`.

    I parametri opzionali consentono test deterministici senza dipendere
    da `__file__` e dalla cwd reale del processo.
    """
    current = file_location or Path(__file__).resolve()
    current_cwd = cwd or Path.cwd()
    return [
        current.parent.parent.parent.parent / "scripts",
        current.parent.parent.parent / "scripts",
        current.parent.parent / "scripts",
        current_cwd / "scripts",
    ]


def _resolve_scripts_dir() -> Path:
    """
    Risolve la directory degli script di backup.

    Cerca in ordine:
    1. Variabile d'ambiente SCRIPTS_DIR (configurabile su Render)
    2. scripts/ relativo alla root del repo (risalendo da __file__)
    3. scripts/ relativo al CWD
    """
    env_scripts_dir = os.getenv("SCRIPTS_DIR", "").strip()
    if env_scripts_dir:
        p = Path(env_scripts_dir)
        logger.info("[backup] SCRIPTS_DIR da env: %s (exists=%s)", p, p.exists())
        return p

    candidates = _scripts_dir_candidates()
    *check_candidates, cwd_scripts = candidates
    for candidate in check_candidates:
        if candidate.exists():
            logger.info("[backup] SCRIPTS_DIR trovata: %s", candidate)
            return candidate

    logger.warning(
        "[backup] SCRIPTS_DIR non trovata nei path standard. "
        "Usare variabile d'ambiente SCRIPTS_DIR. Tentativo con CWD: %s",
        cwd_scripts,
    )
    return cwd_scripts


SCRIPTS_DIR = _resolve_scripts_dir()

# Stato in memoria dell'ultimo backup (semplice, no DB)
_last_backup_status: dict = {
    "db": {"status": "never", "last_run": None, "duration_s": None, "error": None},
    "store": {"status": "never", "last_run": None, "duration_s": None, "error": None},
    "recover": {"status": "never", "last_run": None, "duration_s": None, "error": None},
}


def _verify_backup_secret(x_backup_secret: Optional[str] = Header(None, alias="X-Backup-Secret")) -> None:
    """Verifica il secret di autenticazione per i trigger di backup da GitHub Actions."""
    secret = os.getenv("BACKUP_TRIGGER_SECRET", "")
    if not secret:
        logger.error("BACKUP_TRIGGER_SECRET non configurata nel backend — backup disabilitato")
        raise HTTPException(status_code=503, detail="Backup non configurato")
    if not x_backup_secret or not compare_digest(x_backup_secret, secret):
        logger.warning("Tentativo di trigger backup con secret non valido")
        raise HTTPException(status_code=401, detail="Non autorizzato")


def _run_script(script_name: str, extra_env: Optional[dict] = None) -> tuple[bool, str, float]:
    """
    Esegue uno script Python come subprocess.

    Returns:
        (success: bool, output: str, duration_seconds: float)
    """
    script_path = SCRIPTS_DIR / script_name
    logger.info("[backup] SCRIPTS_DIR=%s, script_path=%s, exists=%s", SCRIPTS_DIR, script_path, script_path.exists())

    if not script_path.exists():
        msg = f"Script non trovato: {script_path} (SCRIPTS_DIR={SCRIPTS_DIR})"
        logger.error("[backup] %s", msg)
        return False, msg, 0.0

    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)

    start = datetime.now(timezone.utc)
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            timeout=3300,  # 55 minuti max
            env=env,
        )
        duration = (datetime.now(timezone.utc) - start).total_seconds()
        output = result.stdout + ("\n" + result.stderr if result.stderr else "")
        success = result.returncode == 0
        if not success:
            logger.error("[backup] Script %s fallito (rc=%d):\n%s", script_name, result.returncode, output)
        else:
            logger.info("[backup] Script %s completato in %.1fs", script_name, duration)
        return success, output, duration
    except subprocess.TimeoutExpired:
        duration = (datetime.now(timezone.utc) - start).total_seconds()
        logger.error("[backup] Script %s timeout dopo %.0fs", script_name, duration)
        return False, "Timeout", duration
    except Exception as exc:
        duration = (datetime.now(timezone.utc) - start).total_seconds()
        logger.error("[backup] Script %s errore: %s", script_name, exc)
        return False, str(exc), duration


@router.post("/run-db", dependencies=[Depends(_verify_backup_secret)])
async def run_db_backup():
    """
    Esegue backup_db.py (pg_dump + upload Google Drive).
    Chiamato ogni notte da GitHub Actions backup-nightly.yml.
    """
    logger.info("[backup] Avvio backup DB da GitHub Actions trigger")
    loop = asyncio.get_running_loop()
    try:
        success, output, duration = await loop.run_in_executor(None, _run_script, "backup_db.py")
    except Exception as exc:
        logger.error("[backup] Eccezione imprevista in run_db_backup: %s", exc)
        raise HTTPException(status_code=500, detail=f"Errore imprevisto: {str(exc)}")

    _last_backup_status["db"] = {
        "status": "success" if success else "error",
        "last_run": datetime.now(timezone.utc).isoformat(),
        "duration_s": round(duration, 1),
        "error": None if success else output[-500:],
    }

    if not success:
        raise HTTPException(
            status_code=500,
            detail={"message": "Backup DB fallito", "output": output[-2000:]}
        )
    return {
        "status": "success",
        "message": "Backup DB completato",
        "duration_s": round(duration, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/run-store", dependencies=[Depends(_verify_backup_secret)])
async def run_store_backup():
    """
    Esegue backup_store.py (backup mensile store/magazzino + upload Google Drive).
    Chiamato il 1° del mese da GitHub Actions backup-monthly.yml.
    """
    logger.info("[backup] Avvio backup Store da GitHub Actions trigger")
    loop = asyncio.get_running_loop()
    try:
        success, output, duration = await loop.run_in_executor(None, _run_script, "backup_store.py")
    except Exception as exc:
        logger.error("[backup] Eccezione imprevista in run_store_backup: %s", exc)
        raise HTTPException(status_code=500, detail=f"Errore imprevisto: {str(exc)}")

    _last_backup_status["store"] = {
        "status": "success" if success else "error",
        "last_run": datetime.now(timezone.utc).isoformat(),
        "duration_s": round(duration, 1),
        "error": None if success else output[-500:],
    }

    if not success:
        raise HTTPException(
            status_code=500,
            detail={"message": "Backup Store fallito", "output": output[-2000:]}
        )
    return {
        "status": "success",
        "message": "Backup Store completato",
        "duration_s": round(duration, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


class RecoverRequest(BaseModel):
    backup_file_id: Optional[str] = None  # ID Drive del file, None = più recente
    dry_run: bool = True                   # True = solo simulazione, non applica


@router.post("/recover", dependencies=[Depends(_verify_backup_secret)])
async def run_recovery(request: RecoverRequest):
    """
    Esegue recover_db.py per ripristinare il database da un backup su Drive.
    Chiamato manualmente da GitHub Actions recovery-manual.yml.

    ATTENZIONE: se dry_run=False sovrascrive il database corrente.
    """
    logger.warning(
        "[recovery] Avvio recovery! file_id=%s dry_run=%s",
        request.backup_file_id or "LATEST",
        request.dry_run,
    )

    extra_env = {}
    if request.backup_file_id:
        extra_env["RECOVERY_FILE_ID"] = request.backup_file_id
    extra_env["RECOVERY_DRY_RUN"] = "1" if request.dry_run else "0"

    loop = asyncio.get_running_loop()
    try:
        success, output, duration = await loop.run_in_executor(
            None, lambda: _run_script("recover_db.py", extra_env)
        )
    except Exception as exc:
        logger.error("[backup] Eccezione imprevista in run_recovery: %s", exc)
        raise HTTPException(status_code=500, detail=f"Errore imprevisto: {str(exc)}")

    _last_backup_status["recover"] = {
        "status": "success" if success else "error",
        "last_run": datetime.now(timezone.utc).isoformat(),
        "duration_s": round(duration, 1),
        "error": None if success else output[-500:],
        "dry_run": request.dry_run,
    }

    if not success:
        raise HTTPException(
            status_code=500,
            detail={"message": "Recovery fallito", "output": output[-2000:]}
        )
    return {
        "status": "success",
        "message": f"Recovery {'simulato (dry_run)' if request.dry_run else 'APPLICATO'} con successo",
        "dry_run": request.dry_run,
        "duration_s": round(duration, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/diag", dependencies=[Depends(_verify_backup_secret)])
async def backup_diag():
    """
    Diagnostica: mostra il path degli script e verifica la loro esistenza.
    Utile per debug su Render.
    """
    import shutil
    file_location = Path(__file__).resolve()
    candidates_tried = _scripts_dir_candidates()
    return {
        "file_location": str(file_location),
        "cwd": os.getcwd(),
        "candidates_tried": [str(p) for p in candidates_tried],
        "scripts_dir": str(SCRIPTS_DIR),
        "scripts_dir_exists": SCRIPTS_DIR.exists(),
        "scripts_available": {
            "backup_db": (SCRIPTS_DIR / "backup_db.py").exists(),
            "backup_store": (SCRIPTS_DIR / "backup_store.py").exists(),
            "recover_db": (SCRIPTS_DIR / "recover_db.py").exists(),
        },
        "pg_dump_path": shutil.which("pg_dump"),
        "python_executable": sys.executable,
    }


@router.get("/status")
async def get_backup_status(current_user=Depends(get_current_admin)):
    """
    Restituisce lo stato degli ultimi backup/recovery.
    Richiede autenticazione admin JWT.
    """
    return {
        "backup_db": _last_backup_status["db"],
        "backup_store": _last_backup_status["store"],
        "last_recovery": _last_backup_status["recover"],
        "scripts_dir": str(SCRIPTS_DIR),
        "scripts_available": {
            "backup_db": (SCRIPTS_DIR / "backup_db.py").exists(),
            "backup_store": (SCRIPTS_DIR / "backup_store.py").exists(),
            "recover_db": (SCRIPTS_DIR / "recover_db.py").exists(),
        },
    }


@router.get("/list")
async def list_backups(current_user=Depends(get_current_admin)):
    """
    Lista i backup disponibili su Google Drive.
    Richiede autenticazione admin JWT.
    """
    folder_id = os.getenv("BACKUP_GOOGLE_DRIVE_FOLDER_ID")
    if not folder_id:
        raise HTTPException(status_code=503, detail="BACKUP_GOOGLE_DRIVE_FOLDER_ID non configurata")

    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not sa_json:
        raise HTTPException(status_code=503, detail="GOOGLE_SERVICE_ACCOUNT_JSON non configurata")

    try:
        import json
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        info = json.loads(sa_json)
        credentials = service_account.Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/drive.readonly"]
        )
        service = build("drive", "v3", credentials=credentials, cache_discovery=False)

        result = service.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            fields="files(id,name,size,createdTime)",
            orderBy="createdTime desc",
            pageSize=50,
        ).execute()

        files = result.get("files", [])
        return {
            "total": len(files),
            "backups": [
                {
                    "id": f["id"],
                    "name": f["name"],
                    "size_mb": round(int(f.get("size", 0)) / (1024 * 1024), 2),
                    "created_at": f.get("createdTime"),
                }
                for f in files
            ],
        }
    except Exception as exc:
        logger.error("[backup] Errore listing Drive: %s", exc)
        raise HTTPException(status_code=500, detail=f"Errore accesso Drive: {str(exc)}")
