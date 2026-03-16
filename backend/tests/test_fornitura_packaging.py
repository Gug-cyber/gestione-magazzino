"""
Tests for packaging expense aggregation and idempotent upsert behaviour.
"""
import pytest
from app.models.spesa_gestione import SpesaGestione


def _crea_prodotto(client, auth_headers, sku="PKG-PROD-001"):
    resp = client.post(
        "/api/prodotti/",
        json={
            "nome": "Prodotto packaging test",
            "sku": sku,
            "quantita": 0,
            "quantita_minima": 0,
            "prezzo_acquisto": 5.00,
            "prezzo_vendita": 10.00,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _crea_fornitura_packaging(client, auth_headers, righe):
    resp = client.post(
        "/api/forniture/",
        json={"fornitore_nome": "Test Packaging Fornitore", "righe": righe},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _porta_a_ricevuto(client, auth_headers, fornitura_id):
    resp = client.put(
        f"/api/forniture/{fornitura_id}",
        json={"stato": "ricevuto"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_due_righe_packaging_creano_una_sola_spesa(client, auth_headers, db):
    """
    Transitioning to 'ricevuto' with 2 packaging rows must create exactly one
    SpesaGestione whose importo equals the sum of both subtotals.
    """
    fornitura = _crea_fornitura_packaging(client, auth_headers, [
        {"tipo_voce": "packaging", "descrizione": "Nastro adesivo", "quantita": 10, "prezzo_unitario": 1.00},
        {"tipo_voce": "packaging", "descrizione": "Busta imbottita", "quantita": 5, "prezzo_unitario": 2.00},
    ])
    fornitura_id = fornitura["id"]

    _porta_a_ricevuto(client, auth_headers, fornitura_id)

    spese = db.query(SpesaGestione).filter(
        SpesaGestione.fornitura_id == fornitura_id,
        SpesaGestione.categoria == "packaging",
    ).all()

    assert len(spese) == 1, f"Expected 1 SpesaGestione, got {len(spese)}"
    # 10*1.00 + 5*2.00 = 10 + 10 = 20
    assert float(spese[0].importo) == pytest.approx(20.0)


def test_chiamata_duplicata_non_duplica_spesa(client, auth_headers, db):
    """
    Calling update to 'ricevuto' a second time must update the existing
    SpesaGestione, not create a duplicate.  Total rows for fornitura_id must
    remain exactly 1.
    """
    fornitura = _crea_fornitura_packaging(client, auth_headers, [
        {"tipo_voce": "packaging", "descrizione": "Nastro adesivo", "quantita": 4, "prezzo_unitario": 3.00},
    ])
    fornitura_id = fornitura["id"]

    _porta_a_ricevuto(client, auth_headers, fornitura_id)
    # Simulate a duplicate call; the guard (stock_caricato) prevents a second
    # execution of the stock-loading block, but the upsert itself must also be
    # safe even if the guard were bypassed.
    _porta_a_ricevuto(client, auth_headers, fornitura_id)

    spese = db.query(SpesaGestione).filter(
        SpesaGestione.fornitura_id == fornitura_id,
        SpesaGestione.categoria == "packaging",
    ).all()

    assert len(spese) == 1, f"Expected 1 SpesaGestione after duplicate call, got {len(spese)}"
    assert float(spese[0].importo) == pytest.approx(12.0)  # 4 * 3.00


def test_fornitura_senza_packaging_non_crea_spesa(client, auth_headers, db):
    """
    Transitioning to 'ricevuto' when no packaging rows exist must not create
    any SpesaGestione record.
    """
    prodotto = _crea_prodotto(client, auth_headers, sku="PKG-PROD-002")
    fornitura = _crea_fornitura_packaging(client, auth_headers, [
        {
            "tipo_voce": "prodotto",
            "prodotto_id": prodotto["id"],
            "quantita": 3,
            "prezzo_unitario": 10.00,
        }
    ])
    fornitura_id = fornitura["id"]

    _porta_a_ricevuto(client, auth_headers, fornitura_id)

    spese = db.query(SpesaGestione).filter(
        SpesaGestione.fornitura_id == fornitura_id,
        SpesaGestione.categoria == "packaging",
    ).all()

    assert len(spese) == 0, f"Expected 0 SpesaGestione, got {len(spese)}"
