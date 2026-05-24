from decimal import Decimal

import app.routers.ai as ai_router
from app.models.cardmarket_price import CardMarketPrice
from app.models.prodotto import Prodotto


def _make_product(db, **kwargs):
    product = Prodotto(
        nome=kwargs.get("nome", "Carta Test"),
        sku=kwargs.get("sku", "AI-001"),
        quantita=kwargs.get("quantita", 5),
        quantita_minima=kwargs.get("quantita_minima", 1),
        prezzo_acquisto=kwargs.get("prezzo_acquisto"),
        prezzo_vendita=kwargs.get("prezzo_vendita"),
        lingua=kwargs.get("lingua", "Italiano"),
        stato_conservazione=kwargs.get("stato_conservazione", "Near Mint"),
        cardtrader_blueprint_id=kwargs.get("cardtrader_blueprint_id", 123),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def test_analisi_mercato_endpoint_with_product_id(client, auth_headers, db, monkeypatch):
    product = _make_product(
        db,
        sku="AI-101",
        prezzo_acquisto=Decimal("10.00"),
        prezzo_vendita=Decimal("12.00"),
    )

    monkeypatch.setattr(
        ai_router.market_scraper_service,
        "get_all_market_prices",
        lambda **kwargs: {
            "summary": {"avg": 20.0, "min": 15.0, "max": 25.0, "count": 4, "all_prices": [15.0, 20.0, 25.0]},
            "sources": {},
        },
    )
    monkeypatch.setattr(ai_router.llm_service, "chat", lambda **kwargs: "Analisi AI di test")

    response = client.post("/api/ai/analisi-mercato", json={"prodotto_id": product.id}, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["prodotto"]["id"] == product.id
    assert data["raccomandazioni"]["prezzo_massimo_acquisto_per_margine_30"] == 15.38
    assert "Analisi AI di test" in data["raccomandazioni"]["analisi_llm"]


def test_analisi_magazzino_endpoint_returns_classification(client, auth_headers, db):
    product = _make_product(db, sku="AI-201", prezzo_vendita=Decimal("8.00"))
    db.add(
        CardMarketPrice(
            prodotto_id=product.id,
            prezzo_minimo=Decimal("10.00"),
            prezzo_medio=Decimal("12.00"),
        )
    )
    db.commit()

    response = client.get("/api/ai/analisi-magazzino", headers=auth_headers)

    assert response.status_code == 200
    rows = response.json()["suggerimenti"]
    target = next(row for row in rows if row["prodotto_id"] == product.id)
    assert target["stato"] == "troppo_basso"


def test_genera_descrizione_endpoint_parses_json_response(client, auth_headers, db, monkeypatch):
    product = _make_product(db, sku="AI-301")
    monkeypatch.setattr(ai_router.llm_service, "chat", lambda **kwargs: '{"it":"Descrizione IT","en":"Description EN"}')

    response = client.post("/api/ai/genera-descrizione", json={"prodotto_id": product.id}, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["descrizione_it"] == "Descrizione IT"
    assert data["descrizione_en"] == "Description EN"


def test_chat_endpoint_returns_ai_response(client, auth_headers, monkeypatch):
    monkeypatch.setattr(ai_router.llm_service, "chat", lambda **kwargs: "Risposta AI chat")

    response = client.post(
        "/api/ai/chat",
        json={"messaggio": "Quali prodotti devo riordinare?", "history": []},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["risposta"] == "Risposta AI chat"
