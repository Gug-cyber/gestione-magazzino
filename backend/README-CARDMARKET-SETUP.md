# 🎴 Setup CardMarket RapidAPI

## Registrazione RapidAPI

1. Vai su: https://rapidapi.com/tcggopro/api/cardmarket-api-tcg
2. Registrati/accedi a RapidAPI
3. Sottoscrivi il piano dell'API e copia la tua API key

## Configurazione

### Vercel (Production)
1. Settings → Environment Variables
2. Aggiungi: `RAPIDAPI_CARDMARKET_KEY=<tua-chiave>`
3. Redeploy

### Locale (.env)
```bash
RAPIDAPI_CARDMARKET_KEY=abc123def456...
```

## Come funziona

- Se `RAPIDAPI_CARDMARKET_KEY` è configurata, il backend usa le chiamate REST all'API RapidAPI `cardmarket-api-tcg`.
- Se la chiave **non** è configurata, l'endpoint restituisce errore `400` (`RAPIDAPI_CARDMARKET_KEY non configurata`).
- I prezzi vengono **cachati per 7 giorni** nel database per ridurre il numero di richieste API.

## Endpoint disponibili

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET`  | `/api/cardmarket-scraper/prezzi-cached/{prodotto_id}` | Legge prezzi dalla cache |
| `POST` | `/api/cardmarket-scraper/scrape-prezzi/{prodotto_id}?force=true` | Scrape prezzi (usa cache se <7gg, `force=true` forza aggiornamento) |
| `POST` | `/api/cardmarket-scraper/update-all-prices?limit=50` | Aggiorna tutti i prodotti con prezzi vecchi (solo admin) |

## Test

```bash
# Ottieni prezzi dalla cache
curl "https://tuo-dominio.com/api/cardmarket-scraper/prezzi-cached/1" \
  -H "Authorization: Bearer <token>"

# Forza aggiornamento prezzi
curl -X POST "https://tuo-dominio.com/api/cardmarket-scraper/scrape-prezzi/1?force=true" \
  -H "Authorization: Bearer <token>"
```

## Costi RapidAPI

I costi e i limiti dipendono dal piano disponibile su RapidAPI per `cardmarket-api-tcg`.

Con la cache da 7 giorni e un utilizzo normale (decine di prodotti), il consumo API resta contenuto.
