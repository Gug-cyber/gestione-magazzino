"""
Test per la logica dei prodotti.
"""
import pytest


def _crea_prodotto(client, auth_headers, nome="Prodotto Test", sku="PROD-001", quantita=10):
    """Helper per creare un prodotto di test."""
    response = client.post(
        "/api/prodotti/",
        json={
            "nome": nome,
            "sku": sku,
            "quantita": quantita,
            "quantita_minima": 2,
            "prezzo_acquisto": 5.00,
            "prezzo_vendita": 10.00,
            "stato_conservazione": "Near Mint",
        },
        headers=auth_headers,
    )
    return response


def test_create_prodotto(client, auth_headers):
    """Verifica la creazione di un prodotto con tutti i campi."""
    resp = _crea_prodotto(client, auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["nome"] == "Prodotto Test"
    assert data["sku"] == "PROD-001"
    assert data["quantita"] == 10
    assert data["quantita_minima"] == 2
    assert float(data["prezzo_acquisto"]) == 5.00
    assert float(data["prezzo_vendita"]) == 10.00
    assert data["stato_conservazione"] == "Near Mint"
    assert data["id"] is not None


def test_create_prodotto_sku_duplicato(client, auth_headers):
    """Verifica HTTP 400 con SKU duplicato."""
    resp1 = _crea_prodotto(client, auth_headers, sku="DUPL-001")
    assert resp1.status_code == 201

    resp2 = _crea_prodotto(client, auth_headers, nome="Altro Prodotto", sku="DUPL-001")
    assert resp2.status_code == 400
    assert "sku" in resp2.json()["detail"].lower()


def test_get_prodotti_search(client, auth_headers):
    """Verifica la ricerca server-side per nome e SKU."""
    # Crea due prodotti con nomi diversi
    r1 = _crea_prodotto(client, auth_headers, nome="Charizard Holo", sku="CHZRD-001")
    assert r1.status_code == 201
    r2 = _crea_prodotto(client, auth_headers, nome="Pikachu Base", sku="PIKA-001")
    assert r2.status_code == 201

    # Cerca per nome
    resp = client.get("/api/prodotti/?search=Charizard", headers=auth_headers)
    assert resp.status_code == 200
    risultati = resp.json()
    assert len(risultati) == 1
    assert risultati[0]["nome"] == "Charizard Holo"

    # Cerca per SKU
    resp_sku = client.get("/api/prodotti/?search=PIKA-001", headers=auth_headers)
    assert resp_sku.status_code == 200
    assert len(resp_sku.json()) == 1
    assert resp_sku.json()[0]["sku"] == "PIKA-001"


def test_get_prodotti_sotto_scorta(client, auth_headers):
    """Verifica il filtro sotto-scorta."""
    # Prodotto con quantita < quantita_minima
    r1 = client.post(
        "/api/prodotti/",
        json={
            "nome": "Prodotto Sotto Scorta",
            "sku": "SOTTO-001",
            "quantita": 1,
            "quantita_minima": 5,
        },
        headers=auth_headers,
    )
    assert r1.status_code == 201

    # Prodotto con quantita >= quantita_minima
    r2 = client.post(
        "/api/prodotti/",
        json={
            "nome": "Prodotto OK",
            "sku": "OK-001",
            "quantita": 10,
            "quantita_minima": 5,
        },
        headers=auth_headers,
    )
    assert r2.status_code == 201

    resp = client.get("/api/prodotti/sotto-scorta", headers=auth_headers)
    assert resp.status_code == 200
    nomi = [p["nome"] for p in resp.json()]
    assert "Prodotto Sotto Scorta" in nomi
    assert "Prodotto OK" not in nomi
