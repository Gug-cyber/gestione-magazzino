"""
Test di sicurezza per l'applicazione gestione-magazzino.
"""
import pytest
from fastapi.testclient import TestClient


class TestSQLInjection:
    """Test per SQL Injection vulnerabilities"""

    def test_sql_injection_in_search(self, client: TestClient, auth_headers):
        """Test SQL injection nei parametri di ricerca prodotti"""
        payloads = [
            "' OR '1'='1",
            "'; DROP TABLE prodotti; --",
            "admin'--",
            "' UNION SELECT NULL, NULL, NULL--",
        ]

        for payload in payloads:
            response = client.get(
                f"/api/prodotti/?search={payload}",
                headers=auth_headers,
            )
            # Non deve crashare o restituire dati non autorizzati
            assert response.status_code in [200, 400, 422], (
                f"Payload '{payload}' ha prodotto status {response.status_code}"
            )
            if response.status_code == 200:
                assert isinstance(response.json(), list)

    def test_sql_injection_in_ordini_search(self, client: TestClient, auth_headers):
        """Test SQL injection nella ricerca ordini"""
        payloads = [
            "' OR 1=1--",
            "1; DROP TABLE ordini;--",
        ]

        for payload in payloads:
            response = client.get(
                f"/api/ordini/?search={payload}",
                headers=auth_headers,
            )
            assert response.status_code in [200, 400, 422]
            if response.status_code == 200:
                assert isinstance(response.json(), list)


class TestAuthentication:
    """Test per autenticazione e autorizzazione"""

    def test_access_without_token(self, client: TestClient):
        """Test accesso senza token JWT: gli endpoint protetti devono restituire 401"""
        protected_endpoints = [
            "/api/prodotti/",
            "/api/ordini/",
            "/api/analisi/mensile",
        ]

        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401, (
                f"Endpoint '{endpoint}' dovrebbe richiedere autenticazione (401), "
                f"ma ha restituito {response.status_code}"
            )

    def test_access_with_invalid_token(self, client: TestClient):
        """Test accesso con token JWT invalido"""
        response = client.get(
            "/api/prodotti/",
            headers={"Authorization": "Bearer invalid_token_here"},
        )
        assert response.status_code == 401

    def test_access_with_malformed_bearer(self, client: TestClient):
        """Test accesso con header Authorization malformato"""
        response = client.get(
            "/api/prodotti/",
            headers={"Authorization": "NotBearer sometoken"},
        )
        assert response.status_code == 401

    def test_password_strength_requirements(self, client: TestClient, auth_headers):
        """Test che password deboli vengano rifiutate alla registrazione (richiede auth admin)"""
        weak_passwords = [
            "123",
            "abc",
        ]

        for pwd in weak_passwords:
            response = client.post(
                "/api/auth/register",
                json={
                    "username": f"testuser_{pwd}",
                    "email": f"test_{pwd}@example.com",
                    "password": pwd,
                },
                headers=auth_headers,
            )
            assert response.status_code in [400, 422], (
                f"Password debole '{pwd}' avrebbe dovuto essere rifiutata, "
                f"ma ha restituito {response.status_code}"
            )


class TestInputValidation:
    """Test validazione input"""

    def test_negative_quantity_rejected(self, client: TestClient, auth_headers):
        """Test che quantità negativa venga rifiutata"""
        response = client.post(
            "/api/prodotti/",
            json={
                "nome": "Test",
                "sku": "SEC-NEG-001",
                "quantita": -10,
                "quantita_minima": 0,
                "prezzo_acquisto": 5.0,
                "prezzo_vendita": 10.0,
            },
            headers=auth_headers,
        )
        assert response.status_code in [400, 422]

    def test_negative_price_rejected(self, client: TestClient, auth_headers):
        """Test che prezzi negativi vengano rifiutati"""
        response = client.post(
            "/api/prodotti/",
            json={
                "nome": "Test",
                "sku": "SEC-NEG-002",
                "quantita": 10,
                "quantita_minima": 0,
                "prezzo_acquisto": -5.0,
                "prezzo_vendita": 10.0,
            },
            headers=auth_headers,
        )
        assert response.status_code in [400, 422]

    def test_empty_order_rejected(self, client: TestClient, auth_headers):
        """Test che un ordine senza righe venga rifiutato"""
        response = client.post(
            "/api/ordini/",
            json={
                "cliente_nome": "Cliente Test",
                "righe": [],
            },
            headers=auth_headers,
        )
        assert response.status_code in [400, 422]

    def test_order_with_zero_quantity_rejected(self, client: TestClient, auth_headers):
        """Test che un ordine con quantità zero venga rifiutato"""
        # Crea prima un prodotto valido
        resp_prod = client.post(
            "/api/prodotti/",
            json={
                "nome": "Prodotto Test",
                "sku": "SEC-ZERO-001",
                "quantita": 10,
                "quantita_minima": 0,
                "prezzo_acquisto": 5.0,
                "prezzo_vendita": 10.0,
            },
            headers=auth_headers,
        )
        assert resp_prod.status_code == 201
        prodotto_id = resp_prod.json()["id"]

        response = client.post(
            "/api/ordini/",
            json={
                "cliente_nome": "Cliente Test",
                "righe": [
                    {
                        "prodotto_id": prodotto_id,
                        "quantita": 0,
                        "prezzo_unitario": 10.0,
                    }
                ],
            },
            headers=auth_headers,
        )
        assert response.status_code in [400, 422]


class TestRateLimiting:
    """Test per rate limiting sull'endpoint di login"""

    def test_repeated_login_attempts(self, client: TestClient):
        """Verifica che tentativi ripetuti di login con credenziali errate vengano gestiti."""
        status_codes = set()
        for i in range(20):
            response = client.post(
                "/api/auth/login",
                data={
                    "username": "nonexistent_user",
                    "password": f"wrong_password_{i}",
                },
            )
            status_codes.add(response.status_code)

        # Ogni tentativo deve restituire 401 (credenziali errate) o 429 (rate limit)
        assert status_codes.issubset({401, 429}), (
            f"Tentativi di login multipli hanno restituito status inattesi: {status_codes}"
        )
