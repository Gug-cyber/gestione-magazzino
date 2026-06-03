"""Router per storico prezzi e dashboard opportunità."""
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..auth import get_current_active_user
from ..database import get_db
from ..models.cardmarket_price import CardMarketPrice
from ..models.prezzo_storico import PrezzoStorico
from ..models.prodotto import Prodotto

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/prodotti/{prodotto_id}/prezzi-storici")
def get_prezzi_storici(
    prodotto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
) -> dict[str, Any]:
    """Restituisce gli ultimi 30 record per fonte (ebay/cardmarket) ordinati per data."""
    prodotto = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    def _fetch(fonte: str):
        records = (
            db.query(PrezzoStorico)
            .filter(
                PrezzoStorico.prodotto_id == prodotto_id,
                PrezzoStorico.fonte == fonte,
            )
            .order_by(desc(PrezzoStorico.rilevato_at))
            .limit(30)
            .all()
        )
        # Return chronological order for charts
        return [
            {
                "id": r.id,
                "prezzo_minimo": r.prezzo_minimo,
                "prezzo_medio": r.prezzo_medio,
                "prezzo_venduto": r.prezzo_venduto,
                "numero_risultati": r.numero_risultati,
                "rilevato_at": r.rilevato_at.isoformat() if r.rilevato_at else None,
            }
            for r in reversed(records)
        ]

    return {
        "prodotto_id": prodotto_id,
        "ebay": _fetch("ebay"),
        "cardmarket": _fetch("cardmarket"),
    }


@router.get("/opportunita")
def get_opportunita(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
) -> list[dict[str, Any]]:
    """Analizza tutti i prodotti in magazzino e restituisce la lista opportunità."""
    prodotti = db.query(Prodotto).filter(Prodotto.quantita >= 0).all()

    risultati = []

    for prodotto in prodotti:
        prezzo_acquisto = float(prodotto.prezzo_acquisto) if prodotto.prezzo_acquisto else None
        prezzo_vendita = float(prodotto.prezzo_vendita) if prodotto.prezzo_vendita else None

        # Ultimi prezzi eBay
        ultimo_ebay = (
            db.query(PrezzoStorico)
            .filter(PrezzoStorico.prodotto_id == prodotto.id, PrezzoStorico.fonte == "ebay")
            .order_by(desc(PrezzoStorico.rilevato_at))
            .first()
        )

        # Ultimi prezzi CardMarket (da prezzi_storici prima, poi fallback su cardmarket_prices)
        ultimo_cm_storico = (
            db.query(PrezzoStorico)
            .filter(PrezzoStorico.prodotto_id == prodotto.id, PrezzoStorico.fonte == "cardmarket")
            .order_by(desc(PrezzoStorico.rilevato_at))
            .first()
        )

        ebay_prezzo_medio: Optional[float] = ultimo_ebay.prezzo_medio if ultimo_ebay else None
        cardmarket_prezzo_medio: Optional[float] = None
        if ultimo_cm_storico:
            cardmarket_prezzo_medio = ultimo_cm_storico.prezzo_medio
        else:
            # Fallback sulla tabella cardmarket_prices (cache principale)
            cm_cache = (
                db.query(CardMarketPrice)
                .filter(CardMarketPrice.prodotto_id == prodotto.id)
                .first()
            )
            if cm_cache and cm_cache.prezzo_medio:
                cardmarket_prezzo_medio = float(cm_cache.prezzo_medio)

        # Media mercato: media di eBay e CM se entrambi disponibili
        prezzi_mercato = [p for p in [ebay_prezzo_medio, cardmarket_prezzo_medio] if p is not None]
        media_mercato: Optional[float] = (
            round(sum(prezzi_mercato) / len(prezzi_mercato), 2) if prezzi_mercato else None
        )

        # Calcoli margini
        margine_attuale: Optional[float] = None
        if prezzo_vendita is not None and prezzo_acquisto is not None:
            margine_attuale = round(prezzo_vendita - prezzo_acquisto, 2)

        margine_vs_mercato: Optional[float] = None
        if media_mercato is not None and prezzo_vendita is not None:
            margine_vs_mercato = round(media_mercato - prezzo_vendita, 2)

        # Trend cardmarket (semplice: confronta ultimi 2 record)
        trend_cm_salita = False
        if ultimo_cm_storico:
            penultimo_cm = (
                db.query(PrezzoStorico)
                .filter(
                    PrezzoStorico.prodotto_id == prodotto.id,
                    PrezzoStorico.fonte == "cardmarket",
                    PrezzoStorico.id != ultimo_cm_storico.id,
                )
                .order_by(desc(PrezzoStorico.rilevato_at))
                .first()
            )
            if (
                penultimo_cm
                and ultimo_cm_storico.prezzo_medio is not None
                and penultimo_cm.prezzo_medio is not None
            ):
                trend_cm_salita = ultimo_cm_storico.prezzo_medio > penultimo_cm.prezzo_medio

        # opportunita_score (0-100)
        opportunita_score = _calcola_score(
            prezzo_vendita, prezzo_acquisto, media_mercato, margine_vs_mercato
        )

        # azione_consigliata
        azione = _calcola_azione(
            prezzo_vendita,
            prezzo_acquisto,
            media_mercato,
            prodotto.quantita,
            prodotto.quantita_minima,
            trend_cm_salita,
        )

        risultati.append(
            {
                "prodotto_id": prodotto.id,
                "nome": prodotto.nome,
                "sku": prodotto.sku,
                "quantita": prodotto.quantita,
                "prezzo_acquisto": prezzo_acquisto,
                "prezzo_vendita": prezzo_vendita,
                "ebay_prezzo_medio": ebay_prezzo_medio,
                "cardmarket_prezzo_medio": cardmarket_prezzo_medio,
                "media_mercato": media_mercato,
                "margine_attuale": margine_attuale,
                "margine_vs_mercato": margine_vs_mercato,
                "opportunita_score": opportunita_score,
                "azione_consigliata": azione,
            }
        )

    # Ordina per score decrescente
    risultati.sort(key=lambda x: x["opportunita_score"], reverse=True)
    return risultati


