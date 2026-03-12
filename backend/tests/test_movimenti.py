"""
Test per la logica dei movimenti di magazzino.
"""
import pytest


def _crea_prodotto(client, auth_headers, nome="Prodotto Test", sku="MOV-001", quantita=10):
    """Helper per creare un prodotto di test."""
    response = client.post(
        "/api/prodotti/",
        json={
            "nome": nome,
            "sku": sku,
            "quantita": quantita,
            "quantita_minima": 2,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


def test_movimento_carico_aumenta_quantita(client, auth_headers):
    """Verifica che un movimento di carico aumenti la quantità del prodotto."""
    prodotto = _crea_prodotto(client, auth_headers, quantita=5)
    prodotto_id = prodotto["id"]

    resp = client.post(
        "/api/movimenti/",
        json={
            "prodotto_id": prodotto_id,
            "tipo": "carico",
            "quantita": 10,
            "note": "Carico test",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201

    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.status_code == 200
    assert resp_prodotto.json()["quantita"] == 15  # 5 + 10


def test_movimento_scarico_diminuisce_quantita(client, auth_headers):
    """Verifica che un movimento di scarico diminuisca la quantità del prodotto."""
    prodotto = _crea_prodotto(client, auth_headers, sku="MOV-002", quantita=10)
    prodotto_id = prodotto["id"]

    resp = client.post(
        "/api/movimenti/",
        json={
            "prodotto_id": prodotto_id,
            "tipo": "scarico",
            "quantita": 4,
            "note": "Scarico test",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201

    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.status_code == 200
    assert resp_prodotto.json()["quantita"] == 6  # 10 - 4


def test_movimento_scarico_quantita_insufficiente(client, auth_headers):
    """Verifica HTTP 400 quando la quantità da scaricare supera quella disponibile."""
    prodotto = _crea_prodotto(client, auth_headers, sku="MOV-003", quantita=3)
    prodotto_id = prodotto["id"]

    resp = client.post(
        "/api/movimenti/",
        json={
            "prodotto_id": prodotto_id,
            "tipo": "scarico",
            "quantita": 10,
            "note": "Scarico eccessivo",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "insufficiente" in resp.json()["detail"].lower()
