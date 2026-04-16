import logging
import os
import time
import json as _json
import unicodedata
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_CONDITION_MAP = {
    "Mint": "USED_EXCELLENT",
    "Near Mint": "USED_EXCELLENT",
    "Excellent": "USED_EXCELLENT",
    "Good": "USED_GOOD",
    "Light Played": "USED_GOOD",
    "Played": "USED_ACCEPTABLE",
    "Poor": "USED_ACCEPTABLE",
}

_VALID_EBAY_CONDITIONS = {
    "NEW",
    "LIKE_NEW",
    "MANUFACTURER_REFURBISHED",
    "SELLER_REFURBISHED",
    "USED_EXCELLENT",
    "USED_GOOD",
    "USED_ACCEPTABLE",
    "FOR_PARTS_OR_NOT_WORKING",
    "GRADED",
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

def _sanitize_ascii_text(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")

class _EbayRequestHTTPException(HTTPException):
    def __init__(self, ebay_status: int, detail: str):
        super().__init__(status_code=502, detail=detail)
        self.ebay_status = ebay_status

class EbayInventoryService:
    @staticmethod
    def _base_url() -> str:
        env = os.getenv("EBAY_ENV", "PRODUCTION").upper().strip()
        if env == "SANDBOX":
            return "https://api.sandbox.ebay.com"
        return "https://api.ebay.com"

    @staticmethod
    def _request_with_retry(
        method: str, url: str, headers: dict = None, json=None, params: dict = None
    ) -> dict | None:
        # Pass headers as-is — Content-Language is required by eBay Inventory API
        clean_headers = dict(headers) if headers else {}
        if json is not None and "content-type" not in {k.lower() for k in clean_headers}:
            clean_headers["Content-Type"] = "application/json"
        logger.info("eBay inventory request header keys: %s", sorted(clean_headers.keys()))

        session = requests.Session()
        session.headers.clear()
        session.headers["User-Agent"] = "gestione-magazzino/1.0"

        body = _json.dumps(json, ensure_ascii=True).encode("ascii") if json is not None else None

        delay = 1
        for attempt in range(3):
            try:
                response = session.request(
                    method,
                    url,
                    headers=clean_headers,
                    data=body,
                    params=params,
                    timeout=30,
                )
                if response.status_code == 429 and attempt < 2:
                    time.sleep(delay)
                    delay *= 2
                    continue
                if response.ok:
                    return response.json() if response.content else None

                status = response.status_code
                try:
                    error_body = response.text
                except Exception:
                    error_body = "<unreadable>"
                logger.error("eBay inventory_item error %s — body: %s", status, error_body)
                try:
                    error_data = _json.loads(error_body)
                    errors = error_data.get("errors", [])
                    msg = errors[0].get("message") if errors and isinstance(errors[0], dict) else None
                except Exception:
                    msg = None
                detail = f"Errore creazione inventory eBay: {status}"
                if msg:
                    detail = f"{detail} ({msg})"
                raise _EbayRequestHTTPException(ebay_status=status, detail=detail)
            except requests.exceptions.Timeout:
                if attempt < 2:
                    time.sleep(delay)
                    delay *= 2
                    continue
                raise HTTPException(status_code=504, detail="Timeout rete eBay")
            except requests.exceptions.RequestException as exc:
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
        for extra in (getattr(product, "foto_aggiuntive", None) or []):
            extra_url = EbayInventoryService._to_public_image_url(extra)
            if extra_url and extra_url not in urls:
                urls.append(extra_url)
        return [u for u in urls if u][:12]  # eBay max 12 immagini

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
        ebay_condition: str | None = None,
        grading_service: str | None = None,
        grade: str | None = None,
    ) -> None:
        title = _sanitize_ascii_text((product.nome or "").strip())
        if len(title) > 80:
            title = f"{title[:77]}..."
        description = _sanitize_ascii_text((product.descrizione or "").strip())
        image_urls = EbayInventoryService._build_image_urls(product)
        if not image_urls:
            raise HTTPException(status_code=400, detail="Il prodotto non ha immagini pubbliche utilizzabili")

        content_language = EbayInventoryService._content_language_for_marketplace(marketplace_id)
        condition = (
            ebay_condition if ebay_condition and ebay_condition in _VALID_EBAY_CONDITIONS
            else _CONDITION_MAP.get(product.stato_conservazione, "USED_GOOD")
        )
        url = f"{EbayInventoryService._base_url()}/sell/inventory/v1/inventory_item/{sku}"

        product_payload: dict = {
            "title": title,
            "description": description,
            "imageUrls": image_urls,
        }

        if grading_service or grade:
            aspects: dict = {}
            if grading_service:
                aspects["Professional Grader"] = [grading_service]
            if grade:
                aspects["Grade"] = [grade]
            if aspects:
                product_payload["aspects"] = aspects

        payload = {
            "availability": {
                "shipToLocationAvailability": {
                    "quantity": max(0, listing.quantity_published),
                }
            },
            "product": product_payload,
            "condition": condition,
        }
        payload["conditionDescription"] = (
            _sanitize_ascii_text((product.stato_conservazione or "").strip()) or "Usato in buone condizioni"
        )

        EbayInventoryService._request_with_retry(
            "PUT",
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Content-Language": content_language,
            },
            json=payload,
        )
        listing.ebay_item_id = sku
        listing.last_sync_at = datetime.now(timezone.utc)

    @staticmethod
    def delete_inventory_item(token: str, sku: str) -> None:
        url = f"{EbayInventoryService._base_url()}/sell/inventory/v1/inventory_item/{sku}"
        try:
            EbayInventoryService._request_with_retry(
                "DELETE",
                url,
                headers={"Authorization": f"Bearer {token}"},
            )
        except HTTPException as exc:
            status = getattr(exc, "ebay_status", None)
            if status != 404:
                if status is None:
                    raise
                raise HTTPException(status_code=502, detail=f"Errore eliminazione inventory eBay: {status}")

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
        except HTTPException as exc:
            status = getattr(exc, "ebay_status", None)
            if status == 405:
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
            if status is None:
                raise
            raise HTTPException(status_code=502, detail=f"Errore update quantità eBay: {status}")
