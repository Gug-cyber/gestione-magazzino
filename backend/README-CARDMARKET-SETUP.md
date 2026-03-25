# 🎴 Setup CardMarket ScraperAPI

## Registrazione gratuita (1000 richieste/mese)

1. Vai su: https://www.scraperapi.com/signup
2. Registrati con email (no carta di credito richiesta)
3. Copia la tua API key dalla dashboard

## Configurazione

### Vercel (Production)
1. Settings → Environment Variables
2. Aggiungi: `SCRAPER_API_KEY=<tua-chiave>`
3. Redeploy

### Locale (.env)
```bash
SCRAPER_API_KEY=abc123def456...
```

## Come funziona

- Se `SCRAPER_API_KEY` è configurata, il backend usa **ScraperAPI** per bypassare il blocco 403 di CardMarket (rotazione IP, bypass Cloudflare, retry automatici).
- Se la chiave **non** è configurata, il backend tenta richieste dirette con header realistici — CardMarket potrebbe bloccarle con un 403.
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

## Costi ScraperAPI

| Piano | Richieste/mese | Prezzo |
|-------|---------------|--------|
| Free  | 1.000         | Gratis |
| Hobby | 25.000        | $29/mese |
| Startup | 100.000     | $49/mese |

Con la cache da 7 giorni e un utilizzo normale (decine di prodotti), il piano gratuito è sufficiente.
