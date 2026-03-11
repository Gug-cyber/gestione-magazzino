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

**Credenziali default**: `admin` / `admin123` (cambiale subito nelle impostazioni!)

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

## 📁 Note sulle foto prodotti

Il piano gratuito di Koyeb ha un **filesystem effimero**: le foto caricate vengono perse al riavvio del servizio. Per una soluzione persistente, considera di usare [Cloudinary](https://cloudinary.com) (piano gratuito disponibile) o [Supabase Storage](https://supabase.com). Per ora le foto funzionano ma non sono persistenti tra un riavvio e l'altro.

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
