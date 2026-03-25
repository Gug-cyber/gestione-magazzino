# 🛒 Setup E-Commerce: Magazzino → CMS → Portale

## Architettura

```
Magazzino Backend (FastAPI + PostgreSQL)
    ↓ API Sync
CMS Strapi (Content Management)
    ↓ REST API
E-Commerce Frontend (React + Vite)
```

---

## 🚀 Setup Locale

### 1. **Installazione CMS Strapi**

```bash
cd cms
npm install
```

Crea file `.env`:
```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=...  # Generato automaticamente
API_TOKEN_SALT=...
ADMIN_JWT_SECRET=...
JWT_SECRET=...

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gestione_magazzino
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_SSL=false

PUBLIC_URL=http://localhost:1337
```

Avvia Strapi:
```bash
npm run develop
```

Primo avvio: Crea admin user su http://localhost:1337/admin

### 2. **Generare API Token Strapi**

1. Login su http://localhost:1337/admin
2. Settings → API Tokens → Create new API Token
3. Nome: "Magazzino Sync"
4. Token type: "Full access"
5. Copia il token generato

Aggiungi al backend `.env`:
```env
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your_generated_token_here
```

### 3. **Setup E-Commerce Frontend**

```bash
cd ecommerce-frontend
npm install
```

Crea `.env`:
```env
VITE_STRAPI_URL=http://localhost:1337
```

Avvia frontend:
```bash
npm run dev
```

---

## 📊 Sincronizzazione Magazzino → CMS

### API Endpoints

**Sync tutti i prodotti:**
```bash
POST http://localhost:8000/api/cms/sync-all
Authorization: Bearer <token>
```

**Sync prodotto singolo:**
```bash
POST http://localhost:8000/api/cms/sync-product/{product_id}
Authorization: Bearer <token>
```

**Webhook (Strapi → Magazzino):**
```bash
POST http://localhost:8000/api/cms/webhook/product-updated
Content-Type: application/json
```

---

## 🗄️ Database Migration

Esegui la migrazione per creare la tabella `cms_sync_log`:

```bash
cd backend
alembic upgrade head
```

La tabella `cms_sync_log` traccia lo stato di sincronizzazione di ogni prodotto:
- `prodotto_id`: ID del prodotto nel magazzino
- `strapi_product_id`: ID del prodotto in Strapi
- `sync_status`: `success`, `failed`, `pending`
- `error_message`: Dettaglio errore (se presente)
- `synced_at`: Timestamp dell'ultima sincronizzazione

---

## 📂 Struttura Progetto

```
gestione-magazzino/
├── backend/                    # FastAPI Backend (esistente)
│   ├── app/routers/
│   │   └── cms_sync.py         # Router sync Magazzino → CMS
│   └── alembic/versions/
│       └── 0010_add_cms_ecommerce_tables.py
├── cms/                        # Strapi CMS
│   ├── package.json
│   ├── config/
│   │   ├── database.js
│   │   ├── server.js
│   │   └── plugins.js
│   └── src/
│       ├── api/
│       │   ├── product/        # Content-type Prodotti
│       │   ├── category/       # Categorie
│       │   ├── banner/         # Banner homepage
│       │   └── static-page/    # Pagine statiche
│       ├── components/
│       │   └── shared/seo.json # Componente SEO condiviso
│       └── middlewares/
│           └── sync-middleware.js
└── ecommerce-frontend/         # React + Vite E-Commerce
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/strapi.js       # Client API Strapi
        ├── pages/
        │   ├── Home.jsx
        │   ├── Catalog.jsx
        │   ├── ProductDetail.jsx
        │   └── StaticPage.jsx
        └── components/
            ├── Header.jsx
            ├── Footer.jsx
            ├── Banner.jsx
            ├── ProductCard.jsx
            ├── ProductGrid.jsx
            ├── SearchBar.jsx
            └── Filters.jsx
```

---

## 🔧 Variabili d'Ambiente

### Backend (`.env`)
| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `STRAPI_URL` | `http://localhost:1337` | URL del CMS Strapi |
| `STRAPI_API_TOKEN` | *(obbligatorio)* | Token API per autenticazione verso Strapi |

### CMS Strapi (`.env`)
| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `HOST` | `0.0.0.0` | Host del server Strapi |
| `PORT` | `1337` | Porta del server Strapi |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5432` | Porta PostgreSQL |
| `DATABASE_NAME` | `gestione_magazzino` | Nome database |
| `DATABASE_USERNAME` | `postgres` | Utente database |
| `DATABASE_PASSWORD` | *(obbligatorio)* | Password database |
| `MAGAZZINO_BACKEND_URL` | `http://localhost:8000` | URL backend magazzino (webhook) |

### Frontend (`.env`)
| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `VITE_STRAPI_URL` | `http://localhost:1337` | URL del CMS Strapi |
