"""
Test per la sincronizzazione stock bidirezionale (magazzino ↔ eBay).
"""
import pytest
from unittest.mock import MagicMock, patch, call
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


def _make_listing(product_quantita=5, offer_id="OFFER-1", item_id="SKU-1", status="active"):
    """Create a mock EbayListing with associated product."""
    listing = MagicMock()
    listing.ebay_offer_id = offer_id
    listing.ebay_item_id = item_id
    listing.status = status
    product = MagicMock()
    product.quantita = product_quantita
    listing.product = product
    return listing


def _make_connection(marketplace_id="EBAY_IT"):
    connection = MagicMock()
    connection.marketplace_id = marketplace_id
    return connection


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


# ---------------------------------------------------------------------------
# 10. sync_quantity_to_ebay usa get_offer + _update_offer quando ebay_offer_id disponibile
# ---------------------------------------------------------------------------

def test_sync_quantity_to_ebay_uses_offer_api_when_offer_id_available():
    """Verifica che sync_quantity_to_ebay usi GET+PUT offer quando ebay_offer_id è presente."""
    listing = _make_listing(product_quantita=5, offer_id="OFFER-99", item_id="SKU-99")
    connection = _make_connection()
    db = MagicMock()

    with patch("app.services.inventory_sync_service.EbayAuthService.get_valid_token", return_value="tok"), \
         patch("app.services.inventory_sync_service.EbayOfferService.get_offer", return_value={"availableQuantity": 10}) as mock_get, \
         patch("app.services.inventory_sync_service.EbayOfferService._update_offer") as mock_update, \
         patch("app.services.inventory_sync_service.EbayInventoryService.update_quantity") as mock_inv:

        InventorySyncService.sync_quantity_to_ebay(listing, connection, db)

        mock_get.assert_called_once_with("tok", "OFFER-99")
        mock_update.assert_called_once()
        mock_inv.assert_not_called()

        # Verify availableQuantity was set correctly
        call_args = mock_update.call_args
        payload = call_args[0][2]
        assert payload["availableQuantity"] == 5
        # Read-only fields should be removed
        for key in ["offerId", "listing", "status", "marketplaceFees", "auditInfo"]:
            assert key not in payload


# ---------------------------------------------------------------------------
# 11. sync_quantity_to_ebay fallback a update_quantity quando ebay_offer_id è None
# ---------------------------------------------------------------------------

def test_sync_quantity_to_ebay_fallback_no_offer_id():
    """Verifica che sync_quantity_to_ebay usi update_quantity quando ebay_offer_id è None."""
    listing = _make_listing(product_quantita=3, offer_id=None, item_id="SKU-88")
    connection = _make_connection()
    db = MagicMock()

    with patch("app.services.inventory_sync_service.EbayAuthService.get_valid_token", return_value="tok"), \
         patch("app.services.inventory_sync_service.EbayOfferService.get_offer") as mock_get, \
         patch("app.services.inventory_sync_service.EbayInventoryService.update_quantity") as mock_inv:

        InventorySyncService.sync_quantity_to_ebay(listing, connection, db)

        mock_get.assert_not_called()
        mock_inv.assert_called_once_with("tok", "SKU-88", 3, marketplace_id="EBAY_IT")


# ---------------------------------------------------------------------------
# 12. sync_quantity_to_ebay salta chiamata eBay quando qty <= 0
# ---------------------------------------------------------------------------

def test_sync_quantity_to_ebay_skips_ebay_call_when_zero_stock():
    """Verifica che sync_quantity_to_ebay non chiami eBay se la quantità è 0."""
    listing = _make_listing(product_quantita=0, offer_id="OFFER-77", item_id="SKU-77")
    connection = _make_connection()
    db = MagicMock()

    with patch("app.services.inventory_sync_service.EbayAuthService.get_valid_token", return_value="tok"), \
         patch("app.services.inventory_sync_service.EbayOfferService.get_offer") as mock_get, \
         patch("app.services.inventory_sync_service.EbayOfferService._update_offer") as mock_update, \
         patch("app.services.inventory_sync_service.EbayInventoryService.update_quantity") as mock_inv:

        InventorySyncService.sync_quantity_to_ebay(listing, connection, db)

        mock_get.assert_not_called()
        mock_update.assert_not_called()
        mock_inv.assert_not_called()
        assert listing.quantity_published == 0


# ---------------------------------------------------------------------------
# 13. check_and_handle_zero_stock chiude il listing quando product.quantita == 0
# ---------------------------------------------------------------------------

def test_check_and_handle_zero_stock_closes_listing():
    """Verifica che check_and_handle_zero_stock chiuda l'annuncio quando stock è 0."""
    listing = _make_listing(product_quantita=0, offer_id="OFFER-55", status="active")
    connection = _make_connection()
    db = MagicMock()

    with patch("app.services.inventory_sync_service.EbayAuthService.get_valid_token", return_value="tok"), \
         patch("app.services.inventory_sync_service.EbayOfferService.end_listing") as mock_end:

        InventorySyncService.check_and_handle_zero_stock(listing, connection, db)

        mock_end.assert_called_once_with("tok", "OFFER-55", reason="OUT_OF_STOCK")
        assert listing.status == "out_of_stock"
        db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# 14. check_and_handle_zero_stock non chiude se stock > 0
# ---------------------------------------------------------------------------

def test_check_and_handle_zero_stock_no_action_when_stock_positive():
    """Verifica che check_and_handle_zero_stock non faccia nulla se stock > 0."""
    listing = _make_listing(product_quantita=5, offer_id="OFFER-44", status="active")
    connection = _make_connection()
    db = MagicMock()

    with patch("app.services.inventory_sync_service.EbayOfferService.end_listing") as mock_end:
        result = InventorySyncService.check_and_handle_zero_stock(listing, connection, db)

        mock_end.assert_not_called()
        db.commit.assert_not_called()
        assert result is listing


# ---------------------------------------------------------------------------
# 15. check_and_handle_zero_stock non chiude listing già out_of_stock
# ---------------------------------------------------------------------------

def test_check_and_handle_zero_stock_skips_already_closed():
    """Verifica che check_and_handle_zero_stock non tenti di chiudere listing già chiusi."""
    listing = _make_listing(product_quantita=0, offer_id="OFFER-33", status="out_of_stock")
    connection = _make_connection()
    db = MagicMock()

    with patch("app.services.inventory_sync_service.EbayOfferService.end_listing") as mock_end:
        result = InventorySyncService.check_and_handle_zero_stock(listing, connection, db)

        mock_end.assert_not_called()
        db.commit.assert_not_called()
        assert result is listing


# ---------------------------------------------------------------------------
# 16. sync_quantity_to_ebay fallback a update_quantity quando get_offer lancia eccezione
# ---------------------------------------------------------------------------

def test_sync_quantity_to_ebay_fallback_on_offer_error():
    """Verifica il fallback a update_quantity quando get_offer fallisce."""
    listing = _make_listing(product_quantita=4, offer_id="OFFER-FAIL", item_id="SKU-FAIL")
    connection = _make_connection()
    db = MagicMock()

    with patch("app.services.inventory_sync_service.EbayAuthService.get_valid_token", return_value="tok"), \
         patch("app.services.inventory_sync_service.EbayOfferService.get_offer", side_effect=Exception("Network error")), \
         patch("app.services.inventory_sync_service.EbayInventoryService.update_quantity") as mock_inv:

        InventorySyncService.sync_quantity_to_ebay(listing, connection, db)

        mock_inv.assert_called_once_with("tok", "SKU-FAIL", 4, marketplace_id="EBAY_IT")