def _calcola_score(
    prezzo_vendita: Optional[float],
    prezzo_acquisto: Optional[float],
    media_mercato: Optional[float],
    margine_vs_mercato: Optional[float],
) -> int:
    """Calcola un punteggio 0-100 dove alto = sottovalutato rispetto al mercato."""
    if media_mercato is None or media_mercato <= 0:
        return 0

    score = 0

    if margine_vs_mercato is not None:
        # Quanto il prezzo di vendita è sotto il mercato (più è sotto, più score alto)
        pct_sotto = margine_vs_mercato / media_mercato  # positivo = sotto mercato
        score += min(60, int(pct_sotto * 100))

    if prezzo_acquisto is not None and prezzo_acquisto > 0 and media_mercato is not None:
        margine_acquisto_pct = (media_mercato - prezzo_acquisto) / prezzo_acquisto
        score += min(40, int(margine_acquisto_pct * 20))

    return max(0, min(100, score))


def _calcola_azione(
    prezzo_vendita: Optional[float],
    prezzo_acquisto: Optional[float],
    media_mercato: Optional[float],
    quantita: int,
    quantita_minima: int,
    trend_salita: bool,
) -> str:
    """Determina l'azione consigliata per il prodotto."""
    if media_mercato is None or media_mercato <= 0:
        return "Prezzo ok"

    # Se prezzo_vendita < media_mercato * 0.9 → "Aumenta prezzo"
    if prezzo_vendita is not None and prezzo_vendita < media_mercato * 0.9:
        return "Aumenta prezzo"

    # Se margine vs prezzo acquisto > 300% → "Vendi subito"
    if prezzo_acquisto is not None and prezzo_acquisto > 0:
        margine_vs_acquisto = (media_mercato - prezzo_acquisto) / prezzo_acquisto
        if margine_vs_acquisto > 3.0:
            return "Vendi subito"

    # Se quantità < quantità_minima e trend in salita → "Riordina"
    if quantita < quantita_minima and trend_salita:
        return "Riordina"

    return "Prezzo ok"
