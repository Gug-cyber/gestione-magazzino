# 🚀 Deploy Produzione

## Architettura Cloud

```
┌─────────────────┐
│   Neon (DB)     │ ← PostgreSQL Database
└────────┬────────┘
         │
    ┌────┴─────┬──────────────────┐
    │          │                  │
┌───▼────┐ ┌──▼──────┐ ┌────────▼─────────┐
│Backend │ │   CMS   │ │  Frontend React  │
│FastAPI │ │ Strapi  │ │   E-Commerce     │
│ Render │ │ Render  │ │     Vercel       │
└────────┘ └─────────┘ └──────────────────┘
```

---

## 📊 Servizi Utilizzati

| Componente | Servizio | Piano | Costo/mese |
|------------|----------|-------|------------|
| Database PostgreSQL | [Neon](https://neon.tech) | Free Tier | €0 |
| Backend FastAPI | [Render](https://render.com) | Free Web Service | €0 |
| CMS Strapi | [Render](https://render.com) | Free Web Service | €0 |
| Frontend React | [Vercel](https://vercel.com) | Hobby | €0 |
| **TOTALE** | | | **€0/mese** |

> ⚠️ **Nota**: I servizi free di Render vanno in sleep dopo 15 minuti di inattività (cold start ~30-60s)

---

## 🔧 Setup Passo-Passo

### **1. Database Neon (già configurato)**

✅ Il database PostgreSQL su Neon è già attivo e connesso al backend.

Assicurati di avere la connection string:
```
postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require
```

---

### **2. Deploy CMS Strapi su Render**

#### Step 1: Crea nuovo Web Service
1. Vai su [render.com](https://render.com/dashboard)
2. Click **New +** → **Web Service**
3. Connetti il repository `Gug-cyber/gestione-magazzino`
4. Configura:
   - **Name**: `gestione-magazzino-cms`
   - **Root Directory**: `cms`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

#### Step 2: Configura Environment Variables
Aggiungi queste variabili nel dashboard Render:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=10000

# Database Neon
DATABASE_CLIENT=postgres
DATABASE_HOST=ep-xxx.eu-central-1.aws.neon.tech
DATABASE_PORT=5432
DATABASE_NAME=gestione_magazzino
DATABASE_USERNAME=your_neon_user
DATABASE_PASSWORD=your_neon_password
DATABASE_SSL=true

# Strapi Secrets (genera con: openssl rand -base64 32)
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=random_salt_here
ADMIN_JWT_SECRET=random_secret_here
JWT_SECRET=random_secret_here
TRANSFER_TOKEN_SALT=random_salt_here

# URLs
PUBLIC_URL=https://gestione-magazzino-cms.onrender.com
MAGAZZINO_BACKEND_URL=https://your-backend.onrender.com
FRONTEND_URL=https://gestione-magazzino.vercel.app
```

#### Step 3: Deploy
- Click **Create Web Service**
- Attendi il primo deploy (~5-10 minuti)
- Accedi a `https://gestione-magazzino-cms.onrender.com/admin`
- Crea il primo admin user

#### Step 4: Configura Permessi API Pubbliche
1. Login su Strapi admin panel
2. **Settings** → **Users & Permissions** → **Roles** → **Public**
3. Abilita permessi per:
   - `product`: `find`, `findOne`
   - `category`: `find`, `findOne`
   - `banner`: `find`
   - `static-page`: `find`, `findOne`
4. **Save**

#### Step 5: Genera API Token per Backend
1. **Settings** → **API Tokens** → **Create new API Token**
2. Nome: `Magazzino Backend Sync`
3. Token type: `Full access`
4. **Save** e copia il token

---

### **3. Aggiorna Backend Render**

Aggiungi le variabili d'ambiente sul backend esistente:

```env
# Strapi Connection
STRAPI_URL=https://gestione-magazzino-cms.onrender.com
STRAPI_API_TOKEN=<token_copiato_nello_step_5>
```

---

### **4. Deploy Frontend E-commerce su Vercel**

#### Step 1: Importa progetto
1. Vai su [vercel.com](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Importa il repository `Gug-cyber/gestione-magazzino`
4. Configura:
   - **Root Directory**: `ecommerce-frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### Step 2: Configura Environment Variables
```env
VITE_STRAPI_URL=https://gestione-magazzino-cms.onrender.com
VITE_API_URL=https://your-backend.onrender.com
```

#### Step 3: Deploy
- Click **Deploy**
- Attendi il deploy (~2-3 minuti)
- Copia l'URL del frontend (es. `https://gestione-magazzino.vercel.app`)

#### Step 4: Aggiorna CORS su CMS Strapi
Aggiungi l'URL Vercel alla variabile d'ambiente `FRONTEND_URL` nel servizio CMS su Render.

---

## 🔄 Flusso Dati

```
Utente → Frontend Vercel → CMS Strapi Render → DB Neon
                         ↕
                   Backend FastAPI Render → DB Neon
```

## 🛠️ Troubleshooting

### Cold Start Render
I servizi free di Render si addormentano dopo 15 minuti. Per ridurre i cold start:
- Usa un servizio di ping esterno (es. UptimeRobot)
- Considera l'upgrade al piano Starter ($7/mese)

### SSL Neon
Assicurati che `DATABASE_SSL=true` sia impostato sul CMS. La configurazione usa `rejectUnauthorized: false` per compatibilità con i certificati Neon.

### Logs
- Backend: Dashboard Render → **Logs**
- CMS: Dashboard Render → **Logs**
- Frontend: Dashboard Vercel → **Functions** → **Logs**
