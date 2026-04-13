# Backup Database e Store — Documentazione

Questo documento descrive il sistema di backup automatico per il database PostgreSQL
e i dati dello store/magazzino.

---

## Componenti

| File | Descrizione |
|------|-------------|
| `scripts/backup_db.py` | Backup DB giornaliero (incrementale) / settimanale (full) |
| `scripts/backup_store.py` | Backup mensile delle tabelle store e magazzino |
| `scripts/backup_scheduler.py` | Scheduler che esegue i backup automaticamente |

---

## Variabili d'Ambiente

Aggiungere le seguenti variabili al file `backend/.env` (o all'ambiente di produzione):

```bash
# Backup Database su Google Drive
BACKUP_GOOGLE_DRIVE_FOLDER_ID=1AbCdEf...      # ID cartella Drive per backup DB
BACKUP_STORE_GOOGLE_DRIVE_FOLDER_ID=1XyZaB... # ID cartella Drive per backup store
BACKUP_RETENTION_DAYS=30                        # Giorni di retention backup DB (default: 30)

# Credenziali Google (già usata per la galleria foto prodotti)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

---

## Configurazione Google Drive

### 1. Creare un Service Account

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Seleziona il tuo progetto (o crea un nuovo progetto)
3. Vai in **IAM & Admin → Service Accounts**
4. Clicca **Create Service Account**
   - Nome: `backup-magazzino`
   - ID: `backup-magazzino`
5. Clicca **Create and Continue** → salta i permessi opzionali → **Done**
6. Clicca sul Service Account appena creato → tab **Keys** → **Add Key → JSON**
7. Scarica il file JSON e copiane il contenuto in `GOOGLE_SERVICE_ACCOUNT_JSON`

### 2. Abilitare l'API Google Drive

1. Vai in **APIs & Services → Library**
2. Cerca "Google Drive API" e clicca **Enable**

### 3. Creare le Cartelle su Google Drive

1. Vai su [Google Drive](https://drive.google.com/)
2. Crea una cartella **"Backup DB Magazzino"**
3. Crea una cartella **"Backup Store Magazzino"**

### 4. Condividere le Cartelle con il Service Account

Per ogni cartella:
1. Click destro sulla cartella → **Share**
2. Aggiungi l'email del Service Account (formato: `backup-magazzino@your-project.iam.gserviceaccount.com`)
3. Imposta permesso **Editor**
4. Clicca **Send**

### 5. Ottenere l'ID delle Cartelle

L'ID della cartella è visibile nell'URL quando apri la cartella su Drive:
```
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                        Questo è l'ID della cartella
```

---

## Strategia di Backup

### Backup Database (`backup_db.py`)

| Giorno | Tipo | Filename |
|--------|------|----------|
| Domenica | Full | `db_full_YYYYMMDD_HHMMSS.sql.gz` |
| Lun–Sab | Incrementale* | `db_incremental_YYYYMMDD_HHMMSS.sql.gz` |

> *pg_dump non supporta dump incrementali nativi. Il "backup incrementale" è un dump completo compresso, distinto da quello settimanale solo per label. Per backup incrementali veri, considerare WAL-E o pgBackRest.

**Retention:** i file su Google Drive più vecchi di `BACKUP_RETENTION_DAYS` giorni vengono eliminati automaticamente ad ogni esecuzione.

### Backup Store/Magazzino (`backup_store.py`)

- Eseguito **una volta al mese** (il 1° del mese alle 03:00)
- Tabelle incluse: `prodotti`, `categorie`, `ubicazioni`, `movimenti`, `fornitori`, `fatture`, `clienti`, `ordini`, `righe_ordine`, `banner`, `contenuti`, `prodotti_pubblici`, `store_settings`
- **Prima di caricare il nuovo backup, elimina TUTTI i file precedenti** nella cartella Drive
- Si mantiene sempre solo l'ultimo backup mensile
- Filename: `store_backup_YYYYMM.sql.gz`

---

## Avviare lo Scheduler

### Metodo 1: Python scheduler (raccomandato per ambienti Docker)

```bash
# Installa le dipendenze
pip install schedule

# Avvia lo scheduler (processo in foreground)
python scripts/backup_scheduler.py
```

Per eseguirlo in background come servizio:

```bash
# Con nohup
nohup python scripts/backup_scheduler.py >> /var/log/backup_scheduler.log 2>&1 &

# Con systemd (crea /etc/systemd/system/backup-scheduler.service)
```

Esempio file systemd (`/etc/systemd/system/backup-scheduler.service`):
```ini
[Unit]
Description=Backup Scheduler Magazzino
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/app
ExecStart=/usr/bin/python3 /app/scripts/backup_scheduler.py
Restart=always
RestartSec=60
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable backup-scheduler
systemctl start backup-scheduler
```

### Metodo 2: Cron job

Aggiungere al crontab (`crontab -e`):

```cron
# Backup DB: ogni giorno alle 02:00
0 2 * * * /usr/bin/python3 /app/scripts/backup_db.py >> /var/log/backup_db.log 2>&1

# Backup Store: il 1° del mese alle 03:00
0 3 1 * * /usr/bin/python3 /app/scripts/backup_store.py >> /var/log/backup_store.log 2>&1
```

---

## Esecuzione Manuale

```bash
# Backup DB manuale
python scripts/backup_db.py

# Backup Store manuale
python scripts/backup_store.py
```

---

## Ripristino da Backup

```bash
# Decomprimere il backup
gunzip -k db_full_20250101_020000.sql.gz

# Ripristinare nel database
psql postgresql://user:pass@host/dbname < db_full_20250101_020000.sql
```

---

## Requisiti di Sistema

- **Python 3.10+**
- **pg_dump** installato e disponibile nel PATH (incluso con PostgreSQL)
- **Pacchetti Python:** `google-api-python-client`, `google-auth`, `schedule` (già in `requirements.txt`)
- **Spazio disco temporaneo:** `/tmp/backups/` con almeno 500 MB liberi

---

## Troubleshooting

### pg_dump non trovato
```bash
which pg_dump
# Se non trovato, installare:
apt-get install postgresql-client
```

### Errore autenticazione Google Drive
- Verificare che `GOOGLE_SERVICE_ACCOUNT_JSON` contenga il JSON completo e valido
- Verificare che il Service Account abbia accesso (Editor) alle cartelle Drive
- Verificare che l'API Google Drive sia abilitata nel progetto GCP

### Backup salvato solo in locale
Se `BACKUP_GOOGLE_DRIVE_FOLDER_ID` non è configurato, il backup viene salvato
localmente in `/tmp/backups/` senza errori. Configurare la variabile per abilitare
l'upload su Drive.
