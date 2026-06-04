from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.models.ebay_connection import EbayConnection
from app.models.ebay_listing import EbayListing
from app.models.ebay_order_event import EbayOrderEvent
from app.models.ebay_sale import EbaySale
from app.models.ordine import Ordine, StatoOrdine
from app.models.prodotto import Prodotto
from app.services.ebay_order_sync_service import EbayOrderSyncService


def test_process_order_creates_internal_order_updates_stock_and_notifies(db, monkeypatch):
    connection = EbayConnection(
        ebay_account_id="demo-account",
        access_token="access-token",
        refresh_token="refresh-token",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        status="active",
        fee_percentage=Decimal("13.25"),
        marketplace_id="EBAY_IT",
    )
    db.add(connection)
    db.flush()

    product = Prodotto(
        nome="Prodotto eBay",
        descrizione="Descrizione test",
        sku="SKU-EBAY-SALE-1",
        quantita=3,
        prezzo_vendita=Decimal("20.00"),
        foto_path="https://img.example.com/test.jpg",
        stato_conservazione="Good",
    )
    db.add(product)
    db.flush()

    listing = EbayListing(
        product_id=product.id,
        connection_id=connection.id,
        ebay_item_id="SKU-EBAY-SALE-1",
        ebay_offer_id="OFFER-1",
        status="active",
        quantity_published=3,
        fee_percentage=Decimal("13.25"),
    )
    db.add(listing)
    db.commit()

    captured = {"product_ids": None, "ordine_numero": None}

    def _mock_sync_stock_after_ebay_sale(db_session, product_ids):
        captured["product_ids"] = set(product_ids)

    def _mock_send_notification(ordine):
        captured["ordine_numero"] = ordine.numero_ordine

    monkeypatch.setattr(
        "app.services.ebay_order_sync_service.MagazzinoService.sync_stock_after_ebay_sale",
        _mock_sync_stock_after_ebay_sale,
    )
    monkeypatch.setattr(
        "app.services.ebay_order_sync_service.send_ebay_order_notification",
        _mock_send_notification,
    )

    result = EbayOrderSyncService.process_order(
        {
            "orderId": "ORDER-EBAY-1",
            "lineItems": [
                {
                    "sku": "SKU-EBAY-SALE-1",
                    "quantity": 2,
                    "lineItemCost": {"value": "40.00"},
                }
            ],
            "buyer": {"name": "Mario Rossi", "email": "mario@example.com"},
        },
        connection,
        db,
    )

    assert result == "processed"
    ordine = db.query(Ordine).order_by(Ordine.id.desc()).first()
    assert ordine is not None
    assert ordine.stato == StatoOrdine.confermato
    assert ordine.cliente_nome is None
    assert "ORDER-EBAY-1" in (ordine.note or "")
    assert captured["ordine_numero"] == ordine.numero_ordine
    assert captured["product_ids"] == {product.id}

    db.refresh(product)
    assert product.quantita == 1

    event = db.query(EbayOrderEvent).filter(EbayOrderEvent.ebay_order_id == "ORDER-EBAY-1").first()
    assert event is not None
    sale = db.query(EbaySale).filter(EbaySale.ebay_order_id == "ORDER-EBAY-1").first()
    assert sale is not None
    assert sale.quantity_sold == 2


def test_ebay_orders_webhook_requires_secret_when_configured(client, db, monkeypatch):
    connection = EbayConnection(
        ebay_account_id="demo-account",
        access_token="access-token",
        refresh_token="refresh-token",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        status="active",
    )
    db.add(connection)
    db.commit()

    monkeypatch.setenv("EBAY_WEBHOOK_SECRET", "super-secret")
    monkeypatch.setattr(
        "app.routers.ebay.process_webhook_payload",
        lambda connection_obj, db_session, payload: {"total": 0, "processed": 0, "skipped": 0},
    )

    response_unauthorized = client.post("/api/ebay/webhook/orders", json={})
    assert response_unauthorized.status_code == 401

    response_ok = client.post(
        "/api/ebay/webhook/orders",
        json={"orderId": "ORDER-1"},
        headers={"x-ebay-webhook-secret": "super-secret"},
    )
    assert response_ok.status_code == 200
    assert response_ok.json() == {"total": 0, "processed": 0, "skipped": 0}


def test_ebay_orders_webhook_logs_warning_when_secret_missing(client, db, monkeypatch, caplog):
    connection = EbayConnection(
        ebay_account_id="demo-account",
        access_token="access-token",
        refresh_token="refresh-token",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        status="active",
    )
    db.add(connection)
    db.commit()

    monkeypatch.delenv("EBAY_WEBHOOK_SECRET", raising=False)
    monkeypatch.setattr(
        "app.routers.ebay.process_webhook_payload",
        lambda connection_obj, db_session, payload: {"total": 0, "processed": 0, "skipped": 0},
    )

    with caplog.at_level("WARNING"):
        response = client.post("/api/ebay/webhook/orders", json={"orderId": "ORDER-1"})

    assert response.status_code == 200
    assert response.json() == {"total": 0, "processed": 0, "skipped": 0}
    assert any(
        "EBAY_WEBHOOK_SECRET non configurata: webhook eBay accetta richieste senza autenticazione" in record.message
        for record in caplog.records
    )
