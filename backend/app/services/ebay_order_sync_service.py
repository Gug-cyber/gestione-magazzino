import copy
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.ebay_listing import EbayListing
from ..models.ebay_sale import EbaySale
from ..models.movimento import TipoMovimento
from .ebay_auth_service import EbayAuthService
from .ebay_inventory_service import EbayInventoryService
from .inventory_sync_service import InventorySyncService
from .pricing_service import PricingService

logger = logging.getLogger(__name__)

_PII_KEYS = {
    "buyer",
    "buyerusername",
    "shippingaddress",
    "email",
    "phone",
    "name",
    "address",
}


class EbayOrderSyncService:
    @staticmethod
    def _base_url() -> str:
        env = os.getenv("EBAY_ENV", "PRODUCTION").upper().strip()
        if env == "SANDBOX":
            return "https://api.sandbox.ebay.com"
        return "https://api.ebay.com"

    @staticmethod
    def _request_with_retry(method: str, url: str, **kwargs) -> httpx.Response:
        delay = 1
        for attempt in range(3):
            try:
                with httpx.Client(timeout=20.0) as client:
                    response = client.request(method, url, **kwargs)
                if response.status_code == 429 and attempt < 2:
                    time.sleep(delay)
                    delay *= 2
                    continue
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429 and attempt < 2:
                    time.sleep(delay)
                    delay *= 2
                    continue
                raise
            except httpx.RequestError as exc:
                if attempt < 2:
                    time.sleep(delay)
                    delay *= 2
                    continue
                raise HTTPException(status_code=502, detail=f"Errore rete eBay: {exc}")
        raise HTTPException(status_code=429, detail="Rate limit eBay raggiunto")

    @staticmethod
    def sanitize_order_data(order_dict: dict):
        def _sanitize(value):
            if isinstance(value, dict):
                out = {}
                for key, val in value.items():
                    if key.lower() in _PII_KEYS:
                        continue
                    out[key] = _sanitize(val)
                return out
            if isinstance(value, list):
                return [_sanitize(item) for item in value]
            return value

        return _sanitize(copy.deepcopy(order_dict or {}))

    @staticmethod
    def sync_recent_orders(connection, db: Session) -> dict:
        token = EbayAuthService.get_valid_token(connection, db)
        now = datetime.now(timezone.utc)
        start = now - timedelta(hours=24)
        filter_value = f"creationdate:[{start.isoformat()}..{now.isoformat()}]"

        try:
            response = EbayOrderSyncService._request_with_retry(
                "GET",
                f"{EbayOrderSyncService._base_url()}/sell/fulfillment/v1/order",
                headers={"Authorization": f"Bearer {token}"},
                params={"filter": filter_value, "limit": 100},
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 401:
                token = EbayAuthService.refresh_access_token(connection, db).access_token
                response = EbayOrderSyncService._request_with_retry(
                    "GET",
                    f"{EbayOrderSyncService._base_url()}/sell/fulfillment/v1/order",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"filter": filter_value, "limit": 100},
                )
            else:
                raise HTTPException(status_code=502, detail=f"Errore sync ordini eBay: {exc.response.status_code}")

        orders = response.json().get("orders", [])
        processed = 0
        skipped = 0
        for order in orders:
            result = EbayOrderSyncService.process_order(order, connection, db)
            if result == "processed":
                processed += 1
            else:
                skipped += 1
        return {"total": len(orders), "processed": processed, "skipped": skipped}

    @staticmethod
    def process_order(order_data: dict, connection, db: Session) -> str:
        safe_order = EbayOrderSyncService.sanitize_order_data(order_data)
        order_id = safe_order.get("orderId")
        if not order_id:
            return "skipped"

        if db.query(EbaySale).filter(EbaySale.ebay_order_id == order_id).first():
            logger.info("Ordine eBay già processato: %s", order_id)
            return "skipped"

        line_items = safe_order.get("lineItems") or []
        if not line_items:
            logger.info("Ordine eBay senza line items (order_id=%s)", order_id)
            return "skipped"

        total_qty = 0
        gross_amount = Decimal("0")
        selected_listing = None
        for item in line_items:
            sku = item.get("sku")
            qty = int(item.get("quantity") or 0)
            if qty <= 0 or not sku:
                continue
            listing = db.query(EbayListing).filter(EbayListing.ebay_item_id == sku).first()
            if not listing:
                logger.info("SKU ordine eBay non associato (order_id=%s, sku=%s)", order_id, sku)
                continue
            selected_listing = listing
            total_qty += qty
            line_total = item.get("lineItemCost", {})
            line_total_value = line_total.get("value")
            if line_total_value is not None:
                gross_amount += Decimal(str(line_total_value))

        if not selected_listing or total_qty <= 0:
            return "skipped"

        fee_percentage = Decimal(str(selected_listing.fee_percentage or connection.fee_percentage or 0))
        fee_amount = PricingService.calculate_fee_amount(gross_amount, fee_percentage)
        net_amount = PricingService.calculate_net_from_gross(gross_amount, fee_percentage)

        sale = EbaySale(
            product_id=selected_listing.product_id,
            listing_id=selected_listing.id,
            ebay_order_id=order_id,
            quantity_sold=total_qty,
            gross_amount=gross_amount,
            fee_amount=fee_amount,
            net_amount=net_amount,
            sale_status=(safe_order.get("orderFulfillmentStatus") or "completed").lower(),
            sold_at=datetime.now(timezone.utc),
        )
        db.add(sale)
        db.flush()

        InventorySyncService.decrement_stock(
            selected_listing.product_id,
            total_qty,
            db,
            tipo=TipoMovimento.vendita_ebay,
            note=f"Vendita eBay ordine {order_id}",
            auto_commit=False,
        )

        token = EbayAuthService.get_valid_token(connection, db)
        if selected_listing.product and selected_listing.product.quantita > 0 and selected_listing.ebay_item_id:
            EbayInventoryService.update_quantity(
                token,
                selected_listing.ebay_item_id,
                selected_listing.product.quantita,
                marketplace_id=connection.marketplace_id or "EBAY_IT",
            )
            selected_listing.quantity_published = selected_listing.product.quantita
            selected_listing.status = "active"
        else:
            selected_listing.status = "out_of_stock"
        selected_listing.last_sync_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(
            "Ordine eBay processato: order_id=%s sku=%s qty=%s gross=%s",
            order_id,
            selected_listing.ebay_item_id,
            total_qty,
            gross_amount,
        )
        return "processed"
