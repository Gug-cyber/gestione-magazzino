import json
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, model_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_active_user
from ..database import get_db
from ..models.cardmarket_price import CardMarketPrice
from ..models.movimento import Movimento, TipoMovimento
from ..models.ordine import Ordine, RigaOrdine, StatoOrdine
from ..models.prodotto import Prodotto
from ..services.llm_service import LLMService
from ..services.market_scraper_service import MarketScraperService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])

llm_service = LLMService()
market_scraper_service = MarketScraperService()


class AnalisiMercatoRequest(BaseModel):
    prodotto_id: Optional[int] = None
    nome: Optional[str] = None
    lingua: Optional[str] = None
    condizione: Optional[str] = None
    prezzo_acquisto: Optional[float] = None

    @model_validator(mode="after")
    def validate_input(self):
        if self.prodotto_id is None and not self.nome:
            raise ValueError("Fornisci prodotto_id oppure nome.")
        return self


class GeneraDescrizioneRequest(BaseModel):
    prodotto_id: Optional[int] = None
    nome: Optional[str] = None
    condizione: Optional[str] = None
    lingua: Optional[str] = None
    categoria: Optional[str] = None

    @model_validator(mode="after")
    def validate_input(self):
        if self.prodotto_id is None and not self.nome:
            raise ValueError("Fornisci prodotto_id oppure nome.")
        return self


class ChatRequest(BaseModel):
    messaggio: str
    history: list[dict[str, Any]] = []


def _to_float(value: Optional[Decimal]) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def _extract_json_block(text: str) -> Optional[dict[str, Any]]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except Exception:
        return None


def _safe_chat(prompt: str, system: str) -> str:
    try:
        return llm_service.chat(prompt=prompt, system=system)
    except Exception as exc:
        logger.warning("LLM non disponibile, fallback rule-based: %s", exc)
        return "⚠️ AI non disponibile in questo momento. Riprova più tardi."


