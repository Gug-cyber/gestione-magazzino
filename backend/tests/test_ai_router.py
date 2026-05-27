from datetime import datetime, timedelta, timezone
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
    assert data["raccomandazioni"]["prezzo_consigliato_vendita"] == 19.0
    assert "Analisi AI di test" in data["raccomandazioni"]["analisi_llm"]


def test_analisi_mercato_prefers_cached_cardmarket_price(client, auth_headers, db, monkeypatch):
    product = _make_product(db, sku="AI-102", prezzo_vendita=Decimal("27.00"))
    db.add(
        CardMarketPrice(
            prodotto_id=product.id,
            prezzo_minimo=Decimal("22.00"),
            prezzo_medio=Decimal("24.00"),
            data_aggiornamento=datetime.now(timezone.utc),
        )
    )
    db.commit()

    def _should_not_run(**kwargs):
        raise AssertionError("lo scraper non dovrebbe essere chiamato quando la cache CardMarket è disponibile")

    monkeypatch.setattr(ai_router.market_scraper_service, "get_all_market_prices", _should_not_run)
    monkeypatch.setattr(ai_router.llm_service, "chat", lambda **kwargs: "Analisi da cache")

    response = client.post("/api/ai/analisi-mercato", json={"prodotto_id": product.id}, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["mercato"]["source"] == "cardmarket_cache"
    assert data["mercato"]["summary"]["avg"] == 24.0
    assert data["raccomandazioni"]["prezzo_massimo_acquisto_per_margine_30"] == 18.46
    assert data["raccomandazioni"]["prezzo_consigliato_vendita"] == 22.8


def test_analisi_prezzi_endpoint_returns_top_critici(client, auth_headers, db, monkeypatch):
    alto = _make_product(db, sku="AI-201", nome="Charizard", prezzo_vendita=Decimal("150.00"))
    basso = _make_product(db, sku="AI-202", nome="Gengar", prezzo_vendita=Decimal("40.00"))
    db.add_all(
        [
            CardMarketPrice(prodotto_id=alto.id, prezzo_minimo=Decimal("90.00"), prezzo_medio=Decimal("100.00")),
            CardMarketPrice(prodotto_id=basso.id, prezzo_minimo=Decimal("55.00"), prezzo_medio=Decimal("60.00")),
        ]
    )
    db.commit()

    monkeypatch.setattr(
        ai_router.llm_service,
        "chat",
        lambda **kwargs: (
            '{"commenti":['
            f'{{"prodotto_id": {alto.id}, "commento": "Charizard è molto sopra mercato."}},'
            f'{{"prodotto_id": {basso.id}, "commento": "Gengar è sotto mercato."}}'
            ']}'
        ),
    )

    response = client.get("/api/ai/analisi-prezzi", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["totale_prodotti"] >= 2
    top_ids = [row["prodotto_id"] for row in data["top_critici"]]
    assert alto.id in top_ids
    assert basso.id in top_ids
    charizard = next(row for row in data["prodotti"] if row["prodotto_id"] == alto.id)
    gengar = next(row for row in data["prodotti"] if row["prodotto_id"] == basso.id)
    assert charizard["classificazione"] == "sopra_mercato"
    assert charizard["differenza_pct"] == 50.0
    assert charizard["commento_ai"] == "Charizard è molto sopra mercato."
    assert gengar["classificazione"] == "sotto_mercato"


def test_analisi_magazzino_endpoint_returns_classification(client, auth_headers, db):
    product = _make_product(db, sku="AI-301", prezzo_vendita=Decimal("8.00"))
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
    product = _make_product(db, sku="AI-401")
    monkeypatch.setattr(ai_router.llm_service, "chat", lambda **kwargs: '{"it":"Descrizione IT","en":"Description EN"}')

    response = client.post("/api/ai/genera-descrizione", json={"prodotto_id": product.id}, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["descrizione_it"] == "Descrizione IT"
    assert data["descrizione_en"] == "Description EN"


def test_email_fornitore_endpoint_parses_json_response(client, auth_headers, monkeypatch):
    monkeypatch.setattr(
        ai_router.llm_service,
        "chat",
        lambda **kwargs: '{"oggetto":"Proposta acquisto lotto Pokémon","corpo":"Buongiorno, vorrei proporre un acquisto del lotto."}',
    )

    response = client.post(
        "/api/ai/email-fornitore",
        json={
            "nome_fornitore": "Mario",
            "descrizione_lotto": "Lotto di carte Pokémon holo",
            "prezzo_proposto": 50,
            "tipo_email": "proposta_acquisto",
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["oggetto"] == "Proposta acquisto lotto Pokémon"
    assert "Buongiorno" in data["corpo"]


def test_trend_prodotto_endpoint_returns_variation(client, auth_headers, db, monkeypatch):
    product = _make_product(db, sku="AI-501", nome="Gengar EX")
    now = datetime.now(timezone.utc)
    db.add_all(
        [
            CardMarketPrice(prodotto_id=product.id, prezzo_medio=Decimal("50.00"), data_aggiornamento=now - timedelta(days=20)),
            CardMarketPrice(prodotto_id=product.id, prezzo_medio=Decimal("60.00"), data_aggiornamento=now - timedelta(days=2)),
        ]
    )
    db.commit()
    monkeypatch.setattr(ai_router.llm_service, "chat", lambda **kwargs: "Trend positivo, valuta vendita.")

    response = client.post(
        "/api/ai/trend-prodotto",
        json={"prodotto_id": product.id, "periodo_giorni": 30},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["variazione_pct"] == 20.0
    assert len(data["serie_prezzi"]) == 2
    assert data["commento_ai"] == "Trend positivo, valuta vendita."


def test_chat_endpoint_includes_precomputed_context(client, auth_headers, db, monkeypatch):
    _make_product(db, sku="AI-601", nome="Pikachu", quantita=3, quantita_minima=3, prezzo_vendita=Decimal("10.00"))
    _make_product(db, sku="AI-602", nome="Mew", quantita=2, quantita_minima=1, prezzo_vendita=Decimal("25.00"))

    captured = {}

    def _fake_chat(**kwargs):
        captured.update(kwargs)
        return "Risposta AI chat"

    monkeypatch.setattr(ai_router.llm_service, "chat", _fake_chat)

    response = client.post(
        "/api/ai/chat",
        json={"messaggio": "Qual è il valore del mio magazzino?", "history": []},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["risposta"] == "Risposta AI chat"
    assert '"valore_totale_magazzino": 80.0' in captured["prompt"]
    assert '"prodotti_sotto_scorta"' in captured["prompt"]
