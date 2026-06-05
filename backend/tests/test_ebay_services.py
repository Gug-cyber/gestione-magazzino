import logging
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

import app.routers.ebay as ebay_router_module
import app.services.ebay_inventory_service as ebay_inventory_service_module
import app.services.ebay_offer_service as ebay_offer_service_module
from app.models.ebay_connection import EbayConnection
from app.models.ebay_listing import EbayListing
from app.models.prodotto import Prodotto
from app.schemas.ebay import PublishRequest
from app.services.ebay_auth_service import EbayAuthService
from app.services.ebay_inventory_service import EbayInventoryService
from app.services.ebay_order_sync_service import EbayOrderSyncService
from app.services.ebay_offer_service import EbayOfferService
from app.services.pricing_service import PricingService


def _create_publish_connection(db):
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
    db.commit()
    db.refresh(connection)
    return connection


def _create_publish_product(db, sku: str, gioco: str | None = None):
    product = Prodotto(
        nome="Prodotto test",
        descrizione="Descrizione test",
        sku=sku,
        quantita=2,
        prezzo_vendita=Decimal("10.00"),
        foto_path="https://img.example.com/test.jpg",
        stato_conservazione="Good",
        gioco=gioco,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def test_pricing_service_calculates_expected_values():
    net = Decimal("100")
    fee = Decimal("13.25")

    published = PricingService.calculate_ebay_price(net, fee)
    fee_amount = PricingService.calculate_fee_amount(published, fee)
    net_back = PricingService.calculate_net_from_gross(published, fee)

    assert published == Decimal("115.27")
    assert fee_amount == Decimal("15.27")
    assert net_back == Decimal("100.00")


def test_sanitize_order_data_removes_pii_recursively():
    payload = {
        "orderId": "O-123",
        "buyer": {"name": "Mario", "email": "mario@example.com"},
        "lineItems": [{"sku": "SKU-1", "quantity": 1}],
        "shippingAddress": {"address": {"phone": "123", "city": "Roma"}},
    }

    sanitized = EbayOrderSyncService.sanitize_order_data(payload)

    assert sanitized["orderId"] == "O-123"
    assert "buyer" not in sanitized
    assert "shippingAddress" not in sanitized
    assert sanitized["lineItems"][0]["sku"] == "SKU-1"


def test_inventory_item_payload_uses_only_public_photo_and_sets_condition_description(monkeypatch):
    monkeypatch.setenv("BACKEND_URL", "https://backend.example.com")
    captured = {}

    def _mock_request(method, url, **kwargs):
        captured["method"] = method
        captured["payload"] = kwargs["json"]
        captured["headers"] = kwargs["headers"]
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Carta rara",
        descrizione="Descrizione reale",
        stato_conservazione="Good",
        foto_path="/uploads/carta.jpg",
        google_drive_folder_id="drive-folder-id",
    )
    listing = SimpleNamespace(quantity_published=3, ebay_item_id=None, last_sync_at=None)

    EbayInventoryService.create_or_update_inventory_item(
        "token",
        "SKU-1",
        product,
        listing,
        marketplace_id="EBAY_DE",
    )

    payload = captured["payload"]
    headers = captured["headers"]
    assert captured["method"] == "PUT"
    assert headers.get("Content-Language") == "de-DE"
    assert payload["product"]["imageUrls"] == ["https://backend.example.com/uploads/carta.jpg"]
    assert payload["condition"] == "USED_GOOD"
    assert payload["conditionDescription"] == "Good"
    assert "sku" not in payload


def test_inventory_item_sends_default_content_language_for_unknown_marketplace(monkeypatch):
    captured = {}

    def _mock_request(method, url, **kwargs):
        captured["headers"] = kwargs["headers"]
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Carta",
        descrizione="Descrizione",
        stato_conservazione="Good",
        foto_path="https://img.example.com/a.jpg",
        google_drive_folder_id=None,
    )
    listing = SimpleNamespace(quantity_published=1, ebay_item_id=None, last_sync_at=None)

    EbayInventoryService.create_or_update_inventory_item(
        "token",
        "SKU-1",
        product,
        listing,
        marketplace_id="EBAY_UNKNOWN",
    )

    # Unknown marketplaces fall back to the default Content-Language "it-IT"
    assert captured["headers"].get("Content-Language") == "it-IT"


def test_inventory_item_preserves_utf8_in_title_and_description(monkeypatch):
    captured = {}

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Caffè Pokémon àèìòù",
        descrizione="Descrizione con accenti: àèìòù e simbolo ™",
        stato_conservazione="Usàto",
        foto_path="https://img.example.com/a.jpg",
        google_drive_folder_id=None,
    )
    listing = SimpleNamespace(quantity_published=1, ebay_item_id=None, last_sync_at=None)

    EbayInventoryService.create_or_update_inventory_item("token", "SKU-1", product, listing)

    payload = captured["payload"]
    # Title and description are preserved as UTF-8 (no ASCII stripping)
    assert payload["product"]["title"] == "Caffè Pokémon àèìòù"
    assert payload["product"]["description"] == "Descrizione con accenti: àèìòù e simbolo ™"
    assert payload["conditionDescription"] == "Usàto"


def test_inventory_item_adds_game_aspect_without_overwriting_other_aspects(monkeypatch):
    captured = {}

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Carta rara",
        descrizione="Descrizione reale",
        stato_conservazione="Good",
        foto_path="https://img.example.com/a.jpg",
        google_drive_folder_id=None,
    )
    listing = SimpleNamespace(quantity_published=1, ebay_item_id=None, last_sync_at=None)

    EbayInventoryService.create_or_update_inventory_item(
        "token",
        "SKU-GAME-1",
        product,
        listing,
        aspects={"Rarità": ["Rara"]},
        item_game="Pokémon",
    )

    assert captured["payload"]["product"]["aspects"]["Rarità"] == ["Rara"]
    assert captured["payload"]["product"]["aspects"]["Gioco"] == ["Pokémon"]


def test_update_quantity_makes_get_then_put(monkeypatch):
    calls = []

    def _mock_request(method, url, **kwargs):
        calls.append((method, kwargs["headers"]))
        if method == "GET":
            return {"availability": {"shipToLocationAvailability": {"quantity": 10}}}
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    EbayInventoryService.update_quantity("token", "SKU-1", 5, marketplace_id="EBAY_US")

    assert len(calls) == 2
    get_method, get_headers = calls[0]
    assert get_method == "GET"
    assert get_headers == {"Authorization": "Bearer token"}
    assert "Content-Language" not in get_headers

    put_method, put_headers = calls[1]
    assert put_method == "PUT"
    assert put_headers["Authorization"] == "Bearer token"
    assert put_headers["Content-Type"] == "application/json"
    assert put_headers["Content-Language"] == "en-US"


