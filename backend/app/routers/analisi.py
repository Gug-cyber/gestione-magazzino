from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from datetime import datetime
from ..database import get_db
from ..models.movimento import Movimento, TipoMovimento
from ..models.prodotto import Prodotto
from ..models.spesa_gestione import SpesaGestione
from ..models.dato_storico import DatoStorico
from ..auth import get_current_active_user

router = APIRouter()


@router.get("/mensile")
def get_analisi_mensile(
    anno: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if anno is None:
        anno = datetime.now().year

    risultati = []
    for mese in range(1, 13):
        movimenti_carico = (
            db.query(Movimento, Prodotto)
            .join(Prodotto, Movimento.prodotto_id == Prodotto.id)
            .filter(
                Movimento.tipo == TipoMovimento.carico,
                extract("year", Movimento.data_movimento) == anno,
                extract("month", Movimento.data_movimento) == mese,
            )
            .all()
        )
        costi = sum(
            float(m.quantita) * float(p.prezzo_acquisto or 0)
            for m, p in movimenti_carico
        )

        movimenti_scarico = (
            db.query(Movimento, Prodotto)
            .join(Prodotto, Movimento.prodotto_id == Prodotto.id)
            .filter(
                Movimento.tipo == TipoMovimento.scarico,
                extract("year", Movimento.data_movimento) == anno,
                extract("month", Movimento.data_movimento) == mese,
            )
            .all()
        )
        ricavi = sum(
            float(m.quantita) * float(p.prezzo_vendita or 0)
            for m, p in movimenti_scarico
        )

        spese_result = db.query(func.sum(SpesaGestione.importo)).filter(
            extract("year", SpesaGestione.data) == anno,
            extract("month", SpesaGestione.data) == mese,
        ).scalar()
        spese = float(spese_result or 0)

        storici_costi = db.query(func.sum(DatoStorico.importo)).filter(
            DatoStorico.tipo == "costo",
            extract("year", DatoStorico.data) == anno,
            extract("month", DatoStorico.data) == mese,
        ).scalar()
        costi += float(storici_costi or 0)

        storici_ricavi = db.query(func.sum(DatoStorico.importo)).filter(
            DatoStorico.tipo == "ricavo",
            extract("year", DatoStorico.data) == anno,
            extract("month", DatoStorico.data) == mese,
        ).scalar()
        ricavi += float(storici_ricavi or 0)

        risultati.append({
            "mese": mese,
            "costi": round(costi, 2),
            "ricavi": round(ricavi, 2),
            "spese": round(spese, 2),
        })

    return risultati


@router.get("/annuale")
def get_analisi_annuale(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    anni_query = (
        db.query(extract("year", Movimento.data_movimento).label("anno"))
        .distinct()
        .order_by("anno")
        .all()
    )
    anni = [int(row.anno) for row in anni_query if row.anno is not None]

    # Also include years that only appear in dati_storici
    storici_anni_query = (
        db.query(extract("year", DatoStorico.data).label("anno"))
        .distinct()
        .all()
    )
    storici_anni = {int(row.anno) for row in storici_anni_query if row.anno is not None}
    anni = sorted(set(anni) | storici_anni)

    if not anni:
        return []

    risultati = []
    for anno in anni:
        movimenti_carico = (
            db.query(Movimento, Prodotto)
            .join(Prodotto, Movimento.prodotto_id == Prodotto.id)
            .filter(
                Movimento.tipo == TipoMovimento.carico,
                extract("year", Movimento.data_movimento) == anno,
            )
            .all()
        )
        costi = sum(
            float(m.quantita) * float(p.prezzo_acquisto or 0)
            for m, p in movimenti_carico
        )

        movimenti_scarico = (
            db.query(Movimento, Prodotto)
            .join(Prodotto, Movimento.prodotto_id == Prodotto.id)
            .filter(
                Movimento.tipo == TipoMovimento.scarico,
                extract("year", Movimento.data_movimento) == anno,
            )
            .all()
        )
        ricavi = sum(
            float(m.quantita) * float(p.prezzo_vendita or 0)
            for m, p in movimenti_scarico
        )

        spese_result = db.query(func.sum(SpesaGestione.importo)).filter(
            extract("year", SpesaGestione.data) == anno,
        ).scalar()
        spese = float(spese_result or 0)

        storici_costi = db.query(func.sum(DatoStorico.importo)).filter(
            DatoStorico.tipo == "costo",
            extract("year", DatoStorico.data) == anno,
        ).scalar()
        costi += float(storici_costi or 0)

        storici_ricavi = db.query(func.sum(DatoStorico.importo)).filter(
            DatoStorico.tipo == "ricavo",
            extract("year", DatoStorico.data) == anno,
        ).scalar()
        ricavi += float(storici_ricavi or 0)

        risultati.append({
            "anno": anno,
            "costi": round(costi, 2),
            "ricavi": round(ricavi, 2),
            "spese": round(spese, 2),
        })

    return risultati
