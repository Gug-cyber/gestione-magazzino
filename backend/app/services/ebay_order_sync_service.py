import copy
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.ebay_listing import EbayListing
from ..models.ebay_order_event import EbayOrderEvent
from ..models.ebay_sale import EbaySale
from .ebay_api import EbayApiClient
from .magazzino import MagazzinoService
from .pricing_service import PricingService
from .telegram_notify import send_ebay_order_notification

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
        lookback_hours = max(1, int(os.getenv("EBAY_SALES_POLL_LOOKBACK_HOURS", "24")))
        orders = EbayApiClient.list_recent_orders(connection, db, lookback_hours=lookback_hours)
        return EbayOrderSyncService.process_orders(orders, connection, db)

    @staticmethod
    def process_orders(orders: list[dict], connection, db: Session) -> dict:
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
        righe_ordine: list[dict] = []
        product_ids: set[int] = set()
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
            product_ids.add(listing.product_id)
            line_total = item.get("lineItemCost", {})
            line_total_value = line_total.get("value")
            if line_total_value is not None:
                gross_amount += Decimal(str(line_total_value))
                prezzo_unitario = float(Decimal(str(line_total_value)) / Decimal(qty))
            else:
                prezzo_unitario = float((listing.product.prezzo_vendita if listing.product else 0) or 0)
                gross_amount += Decimal(str(prezzo_unitario)) * Decimal(qty)
            righe_ordine.append(
                {
                    "prodotto_id": listing.product_id,
                    "quantita": qty,
                    "prezzo_unitario": prezzo_unitario,
                }
            )

        if not selected_listing or total_qty <= 0 or not righe_ordine:
            return "skipped"

        event = EbayOrderEvent(
            ebay_order_id=order_id,
            sku=selected_listing.ebay_item_id,
            quantity=total_qty,
        )
        db.add(event)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            logger.info("Evento ordine eBay già registrato: %s", order_id)
            return "skipped"

        ordine = MagazzinoService.create_ebay_internal_order(db, order_id, righe_ordine)
        MagazzinoService.sync_stock_after_ebay_sale(db, product_ids)

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

        db.commit()
        send_ebay_order_notification(ordine)
        logger.info(
            "Ordine eBay processato: order_id=%s sku=%s qty=%s gross=%s numero_ordine=%s",
            order_id,
            selected_listing.ebay_item_id,
            total_qty,
            gross_amount,
            ordine.numero_ordine,
        )
        return "processed"
