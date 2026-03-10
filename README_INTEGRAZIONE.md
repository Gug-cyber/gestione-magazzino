# Integrazione Strapi CMS + Medusa eCommerce

Questa documentazione descrive come avviare e configurare l'integrazione tra il Gestione Magazzino (FastAPI), Strapi CMS e Medusa.js eCommerce.

---

## Architettura

```
Gestione Magazzino (FastAPI)  :8000
    │  push prodotti (create/update/delete) via BackgroundTasks
    ▼
Strapi CMS                    :1337
    │  gestione foto/contenuti dall'admin UI
    │  sync prodotti verso Medusa
    ▼
Medusa.js                     :9000
    │  webhook ordine completato
    ▼
Gestione Magazzino (FastAPI) → scarico quantità magazzino
```

---

## Avvio dei servizi

```bash
docker compose up --build
```

Questo avvia tutti i servizi:
- **Gestione Magazzino** — http://localhost:8000
- **Frontend** — http://localhost:3000
- **Strapi CMS** — http://localhost:1337
- **Medusa eCommerce** — http://localhost:9000

---

## Configurazione Strapi

1. Aprire l'admin di Strapi: http://localhost:1337/admin
2. Creare il primo account amministratore
3. Andare in **Settings → API Tokens → Create new API Token**
4. Creare un token con permessi **Full Access**
5. Copiare il token e aggiornare la variabile d'ambiente nel backend:
   ```
   STRAPI_API_TOKEN=<il_tuo_token>
   ```
6. Riavviare il servizio backend:
   ```bash
   docker compose restart backend
   ```
7. Per permettere la lettura pubblica dell'API, andare in **Settings → Users & Permissions → Roles → Public** e abilitare le operazioni `find` e `findOne` per il content-type `Prodotto`.

---

## Configurazione Medusa

1. Aprire l'admin di Medusa: http://localhost:9000/app
2. Creare il primo account amministratore
3. Andare in **Settings → API Keys → Create API Key**
4. Copiare la chiave e aggiornare la variabile d'ambiente nel backend:
   ```
   MEDUSA_API_KEY=<la_tua_api_key>
   ```
5. Riavviare il servizio backend:
   ```bash
   docker compose restart backend
   ```

---

## Sincronizzazione automatica Magazzino → Strapi → Medusa

La sincronizzazione è **automatica** e avviene in background ogni volta che si:
- **Crea** un prodotto nel magazzino → viene creato anche su Strapi e Medusa
- **Aggiorna** un prodotto nel magazzino → viene aggiornato anche su Strapi e Medusa
- **Elimina** un prodotto dal magazzino → viene eliminato anche da Strapi e Medusa

Le operazioni di sync sono **fire-and-forget**: non bloccano la risposta API in caso di errori di connessione a Strapi/Medusa. Se le chiavi API non sono configurate, la sync viene saltata silenziosamente.

---

## Webhook Medusa → Magazzino

Quando un ordine viene completato su Medusa, il subscriber `order-placed.js` invia automaticamente un webhook al magazzino per scaricare le quantità.

### Endpoint webhook

```
POST /api/webhook/medusa/order
Header: X-Webhook-Secret: magazzino-webhook-secret
```

### Payload atteso

```json
{
  "order_id": "order_123",
  "items": [
    { "sku": "LIBRO-001", "quantity": 2 },
    { "sku": "LIBRO-002", "quantity": 1 }
  ]
}
```

### Risposta

```json
{
  "status": "ok",
  "order_id": "order_123",
  "scaricati": ["LIBRO-001", "LIBRO-002"],
  "errori": []
}
```

---

## Variabili d'ambiente backend

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `STRAPI_URL` | `http://strapi:1337` | URL del servizio Strapi |
| `STRAPI_API_TOKEN` | *(vuoto)* | Token API Strapi (necessario per la sync) |
| `MEDUSA_URL` | `http://medusa:9000` | URL del servizio Medusa |
| `MEDUSA_API_KEY` | *(vuoto)* | API Key Medusa (necessaria per la sync) |
| `WEBHOOK_SECRET` | `magazzino-webhook-secret` | Secret per autenticare i webhook in entrata |

---

## Gestione foto prodotti

Le foto dei prodotti vengono gestite direttamente dall'admin di Strapi:

1. Aprire http://localhost:1337/admin
2. Navigare in **Content Manager → Prodotto**
3. Aprire il prodotto desiderato
4. Caricare le foto nel campo **foto**
5. Pubblicare il prodotto

Le foto vengono salvate nel volume Docker `strapi_uploads` e sono servite da Strapi.