@router.post("/analisi-mercato")
def analisi_mercato(
    payload: AnalisiMercatoRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    prodotto = None
    if payload.prodotto_id:
        prodotto = db.query(Prodotto).filter(Prodotto.id == payload.prodotto_id).first()
        if not prodotto:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")

    nome = payload.nome or (prodotto.nome if prodotto else None)
    lingua = payload.lingua or (prodotto.lingua if prodotto else None) or ""
    condizione = payload.condizione or (prodotto.stato_conservazione if prodotto else None) or ""
    prezzo_acquisto = payload.prezzo_acquisto
    if prezzo_acquisto is None and prodotto and prodotto.prezzo_acquisto is not None:
        prezzo_acquisto = float(prodotto.prezzo_acquisto)

    prezzi = market_scraper_service.get_all_market_prices(
        nome=nome,
        condizione=condizione,
        lingua=lingua,
        blueprint_id=(prodotto.cardtrader_blueprint_id if prodotto else None),
    )

    summary = prezzi.get("summary") or {}
    prezzo_medio = summary.get("avg")
    prezzo_minimo = summary.get("min")
    prezzo_massimo_acquisto = round(prezzo_medio / 1.3, 2) if prezzo_medio else None

    prezzo_vendita_magazzino = _to_float(prodotto.prezzo_vendita) if prodotto else None
    suggerimenti_rule_based: list[str] = []

    if prezzo_vendita_magazzino is not None and prezzo_minimo is not None and prezzo_vendita_magazzino < prezzo_minimo:
        suggerimenti_rule_based.append(
            f"Prezzo in magazzino (€{prezzo_vendita_magazzino:.2f}) sotto minimo mercato (€{prezzo_minimo:.2f}): valuta aumento."
        )

    if prezzo_vendita_magazzino is not None and prezzo_medio is not None and prezzo_vendita_magazzino > prezzo_medio * 1.7:
        suggerimenti_rule_based.append(
            f"Prezzo in magazzino (€{prezzo_vendita_magazzino:.2f}) oltre +70% del medio mercato (€{prezzo_medio:.2f}): valuta riduzione."
        )

    prompt = f"""
Analizza questi dati di mercato e restituisci una valutazione sintetica in italiano.
Prodotto: {nome}
Lingua: {lingua}
Condizione: {condizione}
Prezzo acquisto attuale: {prezzo_acquisto}
Prezzo vendita in magazzino: {prezzo_vendita_magazzino}
Prezzo massimo acquisto consigliato (30% margine): {prezzo_massimo_acquisto}

Dati marketplace:
{json.dumps(prezzi, ensure_ascii=False)}

Obiettivi:
1) Dire se conviene acquistare.
2) Indicare il prezzo massimo di acquisto consigliato per circa 30% margine.
3) Dire se il prezzo magazzino va alzato o abbassato.
4) Evidenziare opportunità su marketplace usato europei.
"""

    analisi_llm = _safe_chat(
        prompt=prompt,
        system="Sei un analista di mercato per un magazzino di compravendita. Rispondi in italiano, in modo pratico e numerico.",
    )

    return {
        "prodotto": {
            "id": prodotto.id if prodotto else None,
            "nome": nome,
            "lingua": lingua,
            "condizione": condizione,
            "prezzo_acquisto": prezzo_acquisto,
            "prezzo_vendita": prezzo_vendita_magazzino,
        },
        "mercato": prezzi,
        "raccomandazioni": {
            "prezzo_massimo_acquisto_per_margine_30": prezzo_massimo_acquisto,
            "suggerimenti_rule_based": suggerimenti_rule_based,
            "analisi_llm": analisi_llm,
        },
    }


@router.get("/analisi-magazzino")
def analisi_magazzino(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    rows = (
        db.query(Prodotto, CardMarketPrice)
        .outerjoin(CardMarketPrice, CardMarketPrice.prodotto_id == Prodotto.id)
        .all()
    )

    suggerimenti = []
    for prodotto, cm_price in rows:
        prezzo_vendita = _to_float(prodotto.prezzo_vendita)
        prezzo_minimo = _to_float(cm_price.prezzo_minimo) if cm_price else None
        prezzo_medio = _to_float(cm_price.prezzo_medio) if cm_price else None

        stato = "nella_norma"
        nota = "Prezzo in linea con il mercato."
        if prezzo_vendita is None or prezzo_medio is None:
            stato = "dati_insufficienti"
            nota = "Dati di prezzo insufficienti (cache mercato mancante)."
        elif prezzo_minimo is not None and prezzo_vendita < prezzo_minimo:
            stato = "troppo_basso"
            nota = "Prezzo inferiore al minimo di mercato, valuta aumento."
        elif prezzo_vendita > (prezzo_medio * 1.7):
            stato = "troppo_alto"
            nota = "Prezzo oltre +70% del medio mercato, valuta riduzione."

        suggerimenti.append(
            {
                "prodotto_id": prodotto.id,
                "nome": prodotto.nome,
                "quantita": prodotto.quantita,
                "prezzo_vendita": prezzo_vendita,
                "prezzo_mercato_minimo": prezzo_minimo,
                "prezzo_mercato_medio": prezzo_medio,
                "stato": stato,
                "suggerimento": nota,
            }
        )

    return {"totale_prodotti": len(suggerimenti), "suggerimenti": suggerimenti}


@router.post("/genera-descrizione")
def genera_descrizione(
    payload: GeneraDescrizioneRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    prodotto = None
    if payload.prodotto_id:
        prodotto = db.query(Prodotto).filter(Prodotto.id == payload.prodotto_id).first()
        if not prodotto:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")

    nome = payload.nome or (prodotto.nome if prodotto else "")
    condizione = payload.condizione or (prodotto.stato_conservazione if prodotto else "")
    lingua = payload.lingua or (prodotto.lingua if prodotto else "")
    categoria = payload.categoria or (prodotto.categoria.nome if prodotto and prodotto.categoria else "collezionabili")

    prompt = f"""
Genera una descrizione professionale per annuncio marketplace (eBay, Vinted, Wallapop).
Restituisci JSON con chiavi "it" e "en".
Prodotto: {nome}
Categoria: {categoria}
Condizione: {condizione}
Lingua: {lingua}
"""
    raw_text = _safe_chat(
        prompt=prompt,
        system="Sei un copywriter e-commerce. Scrivi descrizioni efficaci, precise, senza inventare specifiche tecniche.",
    )
    parsed = _extract_json_block(raw_text)

    return {
        "prodotto": {"id": prodotto.id if prodotto else None, "nome": nome},
        "descrizione_it": (parsed or {}).get("it"),
        "descrizione_en": (parsed or {}).get("en"),
        "raw": raw_text if not parsed else None,
    }


@router.get("/previsioni-stock")
def previsioni_stock(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    now = datetime.now(timezone.utc)
    since_90 = now - timedelta(days=90)

    vendite_per_prodotto = dict(
        db.query(RigaOrdine.prodotto_id, func.coalesce(func.sum(RigaOrdine.quantita), 0))
        .join(Ordine, Ordine.id == RigaOrdine.ordine_id)
        .filter(Ordine.stato == StatoOrdine.completato)
        .filter(Ordine.data_ordine >= since_90)
        .group_by(RigaOrdine.prodotto_id)
        .all()
    )

    scarichi_per_prodotto = dict(
        db.query(Movimento.prodotto_id, func.coalesce(func.sum(Movimento.quantita), 0))
        .filter(Movimento.tipo.in_([TipoMovimento.scarico, TipoMovimento.vendita_ebay]))
        .filter(Movimento.data_movimento >= since_90)
        .group_by(Movimento.prodotto_id)
        .all()
    )

    prodotti = db.query(Prodotto).all()
    suggerimenti = []
    for p in prodotti:
        venduto = int(vendite_per_prodotto.get(p.id, 0) or 0)
        scaricato = int(scarichi_per_prodotto.get(p.id, 0) or 0)
        domanda_90gg = max(venduto, scaricato)
        media_giornaliera = round(domanda_90gg / 90, 3) if domanda_90gg > 0 else 0.0
        giorni_copertura = round((p.quantita / media_giornaliera), 1) if media_giornaliera > 0 else None

        riordino = False
        quantita_suggerita = 0
        motivo = "Scorta adeguata."
        if p.quantita <= (p.quantita_minima or 0):
            riordino = True
            quantita_suggerita = max((p.quantita_minima or 0) * 2 - p.quantita, 1)
            motivo = "Quantità sotto soglia minima."
        elif giorni_copertura is not None and giorni_copertura < 30:
            riordino = True
            target = int((media_giornaliera * 45) + 0.999)
            quantita_suggerita = max(target - p.quantita, 1)
            motivo = "Copertura inferiore a 30 giorni."

        suggerimenti.append(
            {
                "prodotto_id": p.id,
                "nome": p.nome,
                "quantita_attuale": p.quantita,
                "quantita_minima": p.quantita_minima,
                "domanda_90gg": domanda_90gg,
                "media_giornaliera": media_giornaliera,
                "giorni_copertura": giorni_copertura,
                "riordino_consigliato": riordino,
                "quantita_riordino_suggerita": quantita_suggerita if riordino else 0,
                "motivo": motivo,
            }
        )

    top_alerts = [s for s in suggerimenti if s["riordino_consigliato"]][:30]
    llm_text = _safe_chat(
        prompt=f"Questi sono i prodotti con necessità di riordino: {json.dumps(top_alerts, ensure_ascii=False)}",
        system="Sei un inventory planner. Fornisci priorità di riordino pratiche in italiano.",
    )

    return {
        "totale_prodotti": len(suggerimenti),
        "suggerimenti": suggerimenti,
        "riepilogo_ai": llm_text,
    }


@router.post("/chat")
def chat_ai(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    prodotti = (
        db.query(Prodotto.id, Prodotto.nome, Prodotto.quantita, Prodotto.prezzo_vendita)
        .order_by(Prodotto.updated_at.desc())
        .limit(30)
        .all()
    )
    ordini_recenti = (
        db.query(Ordine.numero_ordine, Ordine.stato, Ordine.totale, Ordine.data_ordine)
        .order_by(Ordine.data_ordine.desc())
        .limit(10)
        .all()
    )

    context = {
        "prodotti_recenti": [
            {"id": p.id, "nome": p.nome, "quantita": p.quantita, "prezzo_vendita": _to_float(p.prezzo_vendita)}
            for p in prodotti
        ],
        "ordini_recenti": [
            {
                "numero_ordine": o.numero_ordine,
                "stato": o.stato.value if hasattr(o.stato, "value") else str(o.stato),
                "totale": o.totale,
                "data_ordine": o.data_ordine.isoformat() if o.data_ordine else None,
            }
            for o in ordini_recenti
        ],
    }

    history_text = "\n".join(
        f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in payload.history[-12:]
    )
    prompt = f"""
Contesto magazzino:
{json.dumps(context, ensure_ascii=False)}

Cronologia chat:
{history_text}

Domanda utente:
{payload.messaggio}
"""

    risposta = _safe_chat(
        prompt=prompt,
        system=(
            "Sei l'assistente del gestionale magazzino. Rispondi SEMPRE in italiano, "
            "in modo pratico, usando i dati disponibili nel contesto."
        ),
    )

    return {"risposta": risposta}
