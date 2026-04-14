from decimal import Decimal
from types import SimpleNamespace

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
        captured["payload"] = kwargs["json"]
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

    EbayInventoryService.create_or_update_inventory_item("token", "SKU-1", product, listing)

    payload = captured["payload"]
    assert payload["product"]["imageUrls"] == ["https://backend.example.com/uploads/carta.jpg"]
    assert payload["condition"] == "USED_EXCELLENT"
    assert payload["conditionDescription"] == "Good"


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
