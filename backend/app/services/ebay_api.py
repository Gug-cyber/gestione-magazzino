import logging
import os
import time
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException

from .ebay_auth_service import EbayAuthService

logger = logging.getLogger(__name__)


class EbayApiClient:
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
    def list_recent_orders(connection, db, lookback_hours: int = 24) -> list[dict]:
        token = EbayAuthService.get_valid_token(connection, db)
        now = datetime.now(timezone.utc)
        start = now - timedelta(hours=max(1, lookback_hours))
        filter_value = f"creationdate:[{start.isoformat()}..{now.isoformat()}]"
        base_url = EbayApiClient._base_url()

        try:
            response = EbayApiClient._request_with_retry(
                "GET",
                f"{base_url}/sell/fulfillment/v1/order",
                headers={"Authorization": f"Bearer {token}"},
                params={"filter": filter_value, "limit": 100},
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 401:
                token = EbayAuthService.refresh_access_token(connection, db).access_token
                response = EbayApiClient._request_with_retry(
                    "GET",
                    f"{base_url}/sell/fulfillment/v1/order",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"filter": filter_value, "limit": 100},
                )
            else:
                raise HTTPException(status_code=502, detail=f"Errore sync ordini eBay: {exc.response.status_code}")

        return response.json().get("orders", [])

    @staticmethod
    def get_order_by_id(connection, db, order_id: str) -> dict:
        token = EbayAuthService.get_valid_token(connection, db)
        base_url = EbayApiClient._base_url()

        try:
            response = EbayApiClient._request_with_retry(
                "GET",
                f"{base_url}/sell/fulfillment/v1/order/{order_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 401:
                token = EbayAuthService.refresh_access_token(connection, db).access_token
                response = EbayApiClient._request_with_retry(
                    "GET",
                    f"{base_url}/sell/fulfillment/v1/order/{order_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
            else:
                raise HTTPException(status_code=502, detail=f"Errore lettura ordine eBay: {exc.response.status_code}")

        return response.json()
