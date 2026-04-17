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

_location_cache: dict = {}
_location_cache_lock = threading.Lock()
_LOCATION_KEY = "default_it"

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
_MARKETPLACE_COUNTRY_MAP = {
    "EBAY_IT": "IT",
    "EBAY_DE": "DE",
    "EBAY_FR": "FR",
    "EBAY_ES": "ES",
    "EBAY_GB": "GB",
    "EBAY_US": "US",
    "EBAY_AU": "AU",
    "EBAY_CA": "CA",
}
_MARKETPLACE_DEFAULT_CATEGORY_MAP = {
    "EBAY_IT": "45101",   # Monete italiane (leaf su EBAY_IT)
    "EBAY_DE": "45098",   # Münzen Deutschland (leaf su EBAY_DE)
    "EBAY_FR": "45099",   # Monnaies françaises (leaf su EBAY_FR)
    "EBAY_ES": "45100",   # Monedas españolas (leaf su EBAY_ES)
    "EBAY_GB": "4726",    # British coins (leaf su EBAY_GB)
    "EBAY_US": "4726",    # US coins (leaf su EBAY_US)
    "EBAY_AU": "4726",    # World coins (leaf su EBAY_AU)
    "EBAY_CA": "4726",    # World coins (leaf su EBAY_CA)
}


def _sanitize_description(text: str) -> str:
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


def _extract_existing_offer_id(response: httpx.Response) -> str | None:
    try:
        payload = response.json()
    except Exception:
        return None
    errors = payload.get("errors", [])
    for error in errors:
        if not isinstance(error, dict):
            continue
        if error.get("errorId") == 25002:
            for param in error.get("parameters", []):
                if isinstance(param, dict) and param.get("name") == "offerId":
                    return str(param["value"])
    return None


def _content_language_for_marketplace(marketplace_id: str | None) -> str:
    normalized = (marketplace_id or "").strip().upper()
    return _MARKETPLACE_LANGUAGE_MAP.get(normalized, "it-IT")


