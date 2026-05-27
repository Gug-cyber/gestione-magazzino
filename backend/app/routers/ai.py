import json
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
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

AI_UNAVAILABLE_MESSAGE = "⚠️ AI non disponibile in questo momento. Riprova più tardi."


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
    history: list[dict[str, Any]] = Field(default_factory=list)


class EmailFornitoreRequest(BaseModel):
    nome_fornitore: Optional[str] = None
    descrizione_lotto: str
    prezzo_proposto: float
    tipo_email: Literal["proposta_acquisto", "richiesta_info", "controfferta"]


class TrendProdottoRequest(BaseModel):
    prodotto_id: int
    periodo_giorni: int = 30

    @model_validator(mode="after")
    def validate_period(self):
        if self.periodo_giorni not in (30, 60, 90):
            raise ValueError("periodo_giorni deve essere 30, 60 o 90.")
        return self


def _to_float(value: Optional[Decimal]) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def _to_iso_datetime(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


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
        return AI_UNAVAILABLE_MESSAGE


def _to_str(value: Any) -> Optional[str]:
    """Converte un valore in stringa, gestendo dict/list annidati restituiti dall'LLM."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _cardmarket_timestamp(row: CardMarketPrice) -> datetime:
    value = row.data_aggiornamento or row.created_at or datetime.min.replace(tzinfo=timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _latest_cardmarket_price_for_product(db: Session, prodotto_id: int) -> Optional[CardMarketPrice]:
    rows = db.query(CardMarketPrice).filter(CardMarketPrice.prodotto_id == prodotto_id).all()
    if not rows:
        return None
    return max(rows, key=_cardmarket_timestamp)


def _latest_cardmarket_prices_map(db: Session) -> dict[int, CardMarketPrice]:
    latest_by_product: dict[int, CardMarketPrice] = {}
    for row in db.query(CardMarketPrice).all():
        current = latest_by_product.get(row.prodotto_id)
        if current is None or _cardmarket_timestamp(row) > _cardmarket_timestamp(current):
            latest_by_product[row.prodotto_id] = row
    return latest_by_product


def _fallback_price_comment(item: dict[str, Any]) -> str:
    nome = item["nome"]
    prezzo_vendita = item["prezzo_vendita"]
    prezzo_medio = item["prezzo_mercato_medio"]
    differenza_pct = item["differenza_pct"]
    if differenza_pct is None or prezzo_vendita is None or prezzo_medio is None:
        return f"{nome}: dati insufficienti per confrontare il prezzo con il mercato."
    diff_text = abs(differenza_pct)
    if item["classificazione"] == "sopra_mercato":
        return (
            f"{nome} è a €{prezzo_vendita:.2f}, mercato medio €{prezzo_medio:.2f}: "
            f"sei sopra del {diff_text:.2f}%, valuta una riduzione per vendere più velocemente."
        )
    if item["classificazione"] == "sotto_mercato":
        return (
            f"{nome} è a €{prezzo_vendita:.2f}, mercato medio €{prezzo_medio:.2f}: "
            f"sei sotto del {diff_text:.2f}%, potresti recuperare margine con un lieve aumento."
        )
    return (
        f"{nome} è a €{prezzo_vendita:.2f}, mercato medio €{prezzo_medio:.2f}: "
        "prezzo in linea con il mercato."
    )


def _generate_price_comments(top_items: list[dict[str, Any]]) -> dict[int, str]:
    if not top_items:
        return {}

    prompt = f"""
Sei un analista pricing per un magazzino di carte collezionabili.
Usa ESCLUSIVAMENTE i numeri già calcolati qui sotto. Non fare calcoli aggiuntivi.

Casi critici:
{json.dumps(top_items, ensure_ascii=False)}

Rispondi SOLO con JSON nel formato:
{{"commenti":[{{"prodotto_id": 1, "commento": "testo sintetico in italiano"}}]}}

Ogni commento deve:
- citare i numeri già presenti
- spiegare se il prezzo è sopra o sotto mercato
- suggerire un'azione pratica
"""
    raw_text = _safe_chat(
        prompt=prompt,
        system=(
            "Sei un analista di pricing. Non fare aritmetica: usa soltanto i numeri già "
            "forniti dal backend e scrivi commenti brevi e operativi in italiano."
        ),
    )
    parsed = _extract_json_block(raw_text) or {}
    comments = {
        int(item["prodotto_id"]): _to_str(item.get("commento")) or ""
        for item in parsed.get("commenti", [])
        if isinstance(item, dict) and item.get("prodotto_id") is not None
    }

    for item in top_items:
        comments.setdefault(item["prodotto_id"], _fallback_price_comment(item))
    return comments


def _build_price_analysis_rows(db: Session) -> list[dict[str, Any]]:
    latest_prices = _latest_cardmarket_prices_map(db)
    prodotti = db.query(Prodotto).order_by(Prodotto.nome.asc()).all()
    rows: list[dict[str, Any]] = []

    for prodotto in prodotti:
        cm_price = latest_prices.get(prodotto.id)
        prezzo_vendita = _to_float(prodotto.prezzo_vendita)
        prezzo_medio = _to_float(cm_price.prezzo_medio) if cm_price else None
        differenza_pct = None
        classificazione = "dati_insufficienti"

        if prezzo_vendita is not None and prezzo_medio not in (None, 0):
            differenza_pct = round(((prezzo_vendita - prezzo_medio) / prezzo_medio) * 100, 2)
            if differenza_pct > 10:
                classificazione = "sopra_mercato"
            elif differenza_pct < -10:
                classificazione = "sotto_mercato"
            else:
                classificazione = "in_linea"

        rows.append(
            {
                "prodotto_id": prodotto.id,
                "nome": prodotto.nome,
                "quantita": prodotto.quantita,
                "prezzo_vendita": prezzo_vendita,
                "prezzo_mercato_medio": prezzo_medio,
                "differenza_pct": differenza_pct,
                "classificazione": classificazione,
                "fonte_mercato": "cardmarket_cache" if cm_price else None,
                "data_mercato": _to_iso_datetime(_cardmarket_timestamp(cm_price)) if cm_price else None,
                "commento_ai": None,
            }
        )

    top_items = sorted(
        [row for row in rows if row["differenza_pct"] is not None and row["classificazione"] != "in_linea"],
        key=lambda item: abs(item["differenza_pct"]),
        reverse=True,
    )[:5]
    comments = _generate_price_comments(top_items)

    for row in rows:
        row["commento_ai"] = comments.get(row["prodotto_id"])
    return rows


def _fallback_trend_comment(
    nome: str,
    periodo_giorni: int,
    prezzo_iniziale: float,
    prezzo_finale: float,
    variazione_pct: float,
) -> str:
    if abs(variazione_pct) < 3:
        return (
            f"{nome} è stabile negli ultimi {periodo_giorni} giorni: da €{prezzo_iniziale:.2f} "
            f"a €{prezzo_finale:.2f} ({variazione_pct:.2f}%)."
        )
    if variazione_pct > 0:
        return (
            f"{nome} è salito del {variazione_pct:.2f}% negli ultimi {periodo_giorni} giorni "
            f"(da €{prezzo_iniziale:.2f} a €{prezzo_finale:.2f}). Potrebbe essere un buon momento per vendere."
        )
    return (
        f"{nome} è sceso del {abs(variazione_pct):.2f}% negli ultimi {periodo_giorni} giorni "
        f"(da €{prezzo_iniziale:.2f} a €{prezzo_finale:.2f}). Valuta acquisti solo se la domanda resta solida."
    )


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

    latest_cached_price = _latest_cardmarket_price_for_product(db, prodotto.id) if prodotto else None
    if latest_cached_price and latest_cached_price.prezzo_medio is not None:
        prezzo_medio = _to_float(latest_cached_price.prezzo_medio)
        prezzo_minimo = _to_float(latest_cached_price.prezzo_minimo)
        prezzi = {
            "query": {"nome": nome, "condizione": condizione, "lingua": lingua},
            "source": "cardmarket_cache",
            "sources": {
                "cardmarket_cache": {
                    "prezzo_medio": prezzo_medio,
                    "prezzo_minimo": prezzo_minimo,
                    "url_cardmarket": latest_cached_price.url_cardmarket,
                    "data_aggiornamento": _to_iso_datetime(_cardmarket_timestamp(latest_cached_price)),
                }
            },
            "summary": {
                "avg": prezzo_medio,
                "min": prezzo_minimo,
                "max": prezzo_medio,
                "count": 1,
                "total_annunci": 1,
                "outliers_esclusi": 0,
                "all_prices": [prezzo_medio] if prezzo_medio is not None else [],
            },
        }
    else:
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
    prezzo_consigliato_vendita = round(prezzo_medio * 0.95, 2) if prezzo_medio else None

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
Sei un analista di mercato per un magazzino di carte collezionabili.
Usa SOLO i numeri già calcolati dal backend. Non fare aritmetica aggiuntiva.

Prodotto: {nome}
Lingua: {lingua}
Condizione: {condizione}
Prezzo acquisto attuale: {prezzo_acquisto}
Prezzo vendita in magazzino: {prezzo_vendita_magazzino}
Prezzo medio di mercato: {prezzo_medio}
Prezzo minimo di mercato: {prezzo_minimo}
Prezzo massimo acquisto per margine 30%: {prezzo_massimo_acquisto}
Prezzo consigliato di vendita competitivo: {prezzo_consigliato_vendita}
Fonte mercato: {prezzi.get("source") or "scraper"}

Dati di supporto:
{json.dumps(prezzi, ensure_ascii=False)}

Scrivi un commento pratico in italiano di massimo 5 frasi.
Devi:
1) dire se conviene acquistare;
2) commentare il prezzo di vendita attuale se presente;
3) suggerire un posizionamento competitivo usando i numeri già forniti.
"""

    analisi_llm = _safe_chat(
        prompt=prompt,
        system="Sei un analista di mercato. Rispondi in italiano in modo pratico, senza fare nuovi calcoli.",
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
            "prezzo_consigliato_vendita": prezzo_consigliato_vendita,
            "suggerimenti_rule_based": suggerimenti_rule_based,
            "analisi_llm": analisi_llm,
        },
    }


