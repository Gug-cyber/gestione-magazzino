import importlib.util
import uuid
from pathlib import Path

import pytest


def _load_module(script_path: Path):
    module_name = f"backup_db_test_{uuid.uuid4().hex}"
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    "relative_path",
    ["scripts/backup_db.py", "backend/scripts/backup_db.py"],
)
def test_backup_main_invalid_retention_uses_default_30(monkeypatch, relative_path, caplog):
    repo_root = Path(__file__).resolve().parents[2]
    module = _load_module(repo_root / relative_path)
    retention_calls = []

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host/db")
    monkeypatch.setenv("BACKUP_GOOGLE_DRIVE_FOLDER_ID", "folder-id")
    monkeypatch.setenv("BACKUP_RETENTION_DAYS", "not-a-number")

    monkeypatch.setattr(module, "_load_dotenv", lambda: None)
    monkeypatch.setattr(module, "_run_pg_dump", lambda database_url, output_path: True)
    monkeypatch.setattr(module, "_get_drive_client", lambda: object())
    monkeypatch.setattr(module, "_upload_to_drive", lambda service, file_path, folder_id: "file-id")
    monkeypatch.setattr(
        module,
        "_apply_retention",
        lambda service, folder_id, retention_days: retention_calls.append(retention_days),
    )

    caplog.set_level("INFO")
    result = module.main()

    assert result == 0
    assert retention_calls == [30]
    assert any("Config: DATABASE_URL=***" in message for message in caplog.messages)
    assert any("BACKUP_RETENTION_DAYS ha un valore non valido" in message for message in caplog.messages)


@pytest.mark.parametrize(
    "relative_path",
    ["backend/scripts/backup_db.py"],
)
def test_backup_main_returns_1_when_upload_fails(monkeypatch, relative_path, caplog):
    repo_root = Path(__file__).resolve().parents[2]
    module = _load_module(repo_root / relative_path)

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host/db")
    monkeypatch.setenv("BACKUP_GOOGLE_DRIVE_FOLDER_ID", "folder-id")

    monkeypatch.setattr(module, "_load_dotenv", lambda: None)
    monkeypatch.setattr(module, "_run_pg_dump", lambda database_url, output_path: True)
    monkeypatch.setattr(module, "_get_drive_client", lambda: object())
    monkeypatch.setattr(module, "_upload_to_drive", lambda service, file_path, folder_id: None)
    monkeypatch.setattr(module, "_apply_retention", lambda service, folder_id, retention_days: None)

    caplog.set_level("INFO")
    result = module.main()

    assert result == 1
    assert any("Upload su Drive fallito — backup non salvato su Drive" in message for message in caplog.messages)


@pytest.mark.parametrize(
    "relative_path",
    ["backend/scripts/backup_db.py"],
)
def test_backup_main_returns_1_when_drive_client_unavailable(monkeypatch, relative_path, caplog):
    repo_root = Path(__file__).resolve().parents[2]
    module = _load_module(repo_root / relative_path)

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host/db")
    monkeypatch.setenv("BACKUP_GOOGLE_DRIVE_FOLDER_ID", "folder-id")

    monkeypatch.setattr(module, "_load_dotenv", lambda: None)
    monkeypatch.setattr(module, "_run_pg_dump", lambda database_url, output_path: True)
    monkeypatch.setattr(module, "_get_drive_client", lambda: None)
    monkeypatch.setattr(module, "_upload_to_drive", lambda service, file_path, folder_id: "file-id")
    monkeypatch.setattr(module, "_apply_retention", lambda service, folder_id, retention_days: None)

    caplog.set_level("INFO")
    result = module.main()

    assert result == 1
    assert any("Client Drive non disponibile — backup non salvato su Drive" in message for message in caplog.messages)
