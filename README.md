# 🏭 Gestione Magazzino

![Tests](https://github.com/Gug-cyber/gestione-magazzino/workflows/Tests/badge.svg)
![Security Scan](https://github.com/Gug-cyber/gestione-magazzino/workflows/Security%20Scanning/badge.svg)
[![codecov](https://codecov.io/gh/Gug-cyber/gestione-magazzino/branch/main/graph/badge.svg)](https://codecov.io/gh/Gug-cyber/gestione-magazzino)
![Security Rating](https://img.shields.io/badge/security-A-brightgreen)

Software completo per la gestione del magazzino, sviluppato con un moderno stack tecnologico.

## 📋 Descrizione

**Gestione Magazzino** è un'applicazione web full-stack che permette di:
- Gestire il catalogo prodotti con SKU, categorie e ubicazioni
- Registrare movimenti di carico e scarico
- Monitorare le scorte e ricevere alert per prodotti sotto la soglia minima
- Gestire fornitori e ubicazioni fisiche del magazzino
- Visualizzare statistiche e dashboard in tempo reale

## 🛠️ Stack Tecnologico

| Layer | Tecnologia |
|-------|-----------|
| **Backend** | Python 3.11 + FastAPI + SQLAlchemy |
| **Frontend** | React 18 + Vite |
| **Database** | PostgreSQL 15 |
| **ORM** | SQLAlchemy 2.0 |
| **Containerizzazione** | Docker + Docker Compose |

## ✅ Prerequisiti

- [Docker](https://www.docker.com/get-started) >= 24.0
- [Docker Compose](https://docs.docker.com/compose/) >= 2.0

## 🚀 Avvio del Progetto

### 1. Clona il repository
```bash
git clone https://github.com/Gug-cyber/gestione-magazzino.git
cd gestione-magazzino
```

### 2. Configura le variabili d'ambiente (opzionale)
```bash
cp backend/.env.example backend/.env
```

### 3. Avvia con Docker Compose
```bash
docker compose up --build
```

### 4. Accedi all'applicazione
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Documentazione API (Swagger):** http://localhost:8000/docs
- **Documentazione API (ReDoc):** http://localhost:8000/redoc

### Fermare il progetto
```bash
docker compose down
```

### Fermare e rimuovere i volumi (reset database)
```bash
docker compose down -v
```

## 📁 Struttura del Progetto

```
gestione-magazzino/
├── backend/
│   ├── app/
│   │   ├── main.py              # Entry point FastAPI
│   │   ├── database.py          # Configurazione DB e sessione SQLAlchemy
│   │   ├── models/              # Modelli SQLAlchemy
│   │   │   ├── prodotto.py
│   │   │   ├── categoria.py
│   │   │   ├── movimento.py
│   │   │   ├── fornitore.py
│   │   │   └── ubicazione.py
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # Endpoint REST
│   │   └── crud/                # Operazioni database
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/          # Navbar, Sidebar
│   │   ├── pages/               # Dashboard, Prodotti, Movimenti, Fornitori, Ubicazioni
│   │   └── api/                 # Client Axios
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🌐 Endpoint API Principali

### Prodotti
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/prodotti/` | Lista tutti i prodotti |
| `GET` | `/api/prodotti/{id}` | Dettaglio prodotto |
| `GET` | `/api/prodotti/sotto-scorta` | Prodotti sotto scorta minima |
| `POST` | `/api/prodotti/` | Crea nuovo prodotto |
| `PUT` | `/api/prodotti/{id}` | Aggiorna prodotto |
| `DELETE` | `/api/prodotti/{id}` | Elimina prodotto |

### Movimenti
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/movimenti/` | Lista tutti i movimenti |
| `POST` | `/api/movimenti/` | Registra carico/scarico |
| `GET` | `/api/movimenti/prodotto/{id}` | Movimenti per prodotto |

### Categorie, Fornitori, Ubicazioni
- `GET /api/categorie/`
- `GET /api/fornitori/`
- `GET /api/ubicazioni/`

Tutti gli endpoint supportano operazioni CRUD complete (GET, POST, PUT, DELETE).

### Health Check
```
GET /health
GET /health/db
```

## 🔧 Sviluppo Locale (senza Docker)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🗄️ Migrazioni Database (Alembic)

Il progetto usa [Alembic](https://alembic.sqlalchemy.org/) per gestire le migrazioni del database.

### Eseguire le migrazioni
```bash
cd backend
# Applica tutte le migrazioni in sospeso
DATABASE_URL=postgresql://user:pass@host/db alembic upgrade head
```

### Creare una nuova migrazione
```bash
cd backend
# Autogenera dal confronto tra modelli e DB
DATABASE_URL=... alembic revision --autogenerate -m "descrizione_migrazione"
# Oppure crea una migrazione vuota
alembic revision -m "descrizione_migrazione"
```

### Rollback
```bash
cd backend
alembic downgrade -1   # un passo indietro
alembic downgrade base  # torna all'inizio
```

## 🧪 Test (Backend)

```bash
cd backend
pip install -r requirements-test.txt
pytest
```

## 🔑 Variabili d'Ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `SECRET_KEY` | (deve essere impostata) | Chiave segreta JWT — **obbligatoria in produzione** |
| `DATABASE_URL` | `postgresql://magazzino:magazzino@db:5432/magazzino` | URL del database |
| `APP_ENV` | `production` | Ambiente (`production` / `development`) |
| `UPLOAD_DIR` | `/app/uploads` | Directory per i file caricati |
| `EBAY_WEBHOOK_SECRET` | (vuoto) | Secret condiviso per proteggere `POST /api/ebay/webhook/orders` |
| `EBAY_SALES_POLLING_ENABLED` | `false` | Abilita polling automatico ordini eBay come fallback al webhook |
| `EBAY_SALES_POLL_INTERVAL_SECONDS` | `120` | Intervallo di polling ordini eBay (secondi) |
| `EBAY_SALES_POLL_LOOKBACK_HOURS` | `24` | Finestra temporale usata nelle chiamate Fulfillment API |
| `TELEGRAM_BOT_TOKEN` | (vuoto) | Token bot Telegram per notifica ordini |
| `TELEGRAM_CHAT_ID` | (vuoto) | Chat ID destinatario Telegram (preconfigurato nel codice tramite env) |

> ⚠️ In produzione il server **non si avvia** se `SECRET_KEY` è quella di default o ha meno di 32 caratteri.

### Flusso vendite eBay → Magazzino

- **Webhook**: `POST /api/ebay/webhook/orders` (consigliato, protetto da `EBAY_WEBHOOK_SECRET` se impostato)
- **Fallback polling**: thread automatico opzionale all'avvio (`EBAY_SALES_POLLING_ENABLED=true`)
- Per ogni vendita rilevata:
  1. creazione ordine interno (senza dati intestatario),
  2. scalatura stock,
  3. chiusura annunci eBay residui a stock zero,
  4. notifica Telegram ordine.

Moduli principali backend:
- `backend/app/services/ebay_api.py`
- `backend/app/services/magazzino.py`
- `backend/app/services/telegram_notify.py`
- `backend/app/services/ebay_sales_handler.py`

## 🗄️ Backup DB via GitHub Actions

I workflow backup (`.github/workflows/backup-nightly.yml` e `backup-monthly.yml`) eseguono `pg_dump` **direttamente su GitHub Actions** e salvano il dump come artifact (retention 90 giorni).

Configura in **GitHub → Settings → Secrets and variables → Actions** anche:

- `DATABASE_URL` (obbligatorio per il dump diretto)
- oltre ai secret già usati per trigger/recovery (`BACKUP_TRIGGER_SECRET`, `BACKEND_URL`)

> ⚠️ Nota Render: `BACKUP_RETENTION_DAYS` deve essere un numero intero (es. `30`). Valori non numerici sono configurazioni errate.

## ⏰ Keep-Alive (Render Free Plan)

Render mette in sleep i servizi gratuiti dopo 15 minuti di inattività. Per mantenerli attivi è incluso un workflow GitHub Actions che pinga il backend e il database ogni 10 minuti.

### Configurare il secret `RENDER_BACKEND_URL`

1. Vai su **Settings → Secrets and variables → Actions** nel tuo repository GitHub
2. Clicca su **New repository secret**
3. Nome: `RENDER_BACKEND_URL`
4. Valore: l'URL del tuo backend Render (es. `https://gestione-magazzino-backend.onrender.com`)
5. Clicca **Add secret**

Il workflow `.github/workflows/keep-alive.yml` verrà eseguito automaticamente ogni 10 minuti e:
- Pinga `GET /health` per tenere attivo il **backend**
- Pinga `GET /health/db` per tenere attiva la **connessione al database**
- Fallisce (con notifica) se uno dei due endpoint non risponde con HTTP 200

### Esecuzione manuale locale

```bash
# Pinga i servizi in locale
python scripts/ping_services.py

# Pinga i servizi in produzione
BACKEND_URL=https://gestione-magazzino-backend.onrender.com python scripts/ping_services.py
```

## 🤝 Come Contribuire

1. Forka il repository
2. Crea un branch per la tua feature: `git checkout -b feature/nuova-funzionalita`
3. Fai il commit delle modifiche: `git commit -m 'Aggiunge nuova funzionalità'`
4. Pusha il branch: `git push origin feature/nuova-funzionalita`
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT.
