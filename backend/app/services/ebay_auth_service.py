import base64
import hashlib
import logging
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.ebay_connection import EbayConnection

logger = logging.getLogger(__name__)

_REQUIRED_SCOPES = [
    "https://api.ebay.com/oauth/api_scope/sell.inventory",
    "https://api.ebay.com/oauth/api_scope/sell.account",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
    "https://api.ebay.com/oauth/api_scope/commerce.notification.subscription",
]

_state_cache: dict[str, dict[str, Any]] = {}


class EbayAuthService:
    @staticmethod
    def _get_env() -> str:
        return os.getenv("EBAY_ENV", "PRODUCTION").upper().strip()

    @staticmethod
    def _base_urls() -> tuple[str, str, str]:
        if EbayAuthService._get_env() == "SANDBOX":
            return (
                "https://auth.sandbox.ebay.com/oauth2/authorize",
                "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
                "https://api.sandbox.ebay.com/identity/v1/oauth2/revoke",
            )
        return (
            "https://auth.ebay.com/oauth2/authorize",
            "https://api.ebay.com/identity/v1/oauth2/token",
            "https://api.ebay.com/identity/v1/oauth2/revoke",
        )

    @staticmethod
    def _identity_user_url() -> str:
        if EbayAuthService._get_env() == "SANDBOX":
            return "https://api.sandbox.ebay.com/commerce/identity/v1/user/"
        return "https://api.ebay.com/commerce/identity/v1/user/"

    @staticmethod
    def _credentials() -> tuple[str, str]:
        client_id = os.getenv("EBAY_CLIENT_ID", "").strip()
        client_secret = os.getenv("EBAY_CLIENT_SECRET", "").strip()
        if not client_id or not client_secret:
            raise HTTPException(status_code=400, detail="Credenziali eBay mancanti")
        return client_id, client_secret

    @staticmethod
    def _redirect_uri() -> str:
        value = os.getenv("EBAY_REDIRECT_URI", "").strip()
        if not value:
            raise HTTPException(status_code=400, detail="EBAY_REDIRECT_URI non configurata")
        return value

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
    def get_authorization_url(jwt_token: Optional[str] = None, state: str = "") -> dict[str, str]:
        client_id, _ = EbayAuthService._credentials()
        redirect_uri = EbayAuthService._redirect_uri()
        authorize_url, _, _ = EbayAuthService._base_urls()

        code_verifier = secrets.token_urlsafe(64)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")
        state_value = state or secrets.token_urlsafe(24)
        _state_cache[state_value] = {
            "code_verifier": code_verifier,
            "created_at": datetime.now(timezone.utc),
            "jwt_token": jwt_token,
        }

        query = {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": " ".join(_REQUIRED_SCOPES),
            "state": state_value,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        return {"auth_url": f"{authorize_url}?{urlencode(query)}", "state": state_value}

    @staticmethod
    def get_cached_state_data(state: str) -> dict[str, Any]:
        cache = _state_cache.get(state)
        if not cache:
            raise HTTPException(status_code=400, detail="State OAuth non valido o scaduto")

        created_at = cache.get("created_at")
        if not created_at or datetime.now(timezone.utc) - created_at > timedelta(minutes=20):
            _state_cache.pop(state, None)
            raise HTTPException(status_code=400, detail="State OAuth scaduto")
        return cache

    @staticmethod
    def exchange_code_for_tokens(code: str, state: str, db: Session) -> EbayConnection:
        cache = EbayAuthService.get_cached_state_data(state)

        _, token_url, _ = EbayAuthService._base_urls()
        client_id, client_secret = EbayAuthService._credentials()
        redirect_uri = EbayAuthService._redirect_uri()
        basic_auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

        try:
            response = EbayAuthService._request_with_retry(
                "POST",
                token_url,
                headers={
                    "Authorization": f"Basic {basic_auth}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "code_verifier": cache["code_verifier"],
                },
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=400, detail=f"Errore OAuth eBay: {exc.response.status_code}")
        finally:
            _state_cache.pop(state, None)

        data = response.json()
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        if not access_token or not refresh_token:
            raise HTTPException(status_code=502, detail="Token eBay non ricevuti")

        ebay_account_id = None
        try:
            identity_response = EbayAuthService._request_with_retry(
                "GET",
                EbayAuthService._identity_user_url(),
                headers={"Authorization": f"Bearer {access_token}"},
            )
            identity_data = identity_response.json()
            username = identity_data.get("username")
            if isinstance(username, str):
                ebay_account_id = username.strip() or None
        except Exception as exc:
            logger.warning("Impossibile recuperare username eBay da Identity API: %s", exc)

        now = datetime.now(timezone.utc)
        token_expires_at = now + timedelta(seconds=int(data.get("expires_in", 7200)))
        refresh_exp = data.get("refresh_token_expires_in")
        refresh_token_expires_at = now + timedelta(seconds=int(refresh_exp)) if refresh_exp else None

        db.query(EbayConnection).delete()
        connection = EbayConnection(
            ebay_account_id=ebay_account_id,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
            refresh_token_expires_at=refresh_token_expires_at,
            environment=EbayAuthService._get_env(),
            status="active",
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
        return connection

    @staticmethod
    def refresh_access_token(connection: EbayConnection, db: Session) -> EbayConnection:
        if not connection.refresh_token:
            connection.status = "expired"
            db.commit()
            raise HTTPException(status_code=401, detail="Refresh token eBay mancante — riconnetti l'account eBay")

        client_id, client_secret = EbayAuthService._credentials()
        _, token_url, _ = EbayAuthService._base_urls()
        basic_auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        try:
            response = EbayAuthService._request_with_retry(
                "POST",
                token_url,
                headers={
                    "Authorization": f"Basic {basic_auth}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": connection.refresh_token,
                    "scope": " ".join(_REQUIRED_SCOPES),
                },
            )
        except httpx.HTTPStatusError as exc:
            connection.status = "expired"
            db.commit()
            raise HTTPException(status_code=401, detail=f"Sessione eBay scaduta: {exc.response.status_code}")

        data = response.json()
        access_token = data.get("access_token")
        if not access_token:
            connection.status = "expired"
            db.commit()
            raise HTTPException(status_code=401, detail="Impossibile rinnovare il token eBay")

        connection.access_token = access_token
        connection.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(data.get("expires_in", 7200)))
        new_refresh_token = data.get("refresh_token")
        if new_refresh_token:
            connection.refresh_token = new_refresh_token
        refresh_exp = data.get("refresh_token_expires_in")
        if refresh_exp:
            connection.refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(refresh_exp))
        connection.status = "active"
        db.commit()
        db.refresh(connection)
        return connection

    @staticmethod
    def get_valid_token(connection: EbayConnection, db: Session) -> str:
        if not connection:
            raise HTTPException(status_code=404, detail="Connessione eBay non trovata")
        if connection.status in {"revoked"}:
            raise HTTPException(status_code=400, detail="Connessione eBay non attiva")

        expires = connection.token_expires_at
        # Se token_expires_at è None, forza il refresh
        if expires is None:
            logger.warning("token_expires_at è None — forzo il refresh del token eBay")
            connection = EbayAuthService.refresh_access_token(connection, db)
            return connection.access_token

        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= datetime.now(timezone.utc) + timedelta(seconds=60):
            connection = EbayAuthService.refresh_access_token(connection, db)
        return connection.access_token

    @staticmethod
    def revoke_connection(connection: EbayConnection, db: Session) -> None:
        if not connection:
            return
        # Tenta la revoca su eBay, ma non bloccare il disconnect se fallisce
        try:
            client_id, client_secret = EbayAuthService._credentials()
            _, _, revoke_url = EbayAuthService._base_urls()
            basic_auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
            if connection.refresh_token:
                EbayAuthService._request_with_retry(
                    "POST",
                    revoke_url,
                    headers={
                        "Authorization": f"Basic {basic_auth}",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data={
                        "token": connection.refresh_token,
                        "token_type_hint": "REFRESH_TOKEN",
                    },
                )
        except Exception as exc:
            logger.warning("Impossibile revocare token eBay (ignorato): %s", exc)
        # Elimina sempre la connessione dal DB anche se la revoca eBay fallisce
        try:
            db.delete(connection)
            db.commit()
        except Exception as exc:
            logger.error("Errore eliminazione connessione eBay dal DB: %s", exc)
            db.rollback()
            raise HTTPException(status_code=500, detail="Errore durante la disconnessione eBay")
