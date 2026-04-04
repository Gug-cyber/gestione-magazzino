"""
Test per la sezione Analisi Finanziaria.
Verifica che le spese packaging non vengano conteggiate due volte.
"""
import pytest
from datetime import datetime, timezone


def _crea_prodotto(client, auth_headers, sku="ANALISI-PROD-001"):
    resp = client.post(
        "/api/prodotti/",
        json={
            "nome": "Prodotto Analisi Test",
            "sku": sku,
            "quantita": 100,
            "quantita_minima": 0,
            "prezzo_acquisto": 5.00,
            "prezzo_vendita": 10.00,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _crea_spesa(client, auth_headers, importo, categoria, anno=None, mese=None):
    """Crea una spesa di gestione manuale."""
    anno = anno or datetime.now().year
    mese = mese or datetime.now().month
    data_str = f"{anno}-{mese:02d}-15T00:00:00"
    resp = client.post(
        "/api/spese-gestione/",
        json={
            "descrizione": f"Spesa test {categoria}",
            "importo": importo,
            "categoria": categoria,
            "data": data_str,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Creazione spesa fallita: {resp.text}"
    return resp.json()


def test_spese_non_duplicate_in_analisi_mensile(client, auth_headers):
    """
    REGRESSION TEST: spese e packaging non devono sommarsi due volte.
    Se ho 100€ di spese generali e 50€ di packaging,
    il totale spese deve essere 150€, NON 250€.
    """
    anno = datetime.now().year
    mese = datetime.now().month

    # Crea una spesa generica (non packaging)
    _crea_spesa(client, auth_headers, importo=100.0, categoria="affitto", anno=anno, mese=mese)
    # Crea una spesa packaging
    _crea_spesa(client, auth_headers, importo=50.0, categoria="packaging", anno=anno, mese=mese)

    resp = client.get(f"/api/analisi/mensile?anno={anno}", headers=auth_headers)
    assert resp.status_code == 200

    dati = resp.json()
    dato_mese = next((d for d in dati if d["mese"] == mese), None)
    assert dato_mese is not None, f"Mese {mese} non trovato nei dati"

    spese = dato_mese["spese"]
    packaging = dato_mese["packaging"]
    totale_spese = dato_mese.get("totale_spese", spese + packaging)

    # spese deve essere solo le spese NON packaging (100€)
    assert spese == pytest.approx(100.0), f"Spese generali attese 100.0, ottenute {spese}"
    # packaging deve essere solo le spese packaging (50€)
    assert packaging == pytest.approx(50.0), f"Packaging atteso 50.0, ottenuto {packaging}"
    # totale_spese deve essere 150€, NON 250€
    assert totale_spese == pytest.approx(150.0), (
        f"Totale spese atteso 150.0 (no doppio conteggio), ottenuto {totale_spese}"
    )


def test_spese_non_duplicate_in_analisi_annuale(client, auth_headers):
    """
    REGRESSION TEST per l'endpoint annuale: stesso controllo del test mensile.
    """
    anno = datetime.now().year
    mese = datetime.now().month

    _crea_spesa(client, auth_headers, importo=200.0, categoria="utenze", anno=anno, mese=mese)
    _crea_spesa(client, auth_headers, importo=80.0, categoria="packaging", anno=anno, mese=mese)

    resp = client.get("/api/analisi/annuale", headers=auth_headers)
    assert resp.status_code == 200

    dati = resp.json()
    dato_anno = next((d for d in dati if d["anno"] == anno), None)
    assert dato_anno is not None, f"Anno {anno} non trovato nei dati annuali"

    spese = dato_anno["spese"]
    packaging = dato_anno["packaging"]
    totale_spese = dato_anno.get("totale_spese", spese + packaging)

    assert spese == pytest.approx(200.0), f"Spese generali attese 200.0, ottenute {spese}"
    assert packaging == pytest.approx(80.0), f"Packaging atteso 80.0, ottenuto {packaging}"
    assert totale_spese == pytest.approx(280.0), (
        f"Totale spese atteso 280.0, ottenuto {totale_spese}"
    )


def test_marginalita_calcolo_corretto(client, auth_headers):
    """
    REGRESSION TEST: il margine deve essere Ricavi - Costi - TotaleSpese
    senza doppio conteggio del packaging.
    """
    anno = datetime.now().year
    mese = datetime.now().month

    _crea_spesa(client, auth_headers, importo=30.0, categoria="varie", anno=anno, mese=mese)
    _crea_spesa(client, auth_headers, importo=20.0, categoria="packaging", anno=anno, mese=mese)

    resp = client.get(
        f"/api/analisi/marginalita-confronto?anno={anno}&mese={mese}",
        headers=auth_headers,
    )
    assert resp.status_code == 200

    dati = resp.json()
    mc = dati["mese_corrente"]

    spese = mc["spese"]
    packaging = mc.get("packaging", 0)
    marginalita = mc["marginalita"]
    ricavi = mc["ricavi"]
    costi = mc["costi"]

    # Il margine corretto deve sottrarre sia spese che packaging (non la loro somma due volte)
    margine_atteso = round(ricavi - costi - spese - packaging, 2)
    assert marginalita == pytest.approx(margine_atteso, abs=0.01), (
        f"Marginalità attesa {margine_atteso}, ottenuta {marginalita}. "
        "Possibile doppio conteggio del packaging nel calcolo della marginalità."
    )


def _crea_prodotto_analisi(client, auth_headers, sku="RICAVI-PROD-001"):
    resp = client.post(
        "/api/prodotti/",
        json={
            "nome": "Prodotto Ricavi Test",
            "sku": sku,
            "quantita": 100,
            "quantita_minima": 0,
            "prezzo_acquisto": 5.00,
            "prezzo_vendita": 10.00,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _crea_e_conferma_ordine(client, auth_headers, prodotto_id, quantita=1, prezzo=10.00):
    """Crea un ordine, lo porta a confermato (imposta data_conferma) e poi a completato."""
    resp = client.post(
        "/api/ordini/",
        json={
            "cliente_nome": "Cliente Analisi",
            "righe": [{"prodotto_id": prodotto_id, "quantita": quantita, "prezzo_unitario": prezzo}],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    ordine_id = resp.json()["id"]

    # bozza → confermato via PATCH /stato (imposta data_conferma)
    resp_conf = client.patch(
        f"/api/ordini/{ordine_id}/stato",
        json={"stato": "confermato"},
        headers=auth_headers,
    )
    assert resp_conf.status_code == 200
    ordine = resp_conf.json()
    assert ordine["data_conferma"] is not None, "data_conferma deve essere impostata alla conferma"

    # confermato → completato via PATCH /stato (imposta data_completamento)
    resp_comp = client.patch(
        f"/api/ordini/{ordine_id}/stato",
        json={"stato": "completato"},
        headers=auth_headers,
    )
    assert resp_comp.status_code == 200
    return resp_comp.json()


def test_data_conferma_impostata_alla_conferma(client, auth_headers):
    """
    REGRESSION TEST: data_conferma deve essere impostata quando l'ordine viene confermato.
    """
    prodotto = _crea_prodotto_analisi(client, auth_headers, sku="CONF-001")

    resp = client.post(
        "/api/ordini/",
        json={
            "cliente_nome": "Cliente Test",
            "righe": [{"prodotto_id": prodotto["id"], "quantita": 1, "prezzo_unitario": 10.0}],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    ordine_id = resp.json()["id"]
    assert resp.json()["data_conferma"] is None

    resp_conf = client.patch(
        f"/api/ordini/{ordine_id}/stato",
        json={"stato": "confermato"},
        headers=auth_headers,
    )
    assert resp_conf.status_code == 200
    assert resp_conf.json()["data_conferma"] is not None


def test_ricavi_attribuiti_al_mese_di_conferma(client, auth_headers):
    """
    REGRESSION TEST: i ricavi di un ordine completato devono essere contabilizzati
    nel mese in cui l'ordine è stato confermato (data_conferma), non nel mese
    di completamento.
    """
    prodotto = _crea_prodotto_analisi(client, auth_headers, sku="CONF-002")
    anno = datetime.now(timezone.utc).year
    mese = datetime.now(timezone.utc).month

    ordine = _crea_e_conferma_ordine(client, auth_headers, prodotto["id"], quantita=2, prezzo=10.0)
    totale_atteso = ordine["totale"]

    # I ricavi devono apparire nel mese corrente (mese di conferma)
    resp = client.get(f"/api/analisi/mensile?anno={anno}", headers=auth_headers)
    assert resp.status_code == 200
    dati = resp.json()
    dato_mese = next((d for d in dati if d["mese"] == mese), None)
    assert dato_mese is not None
    assert dato_mese["ricavi"] >= totale_atteso - 0.01, (
        f"Ricavi attesi almeno {totale_atteso} nel mese {mese}, trovati {dato_mese['ricavi']}"
    )
