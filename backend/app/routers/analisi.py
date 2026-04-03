from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, desc
from datetime import datetime
from dateutil.relativedelta import relativedelta
from ..database import get_db
from ..models.movimento import Movimento, TipoMovimento
from ..models.prodotto import Prodotto
from ..models.spesa_gestione import SpesaGestione
from ..models.dato_storico import DatoStorico
from ..models.ordine import Ordine, RigaOrdine, StatoOrdine
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

        # Ricavi da ordini completati nel mese
        ordini_completati = (
            db.query(Ordine)
            .filter(
                Ordine.stato == StatoOrdine.completato,
                extract("year", Ordine.data_completamento) == anno,
                extract("month", Ordine.data_completamento) == mese,
            )
            .all()
        )
        ricavi = sum(float(o.totale or 0) for o in ordini_completati)

        spese_generali_result = db.query(func.sum(SpesaGestione.importo)).filter(
            extract("year", SpesaGestione.data) == anno,
            extract("month", SpesaGestione.data) == mese,
            (SpesaGestione.categoria != "packaging") | (SpesaGestione.categoria.is_(None)),
        ).scalar()
        spese = float(spese_generali_result or 0)

        costi_packaging_result = db.query(func.sum(SpesaGestione.importo)).filter(
            SpesaGestione.categoria == "packaging",
            extract("year", SpesaGestione.data) == anno,
            extract("month", SpesaGestione.data) == mese,
        ).scalar()
        packaging = float(costi_packaging_result or 0)

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
            "packaging": round(packaging, 2),
            "totale_spese": round(spese + packaging, 2),
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

    # Also include years that only appear in completed orders
    ordini_anni_query = (
        db.query(extract("year", Ordine.data_completamento).label("anno"))
        .filter(Ordine.stato == StatoOrdine.completato)
        .distinct()
        .all()
    )
    ordini_anni = {int(row.anno) for row in ordini_anni_query if row.anno is not None}

    anni = sorted(set(anni) | storici_anni | ordini_anni)

    # Also include years that only appear in spese_gestione
    spese_anni_query = (
        db.query(extract("year", SpesaGestione.data).label("anno"))
        .distinct()
        .all()
    )
    spese_anni = {int(row.anno) for row in spese_anni_query if row.anno is not None}

    anni = sorted(set(anni) | spese_anni, reverse=True)

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

        # Ricavi da ordini completati nell'anno
        ordini_completati = (
            db.query(Ordine)
            .filter(
                Ordine.stato == StatoOrdine.completato,
                extract("year", Ordine.data_completamento) == anno,
            )
            .all()
        )
        ricavi = sum(float(o.totale or 0) for o in ordini_completati)

        spese_generali_result = db.query(func.sum(SpesaGestione.importo)).filter(
            extract("year", SpesaGestione.data) == anno,
            (SpesaGestione.categoria != "packaging") | (SpesaGestione.categoria.is_(None)),
        ).scalar()
        spese = float(spese_generali_result or 0)

        costi_packaging_result = db.query(func.sum(SpesaGestione.importo)).filter(
            SpesaGestione.categoria == "packaging",
            extract("year", SpesaGestione.data) == anno,
        ).scalar()
        packaging = float(costi_packaging_result or 0)

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
            "packaging": round(packaging, 2),
            "totale_spese": round(spese + packaging, 2),
        })

    return risultati


