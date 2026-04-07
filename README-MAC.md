# 🍎 Gestione Magazzino — Guida per macOS

## 🚀 Primo avvio

1. Apri il **Finder** e vai nella cartella del progetto
2. Fai **doppio click** su `setup.command`
3. Se macOS chiede conferma, clicca **"Apri"**
4. Lo script installa automaticamente tutte le dipendenze e avvia l'app

Al termine, apri il browser su: **http://localhost:5173**

**Credenziali di default:**
```
Username: admin
Password: generata automaticamente al primo avvio (visibile nei log del server)
```
> ⚠️ Al primo accesso ti verrà chiesto di impostare una nuova password.

---

## ▶️ Avvii successivi

Dopo il primo setup, usa `start.command` per avviare l'app rapidamente:

1. Doppio click su `start.command`
2. L'app sarà disponibile su **http://localhost:5173**

---

## 📱 Accesso da telefono o tablet

L'app è configurata per essere accessibile da qualsiasi dispositivo sulla stessa rete Wi-Fi grazie a `CORS_ALLOW_LAN=true` nel file `.env`.

### Come accedere dal telefono

1. Avvia l'app con `setup.command` o `start.command`
2. Nella console verrà mostrato automaticamente l'IP LAN del Mac e, se disponibile, un QR code
3. Dal telefono vai su: `http://[IP-DEL-MAC]:5173`

### Trovare l'IP del Mac manualmente

```bash
ipconfig getifaddr en0
# oppure
ipconfig getifaddr en1
```

Otterrai qualcosa come `192.168.1.42`. Dal telefono vai su `http://192.168.1.42:5173`.

> ⚠️ Il telefono deve essere connesso alla **stessa rete Wi-Fi** del Mac

### QR code opzionale

Se vuoi il QR code nella console, installa `qrencode`:

```bash
brew install qrencode
```

Poi riavvia con `start.command`: il QR code verrà mostrato automaticamente.

---

## ⚙️ File `.env` backend

Il file `backend/.env` viene creato automaticamente da `setup.command`. Le variabili principali:

| Variabile | Default | Descrizione |
|---|---|---|
| `DATABASE_URL` | PostgreSQL locale | Connessione al database |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Origini CORS permesse |
| `CORS_ALLOW_LAN` | `true` | Abilita accesso da LAN (`*`) |
| `FRONTEND_URL` | `http://localhost:5173` | URL del frontend |

> **Nota sicurezza:** `CORS_ALLOW_LAN=true` imposta `allow_origins=["*"]` con `allow_credentials=False`. L'autenticazione usa JWT nell'header `Authorization`, non cookie, quindi non ci sono rischi di sicurezza.

Per disabilitare l'accesso LAN, imposta `CORS_ALLOW_LAN=false` nel file `backend/.env`.

---

## 🗄️ Database

Il setup usa **PostgreSQL** in locale (installato tramite Homebrew). I dati sono persistenti nella directory data di PostgreSQL.

Per resettare il database:

```bash
psql postgres -c "DROP DATABASE magazzino;"
psql postgres -c "CREATE DATABASE magazzino OWNER magazzino;"
```

Poi riavvia il backend: le tabelle verranno ricreate automaticamente.

---

## ⏹️ Fermare i server

Per fermare backend e frontend avviati con `start.command` o `setup.command`:

1. Fai **doppio click** su `stop.command` dal Finder
2. Oppure, dal terminale:
   ```bash
   ./stop.command
   ```

Lo script legge automaticamente i PID salvati in `/tmp/gestione-magazzino-backend.pid` e `/tmp/gestione-magazzino-frontend.pid`, termina i processi e rimuove i file PID.

Se i file PID non esistono (per esempio dopo un riavvio del Mac), i server possono essere fermati manualmente:

```bash
# Trova i processi
lsof -i :8000   # backend
lsof -i :5173   # frontend

# Termina per porta
kill $(lsof -ti:8000) 2>/dev/null || true
kill $(lsof -ti:5173) 2>/dev/null || true
```

---

## 📋 Log

I log dei server vengono salvati in `/tmp/`:

```bash
tail -f /tmp/gestione-magazzino-backend.log
tail -f /tmp/gestione-magazzino-frontend.log
```

---

## 🐳 Alternativa: Docker

Se hai Docker Desktop installato, puoi usare Docker Compose invece di `setup.command`:

```bash
docker compose up --build
# App: http://localhost:3000
# API docs: http://localhost:8000/docs
```
