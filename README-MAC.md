# 🍎 Installazione su Mac (senza Docker)

## Prima installazione

1. **Scarica il progetto** da GitHub (bottone verde "Code" → "Download ZIP") o con:
   ```bash
   git clone https://github.com/Gug-cyber/gestione-magazzino.git
   ```

2. **Apri la cartella** `gestione-magazzino` nel Finder

3. **Doppio click su `setup.command`**
   > Se Mac dice "impossibile aprire", vai in **Preferenze di Sistema → Privacy e Sicurezza** e clicca "Apri comunque"

4. Lo script installerà automaticamente tutto il necessario e aprirà l'app nel browser

## Avvio successivo

Doppio click su **`start.command`** per avviare l'app velocemente senza reinstallare.

## Fermare l'app

Doppio click su **`stop.command`**

## URL dell'applicazione

| Servizio | URL |
|---------|-----|
| 🌐 App | http://localhost:3000 |
| 🔧 API | http://localhost:8000 |
| 📚 Swagger | http://localhost:8000/docs |

## Primo accesso

Vai su http://localhost:8000/docs, usa l'endpoint `POST /api/auth/register` per creare il primo utente admin.

## Cosa viene installato automaticamente

Lo script `setup.command` installa e configura automaticamente:

| Componente | Versione | Metodo |
|-----------|---------|--------|
| Homebrew | ultima | script ufficiale |
| Python | 3.11+ | `brew install python@3.11` |
| Node.js | 18+ | `brew install node` |
| PostgreSQL | 16 | `brew install postgresql@16` |

## Risoluzione problemi

### Il terminale dice "cannot be opened because the developer cannot be verified"

Vai in **Preferenze di Sistema → Privacy e Sicurezza** → scorri fino a trovare il messaggio relativo al file `.command` → clicca **"Apri comunque"**.

In alternativa, apri il Terminale ed esegui:
```bash
chmod +x setup.command && xattr -d com.apple.quarantine setup.command
```

### PostgreSQL non si avvia

```bash
brew services restart postgresql@16
```

### Il browser non si apre automaticamente

Apri manualmente http://localhost:3000

### Come vedere i log

```bash
tail -f backend.log
tail -f frontend.log
```
