"""
Test per la logica degli ordini.
"""
import pytest


def _crea_prodotto(client, auth_headers, nome="Prodotto Test", sku="TEST-001", quantita=10):
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
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, f"Creazione prodotto fallita: {response.text}"
    return response.json()


def _crea_ordine(client, auth_headers, prodotto_id, quantita=2, prezzo=10.00):
    """Helper per creare un ordine di test."""
    response = client.post(
        "/api/ordini/",
        json={
            "cliente_nome": "Cliente Test",
            "righe": [
                {
                    "prodotto_id": prodotto_id,
                    "quantita": quantita,
                    "prezzo_unitario": prezzo,
                }
            ],
        },
        headers=auth_headers,
    )
    return response


def test_create_ordine_scarica_quantita(client, auth_headers):
    """Verifica che dopo la creazione di un ordine e il completamento
    le quantità del prodotto si riducano."""
    prodotto = _crea_prodotto(client, auth_headers, quantita=10)
    prodotto_id = prodotto["id"]

    # Crea l'ordine
    resp = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    assert resp.status_code == 201
    ordine_id = resp.json()["id"]

    # Porta l'ordine a completato (scarica il magazzino)
    resp_update = client.put(
        f"/api/ordini/{ordine_id}",
        json={"stato": "completato"},
        headers=auth_headers,
    )
    assert resp_update.status_code == 200

    # Verifica che la quantità sia diminuita
    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.status_code == 200
    assert resp_prodotto.json()["quantita"] == 7  # 10 - 3


def test_create_ordine_quantita_insufficiente(client, auth_headers):
    """Verifica che con quantità insufficiente venga restituito HTTP 400."""
    prodotto = _crea_prodotto(client, auth_headers, sku="TEST-002", quantita=2)
    prodotto_id = prodotto["id"]

    # Richiede più unità di quelle disponibili
    resp = _crea_ordine(client, auth_headers, prodotto_id, quantita=5)
    assert resp.status_code == 400
    assert "insufficiente" in resp.json()["detail"].lower()


def test_update_ordine_stato_completato_genera_fattura(client, auth_headers):
    """Verifica che passare lo stato a 'completato' generi automaticamente una fattura."""
    prodotto = _crea_prodotto(client, auth_headers, sku="TEST-003", quantita=10)
    prodotto_id = prodotto["id"]

    resp = _crea_ordine(client, auth_headers, prodotto_id, quantita=1)
    assert resp.status_code == 201
    ordine_id = resp.json()["id"]

    # Porta a completato
    resp_update = client.put(
        f"/api/ordini/{ordine_id}",
        json={"stato": "completato"},
        headers=auth_headers,
    )
    assert resp_update.status_code == 200

    # Verifica che esista una fattura per questo ordine
    resp_fatture = client.get(
        f"/api/fatture/?ordine_id={ordine_id}",
        headers=auth_headers,
    )
    assert resp_fatture.status_code == 200
    fatture = resp_fatture.json()
    assert len(fatture) >= 1
    assert any(f.get("auto_generata") for f in fatture)


def test_delete_ordine_bozza(client, auth_headers):
    """Verifica che un ordine in stato 'bozza' possa essere eliminato."""
    prodotto = _crea_prodotto(client, auth_headers, sku="TEST-004", quantita=10)
    prodotto_id = prodotto["id"]

    resp = _crea_ordine(client, auth_headers, prodotto_id, quantita=1)
    assert resp.status_code == 201
    ordine_id = resp.json()["id"]
    # Lo stato iniziale è 'bozza'
    assert resp.json()["stato"] == "bozza"

    resp_delete = client.delete(f"/api/ordini/{ordine_id}", headers=auth_headers)
    assert resp_delete.status_code == 204

    # Verifica che l'ordine non esista più
    resp_get = client.get(f"/api/ordini/{ordine_id}", headers=auth_headers)
    assert resp_get.status_code == 404