class EbayOfferService:
    @staticmethod
    def _base_url() -> str:
        env = os.getenv("EBAY_ENV", "PRODUCTION").upper().strip()
        if env == "SANDBOX":
            return "https://api.sandbox.ebay.com"
        return "https://api.ebay.com"

    @staticmethod
    def _request_with_retry(method: str, url: str, **kwargs) -> httpx.Response:
        headers = dict(kwargs.pop("headers", None) or {})
        if "json" in kwargs:
            body = _json.dumps(kwargs.pop("json"), ensure_ascii=True).encode("ascii")
            headers.setdefault("Content-Type", "application/json")
            kwargs["content"] = body
        kwargs["headers"] = headers

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
    def _offer_headers(token: str, marketplace_id: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        if marketplace_id:
            headers["Content-Language"] = _content_language_for_marketplace(marketplace_id)
        return headers

    @staticmethod
    def _auth_header(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    @staticmethod
    def _ensure_merchant_location(token: str, marketplace_id: str) -> tuple[str, bool]:
        with _location_cache_lock:
            if _location_cache.get("confirmed"):
                return _LOCATION_KEY, True

        base = EbayOfferService._base_url()
        url = f"{base}/sell/inventory/v1/location/{_LOCATION_KEY}"
        country = _MARKETPLACE_COUNTRY_MAP.get((marketplace_id or "").strip().upper(), "IT")

        try:
            EbayOfferService._request_with_retry(
                "GET",
                url,
                headers=EbayOfferService._auth_header(token),
            )
            logger.info("eBay merchant location '%s' already exists", _LOCATION_KEY)
            with _location_cache_lock:
                _location_cache["confirmed"] = True
            return _LOCATION_KEY, True
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 404:
                logger.warning(
                    "eBay GET location error %s — skipping location creation",
                    exc.response.status_code,
                )
                return _LOCATION_KEY, False

        _COUNTRY_ADDRESS_FALLBACK = {
            "IT": {"city": "Roma", "postalCode": "00100"},
            "DE": {"city": "Berlin", "postalCode": "10115"},
            "FR": {"city": "Paris", "postalCode": "75001"},
            "ES": {"city": "Madrid", "postalCode": "28001"},
            "GB": {"city": "London", "postalCode": "EC1A1BB"},
            "US": {"city": "New York", "postalCode": "10001"},
            "AU": {"city": "Sydney", "postalCode": "2000"},
            "CA": {"city": "Toronto", "postalCode": "M5H2N2"},
        }
        extra_fields = _COUNTRY_ADDRESS_FALLBACK.get(country, {"city": country, "postalCode": "00000"})
        address_candidates = [
            {"country": country},
            {"country": country, **extra_fields},
        ]
        last_exc: httpx.HTTPStatusError | None = None
        for address_payload in address_candidates:
            payload = {
                "location": {"address": address_payload},
                "locationTypes": ["WAREHOUSE"],
                "name": "Magazzino principale",
            }
            try:
                EbayOfferService._request_with_retry(
                    "POST",
                    url,
                    headers=EbayOfferService._offer_headers(token, marketplace_id),
                    json=payload,
                )
                logger.info("eBay merchant location '%s' created successfully", _LOCATION_KEY)
                with _location_cache_lock:
                    _location_cache["confirmed"] = True
                return _LOCATION_KEY, True
            except httpx.HTTPStatusError as exc:
                last_exc = exc
                if exc.response.status_code == 400:
                    continue
                break
        if last_exc is not None:
            try:
                body = last_exc.response.text
            except Exception:
                body = "<unreadable>"
            logger.warning(
                "eBay create location error %s — body: %s (will continue without location)",
                last_exc.response.status_code,
                body,
            )
        return _LOCATION_KEY, False

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
    def _update_offer(token: str, offer_id: str, payload: dict, marketplace_id: str) -> None:
        url = f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}"
        try:
            EbayOfferService._request_with_retry(
                "PUT",
                url,
                headers=EbayOfferService._offer_headers(token, marketplace_id),
                json=payload,
            )
            logger.info("eBay offer %s updated successfully", offer_id)
        except httpx.HTTPStatusError as exc:
            try:
                body = exc.response.text
            except Exception:
                body = "<unreadable>"
            logger.warning(
                "eBay update offer %s error %s — body: %s (will try to publish anyway)",
                offer_id,
                exc.response.status_code,
                body,
            )

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
        category_id: str | None = None,
        listing_format: str = "FIXED_PRICE",
        auction_start_price: float | None = None,
        auction_duration: str | None = None,
        auction_reserve_price: float | None = None,
        auction_buy_it_now_price: float | None = None,
    ) -> str:
        location_key, location_confirmed = EbayOfferService._ensure_merchant_location(token, marketplace_id)

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
        normalized_marketplace = (marketplace_id or "").strip().upper()
        currency = _MARKETPLACE_CURRENCY_MAP.get(normalized_marketplace, "EUR")

        effective_category = category_id or _MARKETPLACE_DEFAULT_CATEGORY_MAP.get(
            normalized_marketplace, "45101"
        )
        payload = {
            "sku": sku,
            "marketplaceId": marketplace_id,
            "availableQuantity": int(quantity),
            "categoryId": effective_category,
            "listingDescription": listing_description,
            "listingPolicies": {
                "fulfillmentPolicyId": fulfillment_policy_id,
                "paymentPolicyId": payment_policy_id,
                "returnPolicyId": return_policy_id,
            },
        }
        if listing_format == "AUCTION" and auction_start_price is not None:
            payload["format"] = "AUCTION"
            payload["pricingSummary"] = {
                "auctionStartPrice": {
                    "value": str(round(float(auction_start_price), 2)),
                    "currency": currency,
                }
            }
            if auction_reserve_price is not None:
                payload["pricingSummary"]["auctionReservePrice"] = {
                    "value": str(round(float(auction_reserve_price), 2)),
                    "currency": currency,
                }
            if auction_buy_it_now_price is not None:
                payload["pricingSummary"]["price"] = {
                    "value": str(round(float(auction_buy_it_now_price), 2)),
                    "currency": currency,
                }
            if auction_duration:
                payload["listingDuration"] = auction_duration
            payload["availableQuantity"] = 1
        else:
            payload["format"] = "FIXED_PRICE"
            payload["pricingSummary"] = {
                "price": {
                    "value": str(price),
                    "currency": currency,
                }
            }
        if location_confirmed:
            payload["merchantLocationKey"] = location_key

        try:
            response = EbayOfferService._request_with_retry(
                "POST",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer",
                headers=EbayOfferService._offer_headers(token, marketplace_id),
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
            if exc.response.status_code == 400:
                existing_offer_id = _extract_existing_offer_id(exc.response)
                if existing_offer_id:
                    # Sempre elimina e ricrea l'offer stale — garantisce dati freschi (categoryId, location, ecc.)
                    logger.info(
                        "eBay offer already exists (%s), deleting and recreating with fresh data",
                        existing_offer_id,
                    )
                    try:
                        EbayOfferService._request_with_retry(
                            "DELETE",
                            f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{existing_offer_id}",
                            headers=EbayOfferService._auth_header(token),
                        )
                    except httpx.HTTPStatusError as del_exc:
                        logger.warning(
                            "eBay delete stale offer %s error %s — fallback to update",
                            existing_offer_id,
                            del_exc.response.status_code,
                        )
                        # fallback: aggiorna l'offer esistente
                        listing_db.ebay_offer_id = existing_offer_id
                        EbayOfferService._update_offer(token, existing_offer_id, payload, marketplace_id)
                        return existing_offer_id
                    # Ritenta la creazione dopo la cancellazione
                    try:
                        response = EbayOfferService._request_with_retry(
                            "POST",
                            f"{EbayOfferService._base_url()}/sell/inventory/v1/offer",
                            headers=EbayOfferService._offer_headers(token, marketplace_id),
                            json=payload,
                        )
                        new_offer_id = response.json().get("offerId")
                        if not new_offer_id:
                            raise HTTPException(status_code=502, detail="Offerta eBay non creata correttamente dopo eliminazione")
                        listing_db.ebay_offer_id = new_offer_id
                        return new_offer_id
                    except httpx.HTTPStatusError as retry_exc:
                        logger.error(
                            "eBay create_offer retry after delete error %s — body: %s",
                            retry_exc.response.status_code,
                            retry_exc.response.text,
                        )
                        raise HTTPException(status_code=502, detail="Errore ricreazione offerta eBay dopo eliminazione")
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
        """Chiude/ritira un'offerta eBay.

        Strategia:
        1. Tenta POST /offer/{id}/withdraw
        2. Se fallisce per qualsiasi motivo (incluso 400, 409), tenta DELETE /offer/{id}
        3. Se anche DELETE fallisce con 404, l'offer non esiste più → OK
        4. Rilancia solo se entrambi falliscono con errori non-404
        """
        try:
            EbayOfferService._request_with_retry(
                "POST",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}/withdraw",
                headers=EbayOfferService._auth_header(token),
                json={},
            )
            return
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "eBay withdraw offer %s error %s — trying DELETE fallback",
                offer_id,
                exc.response.status_code,
            )
            # Continua sempre con DELETE come fallback

        try:
            EbayOfferService._request_with_retry(
                "DELETE",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}",
                headers=EbayOfferService._auth_header(token),
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                # L'offer non esiste più su eBay — OK, obiettivo raggiunto
                logger.info("eBay offer %s already gone (404) — treating as success", offer_id)
                return
            raise HTTPException(
                status_code=502,
                detail=f"Errore chiusura annuncio eBay: withdraw e DELETE entrambi falliti (DELETE status={exc.response.status_code})",
            )

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