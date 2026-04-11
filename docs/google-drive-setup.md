# Configurazione Google Drive per la galleria foto prodotti

Questa guida spiega come configurare Google Drive con un Service Account per abilitare la galleria multi-foto dei prodotti nel magazzino e nello store ecommerce.

---

## 1. Creare un progetto Google Cloud

1. Vai su [Google Cloud Console](https://console.cloud.google.com/).
2. Clicca su **Seleziona un progetto** → **Nuovo progetto**.
3. Dai un nome al progetto (es. `gestione-magazzino`) e clicca **Crea**.

---

## 2. Abilitare Google Drive API

1. Nel menu di navigazione vai su **API e servizi** → **Libreria**.
2. Cerca `Google Drive API` e selezionala.
3. Clicca **Abilita**.

---

## 3. Creare un Service Account e scaricare le credenziali JSON

1. Vai su **API e servizi** → **Credenziali**.
2. Clicca **Crea credenziali** → **Account di servizio**.
3. Inserisci un nome (es. `magazzino-drive`) e clicca **Crea e continua**.
4. Nella sezione **Concedi a questo account di servizio l'accesso al progetto**, seleziona il ruolo **Editor** oppure lascia vuoto (le autorizzazioni Drive si gestiscono a livello di cartella). Clicca **Continua** → **Fine**.
5. Nella lista degli account di servizio, clicca sull'account appena creato.
6. Vai alla scheda **Chiavi** → **Aggiungi chiave** → **Crea nuova chiave**.
7. Seleziona il formato **JSON** e clicca **Crea**. Il file JSON viene scaricato automaticamente.

---

## 4. Copiare il contenuto JSON nella variabile d'ambiente

Il file JSON scaricato ha una struttura simile a questa:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
  "client_email": "magazzino-drive@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

Copia l'intero contenuto JSON (su una singola riga) e incollalo nel file `.env` del backend:

```dotenv
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

> **Attenzione**: assicurati che il JSON sia tutto su una singola riga. I newline all'interno di `private_key` devono rimanere come `\n` letterali (non andare a capo).

---

## 5. (Opzionale) Creare la cartella radice su Drive

Se vuoi organizzare tutte le cartelle dei prodotti dentro una cartella radice:

1. Vai su [Google Drive](https://drive.google.com/).
2. Crea una nuova cartella (es. `Prodotti Magazzino`).
3. Apri la cartella e copia l'ID dall'URL: `https://drive.google.com/drive/folders/**<ID_CARTELLA>**`.
4. Condividi la cartella con l'email del service account (campo `client_email` nel JSON) con il ruolo **Editor**.
5. Aggiungi l'ID al file `.env`:

```dotenv
GOOGLE_DRIVE_ROOT_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWx
```

---

## 6. Configurare il backend

Assicurati che il file `backend/.env` contenga:

```dotenv
GOOGLE_SERVICE_ACCOUNT_JSON=<contenuto JSON su una riga>
# Opzionale:
GOOGLE_DRIVE_ROOT_FOLDER_ID=<ID cartella radice>
```

Riavvia il backend dopo aver modificato il file `.env`.

---

## 7. Testare con l'endpoint di creazione cartella

Una volta configurato, puoi testare creando automaticamente una cartella Drive per un prodotto esistente.

**Richiesta:**
```http
POST /api/prodotti/{id}/drive-folder/crea
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Risposta attesa:**
```json
{
  "folder_id": "1AbCdEfGhIjKlMnOpQrStUvWx",
  "folder_url": "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWx"
}
```

Apri il `folder_url` nel browser per verificare che la cartella sia stata creata su Google Drive.

---

## Flusso d'uso completo

1. **Crea la cartella** per un prodotto tramite `POST /api/prodotti/{id}/drive-folder/crea`.
2. **Carica le foto** nella cartella direttamente dall'interfaccia di Google Drive.
3. **Lo store legge automaticamente** tutte le immagini presenti nella cartella quando un cliente visualizza il prodotto (endpoint `GET /api/store/prodotti/{id}` → campo `immagini`).

Le immagini vengono servite tramite URL pubblici nel formato:
```
https://drive.google.com/uc?export=view&id=<file_id>
```

> **Nota**: il backend usa una cache in-memory con TTL di 5 minuti per evitare chiamate eccessive all'API Drive.