def test_update_quantity_merges_quantity_into_existing_item(monkeypatch):
    """update_quantity fetches the existing item (GET) and updates only the quantity before PUT."""
    calls = []

    def _mock_request(method, url, **kwargs):
        calls.append((method, kwargs.get("json")))
        if method == "GET":
            return {
                "condition": "USED_GOOD",
                "product": {"title": "Articolo esistente"},
                "availability": {"shipToLocationAvailability": {"quantity": 10}},
            }
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    EbayInventoryService.update_quantity("token", "SKU-1", 3, marketplace_id="EBAY_IT")

    assert [method for method, _ in calls] == ["GET", "PUT"]
    _, put_payload = calls[1]
    # PUT payload must preserve existing product data
    assert put_payload["product"]["title"] == "Articolo esistente"
    assert put_payload["condition"] == "USED_GOOD"
    # And update only the quantity
    assert put_payload["availability"]["shipToLocationAvailability"]["quantity"] == 3


def test_publish_request_shipping_cost_default_is_590_and_optional():
    payload = PublishRequest(product_id=1)
    assert payload.shipping_cost == 5.90

    payload_with_none = PublishRequest(product_id=1, shipping_cost=None)
    assert payload_with_none.shipping_cost is None


def test_is_trading_card_category_helper():
    assert ebay_router_module._is_trading_card_category("183454") is True
    assert ebay_router_module._is_trading_card_category("183455") is True
    assert ebay_router_module._is_trading_card_category("19077") is False


