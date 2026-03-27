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
    """Verifica che la creazione di un ordine con quantità superiore allo stock restituisca HTTP 400."""
    prodotto = _crea_prodotto(client, auth_headers, sku="TEST-002", quantita=2)
    prodotto_id = prodotto["id"]

    # La creazione deve fallire immediatamente se la quantità supera lo stock
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


def test_bozza_a_confermato_scala_stock(client, auth_headers):
    """Verifica che passare lo stato da 'bozza' a 'confermato' decrementi le quantità in magazzino."""
    prodotto = _crea_prodotto(client, auth_headers, sku="TEST-005", quantita=10)
    prodotto_id = prodotto["id"]

    resp = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    assert resp.status_code == 201
    ordine = resp.json()
    ordine_id = ordine["id"]
    assert ordine["stato"] == "bozza"

    # La quantità non deve essere cambiata dopo la sola creazione
    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.json()["quantita"] == 10

    # Passa a confermato
    resp_update = client.put(
        f"/api/ordini/{ordine_id}",
        json={"stato": "confermato"},
        headers=auth_headers,
    )
    assert resp_update.status_code == 200
    ordine_aggiornato = resp_update.json()
    assert ordine_aggiornato["stato"] == "confermato"

    # La quantità deve essere diminuita di 3
    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.json()["quantita"] == 7  # 10 - 3


def test_bozza_a_confermato_crea_movimenti_scarico(client, auth_headers):
    """Verifica che la transizione bozza→confermato registri movimenti di scarico."""
    prodotto = _crea_prodotto(client, auth_headers, sku="TEST-006", quantita=10)
    prodotto_id = prodotto["id"]

    resp = _crea_ordine(client, auth_headers, prodotto_id, quantita=4)
    assert resp.status_code == 201
    ordine_id = resp.json()["id"]

    resp_update = client.put(
        f"/api/ordini/{ordine_id}",
        json={"stato": "confermato"},
        headers=auth_headers,
    )
    assert resp_update.status_code == 200

    # Verifica che esista un movimento di scarico per il prodotto
    resp_movimenti = client.get(
        f"/api/movimenti/prodotto/{prodotto_id}",
        headers=auth_headers,
    )
    assert resp_movimenti.status_code == 200
    movimenti = resp_movimenti.json()
    scarichi = [m for m in movimenti if m["tipo"] == "scarico" and m.get("ordine_id") == ordine_id]
    assert len(scarichi) >= 1
    assert scarichi[0]["quantita"] == 4


def test_confermato_stock_insufficiente(client, auth_headers):
    """Verifica che la conferma di un ordine con stock insufficiente restituisca HTTP 400.

    Nota: la creazione di un ordine controlla già la disponibilità, quindi per testare
    lo stock insufficiente al momento della conferma creiamo due ordini e confermiamo il secondo.
    """
    prodotto = _crea_prodotto(client, auth_headers, sku="TEST-007", quantita=5)
    prodotto_id = prodotto["id"]

    # Crea primo ordine per 3 unità
    resp1 = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    assert resp1.status_code == 201
    ordine1_id = resp1.json()["id"]

    # Crea secondo ordine per 3 unità (disponibili 5, quindi 5 >= 3 → OK alla creazione)
    resp2 = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    assert resp2.status_code == 201
    ordine2_id = resp2.json()["id"]

    # Conferma il primo ordine: scala 3 unità → rimangono 2
    resp_conf1 = client.put(
        f"/api/ordini/{ordine1_id}",
        json={"stato": "confermato"},
        headers=auth_headers,
    )
    assert resp_conf1.status_code == 200

    # Conferma il secondo ordine: richiede 3, disponibili 2 → deve fallire
    resp_conf2 = client.put(
        f"/api/ordini/{ordine2_id}",
        json={"stato": "confermato"},
        headers=auth_headers,
    )
    assert resp_conf2.status_code == 400
    assert "insufficiente" in resp_conf2.json()["detail"].lower()


def test_annullato_ripristina_stock(client, auth_headers):
    """Verifica che annullare un ordine confermato ripristini le quantità in magazzino."""
    prodotto = _crea_prodotto(client, auth_headers, sku="TEST-008", quantita=10)
    prodotto_id = prodotto["id"]

    resp = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    assert resp.status_code == 201
    ordine_id = resp.json()["id"]

    # Conferma l'ordine → stock decrementato a 7
    client.put(
        f"/api/ordini/{ordine_id}",
        json={"stato": "confermato"},
        headers=auth_headers,
    )

    # Annulla l'ordine → stock deve tornare a 10
    resp_annulla = client.put(
        f"/api/ordini/{ordine_id}",
        json={"stato": "annullato"},
        headers=auth_headers,
    )
    assert resp_annulla.status_code == 200

    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.json()["quantita"] == 10  # ripristinato


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
