from fastapi import HTTPException
import pytest

import app.routers.cardmarket_scraper as cardmarket_scraper


def test_scrape_cardmarket_requires_rapidapi_key(monkeypatch):
    monkeypatch.setattr(cardmarket_scraper, "RAPIDAPI_CARDMARKET_KEY", "")

    with pytest.raises(HTTPException) as exc:
        cardmarket_scraper._scrape_cardmarket("Black Lotus", "NM", 1)

    assert exc.value.status_code == 400
    assert exc.value.detail == "RAPIDAPI_CARDMARKET_KEY non configurata"


def test_scrape_cardmarket_uses_rapidapi_and_parses_prices(monkeypatch):
    captured = {}

    class _DummyResponse:
        url = "https://cardmarket-api-tcg.p.rapidapi.com/products/search?name=Black+Lotus"

        @staticmethod
        def raise_for_status():
            return None

        @staticmethod
        def json():
            return {
                "data": {
                    "products": [
                        {
                            "minPrice": "12,34",
                            "avgPrice": 14.56,
                            "url": "/it/Magic/Products/Singles/Alpha/Black-Lotus",
                        }
                    ]
                }
            }

    class _DummyClient:
        def __init__(self, timeout):
            assert timeout == 30

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def get(self, url, params=None, headers=None):
            captured["url"] = url
            captured["params"] = params
            captured["headers"] = headers
            return _DummyResponse()

    monkeypatch.setattr(cardmarket_scraper, "RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _DummyClient)

    result = cardmarket_scraper._scrape_cardmarket("Black Lotus", "NM", 1)

    assert captured["url"] == "https://cardmarket-api-tcg.p.rapidapi.com/products/search"
    assert captured["params"] == {"name": "Black Lotus", "condition": "NM", "languageId": 1}
    assert captured["headers"]["X-RapidAPI-Key"] == "test-key"
    assert captured["headers"]["X-RapidAPI-Host"] == "cardmarket-api-tcg.p.rapidapi.com"
    assert result["prezzo_minimo"] == 12.34
    assert result["prezzo_medio"] == 14.56
    assert result["url_cardmarket"] == "https://www.cardmarket.com/it/Magic/Products/Singles/Alpha/Black-Lotus"
