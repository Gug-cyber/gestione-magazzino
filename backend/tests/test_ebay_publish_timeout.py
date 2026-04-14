from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import HTTPException

from app.models.ebay_connection import EbayConnection
from app.models.ebay_listing import EbayListing
from app.models.prodotto import Prodotto


def test_get_connection_returns_fallback_account_label_when_account_id_is_null(client, auth_headers, db):
    connection = EbayConnection(
        ebay_account_id=None,
        access_token="access-token",
        refresh_token="refresh-token",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        status="active",
        fee_percentage=Decimal("13.25"),
        marketplace_id="EBAY_IT",
    )
    db.add(connection)
    db.commit()

    response = client.get("/api/ebay/connection", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["connected"] is True
    assert response.json()["account_id"] == "Account collegato"


def test_publish_listing_returns_504_on_timeout(client, auth_headers, db, monkeypatch):
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

    product = Prodotto(
        nome="Prodotto test",
        descrizione="Descrizione test",
        sku="SKU-TIMEOUT-1",
        quantita=2,
        prezzo_vendita=Decimal("10.00"),
        foto_path="https://img.example.com/test.jpg",
        stato_conservazione="Good",
    )
    db.add(product)
    db.commit()

    def _mock_get_valid_token(connection_obj, db_session):
        return "token"

    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", _mock_get_valid_token)

    def _raise_timeout(*_args, **_kwargs):
        raise httpx.TimeoutException("request timed out")

    monkeypatch.setattr("app.routers.ebay.EbayInventoryService.create_or_update_inventory_item", _raise_timeout)

    response = client.post("/api/ebay/listings/publish", headers=auth_headers, json={"product_id": product.id})

    assert response.status_code == 504
    assert response.json()["detail"] == "Timeout durante la pubblicazione eBay - riprova tra qualche secondo"


def test_publish_listing_uses_default_shipping_cost_when_not_provided(client, auth_headers, db, monkeypatch):
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

    product = Prodotto(
        nome="Prodotto test",
        descrizione="Descrizione test",
        sku="SKU-DEFAULT-SHIP-1",
        quantita=1,
        prezzo_vendita=Decimal("10.00"),
        foto_path="https://img.example.com/test.jpg",
        stato_conservazione="Good",
    )
    db.add(product)
    db.commit()

    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", lambda *_args, **_kwargs: "token")
    monkeypatch.setattr("app.routers.ebay.EbayInventoryService.create_or_update_inventory_item", lambda *_args, **_kwargs: None)

    captured = {}

    def _mock_create_offer(
        token,
        sku,
        price,
        quantity,
        marketplace_id,
        listing,
        description,
        shipping_cost,
    ):
        captured["shipping_cost"] = shipping_cost
        return "OFFER-1"

    monkeypatch.setattr("app.routers.ebay.EbayOfferService.create_offer", _mock_create_offer)
    monkeypatch.setattr("app.routers.ebay.EbayOfferService.publish_offer", lambda *_args, **_kwargs: "LISTING-1")

    response = client.post("/api/ebay/listings/publish", headers=auth_headers, json={"product_id": product.id})

    assert response.status_code == 200
    assert captured["shipping_cost"] == 5.9


def test_publish_listing_propagates_detailed_offer_error(client, auth_headers, db, monkeypatch):
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

    product = Prodotto(
        nome="Prodotto test",
        descrizione="Descrizione test",
        sku="SKU-DETAIL-1",
        quantita=1,
        prezzo_vendita=Decimal("10.00"),
        foto_path="https://img.example.com/test.jpg",
        stato_conservazione="Good",
    )
    db.add(product)
    db.commit()

    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", lambda *_args, **_kwargs: "token")
    monkeypatch.setattr("app.routers.ebay.EbayInventoryService.create_or_update_inventory_item", lambda *_args, **_kwargs: None)

    def _mock_create_offer(*_args, **_kwargs):
        raise HTTPException(status_code=502, detail="Errore creazione offer eBay: 400 (INVALID_FIELD_VALUE)")

    monkeypatch.setattr("app.routers.ebay.EbayOfferService.create_offer", _mock_create_offer)

    response = client.post("/api/ebay/listings/publish", headers=auth_headers, json={"product_id": product.id})

    assert response.status_code == 502
    assert response.json()["detail"] == "Errore creazione offer eBay: 400 (INVALID_FIELD_VALUE)"

    listing = db.query(EbayListing).filter(EbayListing.product_id == product.id).order_by(EbayListing.id.desc()).first()
    assert listing is not None
    assert listing.status == "error"
    assert listing.error_message == "Errore creazione offer eBay: 400 (INVALID_FIELD_VALUE)"
