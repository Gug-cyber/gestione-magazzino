import os
import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Security
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models.cardmarket_price import CardMarketPrice
from ..models.prodotto import Prodotto
from ..models.ordine import Ordine, RigaOrdine, StatoOrdine

DASHI_API_KEY_NAME = "X-Dashi-Key"
api_key_header = APIKeyHeader(name=DASHI_API_KEY_NAME, auto_error=False)

router = APIRouter()

_DASHI_API_KEY = os.getenv("DASHI_API_KEY", "")


def _optional_float(value) -> Optional[float]:
    return float(value) if value is not None else None


def verify_dashi_key(api_key: str = Security(api_key_header)):
    expected = _DASHI_API_KEY
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="Integrazione dashi.gg non configurata: DASHI_API_KEY mancante",
        )
    if not api_key or not secrets.compare_digest(api_key, expected):
        raise HTTPException(status_code=401, detail="API key non valida")
    return api_key


class PrezzoMedioResponse(BaseModel):
    prodotto_id: int
    nome: str
    sku: str
    quantita: int
    prezzo_vendita: Optional[float]
    prezzo_acquisto: Optional[float]
    prezzo_medio_cardmarket: Optional[float]
    prezzo_minimo_cardmarket: Optional[float]
    url_cardmarket: Optional[str]
    aggiornato_il: Optional[datetime]


class RigaOrdineResponse(BaseModel):
    prodotto_id: int
    prodotto_nome: str
    prodotto_sku: str
    quantita: int
    prezzo_unitario: float
    subtotale: float


class UltimaVenditaResponse(BaseModel):
    ordine_id: int
    numero_ordine: str
    cliente_nome: Optional[str]
    stato: str
    totale: float
    data_ordine: Optional[datetime]
    data_completamento: Optional[datetime]
    righe: List[RigaOrdineResponse]


@router.get("/prezzi-medi", response_model=List[PrezzoMedioResponse])
def get_prezzi_medi(
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: str = Depends(verify_dashi_key),
):
    """Restituisce la lista di prodotti con prezzi CardMarket salvati in DB."""
    risultati = (
        db.query(CardMarketPrice, Prodotto)
        .join(Prodotto, CardMarketPrice.prodotto_id == Prodotto.id)
        .order_by(CardMarketPrice.data_aggiornamento.desc())
        .limit(limit)
        .all()
    )

    return [
        PrezzoMedioResponse(
            prodotto_id=p.id,
            nome=p.nome,
            sku=p.sku,
            quantita=p.quantita,
            prezzo_vendita=_optional_float(p.prezzo_vendita),
            prezzo_acquisto=_optional_float(p.prezzo_acquisto),
            prezzo_medio_cardmarket=_optional_float(cm.prezzo_medio),
            prezzo_minimo_cardmarket=_optional_float(cm.prezzo_minimo),
            url_cardmarket=cm.url_cardmarket,
            aggiornato_il=cm.data_aggiornamento,
        )
        for cm, p in risultati
    ]


@router.get("/ultime-vendite", response_model=List[UltimaVenditaResponse])
def get_ultime_vendite(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: str = Depends(verify_dashi_key),
):
    """Restituisce gli ultimi N ordini con stato completato, spedito o confermato."""
    stati_validi = [StatoOrdine.completato, StatoOrdine.spedito, StatoOrdine.confermato]

    ordini = (
        db.query(Ordine)
        .options(joinedload(Ordine.righe).joinedload(RigaOrdine.prodotto))
        .filter(Ordine.stato.in_(stati_validi))
        .order_by(Ordine.data_ordine.desc())
        .limit(limit)
        .all()
    )

    risultati = []
    for ordine in ordini:
        righe = [
            RigaOrdineResponse(
                prodotto_id=riga.prodotto_id,
                prodotto_nome=riga.prodotto.nome if riga.prodotto else "",
                prodotto_sku=riga.prodotto.sku if riga.prodotto else "",
                quantita=riga.quantita,
                prezzo_unitario=float(riga.prezzo_unitario),
                subtotale=float(riga.subtotale),
            )
            for riga in ordine.righe
        ]
        risultati.append(
            UltimaVenditaResponse(
                ordine_id=ordine.id,
                numero_ordine=ordine.numero_ordine,
                cliente_nome=ordine.cliente_nome,
                stato=ordine.stato.value,
                totale=float(ordine.totale),
                data_ordine=ordine.data_ordine,
                data_completamento=ordine.data_completamento,
                righe=righe,
            )
        )

    return risultati