@router.get("/analisi-prezzi")
def analisi_prezzi(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    rows = _build_price_analysis_rows(db)
    top_critici = sorted(
        [row for row in rows if row["commento_ai"] and row["differenza_pct"] is not None],
        key=lambda item: abs(item["differenza_pct"]),
        reverse=True,
    )[:5]
    return {
        "totale_prodotti": len(rows),
        "prodotti": rows,
        "top_critici": top_critici,
    }


@router.get("/analisi-magazzino")
def analisi_magazzino(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    latest_prices = _latest_cardmarket_prices_map(db)
    prodotti = db.query(Prodotto).all()

    suggerimenti = []
    for prodotto in prodotti:
        cm_price = latest_prices.get(prodotto.id)
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
Sei un copywriter e-commerce. Scrivi una descrizione professionale per un annuncio marketplace.
Prodotto: {nome}
Condizione: {condizione}
Categoria: {categoria}
Lingua carta: {lingua}

Rispondi SOLO con JSON:
{{"it": "<descrizione italiana, minimo 3 frasi>", "en": "<descrizione inglese, minimo 3 frasi>"}}
I valori di "it" e "en" devono essere TESTO PURO, non oggetti JSON.
Non inventare rarità, certificazioni o dettagli non presenti nell'input.
"""
    raw_text = _safe_chat(
        prompt=prompt,
        system="Sei un copywriter e-commerce. Scrivi descrizioni efficaci, precise, senza inventare specifiche tecniche.",
    )
    parsed = _extract_json_block(raw_text)

    descrizione_it = _to_str((parsed or {}).get("it")) if parsed else None
    descrizione_en = _to_str((parsed or {}).get("en")) if parsed else None

    return {
        "prodotto": {"id": prodotto.id if prodotto else None, "nome": nome},
        "descrizione_it": descrizione_it,
        "descrizione_en": descrizione_en,
        "raw": raw_text if not parsed else None,
    }


@router.post("/email-fornitore")
def genera_email_fornitore(
    payload: EmailFornitoreRequest,
    current_user=Depends(get_current_active_user),
):
    prompt = f"""
Sei un buyer professionale di un magazzino di carte collezionabili.
Usa solo questi dati già pronti:
- Nome fornitore: {payload.nome_fornitore or "non specificato"}
- Descrizione lotto/prodotto: {payload.descrizione_lotto}
- Prezzo proposto: €{payload.prezzo_proposto:.2f}
- Tipo email: {payload.tipo_email}

Genera una email professionale in italiano, pronta da copiare.
Rispondi SOLO con JSON:
{{"oggetto":"...","corpo":"..."}}
"""
    raw_text = _safe_chat(
        prompt=prompt,
        system=(
            "Sei un buyer B2B. Scrivi email professionali, concise e cortesi in italiano. "
            "Non aggiungere JSON annidato."
        ),
    )
    parsed = _extract_json_block(raw_text) or {}
    oggetto = _to_str(parsed.get("oggetto"))
    corpo = _to_str(parsed.get("corpo"))
    return {
        "oggetto": oggetto,
        "corpo": corpo or raw_text,
        "raw": raw_text if not (oggetto and corpo) else None,
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
    prodotti = db.query(Prodotto).all()
    prodotti_recenti = sorted(
        prodotti,
        key=lambda item: item.updated_at or item.created_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )[:30]
    ordini_recenti = (
        db.query(Ordine.numero_ordine, Ordine.stato, Ordine.totale, Ordine.data_ordine)
        .order_by(Ordine.data_ordine.desc())
        .limit(10)
        .all()
    )

    valore_totale_magazzino = round(
        sum((_to_float(p.prezzo_vendita) or 0.0) * (p.quantita or 0) for p in prodotti),
        2,
    )
    top5_per_valore = sorted(
        [
            {
                "id": p.id,
                "nome": p.nome,
                "quantita": p.quantita,
                "prezzo_vendita": _to_float(p.prezzo_vendita),
                "valore_stock": round((_to_float(p.prezzo_vendita) or 0.0) * (p.quantita or 0), 2),
            }
            for p in prodotti
            if _to_float(p.prezzo_vendita) is not None
        ],
        key=lambda item: item["valore_stock"],
        reverse=True,
    )[:5]
    prodotti_sotto_scorta = [
        {
            "id": p.id,
            "nome": p.nome,
            "quantita": p.quantita,
            "quantita_minima": p.quantita_minima,
        }
        for p in prodotti
        if p.quantita is not None and p.quantita_minima is not None and p.quantita <= p.quantita_minima
    ]

    context = {
        "valore_totale_magazzino": valore_totale_magazzino,
        "num_prodotti": len(prodotti),
        "num_prodotti_senza_prezzo": len([p for p in prodotti if p.prezzo_vendita is None]),
        "top5_per_valore": top5_per_valore,
        "prodotti_sotto_scorta": prodotti_sotto_scorta,
        "prodotti_recenti": [
            {
                "id": p.id,
                "nome": p.nome,
                "quantita": p.quantita,
                "prezzo_vendita": _to_float(p.prezzo_vendita),
                "updated_at": _to_iso_datetime(p.updated_at or p.created_at),
            }
            for p in prodotti_recenti
        ],
        "ordini_recenti": [
            {
                "numero_ordine": o.numero_ordine,
                "stato": o.stato.value if hasattr(o.stato, "value") else str(o.stato),
                "totale": _to_float(o.totale),
                "data_ordine": o.data_ordine.isoformat() if o.data_ordine else None,
            }
            for o in ordini_recenti
        ],
    }

    history_text = "\n".join(
        f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in payload.history[-12:]
    )
    prompt = f"""
Contesto magazzino pre-calcolato dal backend:
{json.dumps(context, ensure_ascii=False)}

Cronologia chat:
{history_text}

Domanda utente:
{payload.messaggio}

Regola fondamentale:
- usa solo i numeri già presenti nel contesto;
- non fare somme o altre operazioni aritmetiche;
- se un dato non è nel contesto, dichiaralo esplicitamente.
"""

    risposta = _safe_chat(
        prompt=prompt,
        system=(
            "Sei l'assistente del gestionale magazzino. Rispondi SEMPRE in italiano, "
            "in modo pratico, usando solo i dati pre-calcolati forniti dal backend."
        ),
    )

    return {"risposta": risposta}


@router.post("/trend-prodotto")
def trend_prodotto(
    payload: TrendProdottoRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    prodotto = db.query(Prodotto).filter(Prodotto.id == payload.prodotto_id).first()
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    since = datetime.now(timezone.utc) - timedelta(days=payload.periodo_giorni)
    history_rows = db.query(CardMarketPrice).filter(CardMarketPrice.prodotto_id == prodotto.id).all()
    history_rows = [
        row
        for row in history_rows
        if row.prezzo_medio is not None and _cardmarket_timestamp(row) >= since
    ]
    history_rows.sort(key=_cardmarket_timestamp)

    serie_prezzi = [
        {
            "data": _to_iso_datetime(_cardmarket_timestamp(row)),
            "prezzo_medio": _to_float(row.prezzo_medio),
        }
        for row in history_rows
    ]
    if len(serie_prezzi) < 2:
        raise HTTPException(status_code=400, detail="Dati storici insufficienti per il trend richiesto")

    prezzo_iniziale = serie_prezzi[0]["prezzo_medio"]
    prezzo_finale = serie_prezzi[-1]["prezzo_medio"]
    if prezzo_iniziale == 0:
        raise HTTPException(status_code=400, detail="Prezzo iniziale non valido per il calcolo del trend")
    variazione_pct = round(((prezzo_finale - prezzo_iniziale) / prezzo_iniziale) * 100, 2)

    prompt = f"""
Sei un analista di trend per carte collezionabili.
Usa SOLO i numeri già calcolati qui sotto. Non fare aritmetica aggiuntiva.

Prodotto: {prodotto.nome}
Periodo giorni: {payload.periodo_giorni}
Prezzo iniziale: {prezzo_iniziale}
Prezzo finale: {prezzo_finale}
Variazione percentuale già calcolata: {variazione_pct}
Serie temporale:
{json.dumps(serie_prezzi, ensure_ascii=False)}

Scrivi un commento breve in italiano che interpreti il trend e suggerisca una possibile azione commerciale.
"""
    commento_ai = _safe_chat(
        prompt=prompt,
        system=(
            "Sei un analista di trend. Interpreta soltanto i numeri già forniti dal backend "
            "e suggerisci un'azione pratica in italiano."
        ),
    )

    return {
        "prodotto": {"id": prodotto.id, "nome": prodotto.nome},
        "periodo_giorni": payload.periodo_giorni,
        "prezzo_iniziale": prezzo_iniziale,
        "prezzo_finale": prezzo_finale,
        "variazione_pct": variazione_pct,
        "serie_prezzi": serie_prezzi,
        "commento_ai": (
            commento_ai
            if commento_ai != AI_UNAVAILABLE_MESSAGE
            else _fallback_trend_comment(
                prodotto.nome,
                payload.periodo_giorni,
                prezzo_iniziale,
                prezzo_finale,
                variazione_pct,
            )
        ),
    }
