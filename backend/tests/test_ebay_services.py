from decimal import Decimal
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

import app.services.ebay_offer_service as ebay_offer_service_module
from app.services.ebay_inventory_service import EbayInventoryService
from app.services.ebay_order_sync_service import EbayOrderSyncService
from app.services.ebay_offer_service import EbayOfferService
from app.services.pricing_service import PricingService


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
    assert headers["Content-Language"] == "de-DE"
    assert payload["product"]["imageUrls"] == ["https://backend.example.com/uploads/carta.jpg"]
    assert payload["condition"] == "USED_EXCELLENT"
    assert payload["conditionDescription"] == "Good"


def test_inventory_item_uses_it_it_content_language_for_unknown_marketplace(monkeypatch):
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

    assert captured["headers"]["Content-Language"] == "it-IT"


def test_update_quantity_sets_content_language_header(monkeypatch):
    calls = []

    def _mock_request(method, url, **kwargs):
        calls.append((method, kwargs["headers"]))
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    EbayInventoryService.update_quantity("token", "SKU-1", 5, marketplace_id="EBAY_US")

    assert len(calls) == 1
    method, headers = calls[0]
    assert method == "PATCH"
    assert headers["Authorization"] == "Bearer token"
    assert headers["Content-Type"] == "application/json"
    assert headers["Content-Language"] == "en-US"


def test_create_offer_uses_real_description_and_shipping_note(monkeypatch):
    captured = {}

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return SimpleNamespace(json=lambda: {"offerId": "OFFER-1"})

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
    )

    assert offer_id == "OFFER-1"
    assert listing_db.ebay_offer_id == "OFFER-1"
    assert captured["payload"]["listingDescription"].startswith("Descrizione prodotto reale")
    assert "€4.50" in captured["payload"]["listingDescription"]


def test_create_offer_sanitizes_description_and_maps_currency(monkeypatch):
    captured = {}

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        captured["payload"] = kwargs["json"]
        return SimpleNamespace(json=lambda: {"offerId": "OFFER-1"})

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
        shipping_cost=None,
    )

    assert captured["payload"]["listingDescription"] == "Descrizione valida\n\nDettagli"
    assert captured["payload"]["pricingSummary"]["price"]["currency"] == "GBP"


def test_create_offer_uses_only_offer_api_headers(monkeypatch):
    captured = {}

    def _mock_fetch_policy_id(token, marketplace_id, policy_type):
        return f"{policy_type}-id"

    def _mock_request(method, url, **kwargs):
        captured["headers"] = kwargs["headers"]
        return SimpleNamespace(json=lambda: {"offerId": "OFFER-1"})

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
        shipping_cost=None,
    )

    assert captured["headers"] == {
        "Authorization": "Bearer token",
        "Content-Type": "application/json",
    }
    assert "Content-Language" not in captured["headers"]


def test_create_offer_logs_error_body_and_propagates_ebay_message(monkeypatch, caplog):
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
            shipping_cost=None,
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


def test_inventory_item_logs_error_body_for_any_status(monkeypatch, caplog):
    def _mock_request(method, url, **kwargs):
        request = httpx.Request("PUT", url)
        response = httpx.Response(500, request=request, text='{"error":"internal"}')
        raise httpx.HTTPStatusError("Internal", request=request, response=response)

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

    assert exc_info.value.detail == "Errore creazione inventory eBay: 500"
    assert any("eBay inventory_item error 500 — body:" in message for message in caplog.messages)


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
