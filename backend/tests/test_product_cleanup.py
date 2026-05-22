"""
Test per la logica di cancellazione automatica dei prodotti a zero stock.

Verifica:
  1. data_scarico viene impostato quando la quantità del prodotto raggiunge zero
     in seguito alla conferma di un ordine.
  2. data_scarico viene azzerato quando lo stock viene ripristinato (annullamento
     ordine o ricezione fornitura).
  3. run_cleanup() elimina correttamente i prodotti candidati dopo 10 giorni.
  4. run_cleanup() NON elimina prodotti non collegati a un ordine.
  5. run_cleanup() NON elimina prodotti con data_scarico recente (< 10 giorni).
  6. run_cleanup() NON elimina prodotti con quantità > 0.
"""
from datetime import datetime, timedelta, timezone

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _crea_prodotto(client, auth_headers, nome="Prodotto Cleanup", sku="CLEANUP-001", quantita=5):
    resp = client.post(
        "/api/prodotti/",
        json={
            "nome": nome,
            "sku": sku,
            "quantita": quantita,
            "quantita_minima": 0,
            "prezzo_acquisto": 2.00,
            "prezzo_vendita": 5.00,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Creazione prodotto fallita: {resp.text}"
    return resp.json()


def _crea_ordine(client, auth_headers, prodotto_id, quantita=1, prezzo=5.00):
    resp = client.post(
        "/api/ordini/",
        json={
            "cliente_nome": "Cliente Cleanup Test",
            "righe": [
                {
                    "prodotto_id": prodotto_id,
                    "quantita": quantita,
                    "prezzo_unitario": prezzo,
                }
            ],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Creazione ordine fallita: {resp.text}"
    return resp.json()


def _conferma_ordine(client, auth_headers, ordine_id):
    resp = client.put(
        f"/api/ordini/{ordine_id}",
        json={"stato": "confermato"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Conferma ordine fallita: {resp.text}"
    return resp.json()


def _annulla_ordine(client, auth_headers, ordine_id):
    resp = client.put(
        f"/api/ordini/{ordine_id}",
        json={"stato": "annullato"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Annullamento ordine fallito: {resp.text}"
    return resp.json()


# ---------------------------------------------------------------------------
# Test: data_scarico viene impostato quando la quantità raggiunge zero
# ---------------------------------------------------------------------------

def test_data_scarico_impostato_quando_quantita_zero(client, auth_headers, db):
    """Confermare un ordine che esaurisce le scorte deve impostare data_scarico."""
    from app.models.prodotto import Prodotto

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-01", quantita=3)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    _conferma_ordine(client, auth_headers, ordine["id"])

    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p.quantita == 0
    assert p.data_scarico is not None, "data_scarico deve essere impostato quando la quantità è zero"


def test_data_scarico_non_impostato_se_quantita_rimane_positiva(client, auth_headers, db):
    """Se dopo la vendita rimane dello stock, data_scarico NON deve essere impostato."""
    from app.models.prodotto import Prodotto

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-02", quantita=10)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    _conferma_ordine(client, auth_headers, ordine["id"])

    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p.quantita == 7
    assert p.data_scarico is None, "data_scarico deve restare None se la quantità è > 0"


def test_data_scarico_azzerato_quando_stock_ripristinato(client, auth_headers, db):
    """Annullare un ordine deve azzerare data_scarico se lo stock viene ripristinato."""
    from app.models.prodotto import Prodotto

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-03", quantita=3)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    _conferma_ordine(client, auth_headers, ordine["id"])

    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p.data_scarico is not None

    _annulla_ordine(client, auth_headers, ordine["id"])

    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p.quantita == 3
    assert p.data_scarico is None, "data_scarico deve essere azzerato dopo il ripristino dello stock"


# ---------------------------------------------------------------------------
# Test: logica run_cleanup
# ---------------------------------------------------------------------------

def test_cleanup_elimina_prodotto_candidato(client, auth_headers, db):
    """run_cleanup deve eliminare un prodotto con quantità=0, data_scarico > 10 giorni e ordine."""
    from app.models.prodotto import Prodotto
    from app.tasks.product_cleanup_scheduler import run_cleanup

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-04", quantita=2)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=2)
    _conferma_ordine(client, auth_headers, ordine["id"])

    # Simula data_scarico vecchia (> 10 giorni)
    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    p.data_scarico = datetime.now(timezone.utc) - timedelta(days=11)
    db.commit()

    result = run_cleanup(db=db)

    assert prodotto_id in result["ids"], "Il prodotto doveva essere eliminato"
    assert result["eliminati"] >= 1

    db.expire_all()
    p_after = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p_after is None, "Il prodotto deve essere fisicamente eliminato dal DB"


def test_cleanup_non_elimina_prodotto_senza_ordine(client, auth_headers, db):
    """run_cleanup NON deve eliminare prodotti a zero stock non collegati a nessun ordine."""
    from app.models.prodotto import Prodotto
    from app.tasks.product_cleanup_scheduler import run_cleanup

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-05", quantita=0)
    prodotto_id = prodotto["id"]

    # Imposta data_scarico vecchia manualmente (nessun ordine collegato)
    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    p.data_scarico = datetime.now(timezone.utc) - timedelta(days=15)
    db.commit()

    result = run_cleanup(db=db)

    assert prodotto_id not in result["ids"], "Prodotto senza ordine non deve essere eliminato"

    db.expire_all()
    p_after = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p_after is not None, "Il prodotto senza ordine deve rimanere nel DB"


def test_cleanup_non_elimina_prodotto_con_data_scarico_recente(client, auth_headers, db):
    """run_cleanup NON deve eliminare prodotti con data_scarico < 10 giorni."""
    from app.models.prodotto import Prodotto
    from app.tasks.product_cleanup_scheduler import run_cleanup

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-06", quantita=1)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=1)
    _conferma_ordine(client, auth_headers, ordine["id"])

    # data_scarico recente (solo 5 giorni fa)
    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    p.data_scarico = datetime.now(timezone.utc) - timedelta(days=5)
    db.commit()

    result = run_cleanup(db=db)

    assert prodotto_id not in result["ids"], "Prodotto con data_scarico recente non deve essere eliminato"

    db.expire_all()
    p_after = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p_after is not None


def test_cleanup_non_elimina_prodotto_con_quantita_positiva(client, auth_headers, db):
    """run_cleanup NON deve eliminare prodotti con quantità > 0."""
    from app.models.prodotto import Prodotto
    from app.tasks.product_cleanup_scheduler import run_cleanup

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-07", quantita=5)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=2)
    _conferma_ordine(client, auth_headers, ordine["id"])

    # quantità rimasta = 3 (non zero), forza data_scarico vecchia per sicurezza
    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p.quantita == 3
    p.data_scarico = datetime.now(timezone.utc) - timedelta(days=15)
    db.commit()

    result = run_cleanup(db=db)

    assert prodotto_id not in result["ids"]

    db.expire_all()
    p_after = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p_after is not None


def test_cleanup_preserva_storia_ordine_dopo_eliminazione(client, auth_headers, db):
    """Dopo la cancellazione del prodotto, la riga ordine deve esistere con prodotto_id=NULL."""
    from app.models.prodotto import Prodotto
    from app.models.ordine import RigaOrdine
    from app.tasks.product_cleanup_scheduler import run_cleanup

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-08", quantita=2)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=2)
    ordine_id = ordine["id"]
    _conferma_ordine(client, auth_headers, ordine_id)

    # Simula data_scarico vecchia
    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    p.data_scarico = datetime.now(timezone.utc) - timedelta(days=11)
    db.commit()

    run_cleanup(db=db)

    db.expire_all()
    # Il prodotto deve essere eliminato
    p_after = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p_after is None

    # La riga ordine deve esistere ancora (prodotto_id=NULL grazie a SET NULL)
    riga = db.query(RigaOrdine).filter(RigaOrdine.ordine_id == ordine_id).first()
    assert riga is not None, "La riga ordine deve essere preservata dopo la cancellazione del prodotto"
    assert riga.prodotto_id is None, "prodotto_id deve essere NULL dopo la cancellazione del prodotto"
