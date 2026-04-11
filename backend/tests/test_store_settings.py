"""
Test per StoreSettings: endpoint pubblico e admin.
Copre la feature introdotta in PR #359-#361.
"""
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def utente_non_admin(db):
    from app.crud.utente import create_utente
    from app.schemas.utente import UtenteCreate
    return create_utente(
        db,
        UtenteCreate(
            username="user_test",
            email="user_test@example.com",
            password="UserPassword123",
        ),
        is_admin=False,
    )


@pytest.fixture
def auth_headers_non_admin(client, utente_non_admin):
    response = client.post(
        "/api/auth/login",
        data={"username": utente_non_admin.username, "password": "UserPassword123"},
    )
    assert response.status_code == 200, f"Login non-admin fallito: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _crea_prodotto(client, auth_headers, nome="Prodotto Store", sku="STORE-001", quantita=20):
    resp = client.post(
        "/api/prodotti/",
        json={
            "nome": nome,
            "sku": sku,
            "quantita": quantita,
            "quantita_minima": 1,
            "prezzo_acquisto": 5.00,
            "prezzo_vendita": 15.00,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Creazione prodotto fallita: {resp.text}"
    return resp.json()


# ---------------------------------------------------------------------------
# Test endpoint pubblico GET /api/store/store-settings
# ---------------------------------------------------------------------------

def test_store_settings_pubblico_restituisce_200(client):
    """L'endpoint pubblico non richiede autenticazione e restituisce 200."""
    resp = client.get("/api/store/store-settings")
    assert resp.status_code == 200


def test_store_settings_pubblico_crea_singleton(client):
    """Se non esiste alcun record, il sistema crea il singleton con valori di default."""
    resp = client.get("/api/store/store-settings")
    assert resp.status_code == 200
    data = resp.json()
    # Verifica che i campi principali siano presenti
    assert "store_nome" in data
    assert "spedizione_standard_abilitato" in data
    assert "pagamento_negozio_abilitato" in data


def test_store_settings_pubblico_non_espone_updated_at(client):
    """L'endpoint pubblico NON deve esporre updated_at (information disclosure)."""
    resp = client.get("/api/store/store-settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "updated_at" not in data, (
        "updated_at non deve essere esposto nell'endpoint pubblico: "
        "rivela il timing delle modifiche admin."
    )


def test_store_settings_pubblico_schema_completo(client):
    """Verifica che tutti i campi attesi siano presenti nella response pubblica."""
    resp = client.get("/api/store/store-settings")
    assert resp.status_code == 200
    data = resp.json()
    campi_attesi = [
        "store_nome",
        "spedizione_ritiro_abilitato",
        "spedizione_ritiro_costo",
        "spedizione_ritiro_giorni",
        "spedizione_standard_abilitato",
        "spedizione_standard_costo",
        "spedizione_standard_giorni",
        "spedizione_express_abilitato",
        "spedizione_express_costo",
        "spedizione_express_giorni",
        "pagamento_carta_abilitato",
        "pagamento_paypal_abilitato",
        "pagamento_apple_pay_abilitato",
        "pagamento_google_pay_abilitato",
        "pagamento_negozio_abilitato",
    ]
    for campo in campi_attesi:
        assert campo in data, f"Campo mancante nella response pubblica: {campo}"


def test_store_settings_pubblico_idempotente(client):
    """Due chiamate consecutive restituiscono lo stesso risultato (singleton stabile)."""
    resp1 = client.get("/api/store/store-settings")
    resp2 = client.get("/api/store/store-settings")
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json() == resp2.json()


# ---------------------------------------------------------------------------
# Test endpoint admin GET /api/control-panel/store-settings
# ---------------------------------------------------------------------------

def test_store_settings_admin_senza_auth_restituisce_401(client):
    """GET /api/control-panel/store-settings senza token deve restituire 401."""
    resp = client.get("/api/control-panel/store-settings")
    assert resp.status_code == 401


def test_store_settings_admin_utente_non_admin_restituisce_403(client, auth_headers_non_admin):
    """GET /api/control-panel/store-settings con utente non-admin deve restituire 403."""
    resp = client.get("/api/control-panel/store-settings", headers=auth_headers_non_admin)
    assert resp.status_code == 403


def test_store_settings_admin_con_admin_restituisce_200(client, auth_headers):
    """GET /api/control-panel/store-settings con admin deve restituire 200."""
    resp = client.get("/api/control-panel/store-settings", headers=auth_headers)
    assert resp.status_code == 200


def test_store_settings_admin_espone_updated_at(client, auth_headers):
    """L'endpoint admin DEVE esporre updated_at (campo necessario per il pannello di controllo)."""
    resp = client.get("/api/control-panel/store-settings", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "updated_at" in data


# ---------------------------------------------------------------------------
# Test PUT /api/control-panel/store-settings
# ---------------------------------------------------------------------------

def test_store_settings_update_modifica_valori(client, auth_headers):
    """PUT store-settings aggiorna correttamente i valori."""
    resp = client.put(
        "/api/control-panel/store-settings",
        json={
            "store_nome": "Il Mio Negozio Test",
            "spedizione_standard_costo": 6.50,
            "spedizione_express_abilitato": False,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["store_nome"] == "Il Mio Negozio Test"
    assert data["spedizione_standard_costo"] == 6.50
    assert data["spedizione_express_abilitato"] is False


def test_store_settings_update_persiste_al_get_pubblico(client, auth_headers):
    """Dopo un PUT admin, il GET pubblico riflette i nuovi valori."""
    client.put(
        "/api/control-panel/store-settings",
        json={"spedizione_ritiro_costo": 0.0, "spedizione_ritiro_abilitato": True},
        headers=auth_headers,
    )
    resp = client.get("/api/store/store-settings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["spedizione_ritiro_abilitato"] is True
    assert data["spedizione_ritiro_costo"] == 0.0


def test_store_settings_update_idempotente(client, auth_headers):
    """Doppio PUT con gli stessi valori produce lo stesso risultato (idempotenza)."""
    payload = {"spedizione_standard_costo": 4.90}
    resp1 = client.put("/api/control-panel/store-settings", json=payload, headers=auth_headers)
    resp2 = client.put("/api/control-panel/store-settings", json=payload, headers=auth_headers)
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json()["spedizione_standard_costo"] == resp2.json()["spedizione_standard_costo"]


def test_store_settings_update_senza_auth_restituisce_401(client):
    """PUT /api/control-panel/store-settings senza token deve restituire 401."""
    resp = client.put(
        "/api/control-panel/store-settings",
        json={"store_nome": "Tentativo non autorizzato"},
    )
    assert resp.status_code == 401


def test_store_settings_update_non_admin_restituisce_403(client, auth_headers_non_admin):
    """PUT /api/control-panel/store-settings con utente non-admin deve restituire 403."""
    resp = client.put(
        "/api/control-panel/store-settings",
        json={"store_nome": "Tentativo non autorizzato"},
        headers=auth_headers_non_admin,
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test integrazione: store-settings influenza checkout
# ---------------------------------------------------------------------------

def test_store_checkout_funziona_con_settings_default(client, auth_headers):
    """Il checkout pubblico funziona correttamente con le impostazioni di default."""
    prodotto = _crea_prodotto(client, auth_headers)
    prodotto_id = prodotto["id"]

    resp = client.post(
        "/api/store/checkout",
        json={
            "nome": "Mario Rossi",
            "email": "mario@esempio.it",
            "righe": [
                {
                    "prodotto_id": prodotto_id,
                    "quantita": 1,
                    "prezzo_unitario": 15.00,
                }
            ],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "ordine" in data
    assert "messaggio" in data
    assert data["ordine"]["stato"] == "confermato"


def test_store_checkout_note_contengono_metodo_spedizione(client, auth_headers):
    """Le note dell'ordine possono contenere il metodo di spedizione (inviato dal frontend)."""
    prodotto = _crea_prodotto(client, auth_headers, sku="STORE-002")
    prodotto_id = prodotto["id"]

    resp = client.post(
        "/api/store/checkout",
        json={
            "nome": "Giulia Bianchi",
            "email": "giulia@esempio.it",
            "note": "Spedizione: Spedizione express (€9.90) | Metodo pagamento: carta",
            "righe": [
                {
                    "prodotto_id": prodotto_id,
                    "quantita": 2,
                    "prezzo_unitario": 15.00,
                }
            ],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "express" in (data["ordine"].get("note") or "").lower()


def test_store_checkout_carrello_vuoto_restituisce_400(client):
    """Checkout con righe vuote deve restituire 400."""
    resp = client.post(
        "/api/store/checkout",
        json={
            "nome": "Test",
            "email": "test@esempio.it",
            "righe": [],
        },
    )
    assert resp.status_code == 400
    assert "vuoto" in resp.json()["detail"].lower()


def test_store_checkout_prodotto_inesistente_restituisce_404(client):
    """Checkout con prodotto_id inesistente deve restituire 404."""
    resp = client.post(
        "/api/store/checkout",
        json={
            "nome": "Test",
            "email": "test@esempio.it",
            "righe": [
                {
                    "prodotto_id": 99999,
                    "quantita": 1,
                    "prezzo_unitario": 10.00,
                }
            ],
        },
    )
    assert resp.status_code == 404


def test_store_checkout_quantita_insufficiente_restituisce_400(client, auth_headers):
    """Checkout con quantità superiore allo stock deve restituire 400."""
    prodotto = _crea_prodotto(client, auth_headers, sku="STORE-003", quantita=1)
    prodotto_id = prodotto["id"]

    resp = client.post(
        "/api/store/checkout",
        json={
            "nome": "Test",
            "email": "test@esempio.it",
            "righe": [
                {
                    "prodotto_id": prodotto_id,
                    "quantita": 99,
                    "prezzo_unitario": 15.00,
                }
            ],
        },
    )
    assert resp.status_code == 400
    assert "insufficiente" in resp.json()["detail"].lower()
