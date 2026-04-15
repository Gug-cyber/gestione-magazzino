import json
from decimal import Decimal
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

import app.services.ebay_inventory_service as ebay_inventory_service_module
import app.services.ebay_offer_service as ebay_offer_service_module
from app.schemas.ebay import PublishRequest
from app.services.ebay_auth_service import EbayAuthService
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
    assert "Content-Language" not in headers
    assert payload["product"]["imageUrls"] == ["https://backend.example.com/uploads/carta.jpg"]
    assert payload["condition"] == "USED_EXCELLENT"
    assert payload["conditionDescription"] == "Good"
    assert "sku" not in payload


def test_inventory_item_does_not_send_content_language_header_for_unknown_marketplace(monkeypatch):
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

    assert "Content-Language" not in captured["headers"]


def test_inventory_item_sanitizes_non_ascii_payload_fields(monkeypatch):
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
    assert payload["product"]["title"] == "Caffe Pokemon aeiou"
    assert payload["product"]["description"] == "Descrizione con accenti: aeiou e simbolo TM"
    assert payload["conditionDescription"] == "Usato"


def test_update_quantity_does_not_send_content_language_header(monkeypatch):
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
    assert "Content-Language" not in headers


def test_update_quantity_fallback_put_does_not_send_content_language(monkeypatch):
    calls = []

    def _mock_request(method, url, **kwargs):
        calls.append((method, kwargs["headers"]))
        if method == "PATCH":
            request = httpx.Request("PATCH", url)
            response = httpx.Response(405, request=request)
            raise httpx.HTTPStatusError("Method not allowed", request=request, response=response)
        return SimpleNamespace()

    monkeypatch.setattr("app.services.ebay_inventory_service.EbayInventoryService._request_with_retry", _mock_request)

    EbayInventoryService.update_quantity("token", "SKU-1", 5, marketplace_id="EBAY_US")

    assert [method for method, _ in calls] == ["PATCH", "PUT"]
    for _, headers in calls:
        assert headers["Authorization"] == "Bearer token"
        assert headers["Content-Type"] == "application/json"
        assert "Content-Language" not in headers


def test_publish_request_shipping_cost_default_is_590_and_optional():
    payload = PublishRequest(product_id=1)
    assert payload.shipping_cost == 5.90

    payload_with_none = PublishRequest(product_id=1, shipping_cost=None)
    assert payload_with_none.shipping_cost is None


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
    assert "Spedizione: EUR 4.50 (stimata)." in captured["payload"]["listingDescription"]


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
    )

    assert captured["payload"]["listingDescription"] == (
        "Descrizione valida\n\nDettagli\n\n"
        "Spedizione: EUR 5.90 (stimata). I costi effettivi sono definiti dalla fulfillment policy eBay."
    )
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
        def __init__(self, timeout, transport=None):
            self.timeout = timeout
            captured["transport"] = transport

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
    assert isinstance(captured["transport"], ebay_offer_service_module._NoContentLanguageTransport)


def test_request_with_retry_removes_content_language_from_kwargs_headers(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

    class _DummyClient:
        def __init__(self, timeout, transport=None):
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

    assert captured["kwargs"]["headers"] == {"Authorization": "Bearer token"}


def test_offer_request_with_retry_serializes_non_ascii_json_without_content_language(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

    class _DummyClient:
        def __init__(self, timeout, transport=None):
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
        headers={"Authorization": "Bearer token", "content-language": "it-IT"},
        json=payload,
    )

    headers = captured["kwargs"]["headers"]
    assert "content-language" not in {key.lower() for key in headers}
    assert headers["Content-Type"] == "application/json"
    assert captured["kwargs"]["content"] == json.dumps(payload, ensure_ascii=True).encode("ascii")
    assert "json" not in captured["kwargs"]


def test_offer_transport_removes_content_language(monkeypatch):
    captured = {}

    def _fake_parent_handle_request(self, request):
        captured["headers"] = request.headers
        return httpx.Response(200, request=request)

    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", _fake_parent_handle_request)

    request = httpx.Request(
        "PUT",
        "https://api.example.com/test",
        headers={"Authorization": "Bearer token", "Content-Language": "it-IT"},
        content=b"{}",
    )

    response = ebay_offer_service_module._NoContentLanguageTransport().handle_request(request)

    assert response.status_code == 200
    assert "content-language" not in {key.lower() for key in captured["headers"]}
    assert captured["headers"]["Authorization"] == "Bearer token"


def test_inventory_transport_removes_content_language(monkeypatch):
    captured = {}

    def _fake_parent_handle_request(self, request):
        captured["headers"] = request.headers
        return httpx.Response(200, request=request)

    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", _fake_parent_handle_request)

    request = httpx.Request(
        "PUT",
        "https://api.example.com/test",
        headers={"Authorization": "Bearer token", "Content-Language": "it-IT"},
        content=b"{}",
    )

    response = ebay_inventory_service_module._NoContentLanguageTransport().handle_request(request)

    assert response.status_code == 200
    assert "content-language" not in {key.lower() for key in captured["headers"]}
    assert captured["headers"]["Authorization"] == "Bearer token"


def test_inventory_request_with_retry_removes_content_language_from_kwargs_headers(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

    class _DummyClient:
        def __init__(self, timeout, transport=None):
            self.timeout = timeout
            captured["transport"] = transport

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def request(self, method, url, **kwargs):
            captured["kwargs"] = kwargs
            return _DummyResponse()

    monkeypatch.setattr("app.services.ebay_inventory_service.httpx.Client", _DummyClient)

    EbayInventoryService._request_with_retry(
        "GET",
        "https://api.example.com/test",
        headers={"Authorization": "Bearer token", "Content-Language": "it-IT"},
    )

    assert captured["kwargs"]["headers"] == {"Authorization": "Bearer token"}
    assert "Content-Language" not in captured["kwargs"]["headers"]
    assert isinstance(captured["transport"], ebay_inventory_service_module._NoContentLanguageTransport)


def test_inventory_request_with_retry_serializes_non_ascii_json_without_content_language(monkeypatch):
    captured = {}

    class _DummyResponse:
        status_code = 200

        @staticmethod
        def raise_for_status():
            return None

    class _DummyClient:
        def __init__(self, timeout, transport=None):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def request(self, method, url, **kwargs):
            captured["kwargs"] = kwargs
            return _DummyResponse()

    monkeypatch.setattr("app.services.ebay_inventory_service.httpx.Client", _DummyClient)

    payload = {"title": "Caffè Espresso àê™"}
    EbayInventoryService._request_with_retry(
        "PUT",
        "https://api.example.com/test",
        headers={"Authorization": "Bearer token", "content-language": "it-IT"},
        json=payload,
    )

    headers = captured["kwargs"]["headers"]
    assert "content-language" not in {key.lower() for key in headers}
    assert headers["Content-Type"] == "application/json"
    assert captured["kwargs"]["content"] == json.dumps(payload, ensure_ascii=True).encode("ascii")
    assert "json" not in captured["kwargs"]


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


def test_inventory_item_propagates_ebay_error_message_on_400(monkeypatch):
    def _mock_request(method, url, **kwargs):
        request = httpx.Request("PUT", url)
        response = httpx.Response(
            400,
            request=request,
            json={
                "errors": [
                    {
                        "errorId": 25709,
                        "message": "Invalid value for header Content-Language.",
                    }
                ]
            },
        )
        raise httpx.HTTPStatusError("Bad Request", request=request, response=response)

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
