import importlib.util
import uuid
from pathlib import Path


def _load_module(script_path: Path):
    module_name = f"backup_store_test_{uuid.uuid4().hex}"
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_backup_store_main_returns_1_when_upload_fails(monkeypatch, caplog):
    repo_root = Path(__file__).resolve().parents[2]
    module = _load_module(repo_root / "backend/scripts/backup_store.py")

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host/db")
    monkeypatch.setenv("BACKUP_STORE_GOOGLE_DRIVE_FOLDER_ID", "folder-id")

    monkeypatch.setattr(module, "_load_dotenv", lambda: None)
    monkeypatch.setattr(module, "_run_pg_dump_tables", lambda database_url, tables, output_path: True)
    monkeypatch.setattr(module, "_get_drive_client", lambda: object())
    monkeypatch.setattr(module, "_clear_drive_folder", lambda service, folder_id: None)
    monkeypatch.setattr(module, "_upload_to_drive", lambda service, file_path, folder_id: None)

    caplog.set_level("INFO")
    result = module.main()

    assert result == 1
    assert any("Upload su Drive fallito" in message for message in caplog.messages)


def test_backup_store_main_returns_1_when_drive_client_unavailable(monkeypatch, caplog):
    repo_root = Path(__file__).resolve().parents[2]
    module = _load_module(repo_root / "backend/scripts/backup_store.py")

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host/db")
    monkeypatch.setenv("BACKUP_STORE_GOOGLE_DRIVE_FOLDER_ID", "folder-id")

    monkeypatch.setattr(module, "_load_dotenv", lambda: None)
    monkeypatch.setattr(module, "_run_pg_dump_tables", lambda database_url, tables, output_path: True)
    monkeypatch.setattr(module, "_get_drive_client", lambda: None)
    monkeypatch.setattr(module, "_clear_drive_folder", lambda service, folder_id: None)
    monkeypatch.setattr(module, "_upload_to_drive", lambda service, file_path, folder_id: "file-id")

    caplog.set_level("INFO")
    result = module.main()

    assert result == 1
    assert any("Client Drive non disponibile" in message for message in caplog.messages)
