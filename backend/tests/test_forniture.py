"""
Test per la logica delle forniture (ordini di acquisto).
"""
import pytest


def _crea_prodotto(client, auth_headers, nome="Prodotto Fornitura", sku="FOR-TEST-001", quantita=0):
    """Helper per creare un prodotto di test."""
    response = client.post(
        "/api/prodotti/",
        json={
            "nome": nome,
            "sku": sku,
            "quantita": quantita,
            "quantita_minima": 0,
            "prezzo_acquisto": 5.00,
            "prezzo_vendita": 10.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, f"Creazione prodotto fallita: {response.text}"
    return response.json()


def _crea_fornitura(client, auth_headers, prodotto_id, quantita=5, prezzo=8.00):
    """Helper per creare una fornitura di test."""
    response = client.post(
        "/api/forniture/",
        json={
            "fornitore_nome": "Fornitore Test",
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


def test_create_fornitura(client, auth_headers):
    """Verifica che la fornitura venga creata correttamente con status 201."""
    prodotto = _crea_prodotto(client, auth_headers)
    prodotto_id = prodotto["id"]

    resp = _crea_fornitura(client, auth_headers, prodotto_id, quantita=10, prezzo=5.0)
    assert resp.status_code == 201, f"Creazione fornitura fallita: {resp.text}"

    data = resp.json()
    assert data["stato"] == "bozza"
    assert data["numero_fornitura"].startswith("FOR-")
    assert data["totale"] == 50.0
    assert len(data["righe"]) == 1
    assert data["righe"][0]["quantita"] == 10
    assert data["fornitore_nome"] == "Fornitore Test"


def test_create_fornitura_senza_righe(client, auth_headers):
    """Verifica che creare una fornitura senza righe restituisca HTTP 400."""
    resp = client.post(
        "/api/forniture/",
        json={"fornitore_nome": "Fornitore Test", "righe": []},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "almeno una riga" in resp.json()["detail"].lower()


def test_get_forniture(client, auth_headers):
    """Verifica che la lista forniture restituisca status 200 e l'header X-Total-Count."""
    prodotto = _crea_prodotto(client, auth_headers, sku="FOR-TEST-002")
    _crea_fornitura(client, auth_headers, prodotto["id"])

    resp = client.get("/api/forniture/", headers=auth_headers)
    assert resp.status_code == 200
    assert "x-total-count" in resp.headers
    assert int(resp.headers["x-total-count"]) >= 1
    assert len(resp.json()) >= 1


def test_update_fornitura_stato_ricevuto_carica_quantita(client, auth_headers):
    """Verifica che passando lo stato a 'ricevuto' la quantità del prodotto aumenti."""
    prodotto = _crea_prodotto(client, auth_headers, sku="FOR-TEST-003", quantita=0)
    prodotto_id = prodotto["id"]

    resp = _crea_fornitura(client, auth_headers, prodotto_id, quantita=7)
    assert resp.status_code == 201
    fornitura_id = resp.json()["id"]

    # Porta a ricevuto
    resp_update = client.put(
        f"/api/forniture/{fornitura_id}",
        json={"stato": "ricevuto"},
        headers=auth_headers,
    )
    assert resp_update.status_code == 200

    # Verifica che la quantità sia aumentata
    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.status_code == 200
    assert resp_prodotto.json()["quantita"] == 7  # 0 + 7


def test_delete_fornitura_ricevuta_errore(client, auth_headers):
    """Verifica che eliminare una fornitura ricevuta restituisca HTTP 400."""
    prodotto = _crea_prodotto(client, auth_headers, sku="FOR-TEST-004", quantita=0)
    prodotto_id = prodotto["id"]

    resp = _crea_fornitura(client, auth_headers, prodotto_id, quantita=3)
    assert resp.status_code == 201
    fornitura_id = resp.json()["id"]

    # Porta a ricevuto
    client.put(
        f"/api/forniture/{fornitura_id}",
        json={"stato": "ricevuto"},
        headers=auth_headers,
    )

    # Tenta di eliminare
    resp_delete = client.delete(f"/api/forniture/{fornitura_id}", headers=auth_headers)
    assert resp_delete.status_code == 400
    assert "ricevuta" in resp_delete.json()["detail"].lower()


def test_delete_fornitura_bozza(client, auth_headers):
    """Verifica che una fornitura in stato 'bozza' possa essere eliminata con 204."""
    prodotto = _crea_prodotto(client, auth_headers, sku="FOR-TEST-005")
    prodotto_id = prodotto["id"]

    resp = _crea_fornitura(client, auth_headers, prodotto_id)
    assert resp.status_code == 201
    fornitura_id = resp.json()["id"]
    assert resp.json()["stato"] == "bozza"

    resp_delete = client.delete(f"/api/forniture/{fornitura_id}", headers=auth_headers)
    assert resp_delete.status_code == 204

    # Verifica che la fornitura non esista più
    resp_get = client.get(f"/api/forniture/{fornitura_id}", headers=auth_headers)
    assert resp_get.status_code == 404


def test_create_fornitura_packaging_row(client, auth_headers):
    """Verifica che una riga packaging venga creata senza prodotto_id."""
    resp = client.post(
        "/api/forniture/",
        json={
            "fornitore_nome": "Fornitore Packaging",
            "righe": [
                {
                    "tipo_voce": "packaging",
                    "descrizione": "Nastro adesivo",
                    "quantita": 10,
                    "prezzo_unitario": 2.50,
                }
            ],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Creazione fornitura packaging fallita: {resp.text}"
    data = resp.json()
    assert data["totale"] == 25.0
    assert len(data["righe"]) == 1
    riga = data["righe"][0]
    assert riga["tipo_voce"] == "packaging"
    assert riga["prodotto_id"] is None
    assert riga["descrizione"] == "Nastro adesivo"


def test_packaging_row_non_carica_magazzino(client, auth_headers):
    """Verifica che le righe packaging non aumentino la quantità in magazzino."""
    prodotto = _crea_prodotto(client, auth_headers, sku="FOR-TEST-PKG-001", quantita=0)
    prodotto_id = prodotto["id"]

    # Crea fornitura con riga prodotto e riga packaging
    resp = client.post(
        "/api/forniture/",
        json={
            "fornitore_nome": "Test Packaging",
            "righe": [
                {
                    "tipo_voce": "prodotto",
                    "prodotto_id": prodotto_id,
                    "quantita": 5,
                    "prezzo_unitario": 10.0,
                },
                {
                    "tipo_voce": "packaging",
                    "descrizione": "Buste imbottite",
                    "quantita": 20,
                    "prezzo_unitario": 1.50,
                },
            ],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    fornitura_id = resp.json()["id"]

    # Porta a ricevuto
    resp_update = client.put(
        f"/api/forniture/{fornitura_id}",
        json={"stato": "ricevuto"},
        headers=auth_headers,
    )
    assert resp_update.status_code == 200

    # La quantità del prodotto deve aumentare solo per la riga prodotto
    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.status_code == 200
    assert resp_prodotto.json()["quantita"] == 5  # solo riga prodotto caricata


def test_create_fornitura_non_carica_stock(client, auth_headers):
    """Verifica che la sola creazione di una fornitura (bozza) NON modifichi lo stock."""
    prodotto = _crea_prodotto(client, auth_headers, sku="FOR-TEST-NOCREATE", quantita=5)
    prodotto_id = prodotto["id"]

    # Crea fornitura ma NON portarla a ricevuto
    resp = _crea_fornitura(client, auth_headers, prodotto_id, quantita=3)
    assert resp.status_code == 201
    assert resp.json()["stato"] == "bozza"

    # Lo stock NON deve essere cambiato
    resp_prodotto = client.get(f"/api/prodotti/{prodotto_id}", headers=auth_headers)
    assert resp_prodotto.json()["quantita"] == 5  # invariato


def test_analisi_packaging_endpoint(client, auth_headers):
    """Verifica che l'endpoint /analisi/packaging risponda correttamente."""
    resp = client.get("/api/analisi/packaging", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "anno" in data
    assert "totale_annuale" in data
    assert "per_mese" in data
    assert isinstance(data["per_mese"], list)
