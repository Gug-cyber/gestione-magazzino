import logging
import os
import threading
import time

from ..database import SessionLocal
from ..models.ebay_connection import EbayConnection
from .ebay_api import EbayApiClient
from .ebay_order_sync_service import EbayOrderSyncService

logger = logging.getLogger(__name__)

_polling_started = False
_polling_lock = threading.Lock()


def _is_polling_enabled() -> bool:
    return os.getenv("EBAY_SALES_POLLING_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}


def process_webhook_payload(connection, db, payload: dict) -> dict:
    orders = payload.get("orders")
    if isinstance(orders, list) and orders:
        return EbayOrderSyncService.process_orders(orders, connection, db)

    order_id = (
        payload.get("orderId")
        or payload.get("order_id")
        or payload.get("data", {}).get("orderId")
        or payload.get("notification", {}).get("data", {}).get("orderId")
    )
    if order_id:
        order = EbayApiClient.get_order_by_id(connection, db, str(order_id))
        return EbayOrderSyncService.process_orders([order], connection, db)

    return EbayOrderSyncService.sync_recent_orders(connection, db)


def _poll_loop() -> None:
    interval = max(30, int(os.getenv("EBAY_SALES_POLL_INTERVAL_SECONDS", "120")))
    lookback = max(1, int(os.getenv("EBAY_SALES_POLL_LOOKBACK_HOURS", "24")))
    logger.info("eBay polling avviato: intervallo=%ss lookback=%sh", interval, lookback)

    while True:
        db = SessionLocal()
        try:
            connection = db.query(EbayConnection).order_by(EbayConnection.id.desc()).first()
            if connection and connection.status == "active":
                orders = EbayApiClient.list_recent_orders(connection, db, lookback_hours=lookback)
                result = EbayOrderSyncService.process_orders(orders, connection, db)
                logger.info(
                    "eBay polling completato: total=%s processed=%s skipped=%s",
                    result["total"],
                    result["processed"],
                    result["skipped"],
                )
        except Exception as exc:
            logger.error("Errore polling ordini eBay: %s", exc)
        finally:
            db.close()

        time.sleep(interval)


def start_ebay_sales_polling() -> None:
    global _polling_started

    if not _is_polling_enabled():
        return

    with _polling_lock:
        if _polling_started:
            return
        thread = threading.Thread(target=_poll_loop, name="ebay-sales-polling", daemon=True)
        thread.start()
        _polling_started = True
