# Backup & Recovery — Gestione Magazzino

## Architettura

Il sistema usa **GitHub Actions** (gratuito) come scheduler per triggerare
endpoint protetti sul backend Render.

```text
GitHub Actions cron
  │
  ├── backup-nightly.yml    → POST /api/backup/run-db     (ogni notte 02:00 UTC)
  ├── backup-monthly.yml    → POST /api/backup/run-store  (1° del mese 03:00 UTC)
  └── recovery-manual.yml   → POST /api/backup/recover    (manuale)
        │
        ↓
  Backend FastAPI (Render)
        │
        ├── scripts/backup_db.py      → pg_dump → Google Drive
        ├── scripts/backup_store.py   → export tabelle → Google Drive
        └── scripts/recover_db.py     → Google Drive → psql restore
```

## Setup iniziale (obbligatorio)

### 1. Genera il BACKUP_TRIGGER_SECRET

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 2. Configura i GitHub Secrets

Vai su: **GitHub → Settings → Secrets and variables → Actions → New repository secret**

| Nome | Valore |
|------|--------|
| `BACKUP_TRIGGER_SECRET` | il token generato sopra |
| `BACKEND_URL` | es. `https://gestione-magazzino-backend.onrender.com` |

### 3. Configura le variabili sul backend Render

Nel pannello Render → Environment:

| Nome | Valore |
|------|--------|
| `BACKUP_TRIGGER_SECRET` | stesso token di sopra |
| `BACKUP_GOOGLE_DRIVE_FOLDER_ID` | ID cartella Drive per i backup DB |
| `BACKUP_STORE_GOOGLE_DRIVE_FOLDER_ID` | ID cartella Drive per backup store/magazzino |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON del service account Google (una riga) |
| `BACKUP_RETENTION_DAYS` | `30` (default) |

### Variabile d'ambiente SCRIPTS_DIR (raccomandata su Render se il deploy usa Root Directory = backend)

Se il servizio Render ha "Root Directory" impostato su `backend`, aggiungere nel pannello Render → Environment:

| Nome | Valore |
|------|--------|
| `SCRIPTS_DIR` | `/opt/render/project/src/scripts` |

In alternativa, lasciare vuota e la funzione proverà automaticamente i path standard.

## Utilizzo

### Backup manuale immediato

Vai su: **GitHub → Actions → 🗄️ Backup Notturno DB → Run workflow**

### Recovery manuale

1. Vai su: **GitHub → Actions → 🔄 Recovery Database (MANUALE) → Run workflow**
2. Compila i campi:
   - `backup_file_id`: lascia vuoto per usare il più recente, oppure incolla l'ID Drive del file
   - `confirm`: digita `CONFIRM`
   - `dry_run`: usa `true` per simulare senza modifiche, `false` per recovery reale
3. Clicca **Run workflow**

### Trovare l'ID di un backup specifico

Via API (richiede autenticazione admin):

```http
GET /api/backup/list
Authorization: Bearer <JWT_ADMIN>
```

### Verificare stato ultimo backup/recovery

```http
GET /api/backup/status
Authorization: Bearer <JWT_ADMIN>
```

## Note operative

- Gli endpoint di trigger (`/run-db`, `/run-store`, `/recover`) richiedono header `X-Backup-Secret`.
- In caso di errore dei workflow, controlla i log GitHub Actions e i log backend su Render.
- Per sicurezza, il recovery parte in `dry_run=true` di default.
