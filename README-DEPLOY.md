# 🚀 Deploy Gratuito Online

Questa guida spiega come mettere online **Gestione Magazzino** gratuitamente usando:
- **Frontend** → [Vercel](https://vercel.com) (gratis illimitato)
- **Backend** → [Koyeb](https://koyeb.com) (gratis, sempre attivo)
- **Database** → [Neon](https://neon.tech) (PostgreSQL gratis)

---

## 📋 Prerequisiti

- Account GitHub (già ce l'hai)
- Account Vercel (registrati su vercel.com con GitHub)
- Account Koyeb (registrati su koyeb.com — **non serve carta di credito**)
- Account Neon (registrati su neon.tech con GitHub)

---

## Passo 1 — Database su Neon

1. Vai su [neon.tech](https://neon.tech) e crea un account
2. Crea un nuovo **Project** (es. `gestione-magazzino`)
3. Vai in **Connection Details** e copia la **Connection string** (formato: `postgresql://user:password@host/dbname?sslmode=require`)
4. **Salva questa stringa** — ti servirà nei prossimi passi

---

## Passo 2 — Backend su Koyeb

1. Vai su [koyeb.com](https://koyeb.com) e crea un account
2. Clicca **"Create Service"**
3. Seleziona **"GitHub"** come sorgente
4. Autorizza Koyeb ad accedere al repository `gestione-magazzino`
5. Configura il servizio:
   - **Build type**: Dockerfile
   - **Dockerfile path**: `backend/Dockerfile`
   - **Port**: `8000`
6. Nella sezione **Environment Variables**, aggiungi:

   | Variabile | Valore |
   |---|---|
   | `DATABASE_URL` | La connection string di Neon copiata al Passo 1 |
   | `ALLOWED_ORIGINS` | `https://YOUR_APP.vercel.app` (da aggiornare dopo il Passo 3) |
   | `CORS_ALLOW_LAN` | `false` |
   | `SECRET_KEY` | Una stringa casuale lunga almeno 32 caratteri (es. usa [questo generatore](https://generate-secret.vercel.app/32)) |
   | `FRONTEND_URL` | L'URL del frontend Vercel (es. `https://gestione-magazzino-xxx.vercel.app`) |
   | `RESEND_API_KEY` | La chiave API di Resend (es. `re_xxxxxxxx`) — per invio email |
   | `RESEND_FROM` | *(opzionale)* Mittente email, default: `Gestione Magazzino <onboarding@resend.dev>` |
   | `CLOUDINARY_CLOUD_NAME` | Il nome del tuo cloud Cloudinary (dalla dashboard su cloudinary.com) |
   | `CLOUDINARY_API_KEY` | La API Key di Cloudinary |
   | `CLOUDINARY_API_SECRET` | Il API Secret di Cloudinary |

   > **Nota email**: Il backend usa [Resend](https://resend.com) per inviare email (reset password, recupero username) tramite HTTP API, che funziona su tutti i piani di hosting. Le variabili SMTP (`SMTP_HOST`, `SMTP_USER`, ecc.) sono opzionali e usate solo come fallback se `RESEND_API_KEY` non è configurata.

   > **Nota Cloudinary**: Le variabili `CLOUDINARY_*` sono necessarie per il caricamento delle foto dei prodotti. Registrati gratuitamente su [cloudinary.com](https://cloudinary.com) (piano gratuito: 25 GB storage, 25 GB banda/mese), poi trovi Cloud Name, API Key e API Secret nella sezione **"API Keys"** del dashboard (sotto "Product Environment").

7. Clicca **"Deploy"**
8. Attendi il deploy (2-5 minuti). Una volta completato, copia l'URL del servizio (formato: `https://xxx-yyy.koyeb.app`)

---

## Passo 3 — Frontend su Vercel

1. Vai su [vercel.com](https://vercel.com) e accedi con GitHub
2. Clicca **"Add New Project"** → **"Import Git Repository"**
3. Seleziona il repository `gestione-magazzino`
4. Vercel rileverà automaticamente la configurazione da `vercel.json`
5. Nella sezione **Environment Variables**, aggiungi:

   | Variabile | Valore |
   |---|---|
   | `VITE_API_URL` | *(lascia vuoto — il proxy di Vercel gestirà le chiamate API)* |

6. Clicca **"Deploy"**
7. Una volta completato, copia l'URL del frontend (formato: `https://gestione-magazzino-xxx.vercel.app`)

---

## Passo 4 — Collegare frontend e backend

### 4a. Aggiorna `vercel.json` con l'URL Koyeb reale

Modifica `vercel.json` nella root sostituendo `YOUR_KOYEB_APP.koyeb.app` con il tuo URL Koyeb reale:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://TUO-SERVIZIO.koyeb.app/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Poi fa' un commit e push — Vercel si aggiorna automaticamente.

### 4b. Aggiorna `ALLOWED_ORIGINS` su Koyeb

Vai nelle impostazioni del servizio Koyeb → Environment Variables:
- Cambia `ALLOWED_ORIGINS` con l'URL reale di Vercel (es. `https://gestione-magazzino-xxx.vercel.app`)

---

## ✅ Accesso all'applicazione

- **App**: `https://gestione-magazzino-xxx.vercel.app`
- **API docs**: `https://TUO-SERVIZIO.koyeb.app/docs`

**Credenziali default**: username `admin` / password generata automaticamente al primo avvio (visibile nei log del server). Al primo accesso il cambio password è obbligatorio.

---

## ⚠️ Limitazioni del piano gratuito

| Servizio | Limite |
|---|---|
| **Vercel** | 100 GB di banda/mese, build illimitate |
| **Koyeb** | 512 MB RAM, 1 vCPU, sempre attivo |
| **Neon** | 0.5 GB storage, ~191 ore compute/mese |

Per un uso personale/piccola azienda questi limiti sono più che sufficienti.

---

## 🔄 Deploy automatico

Ogni volta che fai un `git push` sul branch `main`:
- **Vercel** rebuilda e rideploya il frontend automaticamente
- **Koyeb** rebuilda e rideploya il backend automaticamente

---

## 📁 Foto prodotti — Cloudinary

Le foto dei prodotti vengono archiviate su **Cloudinary** (storage cloud gratuito fino a 25 GB/mese).

### Setup Cloudinary (obbligatorio per le foto):
1. Crea un account gratuito su [cloudinary.com](https://cloudinary.com)
2. Dal dashboard Cloudinary copia **Cloud Name**, **API Key**, **API Secret** (nella sezione "Product Environment Credentials")
3. Aggiungi queste variabili d'ambiente al backend (Koyeb/Render):

   | Variabile | Dove trovarla |
   |---|---|
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard → Product Environment |
   | `CLOUDINARY_API_KEY` | Cloudinary dashboard → Product Environment |
   | `CLOUDINARY_API_SECRET` | Cloudinary dashboard → Product Environment |

> **Nota**: senza queste variabili il backend risponde HTTP 503 all'upload foto, ma tutto il resto dell'app funziona normalmente.

---

## 🆘 Risoluzione problemi

### Errore CORS sul frontend
- Verifica che `ALLOWED_ORIGINS` su Koyeb contenga esattamente l'URL di Vercel (senza slash finale)
- Verifica che `vercel.json` contenga l'URL Koyeb corretto nel rewrite

### Il backend non risponde
- Controlla i log su Koyeb → Service → Logs
- Verifica che `DATABASE_URL` sia corretta (deve avere `?sslmode=require` per Neon)

### Errore database
- Vai su Neon → verifica che il progetto sia attivo
- La connection string di Neon potrebbe non funzionare se la password è stata reimpostata o il progetto è stato ricreato: in quel caso vai su Neon e copia una connection string aggiornata
