from fastapi import HTTPException
import pytest

import app.routers.cardmarket_scraper as cardmarket_scraper


def _make_dummy_client(response_json, captured=None):
    """Factory per un client httpx finto che registra la chiamata ed espone la risposta."""

    class _DummyResponse:
        url = "https://cardmarket-api-tcg.p.rapidapi.com/pokemon/cards/search"

        @staticmethod
        def raise_for_status():
            return None

        def json(self):
            return response_json

    class _DummyClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def get(self, url, params=None, headers=None):
            if captured is not None:
                captured["url"] = url
                captured["params"] = params
                captured["headers"] = headers
            return _DummyResponse()

    return _DummyClient


def test_scrape_cardmarket_requires_rapidapi_key(monkeypatch):
    monkeypatch.delenv("RAPIDAPI_CARDMARKET_KEY", raising=False)

    with pytest.raises(HTTPException) as exc:
        cardmarket_scraper._scrape_cardmarket("Black Lotus", "NM", 1)

    assert exc.value.status_code == 400
    assert exc.value.detail == "RAPIDAPI_CARDMARKET_KEY non configurata"


def test_scrape_cardmarket_uses_rapidapi_and_parses_prices(monkeypatch):
    captured = {}
    payload = {
        "data": [
            {
                "name": "Black Lotus",
                "card_number": "1",
                "episode": {"code": "alpha"},
                "prices": {
                    "cardmarket": {
                        "lowest_near_mint": 12.34,
                        "lowest_near_mint_EN": 12.34,
                        "30d_average": 14.56,
                    }
                },
                "links": {"cardmarket": "/it/Magic/Products/Singles/Alpha/Black-Lotus"},
            }
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload, captured))

    result = cardmarket_scraper._scrape_cardmarket("Black Lotus", "NM", 1)

    assert captured["url"] == "https://cardmarket-api-tcg.p.rapidapi.com/pokemon/cards/search"
    assert captured["params"] == {"search": "Black Lotus", "condition": "NM", "languageId": 1}
    assert captured["headers"]["X-RapidAPI-Key"] == "test-key"
    assert captured["headers"]["X-RapidAPI-Host"] == "cardmarket-api-tcg.p.rapidapi.com"
    assert result["prezzo_minimo"] == 12.34
    assert result["prezzo_medio"] == 14.56
    assert result["url_cardmarket"] == "https://www.cardmarket.com/it/Magic/Products/Singles/Alpha/Black-Lotus"


