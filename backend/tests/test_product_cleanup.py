"""
Test per la logica di cancellazione automatica dei prodotti a zero stock.

Verifica:
  1. Il prodotto viene eliminato immediatamente quando la quantità raggiunge zero
     in seguito alla conferma di un ordine.
  2. Se dopo la vendita rimane dello stock, il prodotto NON viene eliminato.
  3. Annullare un ordine il cui prodotto è già stato eliminato non causa errori.
  4. run_cleanup() elimina correttamente i prodotti candidati dopo 10 giorni
     (prodotti con data_scarico impostata manualmente per altri casi).
  5. run_cleanup() NON elimina prodotti non collegati a un ordine.
  6. run_cleanup() NON elimina prodotti con data_scarico recente (< 10 giorni).
  7. run_cleanup() NON elimina prodotti con quantità > 0.
  8. Dopo la cancellazione del prodotto, la riga ordine deve esistere con prodotto_id=NULL.
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
# Test: il prodotto viene eliminato immediatamente quando la quantità raggiunge zero
# ---------------------------------------------------------------------------

def test_prodotto_eliminato_immediatamente_quando_quantita_zero(client, auth_headers, db):
    """Confermare un ordine che esaurisce le scorte deve eliminare subito il prodotto."""
    from app.models.prodotto import Prodotto

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-01", quantita=3)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    _conferma_ordine(client, auth_headers, ordine["id"])

    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p is None, "Il prodotto deve essere eliminato immediatamente quando la quantità è zero"


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


def test_annullamento_ordine_prodotto_eliminato_non_causa_errori(client, auth_headers, db):
    """Annullare un ordine il cui prodotto è già stato eliminato non deve causare errori."""
    from app.models.prodotto import Prodotto

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-03", quantita=3)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=3)
    _conferma_ordine(client, auth_headers, ordine["id"])

    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p is None, "Il prodotto deve essere già eliminato dopo la conferma"

    # Annullare l'ordine non deve sollevare eccezioni
    _annulla_ordine(client, auth_headers, ordine["id"])

    # Il prodotto rimane eliminato (non viene ricreato)
    db.expire_all()
    p_after = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p_after is None, "Il prodotto eliminato non deve essere ricreato dall'annullamento"


# ---------------------------------------------------------------------------
# Test: logica run_cleanup
# ---------------------------------------------------------------------------

def test_cleanup_elimina_prodotto_candidato(client, auth_headers, db):
    """run_cleanup deve eliminare un prodotto con quantità=0, data_scarico > 10 giorni e ordine.

    Questo test simula il caso in cui data_scarico viene impostato manualmente
    (ad es. per prodotti gestiti al di fuori del flusso ordine normale).
    """
    from app.models.prodotto import Prodotto
    from app.tasks.product_cleanup_scheduler import run_cleanup

    # Crea un prodotto con quantità > 0 (non verrà eliminato automaticamente)
    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-04", quantita=2)
    prodotto_id = prodotto["id"]

    # Crea e conferma un ordine parziale per associare il prodotto a una riga_ordine
    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=1)
    _conferma_ordine(client, auth_headers, ordine["id"])

    # Imposta manualmente quantita=0 e data_scarico vecchia per simulare il caso dello scheduler
    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p is not None
    p.quantita = 0
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

    # Crea prodotto e ordine parziale per associare una riga_ordine
    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-06", quantita=2)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=1)
    _conferma_ordine(client, auth_headers, ordine["id"])

    # Imposta manualmente quantita=0 e data_scarico recente
    db.expire_all()
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p is not None
    p.quantita = 0
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
    """Dopo la cancellazione del prodotto, la riga ordine deve esistere con prodotto_id=NULL.

    Testa sia la cancellazione immediata (qty→0 da ordine) sia il comportamento
    del campo prodotto_id nelle righe d'ordine (ON DELETE SET NULL).
    """
    from app.models.prodotto import Prodotto
    from app.models.ordine import RigaOrdine

    prodotto = _crea_prodotto(client, auth_headers, sku="CLEANUP-TEST-08", quantita=2)
    prodotto_id = prodotto["id"]

    ordine = _crea_ordine(client, auth_headers, prodotto_id, quantita=2)
    ordine_id = ordine["id"]
    _conferma_ordine(client, auth_headers, ordine_id)

    db.expire_all()
    # Il prodotto deve essere eliminato immediatamente dopo la conferma
    p_after = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    assert p_after is None, "Il prodotto deve essere eliminato immediatamente quando qty=0"

    # La riga ordine deve esistere ancora (prodotto_id=NULL grazie a SET NULL)
    riga = db.query(RigaOrdine).filter(RigaOrdine.ordine_id == ordine_id).first()
    assert riga is not None, "La riga ordine deve essere preservata dopo la cancellazione del prodotto"
    assert riga.prodotto_id is None, "prodotto_id deve essere NULL dopo la cancellazione del prodotto"
