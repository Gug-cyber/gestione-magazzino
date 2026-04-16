"""
Test per la sincronizzazione stock bidirezionale (magazzino ↔ eBay).
"""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from app.services.inventory_sync_service import InventorySyncService
from app.models.movimento import TipoMovimento, Movimento
from app.models.prodotto import Prodotto


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _crea_prodotto(client, auth_headers, nome="Prodotto Sync", sku="SYNC-001", quantita=10):
    resp = client.post(
        "/api/prodotti/",
        json={
            "nome": nome,
            "sku": sku,
            "quantita": quantita,
            "quantita_minima": 1,
            "prezzo_acquisto": 5.00,
            "prezzo_vendita": 10.00,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _crea_ordine(client, auth_headers, prodotto_id, quantita=2, prezzo=10.00):
    resp = client.post(
        "/api/ordini/",
        json={
            "cliente_nome": "Cliente Sync Test",
            "righe": [{"prodotto_id": prodotto_id, "quantita": quantita, "prezzo_unitario": prezzo}],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# 1. decrement_stock con auto_commit=False non esegue commit da solo
# ---------------------------------------------------------------------------

def test_decrement_stock_auto_commit_false(db):
    """Verifica che decrement_stock con auto_commit=False non committi autonomamente."""
    prodotto = Prodotto(nome="Test", sku="DC-001", quantita=10, quantita_minima=1,
                        prezzo_acquisto=1.0, prezzo_vendita=2.0)
    db.add(prodotto)
    db.commit()
    db.refresh(prodotto)

    original_commit = db.commit
    commit_called = []
    db.commit = lambda: commit_called.append(True) or original_commit()

    try:
        InventorySyncService.decrement_stock(
            prodotto.id, 3, db,
            tipo=TipoMovimento.vendita_ebay,
            auto_commit=False,
        )
        # Con auto_commit=False, commit non deve essere chiamato
        assert len(commit_called) == 0, "commit non dovrebbe essere chiamato con auto_commit=False"
    finally:
        db.commit = original_commit

    # La modifica deve essere in sessione (flush applicato)
    db.refresh(prodotto)
    assert prodotto.quantita == 7


# ---------------------------------------------------------------------------
# 2. decrement_stock crea movimento con tipo corretto
# ---------------------------------------------------------------------------

def test_decrement_stock_tipo_scarico_ordine(db):
    """Verifica che il movimento creato abbia il tipo passato come parametro."""
    prodotto = Prodotto(nome="Test Tipo", sku="TT-001", quantita=10, quantita_minima=1,
                        prezzo_acquisto=1.0, prezzo_vendita=2.0)
    db.add(prodotto)
    db.commit()
    db.refresh(prodotto)

    InventorySyncService.decrement_stock(
        prodotto.id, 2, db,
        tipo=TipoMovimento.scarico_ordine,
        note="Test scarico ordine",
        auto_commit=True,
    )

    movimento = (
        db.query(Movimento)
        .filter(Movimento.prodotto_id == prodotto.id)
        .first()
    )
    assert movimento is not None
    assert movimento.tipo == TipoMovimento.scarico_ordine
    assert movimento.quantita == 2
    assert movimento.note == "Test scarico ordine"


# ---------------------------------------------------------------------------
# 3. decrement_stock tipo default è vendita_ebay
# ---------------------------------------------------------------------------

def test_decrement_stock_tipo_default_vendita_ebay(db):
    """Verifica che senza parametro tipo, il movimento sia vendita_ebay."""
    prodotto = Prodotto(nome="Test Default", sku="TD-001", quantita=5, quantita_minima=1,
                        prezzo_acquisto=1.0, prezzo_vendita=2.0)
    db.add(prodotto)
    db.commit()
    db.refresh(prodotto)

    InventorySyncService.decrement_stock(prodotto.id, 1, db)

    movimento = db.query(Movimento).filter(Movimento.prodotto_id == prodotto.id).first()
    assert movimento is not None
    assert movimento.tipo == TipoMovimento.vendita_ebay


# ---------------------------------------------------------------------------
# 4. decrement_stock con stock insufficiente lancia eccezione
# ---------------------------------------------------------------------------

def test_decrement_stock_quantita_insufficiente(db):
    """Verifica che quantità insufficiente sollevi HTTP 400."""
    from fastapi import HTTPException
    prodotto = Prodotto(nome="Scarso", sku="SC-001", quantita=2, quantita_minima=1,
                        prezzo_acquisto=1.0, prezzo_vendita=2.0)
    db.add(prodotto)
    db.commit()
    db.refresh(prodotto)

    with pytest.raises(HTTPException) as exc_info:
        InventorySyncService.decrement_stock(prodotto.id, 5, db)
    assert exc_info.value.status_code == 400
    assert "insufficiente" in exc_info.value.detail


# ---------------------------------------------------------------------------
# 5. Conferma ordine sincronizza eBay (mock)
# ---------------------------------------------------------------------------

def test_ordine_confermato_sincronizza_ebay(client, auth_headers):
    """Verifica che dopo conferma ordine venga tentata la sync eBay."""
    prodotto = _crea_prodotto(client, auth_headers, sku="SYNC-002", quantita=10)
    ordine = _crea_ordine(client, auth_headers, prodotto["id"], quantita=2)

    with patch(
        "app.crud.ordine._sync_ebay_after_order_confirmation"
    ) as mock_sync:
        resp = client.put(
            f"/api/ordini/{ordine['id']}",
            json={"stato": "confermato"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["stato"] == "confermato"
        mock_sync.assert_called_once()


# ---------------------------------------------------------------------------
# 6. Conferma ordine NON risincronizza eBay se stock era già scalato
# ---------------------------------------------------------------------------

def test_ordine_confermato_non_risincronizza_se_gia_scalato(client, auth_headers):
    """Verifica che la sync eBay non venga ri-chiamata se stock già scalato."""
    prodotto = _crea_prodotto(client, auth_headers, sku="SYNC-003", quantita=10)
    ordine = _crea_ordine(client, auth_headers, prodotto["id"], quantita=2)

    # Prima conferma
    client.put(f"/api/ordini/{ordine['id']}", json={"stato": "confermato"}, headers=auth_headers)

    with patch(
        "app.crud.ordine._sync_ebay_after_order_confirmation"
    ) as mock_sync:
        # Seconda PUT con stato confermato (già confermato, no re-trigger)
        resp = client.put(
            f"/api/ordini/{ordine['id']}",
            json={"stato": "confermato"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        mock_sync.assert_not_called()


# ---------------------------------------------------------------------------
# 7. sync_ebay_for_product senza connessione eBay attiva
# ---------------------------------------------------------------------------

def test_sync_ebay_for_product_no_connection(db):
    """Verifica che sync_ebay_for_product ritorni 'no_connection' se non c'è connessione."""
    result = InventorySyncService.sync_ebay_for_product(999, db)
    assert result["status"] == "no_connection"


# ---------------------------------------------------------------------------
# 8. TipoMovimento ha il valore scarico_ordine
# ---------------------------------------------------------------------------

def test_tipo_movimento_scarico_ordine_exists():
    """Verifica che TipoMovimento.scarico_ordine esista."""
    assert TipoMovimento.scarico_ordine == "scarico_ordine"


# ---------------------------------------------------------------------------
# 9. Endpoint /sync/listings richiede connessione attiva
# ---------------------------------------------------------------------------

def test_sync_all_listings_no_connection(client, auth_headers):
    """Verifica che /sync/listings risponda 400 senza connessione eBay."""
    resp = client.post("/api/ebay/sync/listings", headers=auth_headers)
    assert resp.status_code == 400
