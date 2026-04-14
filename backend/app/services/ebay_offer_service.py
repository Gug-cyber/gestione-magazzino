import logging
import os
import time
import concurrent.futures
import threading
from typing import Optional

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_policy_cache: dict = {}
_policy_cache_lock = threading.Lock()
_POLICY_CACHE_TTL = 7200  # 2 ore


class EbayOfferService:
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
        response = EbayOfferService._request_with_retry(
            "GET",
            url,
            headers={"Authorization": f"Bearer {token}"},
            params={"marketplace_id": marketplace_id},
        )
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
        shipping_cost: Optional[float] = None,
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
            raise HTTPException(status_code=504, detail="Timeout recupero policy eBay")
        except HTTPException:
            raise
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Errore recupero policy eBay: {exc.response.status_code}")
        except (concurrent.futures.CancelledError, concurrent.futures.BrokenExecutor, RuntimeError) as exc:
            raise HTTPException(status_code=502, detail=f"Errore recupero policy eBay: {exc}")

        listing_description = (description or "").strip() or "Annuncio generato automaticamente da Gestione Magazzino"
        if shipping_cost is not None and float(shipping_cost) > 0:
            listing_description = (
                f"{listing_description}\n\n"
                f"Nota spedizione indicativa: costo €{float(shipping_cost):.2f}. "
                "I costi effettivi sono definiti dalla fulfillment policy eBay."
            )

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
                    "currency": "EUR",
                }
            },
        }

        try:
            response = EbayOfferService._request_with_retry(
                "POST",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            offer_id = response.json().get("offerId")
            if not offer_id:
                raise HTTPException(status_code=502, detail="Offer eBay non creata correttamente")
            listing_db.ebay_offer_id = offer_id
            return offer_id
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Errore creazione offer eBay: {exc.response.status_code}")

    @staticmethod
    def publish_offer(token: str, offer_id: str) -> str | None:
        try:
            response = EbayOfferService._request_with_retry(
                "POST",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}/publish",
                headers={"Authorization": f"Bearer {token}"},
            )
            return response.json().get("listingId")
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Errore pubblicazione annuncio eBay: {exc.response.status_code}")

    @staticmethod
    def end_listing(token: str, offer_id: str, reason: str = "OUT_OF_STOCK") -> None:
        try:
            EbayOfferService._request_with_retry(
                "POST",
                f"{EbayOfferService._base_url()}/sell/inventory/v1/offer/{offer_id}/withdraw",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
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
                headers={"Authorization": f"Bearer {token}"},
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
                headers={"Authorization": f"Bearer {token}"},
            )
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Errore lettura offer eBay: {exc.response.status_code}")
