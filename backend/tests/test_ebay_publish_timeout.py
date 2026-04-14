from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx

from app.models.ebay_connection import EbayConnection
from app.models.prodotto import Prodotto


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
