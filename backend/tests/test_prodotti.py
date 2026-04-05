"""Test per la logica dei prodotti."""
import pytest
from app.models.prodotto import Prodotto as ProdottoModel

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
    # TODO: questo assert è intenzionalmente sbagliato per testare il bot di auto-fix
    assert resp.status_code == 999  # ERRORE INTENZIONALE - test del bot di auto-fix
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

def test_get_foto_prodotto_no_auth(client, auth_headers, db):
    """Verifica che GET /foto non richieda autenticazione (no 401 senza token)."""
    # Crea un prodotto
    resp = _crea_prodotto(client, auth_headers, sku="FOTO-001")
    assert resp.status_code == 201
    prodotto_id = resp.json()["id"]

    # Imposta un foto_path direttamente nel DB (simula una foto con path locale mancante)
    prodotto = db.query(ProdottoModel).filter(ProdottoModel.id == prodotto_id).first()
    prodotto.foto_path = "/tmp/foto_inesistente.jpg"
    db.commit()

    # Richiesta senza header di autenticazione: deve restituire 404 (file mancante),
    # NON 401 (autenticazione richiesta)
    resp_no_auth = client.get(f"/api/prodotti/{prodotto_id}/foto")
    assert resp_no_auth.status_code != 401, (
        "L'endpoint GET /foto non deve richiedere autenticazione"
    )
    assert resp_no_auth.status_code == 404

def test_get_foto_prodotto_cloudinary_no_auth(client, auth_headers, db):
    """Verifica che GET /foto con URL Cloudinary faccia redirect senza autenticazione."""
    resp = _crea_prodotto(client, auth_headers, sku="FOTO-CLOUD-001")
    assert resp.status_code == 201
    prodotto_id = resp.json()["id"]

    # Simula un foto_path Cloudinary
    prodotto = db.query(ProdottoModel).filter(ProdottoModel.id == prodotto_id).first()
    prodotto.foto_path = "https://res.cloudinary.com/test/image/upload/v1/prodotti/1.jpg"
    db.commit()

    # Richiesta senza header di autenticazione: deve fare redirect (302), NON 401
    resp_no_auth = client.get(f"/api/prodotti/{prodotto_id}/foto", follow_redirects=False)
    assert resp_no_auth.status_code != 401, (
        "L'endpoint GET /foto non deve richiedere autenticazione neanche per URL Cloudinary"
    )
    assert resp_no_auth.status_code == 302

def test_get_foto_prodotto_valid_query_token(client, auth_headers, db):
    """Verifica che GET /foto restituisca la foto anche senza token (endpoint pubblico)."""
    resp = _crea_prodotto(client, auth_headers, sku="FOTO-TOKEN-001")
    assert resp.status_code == 201
    prodotto_id = resp.json()["id"]

    prodotto = db.query(ProdottoModel).filter(ProdottoModel.id == prodotto_id).first()
    prodotto.foto_path = "/tmp/foto_inesistente_token.jpg"
    db.commit()

    # Richiesta senza token: deve restituire 404 (file mancante), NON 401
    resp = client.get(f"/api/prodotti/{prodotto_id}/foto")
    assert resp.status_code == 404

def test_get_foto_prodotto_invalid_token(client, auth_headers, db):
    """Verifica che GET /foto ignori un token non valido (endpoint pubblico, nessun 401)."""
    resp = _crea_prodotto(client, auth_headers, sku="FOTO-INVALID-001")
    assert resp.status_code == 201
    prodotto_id = resp.json()["id"]

    prodotto = db.query(ProdottoModel).filter(ProdottoModel.id == prodotto_id).first()
    prodotto.foto_path = "/tmp/foto_inesistente_invalid.jpg"
    db.commit()

    # Token non valido come query param: deve essere ignorato, risultato 404 (non 401)
    resp = client.get(f"/api/prodotti/{prodotto_id}/foto?token=invalid.jwt.token")
    assert resp.status_code == 404

    # Token non valido come Bearer header: deve essere ignorato, risultato 404 (non 401)
    resp_bearer = client.get(
        f"/api/prodotti/{prodotto_id}/foto",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert resp_bearer.status_code == 404

def test_get_foto_prodotto_valid_bearer_header(client, auth_headers, db):
    """Verifica che GET /foto restituisca la foto indipendentemente dall'header Authorization (endpoint pubblico)."""
    resp = _crea_prodotto(client, auth_headers, sku="FOTO-BEARER-001")
    assert resp.status_code == 201
    prodotto_id = resp.json()["id"]

    prodotto = db.query(ProdottoModel).filter(ProdottoModel.id == prodotto_id).first()
    prodotto.foto_path = "/tmp/foto_inesistente_bearer.jpg"
    db.commit()

    # Usa l'header Authorization dalla fixture auth_headers (token valido)
    resp = client.get(f"/api/prodotti/{prodotto_id}/foto", headers=auth_headers)
    assert resp.status_code == 404  # file non trovato, ma autenticazione OK