def test_publish_listing_blocks_trading_card_category_without_game(client, auth_headers, db, monkeypatch):
    _create_publish_connection(db)
    product = _create_publish_product(db, "SKU-TCG-NOGAME-1")
    inventory_calls = []
    offer_calls = []

    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", lambda *_args, **_kwargs: "token")
    monkeypatch.setattr(
        "app.routers.ebay.EbayInventoryService.create_or_update_inventory_item",
        lambda *_args, **_kwargs: inventory_calls.append((_args, _kwargs)),
    )
    monkeypatch.setattr(
        "app.routers.ebay.EbayOfferService.create_offer",
        lambda *_args, **_kwargs: offer_calls.append((_args, _kwargs)),
    )

    response = client.post(
        "/api/ebay/listings/publish",
        headers=auth_headers,
        json={"product_id": product.id, "ebay_category_id": "183454"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Per le categorie di carte collezionabili è obbligatorio specificare il Gioco nella scheda prodotto"
    )
    assert inventory_calls == []
    assert offer_calls == []
    assert db.query(EbayListing).count() == 0


def test_publish_listing_propagates_product_game_to_inventory_retries(client, auth_headers, db, monkeypatch):
    _create_publish_connection(db)
    product = _create_publish_product(db, "SKU-TCG-GAME-1", gioco="Pokémon")
    inventory_calls = []

    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", lambda *_args, **_kwargs: "token")

    def _mock_inventory(*args, **kwargs):
        inventory_calls.append(kwargs)

    monkeypatch.setattr("app.routers.ebay.EbayInventoryService.create_or_update_inventory_item", _mock_inventory)
    monkeypatch.setattr("app.routers.ebay.EbayOfferService.create_offer", lambda *_args, **_kwargs: "OFFER-1")

    publish_attempts = {"count": 0}

    def _mock_publish_offer(*_args, **_kwargs):
        publish_attempts["count"] += 1
        if publish_attempts["count"] == 1:
            raise HTTPException(status_code=400, detail="Condizione non valida per la categoria")
        return "LISTING-1"

    monkeypatch.setattr("app.routers.ebay.EbayOfferService.publish_offer", _mock_publish_offer)

    response = client.post(
        "/api/ebay/listings/publish",
        headers=auth_headers,
        json={"product_id": product.id, "ebay_category_id": "183454"},
    )

    assert response.status_code == 200
    assert len(inventory_calls) == 2
    assert [call["item_game"] for call in inventory_calls] == ["Pokémon", "Pokémon"]


def test_publish_listing_allows_non_trading_category_without_game(client, auth_headers, db, monkeypatch):
    _create_publish_connection(db)
    product = _create_publish_product(db, "SKU-NONTCG-1")
    inventory_calls = []

    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", lambda *_args, **_kwargs: "token")
    monkeypatch.setattr(
        "app.routers.ebay.EbayInventoryService.create_or_update_inventory_item",
        lambda *_args, **kwargs: inventory_calls.append(kwargs),
    )
    monkeypatch.setattr("app.routers.ebay.EbayOfferService.create_offer", lambda *_args, **_kwargs: "OFFER-2")
    monkeypatch.setattr("app.routers.ebay.EbayOfferService.publish_offer", lambda *_args, **_kwargs: "LISTING-2")

    response = client.post(
        "/api/ebay/listings/publish",
        headers=auth_headers,
        json={"product_id": product.id, "ebay_category_id": "19077"},
    )

    assert response.status_code == 200
    assert len(inventory_calls) == 1
    assert inventory_calls[0]["item_game"] is None


def test_create_offer_uses_real_description_and_shipping_note(monkeypatch):
    captured = {}

    def _mock_ensure_location(token, marketplace_id):
        return "default_location", True

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return SimpleNamespace(json=lambda: {"offerId": "OFFER-1"})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    offer_id = EbayOfferService.create_offer(
        token="token",
        sku="SKU-1",
        price=Decimal("12.34"),
        quantity=2,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Descrizione prodotto reale",
        shipping_cost=Decimal("4.5"),
        category_id="19077",
    )

    assert offer_id == "OFFER-1"
    assert listing_db.ebay_offer_id == "OFFER-1"
    assert captured["payload"]["listingDescription"] == "Descrizione prodotto reale"
    assert "Spedizione" not in captured["payload"]["listingDescription"]


def test_create_offer_sanitizes_description_and_maps_currency(monkeypatch):
    captured = {}

    def _mock_ensure_location(token, marketplace_id):
        return "default_location", True

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return SimpleNamespace(json=lambda: {"offerId": "OFFER-1"})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    EbayOfferService.create_offer(
        token="token",
        sku="SKU-1",
        price=Decimal("12.34"),
        quantity=1,
        marketplace_id="EBAY_GB",
        listing_db=listing_db,
        description="<p>Descrizione <b>valida</b></p>\n\n\nDettagli",
        category_id="9355",
    )

    assert captured["payload"]["listingDescription"] == "Descrizione valida\n\nDettagli"
    assert captured["payload"]["pricingSummary"]["price"]["currency"] == "GBP"


def test_create_offer_auction_format(monkeypatch):
    captured = {}

    def _mock_ensure_location(token, marketplace_id):
        return "default_location", True

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return SimpleNamespace(json=lambda: {"offerId": "OFFER-AUCTION-1"})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    offer_id = EbayOfferService.create_offer(
        token="token",
        sku="SKU-AUCTION",
        price=Decimal("10.00"),
        quantity=3,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Moneta rara",
        listing_format="AUCTION",
        auction_start_price=0.99,
        auction_duration="DAYS_7",
        auction_reserve_price=5.00,
        auction_buy_it_now_price=15.00,
        category_id="45101",
    )

    assert offer_id == "OFFER-AUCTION-1"
    payload = captured["payload"]
    assert payload["format"] == "AUCTION"
    assert "availableQuantity" not in payload
    assert payload["listingDuration"] == "DAYS_7"
    assert payload["pricingSummary"]["auctionStartPrice"]["value"] == "0.99"
    assert payload["pricingSummary"]["auctionStartPrice"]["currency"] == "EUR"
    assert payload["pricingSummary"]["auctionReservePrice"]["value"] == "5.0"
    assert payload["pricingSummary"]["price"]["value"] == "15.0"
    assert "Spedizione" not in payload["listingDescription"]


def test_create_offer_auction_format_minimal(monkeypatch):
    captured = {}

    def _mock_ensure_location(token, marketplace_id):
        return "default_location", True

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return SimpleNamespace(json=lambda: {"offerId": "OFFER-AUCTION-2"})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    EbayOfferService.create_offer(
        token="token",
        sku="SKU-AUCTION-2",
        price=Decimal("10.00"),
        quantity=5,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Moneta",
        listing_format="AUCTION",
        auction_start_price=1.00,
        category_id="45101",
    )

    payload = captured["payload"]
    assert payload["format"] == "AUCTION"
    assert "availableQuantity" not in payload
    assert "listingDuration" not in payload
    assert "auctionReservePrice" not in payload["pricingSummary"]
    assert "price" not in payload["pricingSummary"]


def test_create_offer_auction_delete_and_recreate_keeps_payload_without_available_quantity(monkeypatch):
    payloads = []

    def _mock_ensure_location(token, marketplace_id):
        return "default_it", True

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        if method == "POST" and url.endswith("/offer"):
            payloads.append(kwargs["json"])
            if len(payloads) == 1:
                request = httpx.Request("POST", url)
                response = httpx.Response(
                    400,
                    request=request,
                    json={"errors": [{"errorId": 25002, "message": "Offer already exists.", "parameters": [{"name": "offerId", "value": "STALE-AUCT-1"}]}]},
                )
                raise httpx.HTTPStatusError("Bad request", request=request, response=response)
            return SimpleNamespace(json=lambda: {"offerId": "OFFER-AUCTION-3"})
        if method == "DELETE":
            return SimpleNamespace()
        return SimpleNamespace(json=lambda: {})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    offer_id = EbayOfferService.create_offer(
        token="token",
        sku="SKU-AUCTION-3",
        price=Decimal("10.00"),
        quantity=2,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Moneta",
        listing_format="AUCTION",
        auction_start_price=1.00,
        category_id="45101",
    )

    assert offer_id == "OFFER-AUCTION-3"
    assert len(payloads) == 2
    assert all(payload["format"] == "AUCTION" for payload in payloads)
    assert all("availableQuantity" not in payload for payload in payloads)


def test_create_offer_offer_entity_already_exists_deletes_and_recreates_once(monkeypatch, caplog):
    calls = []

    def _mock_ensure_location(token, marketplace_id):
        return "default_it", True

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        calls.append(method)
        if method == "POST" and url.endswith("/offer"):
            if len([call for call in calls if call == "POST"]) == 1:
                request = httpx.Request("POST", url)
                response = httpx.Response(
                    400,
                    request=request,
                    json={
                        "errors": [{
                            "errorId": 25002,
                            "message": "A user error has occurred. Offer entity already exists.",
                            "parameters": [{"name": "offerId", "value": "EXISTING-OFFER-1"}],
                        }]
                    },
                )
                raise httpx.HTTPStatusError("Bad request", request=request, response=response)
            return SimpleNamespace(json=lambda: {"offerId": "NEW-OFFER-1"})
        if method == "DELETE":
            return SimpleNamespace()
        return SimpleNamespace(json=lambda: {})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    offer_id = EbayOfferService.create_offer(
        token="token",
        sku="SKU-OFFER-ENTITY-1",
        price=Decimal("12.34"),
        quantity=1,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Descrizione",
        category_id="19077",
    )

    assert offer_id == "NEW-OFFER-1"
    assert calls.count("POST") == 2
    assert calls.count("DELETE") == 1
    assert any("deleting and recreating once" in message for message in caplog.messages)


def test_create_offer_uses_only_offer_api_headers(monkeypatch):
    captured = {}

    def _mock_ensure_location(token, marketplace_id):
        return "default_location", True

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        captured["headers"] = kwargs["headers"]
        return SimpleNamespace(json=lambda: {"offerId": "OFFER-1"})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    EbayOfferService.create_offer(
        token="token",
        sku="SKU-1",
        price=Decimal("12.34"),
        quantity=1,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Descrizione",
        category_id="19077",
    )

    assert captured["headers"]["Authorization"] == "Bearer token"
    assert captured["headers"]["Content-Type"] == "application/json"
    assert captured["headers"].get("Content-Language") == "it-IT"


def test_create_offer_logs_error_body_and_propagates_ebay_message(monkeypatch, caplog):
    def _mock_ensure_location(token, marketplace_id):
        return "default_location", True

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        request = httpx.Request("POST", url)
        response = httpx.Response(
            400,
            request=request,
            json={"errors": [{"message": "INVALID_FIELD_VALUE"}]},
        )
        raise httpx.HTTPStatusError("Bad request", request=request, response=response)

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    with pytest.raises(HTTPException) as exc_info:
        EbayOfferService.create_offer(
            token="token",
            sku="SKU-1",
            price=Decimal("12.34"),
            quantity=1,
            marketplace_id="EBAY_IT",
            listing_db=listing_db,
            description="Descrizione",
            category_id="19077",
        )

    assert exc_info.value.detail == "Errore creazione offer eBay: 400 (INVALID_FIELD_VALUE)"
    assert any("eBay create_offer error 400 — body:" in message for message in caplog.messages)


def test_publish_offer_logs_error_body_and_propagates_ebay_message(monkeypatch, caplog):
    def _mock_request(method, url, **kwargs):
        request = httpx.Request("POST", url)
        response = httpx.Response(
            422,
            request=request,
            json={"errors": [{"message": "INVALID_FIELD"}]},
        )
        raise httpx.HTTPStatusError("Unprocessable", request=request, response=response)

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    with pytest.raises(HTTPException) as exc_info:
        EbayOfferService.publish_offer("token", "OFFER-1")

    assert exc_info.value.detail == "Errore pubblicazione annuncio eBay: 422 (INVALID_FIELD)"
    assert any("eBay publish_offer error 422" in message for message in caplog.messages)


def test_publish_get_and_end_listing_do_not_send_content_language(monkeypatch):
    calls = []

    def _mock_request(method, url, **kwargs):
        calls.append((method, kwargs.get("headers", {})))
        if method == "POST" and url.endswith("/publish"):
            return SimpleNamespace(json=lambda: {"listingId": "LISTING-1"})
        if method == "GET":
            return SimpleNamespace(json=lambda: {"offerId": "OFFER-1"})
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_id = EbayOfferService.publish_offer("token", "OFFER-1")
    offer = EbayOfferService.get_offer("token", "OFFER-1")
    EbayOfferService.end_listing("token", "OFFER-1")

    assert listing_id == "LISTING-1"
    assert offer["offerId"] == "OFFER-1"

    for method, headers in calls:
        assert "Content-Language" not in headers
        if method in ("GET", "DELETE"):
            assert headers == {"Authorization": "Bearer token"}
        if method == "POST":
            assert headers["Authorization"] == "Bearer token"


def test_request_with_retry_does_not_inject_extra_headers(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

    class _DummyClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def request(self, method, url, **kwargs):
            captured["method"] = method
            captured["url"] = url
            captured["kwargs"] = kwargs
            return _DummyResponse()

    monkeypatch.setattr("app.services.ebay_offer_service.httpx.Client", _DummyClient)

    headers = {"Authorization": "Bearer token"}
    EbayOfferService._request_with_retry("GET", "https://api.example.com/test", headers=headers)

    assert captured["kwargs"]["headers"] == headers
    assert "Content-Language" not in captured["kwargs"]["headers"]


def test_request_with_retry_passes_headers_through(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

    class _DummyClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def request(self, method, url, **kwargs):
            captured["kwargs"] = kwargs
            return _DummyResponse()

    monkeypatch.setattr("app.services.ebay_offer_service.httpx.Client", _DummyClient)

    EbayOfferService._request_with_retry(
        "GET",
        "https://api.example.com/test",
        headers={"Authorization": "Bearer token", "Content-Language": "it-IT"},
    )

    # Headers are passed as-is (no stripping at transport level)
    assert captured["kwargs"]["headers"]["Authorization"] == "Bearer token"
    assert captured["kwargs"]["headers"].get("Content-Language") == "it-IT"


def test_offer_request_with_retry_serializes_non_ascii_json(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

    class _DummyClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def request(self, method, url, **kwargs):
            captured["kwargs"] = kwargs
            return _DummyResponse()

    monkeypatch.setattr("app.services.ebay_offer_service.httpx.Client", _DummyClient)

    payload = {"title": "Caffè àê™"}
    EbayOfferService._request_with_retry(
        "POST",
        "https://api.example.com/test",
        headers={"Authorization": "Bearer token"},
        json=payload,
    )

    headers = captured["kwargs"]["headers"]
    assert headers["Content-Type"] == "application/json"
    assert captured["kwargs"]["content"] == json.dumps(payload, ensure_ascii=True).encode("ascii")
    assert "json" not in captured["kwargs"]


def test_inventory_request_with_retry_passes_headers_through(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200
        ok = True
        content = b"{}"

        @staticmethod
        def json():
            return {}

    def _dummy_request(self, method, url, headers=None, data=None, params=None, timeout=None):
        captured["method"] = method
        captured["url"] = url
        captured["headers"] = headers
        captured["data"] = data
        captured["params"] = params
        captured["timeout"] = timeout
        return _DummyResponse()

    monkeypatch.setattr("app.services.ebay_inventory_service.requests.Session.request", _dummy_request)

    EbayInventoryService._request_with_retry(
        "PUT",
        "https://api.example.com/test",
        headers={
            "Authorization": "Bearer token",
            "Content-Language": "it-IT",
        },
    )

    # Headers are passed as-is (no stripping in _request_with_retry)
    assert captured["headers"]["Authorization"] == "Bearer token"
    normalized_headers = {key.lower(): value for key, value in captured["headers"].items()}
    assert normalized_headers["content-language"] == "it-IT"
    assert captured["timeout"] == 30


def test_inventory_request_with_retry_serializes_non_ascii_json(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200
        ok = True
        content = b"{}"

        @staticmethod
        def json():
            return {}

    def _dummy_request(self, method, url, headers=None, data=None, params=None, timeout=None):
        captured["headers"] = headers
        captured["data"] = data
        captured["params"] = params
        captured["timeout"] = timeout
        return _DummyResponse()

    monkeypatch.setattr("app.services.ebay_inventory_service.requests.Session.request", _dummy_request)

    payload = {"title": "Caffè Espresso àê™"}
    EbayInventoryService._request_with_retry(
        "PUT",
        "https://api.example.com/test",
        headers={"Authorization": "Bearer token", "Content-Language": "it-IT"},
        json=payload,
    )

    headers = captured["headers"]
    normalized_headers = {key.lower(): value for key, value in headers.items()}
    # Content-Language is passed as-is (no stripping in _request_with_retry)
    assert normalized_headers["content-language"] == "it-IT"
    assert normalized_headers["content-type"] == "application/json"
    assert captured["data"] == json.dumps(payload, ensure_ascii=True).encode("ascii")
    assert captured["timeout"] == 30


def test_inventory_item_logs_error_body_for_any_status(monkeypatch, caplog):
    class _DummyResponse:
        status_code = 500
        ok = False
        content = b'{"error":"internal"}'
        text = '{"error":"internal"}'

    def _mock_request(self, method, url, headers=None, data=None, params=None, timeout=None):
        return _DummyResponse()

    monkeypatch.setattr("app.services.ebay_inventory_service.requests.Session.request", _mock_request)

    with pytest.raises(HTTPException) as exc_info:
        EbayInventoryService._request_with_retry("PUT", "https://api.example.com/test", headers={"Authorization": "x"})

    assert exc_info.value.detail == "Errore creazione inventory eBay: 500"
    assert any("eBay inventory_item error 500 — body:" in message for message in caplog.messages)


def test_inventory_item_propagates_ebay_error_message_on_400(monkeypatch):
    def _mock_request(method, url, **kwargs):
        raise HTTPException(
            status_code=502,
            detail="Errore creazione inventory eBay: 400 (Invalid value for header Content-Language.)",
        )

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Carta",
        descrizione="Descrizione",
        stato_conservazione="Good",
        foto_path="https://img.example.com/a.jpg",
        google_drive_folder_id=None,
    )
    listing = SimpleNamespace(quantity_published=1, ebay_item_id=None, last_sync_at=None)

    with pytest.raises(HTTPException) as exc_info:
        EbayInventoryService.create_or_update_inventory_item("token", "SKU-1", product, listing)

    assert exc_info.value.status_code == 502
    assert exc_info.value.detail == (
        "Errore creazione inventory eBay: 400 (Invalid value for header Content-Language.)"
    )


def test_put_inventory_item_with_fallback_retries_without_condition_description_on_400(monkeypatch, caplog):
    """When PUT returns 400 and conditionDescription is in payload, retry without it."""
    calls = []

    def _mock_request(method, url, **kwargs):
        payload = kwargs.get("json", {})
        calls.append(dict(payload))
        if len(calls) == 1:
            raise ebay_inventory_service_module._EbayRequestHTTPException(
                ebay_status=400,
                detail="Errore creazione inventory eBay: 400 (invalid condition)",
            )
        return None  # second attempt succeeds

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    payload = {"condition": "USED_GOOD", "conditionDescription": "Good"}
    EbayInventoryService._put_inventory_item_with_fallback(
        "https://api.example.com/sell/inventory/v1/inventory_item/SKU-1",
        headers={"Authorization": "Bearer token"},
        payload=payload,
    )

    assert len(calls) == 2
    assert "conditionDescription" in calls[0]
    assert "conditionDescription" not in calls[1]
    assert any("retrying without conditionDescription" in msg for msg in caplog.messages)


def test_put_inventory_item_with_fallback_reraises_non_400_error(monkeypatch):
    """Errors other than 400 are re-raised immediately (no retry)."""
    calls = []

    def _mock_request(method, url, **kwargs):
        calls.append(kwargs.get("json", {}))
        raise ebay_inventory_service_module._EbayRequestHTTPException(
            ebay_status=422,
            detail="Errore creazione inventory eBay: 422",
        )

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    with pytest.raises(ebay_inventory_service_module._EbayRequestHTTPException) as exc_info:
        EbayInventoryService._put_inventory_item_with_fallback(
            "https://api.example.com/sell/inventory/v1/inventory_item/SKU-1",
            headers={"Authorization": "Bearer token"},
            payload={"condition": "USED_GOOD", "conditionDescription": "Good"},
        )

    assert exc_info.value.ebay_status == 422
    assert len(calls) == 1  # no retry


def test_put_inventory_item_with_fallback_reraises_400_without_condition_description(monkeypatch):
    """A 400 without conditionDescription in payload is re-raised without retry."""
    calls = []

    def _mock_request(method, url, **kwargs):
        calls.append(kwargs.get("json", {}))
        raise ebay_inventory_service_module._EbayRequestHTTPException(
            ebay_status=400,
            detail="Errore creazione inventory eBay: 400",
        )

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    with pytest.raises(ebay_inventory_service_module._EbayRequestHTTPException):
        EbayInventoryService._put_inventory_item_with_fallback(
            "https://api.example.com/sell/inventory/v1/inventory_item/SKU-1",
            headers={"Authorization": "Bearer token"},
            payload={"condition": "NEW"},  # no conditionDescription
        )

    assert len(calls) == 1  # no retry since no conditionDescription


def test_put_inventory_item_with_fallback_retries_with_fallback_condition_on_condition_error(monkeypatch, caplog):
    """When PUT returns 400 with a condition-related error and no conditionDescription,
    retry with the next condition in the fallback chain."""
    calls = []

    def _mock_request(method, url, **kwargs):
        payload = kwargs.get("json", {})
        calls.append(dict(payload))
        if len(calls) == 1:
            raise ebay_inventory_service_module._EbayRequestHTTPException(
                ebay_status=400,
                detail="Errore creazione inventory eBay: 400 (invalid item condition information)",
            )
        return None  # second attempt succeeds

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    payload = {"condition": "USED_EXCELLENT"}
    EbayInventoryService._put_inventory_item_with_fallback(
        "https://api.example.com/sell/inventory/v1/inventory_item/SKU-1",
        headers={"Authorization": "Bearer token"},
        payload=payload,
    )

    assert len(calls) == 2
    assert calls[0]["condition"] == "USED_EXCELLENT"
    assert calls[1]["condition"] == "USED_GOOD"
    assert any("USED_EXCELLENT" in msg and "USED_GOOD" in msg for msg in caplog.messages)


def test_put_inventory_item_with_fallback_condition_chain_new_to_used_excellent(monkeypatch, caplog):
    """NEW condition should fall back to USED_EXCELLENT on a condition error."""
    calls = []

    def _mock_request(method, url, **kwargs):
        payload = kwargs.get("json", {})
        calls.append(dict(payload))
        if len(calls) == 1:
            raise ebay_inventory_service_module._EbayRequestHTTPException(
                ebay_status=400,
                detail="Errore creazione inventory eBay: 400 (invalid item condition)",
            )
        return None

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    EbayInventoryService._put_inventory_item_with_fallback(
        "https://api.example.com/sell/inventory/v1/inventory_item/SKU-1",
        headers={"Authorization": "Bearer token"},
        payload={"condition": "NEW"},
    )

    assert len(calls) == 2
    assert calls[1]["condition"] == "USED_EXCELLENT"


def test_put_inventory_item_with_fallback_removes_condition_description_before_condition_fallback(monkeypatch, caplog):
    """When payload has conditionDescription, remove it first; if still 400 with condition error,
    then apply condition fallback (3 attempts total)."""
    calls = []

    def _mock_request(method, url, **kwargs):
        payload = kwargs.get("json", {})
        calls.append(dict(payload))
        raise ebay_inventory_service_module._EbayRequestHTTPException(
            ebay_status=400,
            detail="Errore creazione inventory eBay: 400 (invalid item condition information)",
        )

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    with pytest.raises(ebay_inventory_service_module._EbayRequestHTTPException):
        EbayInventoryService._put_inventory_item_with_fallback(
            "https://api.example.com/sell/inventory/v1/inventory_item/SKU-1",
            headers={"Authorization": "Bearer token"},
            payload={"condition": "USED_EXCELLENT", "conditionDescription": "Molto buono"},
        )

    # Attempt 1: full payload (conditionDescription present)
    # Attempt 2: without conditionDescription (condition error → condition fallback)
    # Attempt 3: with fallback condition USED_GOOD, still fails → re-raise
    assert len(calls) == 3
    assert "conditionDescription" in calls[0]
    assert "conditionDescription" not in calls[1]
    assert calls[1]["condition"] == "USED_EXCELLENT"
    assert calls[2]["condition"] == "USED_GOOD"
    assert "conditionDescription" not in calls[2]


def test_put_inventory_item_with_fallback_no_condition_fallback_when_no_fallback_available(monkeypatch):
    """USED_ACCEPTABLE has no further fallback — 400 condition error is re-raised immediately."""
    calls = []

    def _mock_request(method, url, **kwargs):
        calls.append(kwargs.get("json", {}))
        raise ebay_inventory_service_module._EbayRequestHTTPException(
            ebay_status=400,
            detail="Errore creazione inventory eBay: 400 (invalid item condition)",
        )

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    with pytest.raises(ebay_inventory_service_module._EbayRequestHTTPException):
        EbayInventoryService._put_inventory_item_with_fallback(
            "https://api.example.com/sell/inventory/v1/inventory_item/SKU-1",
            headers={"Authorization": "Bearer token"},
            payload={"condition": "USED_ACCEPTABLE"},  # no fallback for this
        )

    assert len(calls) == 1  # re-raised immediately, no retry


def test_condition_fallback_map_entries():
    """Verify the _CONDITION_FALLBACK map has the expected entries."""
    fb = ebay_inventory_service_module._CONDITION_FALLBACK
    assert fb["NEW"] == "USED_EXCELLENT"
    assert fb["NEW_OTHER"] == "USED_EXCELLENT"
    assert fb["NEW_WITH_DEFECTS"] == "USED_GOOD"
    assert fb["LIKE_NEW"] == "USED_EXCELLENT"
    assert fb["USED_EXCELLENT"] == "USED_GOOD"
    assert "USED_GOOD" not in fb
    assert "USED_ACCEPTABLE" not in fb  # terminal condition


def test_create_or_update_inventory_item_accepts_category_id_parameter(monkeypatch):
    """category_id parameter is accepted without error (reserved for future category-aware validation).

    TODO: once category-aware condition validation is implemented, this test should also assert
    that the category_id is used to fetch/validate valid conditions for the given category.
    """
    captured = {}

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return None

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Action Figure Dragon Ball",
        descrizione="Personaggio in ottime condizioni",
        stato_conservazione="Near Mint",
        foto_path="https://img.example.com/fig.jpg",
        google_drive_folder_id=None,
    )
    listing = SimpleNamespace(quantity_published=1, ebay_item_id=None, last_sync_at=None)

    # Should not raise even with category_id provided
    EbayInventoryService.create_or_update_inventory_item(
        "token",
        "SKU-TOY-1",
        product,
        listing,
        marketplace_id="EBAY_IT",
        category_id="19077",
    )

    payload = captured["payload"]
    assert payload["condition"] == "USED_EXCELLENT"
    assert payload["conditionDescription"] == "Near Mint"


def test_create_or_update_inventory_item_skip_condition_description_flag(monkeypatch):
    """When skip_condition_description=True, conditionDescription must be omitted even for non-NEW conditions."""
    captured = {}

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return None

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Action Figure Dragon Ball",
        descrizione="Personaggio usato",
        stato_conservazione="Good",
        foto_path="https://img.example.com/fig.jpg",
        google_drive_folder_id=None,
    )
    listing = SimpleNamespace(quantity_published=1, ebay_item_id=None, last_sync_at=None)

    EbayInventoryService.create_or_update_inventory_item(
        "token",
        "SKU-TOY-2",
        product,
        listing,
        marketplace_id="EBAY_IT",
        skip_condition_description=True,
    )

    payload = captured["payload"]
    assert payload["condition"] == "USED_GOOD"
    assert "conditionDescription" not in payload


def test_create_or_update_inventory_item_condition_description_present_by_default(monkeypatch):
    """By default (skip_condition_description=False), conditionDescription is included for non-NEW conditions."""
    captured = {}

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return None

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Figura usata",
        descrizione="Descrizione prodotto",
        stato_conservazione="Good",
        foto_path="https://img.example.com/fig.jpg",
        google_drive_folder_id=None,
    )
    listing = SimpleNamespace(quantity_published=1, ebay_item_id=None, last_sync_at=None)

    EbayInventoryService.create_or_update_inventory_item(
        "token",
        "SKU-TOY-3",
        product,
        listing,
        marketplace_id="EBAY_IT",
    )

    payload = captured["payload"]
    assert payload["condition"] == "USED_GOOD"
    assert "conditionDescription" in payload
    assert payload["conditionDescription"] == "Good"


def test_create_or_update_inventory_item_skip_condition_description_with_condition_override(monkeypatch):
    """skip_condition_description works together with condition_override."""
    captured = {}

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return None

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    product = SimpleNamespace(
        nome="Action Figure",
        descrizione="Dettagli prodotto",
        stato_conservazione="Like New",
        foto_path="https://img.example.com/fig.jpg",
        google_drive_folder_id=None,
    )
    listing = SimpleNamespace(quantity_published=1, ebay_item_id=None, last_sync_at=None)

    EbayInventoryService.create_or_update_inventory_item(
        "token",
        "SKU-TOY-4",
        product,
        listing,
        marketplace_id="EBAY_IT",
        condition_override="USED_EXCELLENT",
        skip_condition_description=True,
    )

    payload = captured["payload"]
    assert payload["condition"] == "USED_EXCELLENT"
    assert "conditionDescription" not in payload


def test_condition_map_good_maps_to_used_good():
    """'Good' condition should map to USED_GOOD (widely accepted across categories incl. toys)."""
    from app.services.ebay_inventory_service import _CONDITION_MAP
    assert _CONDITION_MAP["Good"] == "USED_GOOD"
    assert _CONDITION_MAP["Like New"] == "USED_EXCELLENT"
    assert _CONDITION_MAP["Very Good"] == "USED_EXCELLENT"
    assert _CONDITION_MAP["Acceptable"] == "USED_GOOD"


def test_get_category_conditions_uses_item_condition_policies_and_matching_policy(client, auth_headers, monkeypatch):
    captured = {}
    fake_connection = SimpleNamespace(status="active")

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

        @staticmethod
        def json():
            return {
                "itemConditionPolicies": [
                    {
                        "categoryId": "999999",
                        "itemConditions": [
                            {"conditionId": "5000", "conditionDescription": "Wrong policy"},
                        ],
                    },
                    {
                        "categoryId": "183454",
                        "itemConditions": [
                            {"conditionId": "2750", "conditionDescription": "Come nuovo"},
                            {"conditionId": "3000", "conditionDescription": "Usato eccellente"},
                        ],
                    },
                ]
            }

    class _DummyClient:
        def __init__(self, timeout):
            captured["timeout"] = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def get(self, url, **kwargs):
            captured["url"] = url
            captured["headers"] = kwargs["headers"]
            captured["params"] = kwargs["params"]
            return _DummyResponse()

    monkeypatch.setattr("app.routers.ebay._get_connection", lambda db: fake_connection)
    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", lambda connection, db: "user-token")
    monkeypatch.setattr("app.routers.ebay.httpx.Client", _DummyClient)

    response = client.get(
        "/api/ebay/category_conditions",
        params={"category_id": "183454", "marketplace_id": "EBAY_IT"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert captured["timeout"] == 15
    assert captured["url"].endswith("/sell/metadata/v1/marketplace/EBAY_IT/get_item_condition_policies")
    assert captured["headers"] == {"Authorization": "Bearer " + "user-token"}
    assert captured["params"] == {"filter": "categoryIds:183454"}
    assert response.json() == {
        "conditions": [
            {
                "conditionId": "2750",
                "conditionEnum": "LIKE_NEW",
                "conditionDescription": "Come nuovo",
            },
            {
                "conditionId": "3000",
                "conditionEnum": "USED_EXCELLENT",
                "conditionDescription": "Usato eccellente",
            },
        ]
    }


def test_get_category_conditions_falls_back_to_first_policy_and_logs_info(client, auth_headers, monkeypatch, caplog):
    fake_connection = SimpleNamespace(status="active")
    caplog.set_level(logging.INFO, logger=ebay_router_module.logger.name)

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

        @staticmethod
        def json():
            return {
                "itemConditionPolicies": [
                    {
                        "categoryId": "183454",
                        "itemConditions": [
                            {"conditionId": "4000", "conditionDescription": "Usato molto buono"},
                            {"conditionId": "5000", "conditionDescription": "Usato buono"},
                            {"conditionId": "6000", "conditionDescription": "Usato accettabile"},
                        ],
                    }
                ]
            }

    class _DummyClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def get(self, url, **kwargs):
            return _DummyResponse()

    monkeypatch.setattr("app.routers.ebay._get_connection", lambda db: fake_connection)
    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", lambda connection, db: "user-token")
    monkeypatch.setattr("app.routers.ebay.httpx.Client", _DummyClient)

    response = client.get(
        "/api/ebay/category_conditions",
        params={"category_id": "183455", "marketplace_id": "EBAY_IT"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "conditions": [
            {
                "conditionId": "4000",
                "conditionEnum": "USED_VERY_GOOD",
                "conditionDescription": "Usato molto buono",
            },
            {
                "conditionId": "5000",
                "conditionEnum": "USED_GOOD",
                "conditionDescription": "Usato buono",
            },
            {
                "conditionId": "6000",
                "conditionEnum": "USED_ACCEPTABLE",
                "conditionDescription": "Usato accettabile",
            },
        ]
    }
    assert any("missing exact policy match for category=183455" in message for message in caplog.messages)


def test_get_category_conditions_logs_warning_when_empty(client, auth_headers, monkeypatch, caplog):
    fake_connection = SimpleNamespace(status="active")

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

        @staticmethod
        def json():
            return {"itemConditionPolicies": []}

    class _DummyClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def get(self, url, **kwargs):
            return _DummyResponse()

    monkeypatch.setattr("app.routers.ebay._get_connection", lambda db: fake_connection)
    monkeypatch.setattr("app.routers.ebay.EbayAuthService.get_valid_token", lambda connection, db: "user-token")
    monkeypatch.setattr("app.routers.ebay.httpx.Client", _DummyClient)

    response = client.get(
        "/api/ebay/category_conditions",
        params={"category_id": "183455", "marketplace_id": "EBAY_IT"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json() == {"conditions": []}
    assert any("returned no policies for marketplace=EBAY_IT category=183455" in message for message in caplog.messages)
    assert any("returned no supported conditions for marketplace=EBAY_IT category=183455" in message for message in caplog.messages)


def test_condition_id_to_enum_mapping_is_aligned():
    mapping = ebay_router_module._CONDITION_ID_TO_ENUM

    assert mapping["2000"] == "MANUFACTURER_REFURBISHED"
    assert mapping["2010"] == "EXCELLENT_REFURBISHED"
    assert mapping["2020"] == "VERY_GOOD_REFURBISHED"
    assert mapping["2030"] == "GOOD_REFURBISHED"
    assert mapping["2500"] == "SELLER_REFURBISHED"
    assert mapping["2750"] == "LIKE_NEW"
    assert mapping["3000"] == "USED_EXCELLENT"
    assert mapping["4000"] == "USED_VERY_GOOD"
    assert mapping["5000"] == "USED_GOOD"
    assert mapping["6000"] == "USED_ACCEPTABLE"


def test_policy_cache_ttl_expiration(monkeypatch):
    ebay_offer_service_module._policy_cache.clear()
    call_count = {"count": 0}
    current_time = {"value": 1000.0}

    def _mock_time():
        return current_time["value"]

    def _mock_request(method, url, **kwargs):
        call_count["count"] += 1
        return SimpleNamespace(
            json=lambda: {
                "paymentPolicies": [
                    {"paymentPolicyId": "PAY-1"},
                ]
            }
        )

    monkeypatch.setattr("app.services.ebay_offer_service.time.time", _mock_time)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    first_policy_id = EbayOfferService._fetch_default_policy_id("token", "EBAY_IT", "payment")
    second_policy_id = EbayOfferService._fetch_default_policy_id("token", "EBAY_IT", "payment")

    assert first_policy_id == "PAY-1"
    assert second_policy_id == "PAY-1"
    assert call_count["count"] == 1

    current_time["value"] += ebay_offer_service_module._POLICY_CACHE_TTL + 1
    third_policy_id = EbayOfferService._fetch_default_policy_id("token", "EBAY_IT", "payment")

    assert third_policy_id == "PAY-1"
    assert call_count["count"] == 2


def test_exchange_code_for_tokens_fetches_and_stores_identity_username(monkeypatch):
    class _DummyResponse:
        def __init__(self, payload):
            self._payload = payload

        def json(self):
            return self._payload

    class _DummyQuery:
        @staticmethod
        def delete():
            return None

    class _DummyDB:
        def __init__(self):
            self.saved = None

        @staticmethod
        def query(_model):
            return _DummyQuery()

        def add(self, obj):
            self.saved = obj

        @staticmethod
        def commit():
            return None

        @staticmethod
        def refresh(_obj):
            return None

    def _mock_request(method, url, **kwargs):
        if method == "POST":
            return _DummyResponse(
                {
                    "access_token": "access-token",
                    "refresh_token": "refresh-token",
                    "expires_in": 7200,
                }
            )
        assert method == "GET"
        assert url.endswith("/commerce/identity/v1/user/")
        assert kwargs["headers"] == {"Authorization": "Bearer access-token"}
        return _DummyResponse({"username": "real-ebay-user"})

    monkeypatch.setattr(
        "app.services.ebay_auth_service.EbayAuthService.get_cached_state_data",
        lambda _state: {"code_verifier": "verifier"},
    )
    monkeypatch.setattr("app.services.ebay_auth_service.EbayAuthService._credentials", lambda: ("cid", "secret"))
    monkeypatch.setattr("app.services.ebay_auth_service.EbayAuthService._redirect_uri", lambda: "urn:test")
    monkeypatch.setattr(
        "app.services.ebay_auth_service.EbayAuthService._base_urls",
        lambda: ("https://auth", "https://token", "https://revoke"),
    )
    monkeypatch.setattr("app.services.ebay_auth_service.EbayAuthService._request_with_retry", _mock_request)

    db = _DummyDB()
    connection = EbayAuthService.exchange_code_for_tokens("code", "state", db)

    assert connection.ebay_account_id == "real-ebay-user"
    assert db.saved.ebay_account_id == "real-ebay-user"


def test_create_offer_deletes_and_recreates_stale_offer_when_location_not_confirmed(monkeypatch):
    """When offer already exists and location_confirmed is False, delete and recreate."""
    calls = []

    def _mock_ensure_location(token, marketplace_id):
        return "default_it", False  # location NOT confirmed

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        calls.append(method)
        if method == "POST" and url.endswith("/offer"):
            if len([c for c in calls if c == "POST"]) == 1:
                # First POST: offer already exists
                request = httpx.Request("POST", url)
                response = httpx.Response(
                    400,
                    request=request,
                    json={"errors": [{"errorId": 25002, "message": "Offer already exists.", "parameters": [{"name": "offerId", "value": "STALE-OFFER-1"}]}]},
                )
                raise httpx.HTTPStatusError("Bad request", request=request, response=response)
            # Second POST after deletion: success
            return SimpleNamespace(json=lambda: {"offerId": "NEW-OFFER-1"})
        if method == "DELETE":
            return SimpleNamespace()
        return SimpleNamespace(json=lambda: {})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    offer_id = EbayOfferService.create_offer(
        token="token",
        sku="SKU-1",
        price=Decimal("12.34"),
        quantity=1,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Descrizione",
        category_id="19077",
    )

    assert offer_id == "NEW-OFFER-1"
    assert listing_db.ebay_offer_id == "NEW-OFFER-1"
    assert "DELETE" in calls


def test_create_offer_falls_back_to_update_when_delete_fails_and_location_not_confirmed(monkeypatch, caplog):
    """When offer exists, location_confirmed=False, and DELETE fails → fall back to update."""
    update_calls = []

    def _mock_ensure_location(token, marketplace_id):
        return "default_it", False  # location NOT confirmed

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        if method == "POST" and url.endswith("/offer"):
            request = httpx.Request("POST", url)
            response = httpx.Response(
                400,
                request=request,
                json={"errors": [{"errorId": 25002, "message": "Offer already exists.", "parameters": [{"name": "offerId", "value": "STALE-OFFER-2"}]}]},
            )
            raise httpx.HTTPStatusError("Bad request", request=request, response=response)
        if method == "DELETE":
            request = httpx.Request("DELETE", url)
            response = httpx.Response(403, request=request, json={"errors": [{"message": "Forbidden"}]})
            raise httpx.HTTPStatusError("Forbidden", request=request, response=response)
        return SimpleNamespace()

    def _mock_update_offer(token, offer_id, payload, marketplace_id):
        update_calls.append(offer_id)

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._update_offer", _mock_update_offer)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    offer_id = EbayOfferService.create_offer(
        token="token",
        sku="SKU-1",
        price=Decimal("12.34"),
        quantity=1,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Descrizione",
        category_id="19077",
    )

    assert offer_id == "STALE-OFFER-2"
    assert listing_db.ebay_offer_id == "STALE-OFFER-2"
    assert update_calls == ["STALE-OFFER-2"]
    assert any("fallback to update" in message for message in caplog.messages)


def test_create_offer_deletes_and_recreates_stale_offer_when_location_confirmed(monkeypatch):
    """When offer already exists and location_confirmed=True, delete and recreate (same as location_confirmed=False)."""
    calls = []

    def _mock_ensure_location(token, marketplace_id):
        return "default_it", True  # location IS confirmed

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        calls.append(method)
        if method == "POST" and url.endswith("/offer"):
            if len([c for c in calls if c == "POST"]) == 1:
                # First POST: offer already exists
                request = httpx.Request("POST", url)
                response = httpx.Response(
                    400,
                    request=request,
                    json={"errors": [{"errorId": 25002, "message": "Offer already exists.", "parameters": [{"name": "offerId", "value": "EXIST-OFFER-3"}]}]},
                )
                raise httpx.HTTPStatusError("Bad request", request=request, response=response)
            # Second POST after deletion: success
            return SimpleNamespace(json=lambda: {"offerId": "NEW-OFFER-3"})
        if method == "DELETE":
            return SimpleNamespace()
        return SimpleNamespace(json=lambda: {})

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._ensure_merchant_location", _mock_ensure_location)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._fetch_default_policy_id", _mock_fetch_policy_id)
    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    listing_db = SimpleNamespace(ebay_offer_id=None)
    offer_id = EbayOfferService.create_offer(
        token="token",
        sku="SKU-1",
        price=Decimal("12.34"),
        quantity=1,
        marketplace_id="EBAY_IT",
        listing_db=listing_db,
        description="Descrizione",
        category_id="19077",
    )

    assert offer_id == "NEW-OFFER-3"
    assert listing_db.ebay_offer_id == "NEW-OFFER-3"
    assert "DELETE" in calls


def test_ensure_merchant_location_retries_with_extra_address_fields_on_400(monkeypatch):
    """When creating location fails with 400, retry with city+postalCode."""
    import app.services.ebay_offer_service as svc_module

    svc_module._location_cache.clear()
    post_attempts = []

    def _mock_request(method, url, **kwargs):
        if method == "GET":
            # Location doesn't exist yet
            request = httpx.Request("GET", url)
            response = httpx.Response(404, request=request, json={})
            raise httpx.HTTPStatusError("Not found", request=request, response=response)
        if method == "POST":
            address = kwargs.get("json", {}).get("location", {}).get("address", {})
            post_attempts.append(address)
            if len(post_attempts) == 1:
                # First attempt (country only) → 400
                request = httpx.Request("POST", url)
                response = httpx.Response(400, request=request, json={"errors": [{"errorId": 25802, "message": "Input error."}]})
                raise httpx.HTTPStatusError("Bad request", request=request, response=response)
            # Second attempt (with city+postalCode) → success
            return SimpleNamespace()
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    location_key, confirmed = EbayOfferService._ensure_merchant_location("token", "EBAY_IT")

    assert confirmed is True
    assert len(post_attempts) == 2
    assert post_attempts[0] == {"country": "IT"}
    assert post_attempts[1]["country"] == "IT"
    assert "city" in post_attempts[1]
    assert "postalCode" in post_attempts[1]

    svc_module._location_cache.clear()


def test_ensure_merchant_location_returns_false_when_all_attempts_fail(monkeypatch, caplog):
    """When all create-location attempts fail, return confirmed=False and log a warning."""
    import app.services.ebay_offer_service as svc_module

    svc_module._location_cache.clear()

    def _mock_request(method, url, **kwargs):
        if method == "GET":
            request = httpx.Request("GET", url)
            response = httpx.Response(404, request=request, json={})
            raise httpx.HTTPStatusError("Not found", request=request, response=response)
        request = httpx.Request("POST", url)
        response = httpx.Response(400, request=request, json={"errors": [{"errorId": 25802, "message": "Input error."}]})
        raise httpx.HTTPStatusError("Bad request", request=request, response=response)

    monkeypatch.setattr("app.services.ebay_offer_service.EbayOfferService._request_with_retry", _mock_request)

    location_key, confirmed = EbayOfferService._ensure_merchant_location("token", "EBAY_IT")

    assert confirmed is False
    assert any("eBay create location error" in message for message in caplog.messages)

    svc_module._location_cache.clear()


def test_exchange_code_for_tokens_identity_username_fetch_is_best_effort(monkeypatch):
    class _DummyResponse:
        def __init__(self, payload):
            self._payload = payload

        def json(self):
            return self._payload

    class _DummyQuery:
        @staticmethod
        def delete():
            return None

    class _DummyDB:
        def __init__(self):
            self.saved = None

        @staticmethod
        def query(_model):
            return _DummyQuery()

        def add(self, obj):
            self.saved = obj

        @staticmethod
        def commit():
            return None

        @staticmethod
        def refresh(_obj):
            return None

    def _mock_request(method, url, **kwargs):
        if method == "POST":
            return _DummyResponse(
                {
                    "access_token": "access-token",
                    "refresh_token": "refresh-token",
                    "expires_in": 7200,
                }
            )
        raise httpx.RequestError("identity api unavailable", request=httpx.Request("GET", url))

    monkeypatch.setattr(
        "app.services.ebay_auth_service.EbayAuthService.get_cached_state_data",
        lambda _state: {"code_verifier": "verifier"},
    )
    monkeypatch.setattr("app.services.ebay_auth_service.EbayAuthService._credentials", lambda: ("cid", "secret"))
    monkeypatch.setattr("app.services.ebay_auth_service.EbayAuthService._redirect_uri", lambda: "urn:test")
    monkeypatch.setattr(
        "app.services.ebay_auth_service.EbayAuthService._base_urls",
        lambda: ("https://auth", "https://token", "https://revoke"),
    )
    monkeypatch.setattr("app.services.ebay_auth_service.EbayAuthService._request_with_retry", _mock_request)

    db = _DummyDB()
    connection = EbayAuthService.exchange_code_for_tokens("code", "state", db)

    assert connection.ebay_account_id is None
    assert db.saved.ebay_account_id is None
