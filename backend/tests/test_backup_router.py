import app.routers.backup as backup_router


def test_scripts_dir_candidates_prioritize_backend_scripts():
    candidates = backup_router._scripts_dir_candidates(
        file_location=backup_router.Path("/opt/render/project/src/backend/app/routers/backup.py"),
        cwd=backup_router.Path("/tmp"),
    )

    assert candidates[0].as_posix() == "/opt/render/project/src/backend/scripts"
    assert candidates[1].as_posix() == "/opt/render/project/src/scripts"


def test_resolve_scripts_dir_prefers_env(monkeypatch):
    monkeypatch.setenv("SCRIPTS_DIR", "/tmp/custom-scripts")

    resolved = backup_router._resolve_scripts_dir()

    assert resolved.as_posix() == "/tmp/custom-scripts"


def test_backup_diag_includes_debug_paths(client, monkeypatch):
    monkeypatch.setenv("BACKUP_TRIGGER_SECRET", "test-secret")

    response = client.get(
        "/api/backup/diag",
        headers={"X-Backup-Secret": "test-secret"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "file_location" in data
    assert "cwd" in data
    assert "candidates_tried" in data
    assert isinstance(data["candidates_tried"], list)
    assert data["candidates_tried"]
    assert any(path.endswith("/scripts") for path in data["candidates_tried"])
    assert "candidates_status" in data
    assert isinstance(data["candidates_status"], list)
    assert data["candidates_status"]
    assert all("path" in candidate for candidate in data["candidates_status"])
    assert all("exists" in candidate for candidate in data["candidates_status"])
    assert all("scripts_available" in candidate for candidate in data["candidates_status"])


def test_backup_run_db_requires_configured_secret(client, monkeypatch):
    monkeypatch.delenv("BACKUP_TRIGGER_SECRET", raising=False)

    response = client.post(
        "/api/backup/run-db",
        headers={"X-Backup-Secret": "anything"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Backup non configurato"


def test_backup_run_db_executes_with_valid_secret(client, monkeypatch):
    monkeypatch.setenv("BACKUP_TRIGGER_SECRET", "test-secret")
    monkeypatch.setattr(backup_router, "_run_script", lambda script_name, extra_env=None: (True, "ok", 1.2))

    response = client.post(
        "/api/backup/run-db",
        headers={"X-Backup-Secret": "test-secret"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "Backup DB completato"


def test_recovery_sets_dry_run_env_explicitly(client, monkeypatch):
    monkeypatch.setenv("BACKUP_TRIGGER_SECRET", "test-secret")

    captured = {}

    def fake_run_script(script_name, extra_env=None):
        captured["script_name"] = script_name
        captured["extra_env"] = dict(extra_env or {})
        return True, "ok", 1.0

    monkeypatch.setattr(backup_router, "_run_script", fake_run_script)

    response = client.post(
        "/api/backup/recover",
        headers={"X-Backup-Secret": "test-secret"},
        json={"dry_run": False},
    )

    assert response.status_code == 200
    assert captured["script_name"] == "recover_db.py"
    assert captured["extra_env"]["RECOVERY_DRY_RUN"] == "0"
