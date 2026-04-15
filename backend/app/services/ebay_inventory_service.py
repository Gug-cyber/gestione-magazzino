import logging
import os
import time
import json as _json
import unicodedata
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_CONDITION_MAP = {
    "Mint": "NEW",
    "Near Mint": "NEW",
    "Excellent": "USED_EXCELLENT",
    "Good": "USED_EXCELLENT",
    "Light Played": "USED_GOOD",
    "Played": "USED_ACCEPTABLE",
    "Poor": "USED_ACCEPTABLE",
}

_MARKETPLACE_LANGUAGE_MAP = {
    "EBAY_IT": "it-IT",
    "EBAY_DE": "de-DE",
    "EBAY_FR": "fr-FR",
    "EBAY_ES": "es-ES",
    "EBAY_GB": "en-GB",
    "EBAY_US": "en-US",
    "EBAY_AU": "en-AU",
    "EBAY_CA": "en-CA",
}
_DEFAULT_MARKETPLACE_ID = "EBAY_IT"
_DEFAULT_CONTENT_LANGUAGE = "it-IT"


def _extract_ebay_error_message(response: httpx.Response) -> str | None:
    try:
        payload = response.json()
    except Exception:
        return None
    errors = payload.get("errors")
    if not isinstance(errors, list) or not errors:
        return None
    first_error = errors[0] or {}
    if not isinstance(first_error, dict):
        return None
    message = first_error.get("message")
    return str(message).strip() if message else None


def _sanitize_ascii_text(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")


class _NoContentLanguageTransport(httpx.HTTPTransport):
    """Transport that always removes Content-Language before sending the request."""

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        headers = [(k, v) for k, v in request.headers.raw if k.lower() != b"content-language"]
        request = httpx.Request(
            method=request.method,
            url=request.url,
            headers=headers,
            content=request.content,
            extensions=request.extensions,
        )
        return super().handle_request(request)


class EbayInventoryService:
    @staticmethod
    def _base_url() -> str:
        env = os.getenv("EBAY_ENV", "PRODUCTION").upper().strip()
        if env == "SANDBOX":
            return "https://api.sandbox.ebay.com"
        return "https://api.ebay.com"

    @staticmethod
    def _request_with_retry(method: str, url: str, **kwargs) -> httpx.Response:
        headers = dict(kwargs.get("headers") or {})
        # Serializzazione manuale del JSON per evitare che httpx aggiunga
        # automaticamente Content-Language per payload con caratteri non-ASCII.
        # L'eBay Inventory API rifiuta qualsiasi Content-Language (errorId 25709).
        if "json" in kwargs:
            body = _json.dumps(kwargs.pop("json"), ensure_ascii=True).encode("ascii")
            headers["Content-Type"] = "application/json"
            kwargs["content"] = body
        kwargs["headers"] = {k: v for k, v in headers.items() if k.lower() != "content-language"}
        logger.info("eBay inventory request header keys: %s", sorted(kwargs["headers"].keys()))

        delay = 1
        for attempt in range(3):
            try:
                with httpx.Client(timeout=30.0, transport=_NoContentLanguageTransport()) as client:
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
    def _to_public_image_url(raw_path: str | None) -> str | None:
        if not raw_path:
            return None
        if raw_path.startswith("http://") or raw_path.startswith("https://"):
            hostname = (urlparse(raw_path).hostname or "").lower()
            if hostname == "drive.google.com" or hostname.endswith(".drive.google.com"):
                return None
            return raw_path
        backend_url = os.getenv("BACKEND_URL", "").rstrip("/")
        if backend_url and raw_path.startswith("/"):
            return f"{backend_url}{raw_path}"
        return raw_path

    @staticmethod
    def _build_image_urls(product) -> list[str]:
        urls: list[str] = []
        foto_url = EbayInventoryService._to_public_image_url(product.foto_path)
        if foto_url:
            urls.append(foto_url)
        return [u for u in urls if u]

    @staticmethod
    def _content_language_for_marketplace(marketplace_id: str | None) -> str:
        normalized_marketplace_id = (marketplace_id or "").strip().upper()
        return _MARKETPLACE_LANGUAGE_MAP.get(normalized_marketplace_id, _DEFAULT_CONTENT_LANGUAGE)

    @staticmethod
    def create_or_update_inventory_item(
        token: str,
        sku: str,
        product,
        listing,
        marketplace_id: str = _DEFAULT_MARKETPLACE_ID,
    ) -> None:
        title = _sanitize_ascii_text((product.nome or "").strip())
        if len(title) > 80:
            title = f"{title[:77]}..."
        description = _sanitize_ascii_text((product.descrizione or "").strip())
        image_urls = EbayInventoryService._build_image_urls(product)
        if not image_urls:
            raise HTTPException(status_code=400, detail="Il prodotto non ha immagini pubbliche utilizzabili")

        condition = _CONDITION_MAP.get(product.stato_conservazione, "USED_GOOD")
        url = f"{EbayInventoryService._base_url()}/sell/inventory/v1/inventory_item/{sku}"
        payload = {
            "availability": {
                "shipToLocationAvailability": {
                    "quantity": max(0, listing.quantity_published),
                }
            },
            "product": {
                "title": title,
                "description": description,
                "imageUrls": image_urls,
            },
            "condition": condition,
        }
        if condition != "NEW":
            payload["conditionDescription"] = (
                _sanitize_ascii_text((product.stato_conservazione or "").strip()) or "Usato in buone condizioni"
            )

        try:
            EbayInventoryService._request_with_retry(
                "PUT",
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            listing.ebay_item_id = sku
            listing.last_sync_at = datetime.now(timezone.utc)
        except httpx.HTTPStatusError as exc:
            try:
                error_body = exc.response.text
            except Exception:
                error_body = "<unreadable>"
            logger.error(
                "eBay inventory_item error %s — body: %s",
                exc.response.status_code,
                error_body,
            )
            ebay_error_message = _extract_ebay_error_message(exc.response)
            detail = f"Errore creazione inventory eBay: {exc.response.status_code}"
            if ebay_error_message:
                detail = f"{detail} ({ebay_error_message})"
            raise HTTPException(status_code=502, detail=detail)

    @staticmethod
    def delete_inventory_item(token: str, sku: str) -> None:
        url = f"{EbayInventoryService._base_url()}/sell/inventory/v1/inventory_item/{sku}"
        try:
            EbayInventoryService._request_with_retry(
                "DELETE",
                url,
                headers={"Authorization": f"Bearer {token}"},
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 404:
                raise HTTPException(status_code=502, detail=f"Errore eliminazione inventory eBay: {exc.response.status_code}")

    @staticmethod
    def update_quantity(token: str, sku: str, new_quantity: int, marketplace_id: str = _DEFAULT_MARKETPLACE_ID) -> None:
        url = f"{EbayInventoryService._base_url()}/sell/inventory/v1/inventory_item/{sku}"
        payload = {
            "availability": {
                "shipToLocationAvailability": {
                    "quantity": max(0, int(new_quantity)),
                }
            }
        }
        try:
            EbayInventoryService._request_with_retry(
                "PATCH",
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 405:
                EbayInventoryService._request_with_retry(
                    "PUT",
                    url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                return
            raise HTTPException(status_code=502, detail=f"Errore update quantità eBay: {exc.response.status_code}")
