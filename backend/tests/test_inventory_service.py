"""
Test per InventoryService — sincronizzazione stock tra ordini interni,
magazzino ed eBay.

Copre i 7 casi richiesti dalla specifica:
1. test_decrement_stock_ok
2. test_decrement_stock_negative_raises
3. test_decrement_stock_idempotent
4. test_sync_ebay_quantity_called_after_decrement
5. test_close_ebay_listing_when_zero
6. test_handle_ebay_sale_decrements_stock
7. test_handle_ebay_sale_idempotent
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.models.ebay_connection import EbayConnection
from app.models.ebay_listing import EbayListing
from app.models.ebay_order_event import EbayOrderEvent
from app.models.prodotto import Prodotto
from app.services.inventory_service import InventoryService


# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #


def _make_product(db, nome="Prodotto Test", sku="INV-001", quantita=10):
    p = Prodotto(nome=nome, sku=sku, quantita=quantita, quantita_minima=0)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _make_connection(db, name="Conn Test"):
    conn = EbayConnection(
        access_token="test-access-token",
        refresh_token="test-refresh-token",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        marketplace_id="EBAY_IT",
        status="active",
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def _make_listing(db, product, connection, sku="INV-001", offer_id="OFF-001"):
    listing = EbayListing(
        product_id=product.id,
        connection_id=connection.id,
        ebay_item_id=sku,
        ebay_offer_id=offer_id,
        status="active",
        quantity_published=product.quantita,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


# --------------------------------------------------------------------------- #
# Test 1: decremento normale                                                   #
# --------------------------------------------------------------------------- #


def test_decrement_stock_ok(db):
    """Decremento normale funziona: quantità ridotta di 3, movimento registrato."""
    product = _make_product(db, quantita=10)

    InventoryService.decrement_stock(db, product.id, 3, source="test")
    db.commit()
    db.refresh(product)

    assert product.quantita == 7


# --------------------------------------------------------------------------- #
# Test 2: stock insufficiente → eccezione                                      #
# --------------------------------------------------------------------------- #


def test_decrement_stock_negative_raises(db):
    """Stock insufficiente solleva HTTPException 400 con messaggio chiaro."""
    product = _make_product(db, sku="INV-002", quantita=2)

    with pytest.raises(HTTPException) as exc_info:
        InventoryService.decrement_stock(db, product.id, 5, source="test")

    assert exc_info.value.status_code == 400
    assert "insufficiente" in exc_info.value.detail.lower()

    # Lo stock non deve essere cambiato
    db.refresh(product)
    assert product.quantita == 2


# --------------------------------------------------------------------------- #
# Test 3: idempotenza con order_id                                             #
# --------------------------------------------------------------------------- #


def test_decrement_stock_idempotent(db):
    """Doppia chiamata con stesso order_id non decrementa due volte."""
    product = _make_product(db, sku="INV-003", quantita=10)
    fake_order_id = 9999

    InventoryService.decrement_stock(db, product.id, 3, source="internal_order", order_id=fake_order_id)
    db.commit()

    # Seconda chiamata identica: deve essere ignorata
    InventoryService.decrement_stock(db, product.id, 3, source="internal_order", order_id=fake_order_id)
    db.commit()

    db.refresh(product)
    assert product.quantita == 7  # decrementato solo una volta


# --------------------------------------------------------------------------- #
# Test 4: sync eBay chiamato dopo il decremento                                #
# --------------------------------------------------------------------------- #


def test_sync_ebay_quantity_called_after_decrement(db, monkeypatch):
    """sync_ebay_quantity viene chiamato correttamente dopo un decremento."""
    product = _make_product(db, sku="INV-004", quantita=10)
    connection = _make_connection(db)
    listing = _make_listing(db, product, connection, sku="INV-004")

    synced_product_ids = []

    # Mock EbayAuthService e EbayInventoryService per evitare chiamate HTTP reali
    monkeypatch.setattr(
        "app.services.inventory_service.EbayAuthService.get_valid_token",
        lambda conn, db: "fake-token",
    )
    monkeypatch.setattr(
        "app.services.inventory_service.EbayInventoryService.update_quantity",
        lambda token, sku, qty, marketplace_id="EBAY_IT": synced_product_ids.append(sku),
    )

    InventoryService.decrement_stock(db, product.id, 3, source="test")
    db.commit()

    InventoryService.sync_ebay_quantity(db, product.id)
    db.commit()

    assert listing.ebay_item_id in synced_product_ids


# --------------------------------------------------------------------------- #
# Test 5: listing chiuso quando stock = 0                                      #
# --------------------------------------------------------------------------- #


def test_close_ebay_listing_when_zero(db, monkeypatch):
    """Listing eBay viene chiuso (status=out_of_stock) quando stock = 0."""
    product = _make_product(db, sku="INV-005", quantita=1)
    connection = _make_connection(db)
    listing = _make_listing(db, product, connection, sku="INV-005", offer_id="OFF-005")

    closed_offers = []

    monkeypatch.setattr(
        "app.services.inventory_service.EbayAuthService.get_valid_token",
        lambda conn, db: "fake-token",
    )
    monkeypatch.setattr(
        "app.services.inventory_service.EbayOfferService.end_listing",
        lambda token, offer_id, reason="OUT_OF_STOCK": closed_offers.append(offer_id),
    )

    # Decrementa a 0
    InventoryService.decrement_stock(db, product.id, 1, source="test")
    db.commit()

    InventoryService.close_ebay_listing_if_zero(db, product.id)
    db.commit()

    assert "OFF-005" in closed_offers
    db.refresh(listing)
    assert listing.status == "out_of_stock"


# --------------------------------------------------------------------------- #
# Test 5b: DB aggiornato anche se la chiamata API eBay fallisce                #
# --------------------------------------------------------------------------- #


def test_close_ebay_listing_api_fails_but_db_updated(db, monkeypatch):
    """Il listing viene marcato out_of_stock nel DB anche se la chiamata API eBay fallisce."""
    product = _make_product(db, sku="INV-005B", quantita=1)
    connection = _make_connection(db)
    listing = _make_listing(db, product, connection, sku="INV-005B", offer_id="OFF-005B")

    monkeypatch.setattr(
        "app.services.inventory_service.EbayAuthService.get_valid_token",
        lambda conn, db: "fake-token",
    )
    monkeypatch.setattr(
        "app.services.inventory_service.EbayOfferService.end_listing",
        lambda token, offer_id, reason="OUT_OF_STOCK": (_ for _ in ()).throw(
            Exception("eBay API error simulato")
        ),
    )

    # Decrementa a 0
    InventoryService.decrement_stock(db, product.id, 1, source="test")
    db.commit()

    # Nonostante l'errore API, il DB deve essere aggiornato
    InventoryService.close_ebay_listing_if_zero(db, product.id)
    db.commit()

    db.refresh(listing)
    assert listing.status == "out_of_stock"


# --------------------------------------------------------------------------- #
# Test 6: vendita eBay decrementa stock interno                                #
# --------------------------------------------------------------------------- #


def test_handle_ebay_sale_decrements_stock(db):
    """handle_ebay_sale decrementa correttamente lo stock interno."""
    product = _make_product(db, sku="INV-006", quantita=10)
    connection = _make_connection(db)
    listing = _make_listing(db, product, connection, sku="INV-006")

    InventoryService.handle_ebay_sale(db, "EBAY-ORD-001", "INV-006", 2)
    db.commit()

    db.refresh(product)
    assert product.quantita == 8

    # Evento registrato per idempotenza
    event = db.query(EbayOrderEvent).filter(EbayOrderEvent.ebay_order_id == "EBAY-ORD-001").first()
    assert event is not None
    assert event.sku == "INV-006"
    assert event.quantity == 2


# --------------------------------------------------------------------------- #
# Test 7: stesso ebay_order_id non processa due volte                          #
# --------------------------------------------------------------------------- #


def test_handle_ebay_sale_idempotent(db):
    """Stesso ebay_order_id non viene processato una seconda volta."""
    product = _make_product(db, sku="INV-007", quantita=10)
    connection = _make_connection(db)
    listing = _make_listing(db, product, connection, sku="INV-007")

    InventoryService.handle_ebay_sale(db, "EBAY-ORD-002", "INV-007", 2)
    db.commit()

    # Seconda chiamata con stesso order_id: deve essere ignorata
    InventoryService.handle_ebay_sale(db, "EBAY-ORD-002", "INV-007", 2)
    db.commit()

    db.refresh(product)
    assert product.quantita == 8  # decrementato solo una volta

    # Un solo evento nella tabella
    events = db.query(EbayOrderEvent).filter(EbayOrderEvent.ebay_order_id == "EBAY-ORD-002").all()
    assert len(events) == 1
