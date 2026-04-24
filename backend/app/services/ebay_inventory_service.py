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
        aspects: dict[str, list[str]] | None = None,
        condition_override: str | None = None,
    ) -> None:
        title = (product.nome or "").strip()
        if len(title) > 80:
            title = f"{title[:77]}..."
        description = (product.descrizione or "").strip()
        if len(description) > 4000:  # eBay API max description length
            description = description[:3997] + "..."
        image_urls = EbayInventoryService._build_image_urls(product)
        if not image_urls:
            raise HTTPException(status_code=400, detail="Il prodotto non ha immagini pubbliche utilizzabili")

        content_language = EbayInventoryService._content_language_for_marketplace(marketplace_id)
        if condition_override and condition_override.strip():
            condition = condition_override.strip()
        else:
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
                (product.stato_conservazione or "").strip() or "Usato in buone condizioni"
            )
        if aspects:
            sanitized_aspects = {
                _sanitize_ascii_text(k): [_sanitize_ascii_text(v) for v in vals]
                for k, vals in aspects.items()
                if vals
            }
            if sanitized_aspects:
                payload["product"]["aspects"] = sanitized_aspects

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
        base_url = EbayInventoryService._base_url()
        url = f"{base_url}/sell/inventory/v1/inventory_item/{sku}"
        content_language = EbayInventoryService._content_language_for_marketplace(marketplace_id)
        auth_headers = {"Authorization": f"Bearer {token}"}
        put_headers = {
            **auth_headers,
            "Content-Type": "application/json",
            "Content-Language": content_language,
        }

        # Step 1: recupera l'item esistente per non sovrascrivere dati del prodotto
        existing: dict = {}
        try:
            result = EbayInventoryService._request_with_retry("GET", url, headers=auth_headers)
            if result:
                existing = result
        except HTTPException as exc:
            status = getattr(exc, "ebay_status", None)
            if status == 404:
                logger.warning("eBay inventory_item %s non trovato (404) — skip update quantità", sku)
                return
            raise

        # Step 2: aggiorna solo la quantità e fai PUT completo
        existing.setdefault("availability", {}).setdefault(
            "shipToLocationAvailability", {}
        )["quantity"] = max(0, int(new_quantity))

        try:
            EbayInventoryService._request_with_retry("PUT", url, headers=put_headers, json=existing)
        except HTTPException as exc:
            status = getattr(exc, "ebay_status", None)
            if status is None:
                raise
            raise HTTPException(status_code=502, detail=f"Errore update quantità eBay: {status}")
