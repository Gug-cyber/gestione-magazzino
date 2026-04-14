from decimal import Decimal

from app.services.ebay_order_sync_service import EbayOrderSyncService
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
