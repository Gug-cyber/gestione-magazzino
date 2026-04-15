import logging
import os
import time
import concurrent.futures
import threading
import json as _json
import re as _re

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_policy_cache: dict = {}
_policy_cache_lock = threading.Lock()
_POLICY_CACHE_TTL = 7200  # 2 ore
_MARKETPLACE_CURRENCY_MAP = {
    "EBAY_IT": "EUR",
    "EBAY_DE": "EUR",
    "EBAY_FR": "EUR",
    "EBAY_ES": "EUR",
    "EBAY_AU": "AUD",
    "EBAY_GB": "GBP",
    "EBAY_US": "USD",
    "EBAY_CA": "CAD",
}


def _sanitize_description(text: str) -> str:
    """Rimuove HTML non consentito e tronca a 4000 caratteri per eBay."""
    if not text:
        return "Prodotto in ottime condizioni."
    clean = _re.sub(r"<[^>]+>", "", text)
    clean = _re.sub(r"\n{3,}", "\n\n", clean).strip()
    if len(clean) > 4000:
        clean = clean[:3997] + "..."
    return clean or "Prodotto in ottime condizioni."


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


class EbayOfferService:
    @staticmethod
    def _base_url() -> str:
        env = os.getenv("EBAY_ENV", "PRODUCTION").upper().strip()
        if env == "SANDBOX":
            return "https://api.sandbox.ebay.com"
        return "https://api.ebay.com"

    @staticmethod
    def _request_with_retry(method: str, url: str, **kwargs) -> httpx.Response:
        # Guardrail: Content-Language non è supportato dalla Offer API eBay.
        headers = dict(kwargs.get("headers") or {})
        if "json" in kwargs:
            body = _json.dumps(kwargs.pop("json"), ensure_ascii=True).encode("ascii")
            headers["Content-Type"] = "application/json"
            kwargs["content"] = body
        kwargs["headers"] = {k: v for k, v in headers.items() if k.lower() != "content-language"}
        logger.info("eBay offer request header keys: %s", sorted(kwargs["headers"].keys()))

        delay = 1
        for attempt in range(3):
            try:
                with httpx.Client(timeout=30.0) as client:
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
    def _offer_headers(token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _auth_header(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    @staticmethod
    def _fetch_default_policy_id(token: str, marketplace_id: str, policy_type: str) -> str:
        cache_key = f"{marketplace_id}:{policy_type}"
        now = time.time()
        with _policy_cache_lock:
            cached = _policy_cache.get(cache_key)
            if cached and cached["expires_at"] > now:
                return cached["policy_id"]

        endpoint_map = {
            "fulfillment": "fulfillment_policy",
            "payment": "payment_policy",
            "return": "return_policy",
        }
        endpoint = endpoint_map[policy_type]
        url = f"{EbayOfferService._base_url()}/sell/account/v1/{endpoint}"
        try:
            response = EbayOfferService._request_with_retry(
                "GET",
                url,
                headers=EbayOfferService._auth_header(token),
                params={"marketplace_id": marketplace_id},
            )
        except httpx.HTTPStatusError as exc:
            try:
                error_body = exc.response.text
            except Exception:
                error_body = "<unreadable>"
            logger.error(
                "eBay fetch policy error %s (type=%s, marketplace=%s) — body: %s",
                exc.response.status_code,
                policy_type,
                marketplace_id,
                error_body,
            )
            raise
        data = response.json()
        key = {
            "fulfillment": "fulfillmentPolicies",
            "payment": "paymentPolicies",
            "return": "returnPolicies",
        }[policy_type]
        policy_id_field = {
            "fulfillment": "fulfillmentPolicyId",
            "payment": "paymentPolicyId",
            "return": "returnPolicyId",
        }[policy_type]
        policies = data.get(key, [])
        if not policies:
            raise HTTPException(status_code=400, detail=f"Nessuna policy eBay disponibile ({policy_type})")
        policy_id = policies[0].get(policy_id_field)
        if not policy_id:
            raise HTTPException(status_code=400, detail=f"Policy eBay non valida ({policy_type})")

        with _policy_cache_lock:
            _policy_cache[cache_key] = {
                "policy_id": policy_id,
                "expires_at": now + _POLICY_CACHE_TTL,
            }
        return policy_id

    @staticmethod
    def create_offer(
        token: str,
        sku: str,
        price,
        quantity: int,
        marketplace_id: str,
        listing_db,
        description: str,
        shipping_cost: float = 5.90,
    ) -> str:
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                fulfillment_future = executor.submit(
                    EbayOfferService._fetch_default_policy_id, token, marketplace_id, "fulfillment"
                )
                payment_future = executor.submit(
                    EbayOfferService._fetch_default_policy_id, token, marketplace_id, "payment"
                )
                return_future = executor.submit(
                    EbayOfferService._fetch_default_policy_id, token, marketplace_id, "return"
                )
                fulfillment_policy_id = fulfillment_future.result(timeout=30)
                payment_policy_id = payment_future.result(timeout=30)
                return_policy_id = return_future.result(timeout=30)
        except concurrent.futures.TimeoutError:
            raise HTTPException(status_code=504, detail="Timeout recupero policy eBay - riprova tra qualche secondo")
        except HTTPException:
            raise
        except httpx.HTTPStatusError as exc:
            try:
                error_body = exc.response.text
            except Exception:
                error_body = "<unreadable>"
            logger.error(
                "eBay policy fetch error %s (marketplace=%s) — body: %s",
                exc.response.status_code,
                marketplace_id,
                error_body,
            )
            raise HTTPException(status_code=502, detail=f"Errore recupero policy eBay: {exc.response.status_code}")
        except (concurrent.futures.CancelledError, concurrent.futures.BrokenExecutor, RuntimeError) as exc:
            logger.exception("Errore interno durante il recupero policy eBay: %s", exc)
            raise HTTPException(status_code=502, detail="Errore interno durante il recupero delle policy eBay")

        listing_description = _sanitize_description(description)
        shipping_cost_value = float(shipping_cost)
        listing_description = (
            f"{listing_description}\n\n"
            f"Spedizione: EUR {shipping_cost_value:.2f} (stimata). "
            "I costi effettivi sono definiti dalla fulfillment policy eBay."
        )
        normalized_marketplace = (marketplace_id or "").strip().upper()
        currency = _MARKETPLACE_CURRENCY_MAP.get(normalized_marketplace, "EUR")

        payload = {
            "sku": sku,
            "marketplaceId": marketplace_id,
            "format": "FIXED_PRICE",
            "availableQuantity": int(quantity),
            "listingDescription": listing_description,
            "listingPolicies": {
                "fulfillmentPolicyId": fulfillment_policy_id,
                "paymentPolicyId": payment_policy_id,
                "returnPolicyId": return_policy_id,
            },
            "pricingSummary": {
                "price": {
                    "value": str(price),
                    "currency": currency,
                }
            },
        }
        logger.debug(
            "eBay create_offer payload (marketplace=%s, sku=%s, price=%s, qty=%s)",
            marketplace_id,
            sku,
            price,
            quantity,
        )

        try:
            response = EbayOfferService._request_with_retry(
                "POST",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer",
                headers=EbayOfferService._offer_headers(token),
                json=payload,
            )
            offer_id = response.json().get("offerId")
            if not offer_id:
                raise HTTPException(status_code=502, detail="Offer eBay non creata correttamente")
            listing_db.ebay_offer_id = offer_id
            return offer_id
        except httpx.HTTPStatusError as exc:
            try:
                error_body = exc.response.text
            except Exception:
                error_body = "<unreadable>"
            logger.error(
                "eBay create_offer error %s — body: %s",
                exc.response.status_code,
                error_body,
            )
            ebay_error_message = _extract_ebay_error_message(exc.response)
            detail = f"Errore creazione offer eBay: {exc.response.status_code}"
            if ebay_error_message:
                detail = f"{detail} ({ebay_error_message})"
            raise HTTPException(status_code=502, detail=detail)

    @staticmethod
    def publish_offer(token: str, offer_id: str) -> str | None:
        try:
            response = EbayOfferService._request_with_retry(
                "POST",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}/publish",
                headers=EbayOfferService._auth_header(token),
            )
            return response.json().get("listingId")
        except httpx.HTTPStatusError as exc:
            try:
                error_body = exc.response.text
            except Exception:
                error_body = "<unreadable>"
            logger.error(
                "eBay publish_offer error %s (offer_id=%s) — body: %s",
                exc.response.status_code,
                offer_id,
                error_body,
            )
            ebay_error_message = _extract_ebay_error_message(exc.response)
            detail = f"Errore pubblicazione annuncio eBay: {exc.response.status_code}"
            if ebay_error_message:
                detail = f"{detail} ({ebay_error_message})"
            raise HTTPException(status_code=502, detail=detail)

    @staticmethod
    def end_listing(token: str, offer_id: str, reason: str = "OUT_OF_STOCK") -> None:
        try:
            EbayOfferService._request_with_retry(
                "POST",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}/withdraw",
                headers=EbayOfferService._offer_headers(token),
                json={"reason": reason},
            )
            return
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in (404, 405):
                raise HTTPException(status_code=502, detail=f"Errore chiusura annuncio eBay: {exc.response.status_code}")

        try:
            EbayOfferService._request_with_retry(
                "DELETE",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}",
                headers=EbayOfferService._auth_header(token),
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 404:
                raise HTTPException(status_code=502, detail=f"Errore chiusura annuncio eBay: {exc.response.status_code}")

    @staticmethod
    def get_offer(token: str, offer_id: str) -> dict:
        try:
            response = EbayOfferService._request_with_retry(
                "GET",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}",
                headers=EbayOfferService._auth_header(token),
            )
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Errore lettura offer eBay: {exc.response.status_code}")
