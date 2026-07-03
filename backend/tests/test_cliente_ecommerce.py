"""
Test per il modulo e-commerce clienti.

Copre: registrazione, login, profilo, preferiti, ordini con spedizione,
validazione indirizzo, dettaglio ordine e invio email automatiche.
"""
import os
import pytest
from unittest.mock import patch, MagicMock


# ============================
# Fixtures aggiuntive cliente
# ============================

@pytest.fixture
def cliente_registrato(client):
    """Registra un cliente di test e restituisce i dati."""
    payload = {
        "email": "test_cliente@example.com",
        "password": "TestPassword123",
        "nome": "Mario",
        "cognome": "Rossi",
        "telefono": "3201234567",
        "indirizzo": "Via Roma",
        "numero_civico": "42",
        "citta": "Milano",
        "cap": "20100",
        "provincia": "MI",
        "paese": "Italia",
    }
    resp = client.post("/api/clienti/registrazione", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture
def cliente_headers(cliente_registrato):
    """Header di autenticazione per il cliente di test."""
    token = cliente_registrato["access_token"]
    return {"Authorization": "Bearer " + token}


# ============================
# Test autenticazione
# ============================

def test_registrazione_cliente(client):
    """Registrazione con tutti i campi incluso numero_civico e paese."""
    payload = {
        "email": "nuovo@example.com",
        "password": "SecurePass123",
        "nome": "Giulia",
        "cognome": "Bianchi",
        "numero_civico": "10",
        "indirizzo": "Via Milano",
        "citta": "Roma",
        "cap": "00100",
        "provincia": "RM",
        "paese": "Italia",
        "indirizzo_nome_destinatario": "Giovanni",
        "indirizzo_cognome_destinatario": "Bianchi",
    }
    resp = client.post("/api/clienti/registrazione", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["cliente"]["email"] == "nuovo@example.com"
    assert data["cliente"]["numero_civico"] == "10"
    assert data["cliente"]["paese"] == "Italia"
    assert data["cliente"]["indirizzo_nome_destinatario"] == "Giovanni"


def test_registrazione_email_duplicata(client, cliente_registrato):
    """Registrazione con email già esistente deve restituire 400."""
    payload = {
        "email": "test_cliente@example.com",
        "password": "AnotherPass123",
        "nome": "Altro",
        "cognome": "Utente",
    }
    resp = client.post("/api/clienti/registrazione", json=payload)
    assert resp.status_code == 400


def test_login_cliente(client, cliente_registrato):
    """Login cliente con credenziali corrette."""
    resp = client.post("/api/clienti/login", json={
        "email": "test_cliente@example.com",
        "password": "TestPassword123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["cliente"]["email"] == "test_cliente@example.com"


def test_login_password_errata(client, cliente_registrato):
    """Login con password errata deve restituire 401."""
    resp = client.post("/api/clienti/login", json={
        "email": "test_cliente@example.com",
        "password": "WrongPassword",
    })
    assert resp.status_code == 401


# ============================
# Test profilo
# ============================

def test_get_profilo(client, cliente_headers):
    """GET /me restituisce il profilo del cliente."""
    resp = client.get("/api/clienti/me", headers=cliente_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test_cliente@example.com"
    assert data["nome"] == "Mario"


def test_aggiornamento_profilo(client, cliente_headers):
    """PUT /me aggiorna indirizzo strutturato."""
    resp = client.put("/api/clienti/me", headers=cliente_headers, json={
        "indirizzo": "Via Torino",
        "numero_civico": "7",
        "citta": "Torino",
        "cap": "10100",
        "provincia": "TO",
        "paese": "Italia",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["indirizzo"] == "Via Torino"
    assert data["numero_civico"] == "7"
    assert data["citta"] == "Torino"


# ============================
# Test preferiti
# ============================

def test_aggiungi_rimuovi_preferito(client, cliente_headers):
    """Aggiunta e rimozione di un prodotto dai preferiti."""
    # Aggiungi
    resp = client.post("/api/clienti/preferiti", headers=cliente_headers, json={
        "prodotto_id": 99,
        "nome_prodotto": "Prodotto Test",
        "prezzo": 9.99,
    })
    assert resp.status_code == 200
    assert resp.json()["prodotto_id"] == 99

    # Lista
    resp = client.get("/api/clienti/preferiti", headers=cliente_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Rimozione
    resp = client.delete("/api/clienti/preferiti/99", headers=cliente_headers)
    assert resp.status_code == 200

    # Lista vuota
    resp = client.get("/api/clienti/preferiti", headers=cliente_headers)
    assert resp.json() == []


# ============================
# Test ordini
# ============================

def _payload_ordine_base(spese_spedizione=0.0):
    return {
        "items": [
            {
                "prodotto_id": 1,
                "nome_prodotto": "Prodotto A",
                "quantita": 2,
                "prezzo_unitario": 15.0,
            },
            {
                "prodotto_id": 2,
                "nome_prodotto": "Prodotto B",
                "quantita": 1,
                "prezzo_unitario": 10.0,
            },
        ],
        "shipping_nome": "Mario",
        "shipping_cognome": "Rossi",
        "shipping_indirizzo": "Via Roma",
        "shipping_numero_civico": "42",
        "shipping_citta": "Milano",
        "shipping_cap": "20100",
        "shipping_provincia": "MI",
        "shipping_paese": "Italia",
        "spese_spedizione": spese_spedizione,
        "metodo_pagamento": "carta",
    }


def test_crea_ordine_con_spedizione(client, cliente_headers):
    """POST /ordini con spese_spedizione > 0: totale = subtotale + spese."""
    payload = _payload_ordine_base(spese_spedizione=4.9)

    with patch("app.routers.clienti_auth.send_email_conferma_ordine"):
        resp = client.post("/api/clienti/ordini", headers=cliente_headers, json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["subtotale"] == pytest.approx(40.0)  # 2*15 + 1*10
    assert data["spese_spedizione"] == pytest.approx(4.9)
    assert data["totale"] == pytest.approx(44.9)
    assert data["metodo_pagamento"] == "carta"
    assert "Mario" in data["indirizzo_spedizione"]
    # Subtotali per riga
    for item in data["items"]:
        assert item["subtotale"] is not None
        assert item["subtotale"] == pytest.approx(item["quantita"] * item["prezzo_unitario"])


def test_crea_ordine_senza_spese_spedizione(client, cliente_headers):
    """POST /ordini senza spese_spedizione: totale = subtotale."""
    payload = _payload_ordine_base(spese_spedizione=0.0)

    with patch("app.routers.clienti_auth.send_email_conferma_ordine"):
        resp = client.post("/api/clienti/ordini", headers=cliente_headers, json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["totale"] == pytest.approx(40.0)
    assert data["spese_spedizione"] == pytest.approx(0.0)


def test_crea_ordine_senza_indirizzo(client, db):
    """POST /ordini deve restituire 422 se né payload né profilo hanno indirizzo."""
    # Registra un cliente senza indirizzo
    reg_resp = client.post("/api/clienti/registrazione", json={
        "email": "noaddr@example.com",
        "password": "TestPass123",
        "nome": "No",
        "cognome": "Address",
    })
    assert reg_resp.status_code == 200
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": "Bearer " + token}

    resp = client.post("/api/clienti/ordini", headers=headers, json={
        "items": [{"prodotto_id": 1, "nome_prodotto": "X", "quantita": 1, "prezzo_unitario": 5.0}],
    })
    assert resp.status_code == 422
    assert "indirizzo" in resp.json()["detail"].lower()


def test_dettaglio_ordine_con_dati_cliente(client, cliente_headers):
    """GET /ordini/{id} espone nome/email cliente."""
    with patch("app.routers.clienti_auth.send_email_conferma_ordine"):
        create_resp = client.post("/api/clienti/ordini", headers=cliente_headers, json=_payload_ordine_base())
    assert create_resp.status_code == 200
    ordine_id = create_resp.json()["id"]

    resp = client.get(f"/api/clienti/ordini/{ordine_id}", headers=cliente_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["cliente_nome"] == "Mario"
    assert data["cliente_cognome"] == "Rossi"
    assert data["cliente_email"] == "test_cliente@example.com"


# ============================
# Test email automatiche
# ============================

def test_invio_email_conferma_ordine(client, cliente_headers):
    """Mock send_email_conferma_ordine: verifica chiamata dopo POST /ordini."""
    with patch("app.routers.clienti_auth.send_email_conferma_ordine") as mock_email:
        resp = client.post("/api/clienti/ordini", headers=cliente_headers, json=_payload_ordine_base())
        assert resp.status_code == 200
    # BackgroundTasks esegue le task in modo sincrono nel TestClient
    mock_email.assert_called_once()


def test_invio_email_conferma_spedizione(client, cliente_headers):
    """Mock send_email_conferma_spedizione: verifica chiamata quando stato -> 'spedito'."""
    with patch("app.routers.clienti_auth.send_email_conferma_ordine"):
        create_resp = client.post("/api/clienti/ordini", headers=cliente_headers, json=_payload_ordine_base())
    assert create_resp.status_code == 200
    ordine_id = create_resp.json()["id"]

    with patch("app.routers.clienti_auth.send_email_conferma_spedizione") as mock_spedizione:
        resp = client.patch(
            f"/api/clienti/ordini/{ordine_id}/stato",
            headers=cliente_headers,
            json={
                "stato": "spedito",
                "corriere": "BRT",
                "tracking_number": "ABC123456",
            },
        )
        assert resp.status_code == 200
    mock_spedizione.assert_called_once()
    data = resp.json()
    assert data["stato"] == "spedito"
    assert data["corriere"] == "BRT"
    assert data["tracking_number"] == "ABC123456"


def test_aggiorna_stato_non_invia_email_se_gia_spedito(client, cliente_headers):
    """Non invia email spedizione se l'ordine era già nello stato 'spedito'."""
    with patch("app.routers.clienti_auth.send_email_conferma_ordine"):
        create_resp = client.post("/api/clienti/ordini", headers=cliente_headers, json=_payload_ordine_base())
    ordine_id = create_resp.json()["id"]

    # Prima messa in stato spedito
    with patch("app.routers.clienti_auth.send_email_conferma_spedizione"):
        client.patch(f"/api/clienti/ordini/{ordine_id}/stato", headers=cliente_headers, json={"stato": "spedito"})

    # Secondo aggiornamento a "spedito" non deve inviare altra email
    with patch("app.routers.clienti_auth.send_email_conferma_spedizione") as mock_email2:
        resp = client.patch(
            f"/api/clienti/ordini/{ordine_id}/stato",
            headers=cliente_headers,
            json={"stato": "spedito"},
        )
        assert resp.status_code == 200
    mock_email2.assert_not_called()
