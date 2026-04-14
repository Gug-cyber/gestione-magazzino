from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.services.ebay_auth_service import _state_cache


@pytest.fixture(autouse=True)
def clear_state_cache():
    _state_cache.clear()
    yield
    _state_cache.clear()


def test_callback_authenticates_with_jwt_saved_in_oauth_state(client, auth_headers, monkeypatch):
    monkeypatch.setenv("EBAY_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv("EBAY_REDIRECT_URI", "http://testserver/api/ebay/callback")

    connect_response = client.get(
        "/api/ebay/connect",
        params={"jwt_token": auth_headers["Authorization"].split(" ", 1)[1]},
        headers=auth_headers,
    )
    assert connect_response.status_code == 200
    state = connect_response.json()["state"]

    def _mock_exchange(code, incoming_state, db):
        assert code == "oauth-code"
        assert incoming_state == state
        return SimpleNamespace(ebay_account_id="demo-account", status="active")

    monkeypatch.setattr("app.routers.ebay.EbayAuthService.exchange_code_for_tokens", _mock_exchange)

    callback_response = client.get("/api/ebay/callback", params={"code": "oauth-code", "state": state})
    assert callback_response.status_code == 200
    assert callback_response.json() == {
        "connected": True,
        "account_id": "demo-account",
        "status": "active",
    }


def test_callback_returns_401_when_jwt_missing_from_cached_state(client, monkeypatch):
    state = "missing-jwt-state"
    _state_cache[state] = {
        "code_verifier": "verifier",
        "created_at": datetime.now(timezone.utc),
    }

    def _mock_exchange(code, incoming_state, db):
        return SimpleNamespace(ebay_account_id="demo-account", status="active")

    monkeypatch.setattr("app.routers.ebay.EbayAuthService.exchange_code_for_tokens", _mock_exchange)

    response = client.get("/api/ebay/callback", params={"code": "oauth-code", "state": state})
    assert response.status_code == 401
    assert response.json()["detail"] == "Token di autenticazione mancante nella sessione OAuth"


def test_connect_without_jwt_token_succeeds_but_callback_fails(client, auth_headers, monkeypatch):
    monkeypatch.setenv("EBAY_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv("EBAY_REDIRECT_URI", "http://testserver/api/ebay/callback")

    response = client.get("/api/ebay/connect", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    state = payload["state"]
    assert "auth_url" in payload
    assert f"state={state}" in payload["auth_url"]
    callback_response = client.get("/api/ebay/callback", params={"code": "oauth-code", "state": state})
    assert callback_response.status_code == 401
    assert callback_response.json()["detail"] == "Token di autenticazione mancante nella sessione OAuth"


def test_callback_returns_400_when_state_is_invalid(client):
    response = client.get("/api/ebay/callback", params={"code": "oauth-code", "state": "missing-state"})
    assert response.status_code == 400
    assert response.json()["detail"] == "State OAuth non valido o scaduto"
