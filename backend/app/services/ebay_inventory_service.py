import logging
import os
import time
import json as _json
import re
import unicodedata
from datetime import datetime, timezone
import urllib.error
import urllib.parse
import urllib.request
from urllib.parse import urlparse

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


def _sanitize_ascii_text(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")


def _extract_status_from_detail(detail: str | None) -> int | None:
    if not isinstance(detail, str):
        return None
    match = re.search(r":\s*(\d{3})\b", detail)
    if not match:
        return None
    try:
        return int(match.group(1))
    except Exception:
        return None


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
        if params:
            url = f"{url}?{urllib.parse.urlencode(params)}"
        body = None
        if json is not None:
            body = _json.dumps(json, ensure_ascii=True).encode("ascii")

        req_headers = {k: v for k, v in (headers or {}).items() if k.lower() != "content-language"}
        if body is not None and "Content-Type" not in req_headers:
            req_headers["Content-Type"] = "application/json"
        logger.info("eBay inventory request header keys: %s", sorted(req_headers.keys()))

        delay = 1
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
                with urllib.request.urlopen(req, timeout=30) as resp:
                    resp_body = resp.read()
                    return _json.loads(resp_body) if resp_body else None
            except urllib.error.HTTPError as exc:
                status = exc.code
                if status == 429 and attempt < 2:
                    time.sleep(delay)
                    delay *= 2
                    continue
                try:
                    error_body = exc.read().decode("utf-8", errors="replace")
                except Exception:
                    error_body = "<unreadable>"
                logger.error("eBay inventory_item error %s — body: %s", status, error_body)
                try:
                    error_data = _json.loads(error_body)
                    errors = error_data.get("errors", [])
                    msg = errors[0].get("message") if errors else None
                except Exception:
                    msg = None
                detail = f"Errore creazione inventory eBay: {status}"
                if msg:
                    detail = f"{detail} ({msg})"
                raise HTTPException(status_code=502, detail=detail)
            except urllib.error.URLError as exc:
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
            status = _extract_status_from_detail(exc.detail)
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
            status = _extract_status_from_detail(exc.detail)
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