def test_scrape_cardmarket_matches_by_card_number_and_set_code(monkeypatch):
    """Verifica che il prodotto corretto sia scelto tramite card_number + set_code."""
    payload = {
        "data": [
            {
                "name": "Mega Gengar ex V2",
                "card_number": "99",
                "episode": {"code": "zzz"},
                "prices": {"cardmarket": {"lowest_near_mint": 5.00, "30d_average": 6.00}},
                "links": {"cardmarket": "/wrong-card"},
            },
            {
                "name": "Mega Gengar ex",
                "card_number": "240",
                "episode": {"code": "m2a"},
                "prices": {"cardmarket": {"lowest_near_mint": 3.50, "30d_average": 4.00}},
                "links": {"cardmarket": "/correct-card"},
            },
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    result = cardmarket_scraper._scrape_cardmarket("Mega Gengar ex (m2a 240)", "NM", None)

    assert result["prezzo_minimo"] == 3.50
    assert result["url_cardmarket"] == "https://www.cardmarket.com/correct-card"


def test_scrape_cardmarket_matches_by_card_number_only(monkeypatch):
    """Verifica match solo per card_number quando è nella forma '(GG69)'."""
    payload = {
        "data": [
            {
                "name": "Pikachu V1",
                "card_number": "001",
                "episode": {"code": "base"},
                "prices": {"cardmarket": {"lowest_near_mint": 1.00, "30d_average": 1.50}},
                "links": {"cardmarket": "/wrong"},
            },
            {
                "name": "Pikachu",
                "card_number": "GG69",
                "episode": {"code": "promo"},
                "prices": {"cardmarket": {"lowest_near_mint": 8.00, "30d_average": 9.00}},
                "links": {"cardmarket": "/correct-pikachu"},
            },
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    result = cardmarket_scraper._scrape_cardmarket("Pikachu (GG69)", "NM", None)

    assert result["prezzo_minimo"] == 8.00
    assert result["url_cardmarket"] == "https://www.cardmarket.com/correct-pikachu"


def test_scrape_cardmarket_flexible_card_number_slash_format(monkeypatch):
    """Verifica matching flessibile: card_number '240/191' matcha hint '240'."""
    payload = {
        "data": [
            {
                "name": "Mega Gengar ex wrong",
                "card_number": "99",
                "episode": {"code": "zzz"},
                "prices": {"cardmarket": {"lowest_near_mint": 5.00, "30d_average": 6.00}},
                "links": {"cardmarket": "/wrong-card"},
            },
            {
                "name": "Mega Gengar ex",
                "card_number": "240/191",
                "episode": {"code": "m2a"},
                "prices": {"cardmarket": {"lowest_near_mint": 3.50, "30d_average": 4.00}},
                "links": {"cardmarket": "/correct-card"},
            },
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    result = cardmarket_scraper._scrape_cardmarket("Mega Gengar ex (m2a 240)", "NM", None)

    assert result["prezzo_minimo"] == 3.50
    assert result["url_cardmarket"] == "https://www.cardmarket.com/correct-card"


def test_scrape_cardmarket_flexible_card_number_prefix_dash_format(monkeypatch):
    """Verifica matching flessibile: card_number 'SV3PT5-240' matcha hint '240'."""
    payload = {
        "data": [
            {
                "name": "Mega Gengar ex wrong",
                "card_number": "99",
                "episode": {"code": "zzz"},
                "prices": {"cardmarket": {"lowest_near_mint": 5.00, "30d_average": 6.00}},
                "links": {"cardmarket": "/wrong-card"},
            },
            {
                "name": "Mega Gengar ex",
                "card_number": "SV3PT5-240",
                "episode": {"code": "m2a"},
                "prices": {"cardmarket": {"lowest_near_mint": 3.50, "30d_average": 4.00}},
                "links": {"cardmarket": "/correct-card"},
            },
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    result = cardmarket_scraper._scrape_cardmarket("Mega Gengar ex (m2a 240)", "NM", None)

    assert result["prezzo_minimo"] == 3.50
    assert result["url_cardmarket"] == "https://www.cardmarket.com/correct-card"


def test_scrape_cardmarket_flexible_card_number_prefix_slash_format(monkeypatch):
    """Verifica matching flessibile: card_number 'sv/240' matcha hint '240'."""
    payload = {
        "data": [
            {
                "name": "Mega Gengar ex wrong",
                "card_number": "99",
                "episode": {"code": "zzz"},
                "prices": {"cardmarket": {"lowest_near_mint": 5.00, "30d_average": 6.00}},
                "links": {"cardmarket": "/wrong-card"},
            },
            {
                "name": "Mega Gengar ex",
                "card_number": "sv/240",
                "episode": {"code": "m2a"},
                "prices": {"cardmarket": {"lowest_near_mint": 3.50, "30d_average": 4.00}},
                "links": {"cardmarket": "/correct-card"},
            },
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    result = cardmarket_scraper._scrape_cardmarket("Mega Gengar ex (m2a 240)", "NM", None)

    assert result["prezzo_minimo"] == 3.50
    assert result["url_cardmarket"] == "https://www.cardmarket.com/correct-card"


def test_scrape_cardmarket_flexible_set_code_matching(monkeypatch):
    """Verifica matching flessibile del set_code: 'sv3pt5' matcha hint 'sv3pt5' come prefisso/suffisso."""
    payload = {
        "data": [
            {
                "name": "Charizard ex wrong",
                "card_number": "054",
                "episode": {"code": "zzz"},
                "prices": {"cardmarket": {"lowest_near_mint": 1.00, "30d_average": 2.00}},
                "links": {"cardmarket": "/wrong"},
            },
            {
                "name": "Charizard ex",
                "card_number": "054",
                "episode": {"code": "sv3pt5-en"},
                "prices": {"cardmarket": {"lowest_near_mint": 15.00, "30d_average": 17.00}},
                "links": {"cardmarket": "/correct"},
            },
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    result = cardmarket_scraper._scrape_cardmarket("Charizard ex (sv3pt5 054)", "NM", None)

    assert result["prezzo_minimo"] == 15.00
    assert result["url_cardmarket"] == "https://www.cardmarket.com/correct"


def test_scrape_cardmarket_fallback_difflib_when_no_card_number(monkeypatch):
    """Senza parentesi usa il fallback difflib e sceglie il miglior match per nome."""
    payload = {
        "data": [
            {
                "name": "totally unrelated card",
                "card_number": "001",
                "episode": {},
                "prices": {"cardmarket": {"lowest_near_mint": 1.00, "30d_average": 1.00}},
                "links": {},
            },
            {
                "name": "charizard ex",
                "card_number": "004",
                "episode": {},
                "prices": {"cardmarket": {"lowest_near_mint": 20.00, "30d_average": 22.00}},
                "links": {"cardmarket": "/charizard"},
            },
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    result = cardmarket_scraper._scrape_cardmarket("Charizard ex", "NM", None)

    assert result["prezzo_minimo"] == 20.00
    assert result["url_cardmarket"] == "https://www.cardmarket.com/charizard"


def test_scrape_cardmarket_japanese_language_uses_generic_lowest_near_mint(monkeypatch, caplog):
    """Con lingua giapponese usa lowest_near_mint generico e logga warning esplicito."""
    payload = {
        "data": [
            {
                "name": "Mega Gengar ex",
                "card_number": "240",
                "episode": {"code": "m2a"},
                "prices": {
                    "cardmarket": {
                        "lowest_near_mint": 650.00,
                        "lowest_near_mint_EN": 2.00,
                        "30d_average": 640.00,
                    }
                },
                "links": {"cardmarket": "/mega-gengar"},
            }
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    with caplog.at_level("WARNING"):
        result = cardmarket_scraper._scrape_cardmarket("Mega Gengar ex (m2a 240)", "NM", 6)

    assert result["prezzo_minimo"] == 650.00
    assert result["prezzo_medio"] == 640.00
    assert "Lingua non europea" in caplog.text


def test_scrape_cardmarket_japanese_megagengar_selects_correct_product_not_fallback(monkeypatch):
    """Con lingua giapponese deve selezionare il prodotto corretto e non il fallback tcggo."""
    payload = {
        "data": [
            {
                "name": "Wrong low-price card",
                "card_number": "77",
                "episode": {"code": "zzz"},
                "prices": {"cardmarket": {"lowest_near_mint": 2.00, "30d_average": 1.98}},
                "links": {},
                "tcggo_url": "https://www.tcggo.com/external/cm/31-wrong",
            },
            {
                "name": "Mega Gengar ex",
                "card_number": "SV3PT5-240",
                "episode": {"code": "m2a"},
                "prices": {"cardmarket": {"lowest_near_mint": 650.00, "30d_average": 640.00}},
                "links": {"cardmarket": "/correct-mega-gengar"},
            },
        ]
    }

    monkeypatch.setenv("RAPIDAPI_CARDMARKET_KEY", "test-key")
    monkeypatch.setattr(cardmarket_scraper.httpx, "Client", _make_dummy_client(payload))

    result = cardmarket_scraper._scrape_cardmarket("Mega Gengar ex (m2a 240)", "NM", 6)

    assert result["prezzo_minimo"] == 650.00
    assert result["prezzo_medio"] == 640.00
    assert result["url_cardmarket"] == "https://www.cardmarket.com/correct-mega-gengar"
    assert "tcggo.com" not in result["url_cardmarket"]