@router.get("/top-prodotti-mensile")
def get_top_prodotti_mensile(
    anno: int = Query(default=None),
    mese: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Restituisce i TOP 5 prodotti più venduti in un mese specifico.
    Considera solo ordini completati.
    """
    if anno is None:
        anno = datetime.now().year
    if mese is None:
        mese = datetime.now().month

    risultati = (
        db.query(
            Prodotto.id,
            Prodotto.nome,
            Prodotto.sku,
            func.sum(RigaOrdine.quantita).label("quantita_venduta"),
        )
        .join(RigaOrdine, RigaOrdine.prodotto_id == Prodotto.id)
        .join(Ordine, RigaOrdine.ordine_id == Ordine.id)
        .filter(
            Ordine.stato == StatoOrdine.completato,
            extract("year", Ordine.data_completamento) == anno,
            extract("month", Ordine.data_completamento) == mese,
        )
        .group_by(Prodotto.id, Prodotto.nome, Prodotto.sku)
        .order_by(desc("quantita_venduta"))
        .limit(5)
        .all()
    )

    return [
        {
            "prodotto_id": r.id,
            "nome": r.nome,
            "sku": r.sku,
            "quantita_venduta": int(r.quantita_venduta),
        }
        for r in risultati
    ]


@router.get("/marginalita-confronto")
def get_marginalita_confronto(
    anno: int = Query(default=None),
    mese: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Confronta la marginalità del mese corrente con il mese precedente.
    Marginalità = Ricavi - Costi - Spese
    """
    if anno is None:
        anno = datetime.now().year
    if mese is None:
        mese = datetime.now().month

    data_corrente = datetime(anno, mese, 1)
    data_precedente = data_corrente - relativedelta(months=1)

    def calcola_marginalita(a, m):
        movimenti_carico = (
            db.query(Movimento, Prodotto)
            .join(Prodotto, Movimento.prodotto_id == Prodotto.id)
            .filter(
                Movimento.tipo == TipoMovimento.carico,
                extract("year", Movimento.data_movimento) == a,
                extract("month", Movimento.data_movimento) == m,
            )
            .all()
        )
        costi = sum(
            float(mov.quantita) * float(prod.prezzo_acquisto or 0)
            for mov, prod in movimenti_carico
        )

        ordini_completati = (
            db.query(Ordine)
            .filter(
                Ordine.stato == StatoOrdine.completato,
                extract("year", Ordine.data_completamento) == a,
                extract("month", Ordine.data_completamento) == m,
            )
            .all()
        )
        ricavi = sum(float(o.totale or 0) for o in ordini_completati)

        spese_generali_result = db.query(func.sum(SpesaGestione.importo)).filter(
            extract("year", SpesaGestione.data) == a,
            extract("month", SpesaGestione.data) == m,
            (SpesaGestione.categoria != "packaging") | (SpesaGestione.categoria.is_(None)),
        ).scalar()
        spese = float(spese_generali_result or 0)

        costi_packaging_result = db.query(func.sum(SpesaGestione.importo)).filter(
            SpesaGestione.categoria == "packaging",
            extract("year", SpesaGestione.data) == a,
            extract("month", SpesaGestione.data) == m,
        ).scalar()
        packaging = float(costi_packaging_result or 0)

        storici_costi = db.query(func.sum(DatoStorico.importo)).filter(
            DatoStorico.tipo == "costo",
            extract("year", DatoStorico.data) == a,
            extract("month", DatoStorico.data) == m,
        ).scalar()
        costi += float(storici_costi or 0)

        storici_ricavi = db.query(func.sum(DatoStorico.importo)).filter(
            DatoStorico.tipo == "ricavo",
            extract("year", DatoStorico.data) == a,
            extract("month", DatoStorico.data) == m,
        ).scalar()
        ricavi += float(storici_ricavi or 0)

        marginalita = ricavi - costi - spese - packaging
        return {
            "ricavi": round(ricavi, 2),
            "costi": round(costi, 2),
            "spese": round(spese, 2),
            "packaging": round(packaging, 2),
            "totale_spese": round(spese + packaging, 2),
            "marginalita": round(marginalita, 2),
        }

    corrente = calcola_marginalita(anno, mese)
    precedente = calcola_marginalita(data_precedente.year, data_precedente.month)

    variazione_assoluta = corrente["marginalita"] - precedente["marginalita"]
    variazione_percentuale = (
        round(variazione_assoluta / precedente["marginalita"] * 100, 2)
        if precedente["marginalita"] != 0
        else None
    )

    return {
        "mese_corrente": {
            "anno": anno,
            "mese": mese,
            **corrente,
        },
        "mese_precedente": {
            "anno": data_precedente.year,
            "mese": data_precedente.month,
            **precedente,
        },
        "variazione_assoluta": round(variazione_assoluta, 2),
        "variazione_percentuale": variazione_percentuale,
    }


@router.get("/packaging")
def get_analisi_packaging(
    anno: int = Query(default=None),
    mese: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Restituisce i costi packaging/logistica da SpesaGestione con categoria='packaging'.
    Se mese è specificato, filtra sul mese. Altrimenti restituisce tutti i mesi dell'anno.
    """
    if anno is None:
        anno = datetime.now().year

    query = db.query(
        extract("month", SpesaGestione.data).label("mese"),
        func.sum(SpesaGestione.importo).label("totale"),
    ).filter(
        SpesaGestione.categoria == "packaging",
        extract("year", SpesaGestione.data) == anno,
    )
    if mese:
        query = query.filter(extract("month", SpesaGestione.data) == mese)

    results = query.group_by(extract("month", SpesaGestione.data)).order_by(extract("month", SpesaGestione.data)).all()

    return {
        "anno": anno,
        "totale_annuale": round(sum(float(r.totale or 0) for r in results), 2),
        "per_mese": [
            {"mese": int(r.mese), "totale": round(float(r.totale or 0), 2)}
            for r in results
        ],
    }
