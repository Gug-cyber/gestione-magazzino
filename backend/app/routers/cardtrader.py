import logging
import os
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

from ..database import get_db
from ..models.prodotto import Prodotto
from ..schemas.prodotto import ProdottoCreate, ProdottoUpdate
from ..crud import prodotto as crud
from ..auth import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter()

CARDTRADER_API_BASE = "https://api.cardtrader.com/api/v2"


def _get_token() -> str:
    token = os.getenv("CARDTRADER_TOKEN", "").strip()
    if not token:
        raise HTTPException(
            status_code=400,
            detail="Token CardTrader non configurato. Impostare la variabile d'ambiente CARDTRADER_TOKEN.",
        )
    return token


def _fetch_listings(token: str) -> list:
    """Fetch raw listings from CardTrader API and return a normalized list."""
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                f"{CARDTRADER_API_BASE}/marketplace/products",
                headers={"Authorization": f"Bearer {token}"},
            )
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Errore CardTrader API: {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Errore di rete: {exc}")

    data = resp.json()
    if isinstance(data, list):
        return data
    return data.get("data") or data.get("products") or []


@router.get("/status")
def get_status(current_user=Depends(get_current_active_user)):
    token = os.getenv("CARDTRADER_TOKEN", "").strip()
    return {"configured": bool(token)}


@router.get("/listings")
def get_listings(current_user=Depends(get_current_active_user)):
    token = _get_token()
    listings = _fetch_listings(token)

    result = []
    for item in listings:
        blueprint = item.get("blueprint") or {}
        properties = item.get("properties") or {}
        price = item.get("price") or {}
        result.append({
            "id": item.get("id"),
            "blueprint_id": blueprint.get("id"),
            "nome": blueprint.get("name"),
            "quantita": item.get("quantity"),
            "prezzo": (price.get("cents") or 0) / 100,
            "condizione": properties.get("condition"),
            "lingua": properties.get("mtg_language") or properties.get("pokemon_language"),
        })
    return result


@router.get("/market-prices/{blueprint_id}")
def get_market_prices(
    blueprint_id: int,
    condizione: Optional[str] = Query(default=None),
    lingua: Optional[str] = Query(default=None),
    current_user=Depends(get_current_active_user),
):
    token = _get_token()

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                f"{CARDTRADER_API_BASE}/marketplace/products",
                headers={"Authorization": f"Bearer {token}"},
                params={"blueprint_id": blueprint_id},
            )
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Errore CardTrader API: {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Errore di rete: {exc}")

    data = resp.json()
    if isinstance(data, list):
        items = data
    else:
        items = data.get("data") or data.get("products") or []

    prices = []
    for item in items:
        properties = item.get("properties") or {}
        price = item.get("price") or {}

        item_condizione = properties.get("condition")
        item_lingua = (
            properties.get("mtg_language") or properties.get("pokemon_language")
        )

        if condizione and item_condizione != condizione:
            continue
        if lingua and item_lingua != lingua:
            continue

        cents = price.get("cents")
        if cents is not None:
            prices.append(cents / 100)

    if not prices:
        return {
            "blueprint_id": blueprint_id,
            "condizione": condizione or None,
            "lingua": lingua or None,
            "prezzo_minimo": None,
            "prezzo_medio": None,
            "numero_offerte": 0,
        }

    prezzo_minimo = round(min(prices), 2)
    prezzo_medio = round(sum(prices) / len(prices), 2)

    return {
        "blueprint_id": blueprint_id,
        "condizione": condizione or None,
        "lingua": lingua or None,
        "prezzo_minimo": prezzo_minimo,
        "prezzo_medio": prezzo_medio,
        "numero_offerte": len(prices),
    }


@router.post("/import")
def import_listings(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    token = _get_token()
    listings = _fetch_listings(token)

    importati = 0
    aggiornati = 0
    errori = []

    for item in listings:
        try:
            blueprint = item.get("blueprint") or {}
            properties = item.get("properties") or {}
            price = item.get("price") or {}

            blueprint_id = blueprint.get("id")
            if not blueprint_id:
                errori.append(f"Listing {item.get('id')}: blueprint_id mancante, saltato")
                continue

            nome = blueprint.get("name") or f"CT-{blueprint_id}"
            sku = f"CT-{blueprint_id}"
            quantita = item.get("quantity") or 0
            prezzo_cents = price.get("cents") or 0
            prezzo_vendita = Decimal(str(prezzo_cents / 100))
            stato_conservazione = properties.get("condition") or None
            lingua = (
                properties.get("mtg_language")
                or properties.get("pokemon_language")
                or None
            )

            existing = crud.get_prodotto_by_sku(db, sku)
            if existing:
                update_data = ProdottoUpdate(
                    quantita=quantita,
                    prezzo_vendita=prezzo_vendita,
                    cardtrader_blueprint_id=blueprint_id,
                )
                crud.update_prodotto(db, existing.id, update_data)
                aggiornati += 1
            else:
                new_prodotto = ProdottoCreate(
                    nome=nome,
                    sku=sku,
                    quantita=quantita,
                    prezzo_vendita=prezzo_vendita,
                    stato_conservazione=stato_conservazione,
                    lingua=lingua,
                    cardtrader_blueprint_id=blueprint_id,
                )
                crud.create_prodotto(db, new_prodotto)
                importati += 1
        except Exception as exc:
            errori.append(f"Listing {item.get('id')}: {exc}")

    return {"importati": importati, "aggiornati": aggiornati, "errori": errori}


class SyncPreviewItem(BaseModel):
    sku: str
    nome: str
    blueprint_id: Optional[int]
    prezzo_attuale: Optional[float]
    prezzo_cardtrader: Optional[float]
    quantita_attuale: Optional[int]
    quantita_cardtrader: Optional[int]
    trovato: bool


class SyncReport(BaseModel):
    trovati: int
    non_trovati: int
    anteprima: list
    applicato: bool


@router.post("/sync", response_model=SyncReport)
def sync_listings(
    apply: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Confronta le listing CardTrader con il magazzino locale.
    Con apply=False (default) mostra solo un'anteprima senza modificare nulla.
    Con apply=True aggiorna prezzi e quantità nel magazzino.
    """
    token = _get_token()
    listings = _fetch_listings(token)

    trovati = 0
    non_trovati = 0
    anteprima = []

    for item in listings:
        blueprint = item.get("blueprint") or {}
        properties = item.get("properties") or {}
        price = item.get("price") or {}

        blueprint_id = blueprint.get("id")
        nome = blueprint.get("name") or f"CT-{blueprint_id}"
        sku = f"CT-{blueprint_id}" if blueprint_id else None
        quantita_ct = item.get("quantity") or 0
        prezzo_cents = price.get("cents") or 0
        prezzo_ct = round(prezzo_cents / 100, 2)

        if not sku:
            non_trovati += 1
            continue

        existing = crud.get_prodotto_by_sku(db, sku)
        if existing:
            trovati += 1
            preview_item = {
                "sku": sku,
                "nome": nome,
                "blueprint_id": blueprint_id,
                "prezzo_attuale": float(existing.prezzo_vendita) if existing.prezzo_vendita else None,
                "prezzo_cardtrader": prezzo_ct,
                "quantita_attuale": existing.quantita,
                "quantita_cardtrader": quantita_ct,
                "trovato": True,
            }
            if apply:
                update_data = ProdottoUpdate(
                    prezzo_vendita=Decimal(str(prezzo_ct)),
                    quantita=quantita_ct,
                )
                crud.update_prodotto(db, existing.id, update_data)
        else:
            non_trovati += 1
            preview_item = {
                "sku": sku,
                "nome": nome,
                "blueprint_id": blueprint_id,
                "prezzo_attuale": None,
                "prezzo_cardtrader": prezzo_ct,
                "quantita_attuale": None,
                "quantita_cardtrader": quantita_ct,
                "trovato": False,
            }
        anteprima.append(preview_item)

    return {
        "trovati": trovati,
        "non_trovati": non_trovati,
        "anteprima": anteprima,
        "applicato": apply,
    }


class SyncRequest(BaseModel):
    cardtrader_id: int
    quantita: int


@router.post("/sync/{prodotto_id}")
def sync_prodotto(
    prodotto_id: int,
    body: SyncRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    token = _get_token()

    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.patch(
                f"{CARDTRADER_API_BASE}/marketplace/products/{body.cardtrader_id}",
                headers={"Authorization": f"Bearer {token}"},
                json={"quantity": body.quantita},
            )
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Errore CardTrader API: {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Errore di rete: {exc}")

    return {"ok": True, "cardtrader_id": body.cardtrader_id, "quantita": body.quantita}


@router.get("/search-blueprint")
def search_blueprint(
    nome: str = Query(..., description="Nome della carta da cercare"),
    current_user=Depends(get_current_active_user),
):
    """
    Cerca blueprint su CardTrader usando l'API marketplace products.
    Restituisce una lista di blueprint matchati.
    """
    token = _get_token()
    nome_safe = nome.replace("\n", " ").replace("\r", " ")[:200]
    logger.info(f"Searching CardTrader blueprints for: {nome_safe}")

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                f"{CARDTRADER_API_BASE}/marketplace/products",
                headers={"Authorization": f"Bearer {token}"},
                params={"q": nome, "limit": 20},
            )
        resp.raise_for_status()

        products = resp.json()
        blueprints_seen = {}

        for product in products:
            blueprint = product.get("blueprint")
            if blueprint:
                bp_id = blueprint.get("id")
                if bp_id and bp_id not in blueprints_seen:
                    expansion = blueprint.get("expansion")
                    game = blueprint.get("game")
                    blueprints_seen[bp_id] = {
                        "id": bp_id,
                        "nome": blueprint.get("name"),
                        "espansione": expansion.get("name") if isinstance(expansion, dict) else None,
                        "gioco": game.get("name") if isinstance(game, dict) else None,
                        "numero": blueprint.get("number"),
                    }

        logger.info(f"CardTrader search successful for '{nome_safe}': {len(blueprints_seen)} blueprints")
        return list(blueprints_seen.values())

    except httpx.HTTPStatusError as exc:
        logger.error(f"CardTrader API error: {exc.response.status_code} - {exc.response.text}")
        raise HTTPException(status_code=502, detail=f"Errore CardTrader API: {exc.response.status_code}")
    except httpx.RequestError as exc:
        logger.error(f"Network error: {exc}")
        raise HTTPException(status_code=502, detail="Errore di rete con CardTrader")


@router.post("/auto-fill-blueprint/{prodotto_id}")
def auto_fill_blueprint_id(
    prodotto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Cerca automaticamente il blueprint ID per un prodotto basandosi sul nome
    e lo salva nel database se non è già presente.
    """
    token = _get_token()

    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    if db_prodotto.cardtrader_blueprint_id:
        return {
            "success": True,
            "blueprint_id": db_prodotto.cardtrader_blueprint_id,
            "message": "Blueprint ID già presente",
        }

    nome = db_prodotto.nome
    nome_safe = nome.replace("\n", " ").replace("\r", " ")[:200]

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                f"{CARDTRADER_API_BASE}/blueprints",
                headers={"Authorization": f"Bearer {token}"},
                params={"name": nome, "limit": 1},
            )
        resp.raise_for_status()

        data = resp.json()
        blueprints = data if isinstance(data, list) else data.get("data") or data.get("blueprints") or []

        if not blueprints:
            return {
                "success": False,
                "message": f"Nessun blueprint trovato per '{nome_safe}'",
            }

        best_match = blueprints[0]
        blueprint_id = best_match.get("id")

        if blueprint_id:
            db_prodotto.cardtrader_blueprint_id = blueprint_id
            db.commit()
            db.refresh(db_prodotto)
            expansion = best_match.get("expansion") or {}
            return {
                "success": True,
                "blueprint_id": blueprint_id,
                "nome_trovato": best_match.get("name"),
                "espansione": expansion.get("name") or expansion.get("code") or best_match.get("expansion_name", ""),
            }
        else:
            return {
                "success": False,
                "message": "Blueprint trovato ma senza ID valido",
            }

    except Exception as exc:
        logger.error(f"Error auto-filling blueprint for prodotto {prodotto_id}: {exc}")
        return {
            "success": False,
            "message": "Errore durante la ricerca del blueprint",
        }


@router.post("/auto-fill-all-blueprints")
def auto_fill_all_blueprints(
    limite: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Cerca e aggiorna automaticamente i blueprint ID per tutti i prodotti
    che non ne hanno uno. Richiede privilegi di amministratore.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Solo gli admin possono eseguire questa operazione")

    token = _get_token()

    prodotti = db.query(Prodotto).filter(
        Prodotto.cardtrader_blueprint_id.is_(None)
    ).limit(limite).all()

    if not prodotti:
        return {
            "success": True,
            "aggiornati": 0,
            "message": "Nessun prodotto da aggiornare",
        }

    aggiornati = 0
    errori = []

    for prodotto in prodotti:
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.get(
                    f"{CARDTRADER_API_BASE}/blueprints",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"name": prodotto.nome, "limit": 1},
                )
            resp.raise_for_status()

            data = resp.json()
            blueprints = data if isinstance(data, list) else data.get("data") or data.get("blueprints") or []

            if blueprints:
                blueprint_id = blueprints[0].get("id")
                if blueprint_id:
                    prodotto.cardtrader_blueprint_id = blueprint_id
                    aggiornati += 1

        except Exception as exc:
            logger.error(f"Error auto-filling blueprint for prodotto '{prodotto.nome}': {exc}")
            errori.append(f"{prodotto.nome}: errore durante la ricerca")
            continue

    if aggiornati > 0:
        db.commit()

    return {
        "success": True,
        "aggiornati": aggiornati,
        "totale_processati": len(prodotti),
        "errori": errori,
    }


@router.post("/auto-populate-blueprint-ids")
def auto_populate_blueprint_ids(
    min_confidence: float = Query(default=60.0, description="Score minimo (0-100)"),
    max_requests: int = Query(default=50, description="Max richieste (rate limiting)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Popola automaticamente i cardtrader_blueprint_id usando matching intelligente."""
    from ..card_parser import parse_card_title, calculate_match_score
    import time

    token = _get_token()

    prodotti_senza_blueprint = db.query(Prodotto).filter(
        (Prodotto.cardtrader_blueprint_id.is_(None)) |
        (Prodotto.cardtrader_blueprint_id == 0)
    ).limit(max_requests).all()

    aggiornati = 0
    non_trovati = []
    low_confidence = []
    errori = []

    logger.info(f"Auto-populate: {len(prodotti_senza_blueprint)} products, min_confidence={min_confidence}%")

    for idx, prodotto in enumerate(prodotti_senza_blueprint):
        try:
            if idx > 0 and idx % 10 == 0:
                time.sleep(1)

            parsed = parse_card_title(prodotto.nome)
            logger.debug(f"[{idx+1}/{len(prodotti_senza_blueprint)}] '{prodotto.nome}' -> {parsed}")

            with httpx.Client(timeout=30) as client:
                resp = client.get(
                    f"{CARDTRADER_API_BASE}/marketplace/products",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"q": parsed.nome, "limit": 10},
                )
            resp.raise_for_status()

            products = resp.json()

            if not products:
                non_trovati.append({
                    "nome_originale": prodotto.nome,
                    "nome_parsed": parsed.nome,
                    "motivo": "Nessun risultato",
                })
                continue

            blueprints_seen = {}
            for product in products:
                blueprint = product.get("blueprint")
                if blueprint:
                    bp_id = blueprint.get("id")
                    if bp_id and bp_id not in blueprints_seen:
                        expansion = blueprint.get("expansion")
                        blueprints_seen[bp_id] = {
                            "id": bp_id,
                            "name": blueprint.get("name"),
                            "expansion_name": expansion.get("name") if isinstance(expansion, dict) else None,
                            "number": blueprint.get("number"),
                        }

            if not blueprints_seen:
                non_trovati.append({
                    "nome_originale": prodotto.nome,
                    "nome_parsed": parsed.nome,
                    "motivo": "Nessun blueprint",
                })
                continue

            best_match = None
            best_score = 0.0

            for bp_id, bp_data in blueprints_seen.items():
                score = calculate_match_score(parsed, bp_data)
                if score > best_score:
                    best_score = score
                    best_match = bp_data

            if best_score >= min_confidence:
                blueprint_id = best_match.get("id")
                prodotto.cardtrader_blueprint_id = blueprint_id
                db.commit()
                aggiornati += 1
                logger.info(f"✓ [{idx+1}] '{prodotto.nome}' -> #{blueprint_id} (score: {best_score:.1f}%)")
            else:
                low_confidence.append({
                    "nome_originale": prodotto.nome,
                    "nome_parsed": parsed.nome,
                    "best_match": best_match.get("name") if best_match else None,
                    "best_match_id": best_match.get("id") if best_match else None,
                    "score": round(best_score, 1),
                })
                logger.warning(f"⚠ [{idx+1}] Low: '{prodotto.nome}' -> '{best_match.get('name') if best_match else 'N/A'}' ({best_score:.1f}%)")

        except httpx.HTTPStatusError as exc:
            error_msg = f"HTTP {exc.response.status_code}"
            errori.append(f"{prodotto.nome}: {error_msg}")
            logger.error(f"HTTP error for '{prodotto.nome}': {exc}")
            if exc.response.status_code == 429:
                logger.error("Rate limit exceeded, stopping")
                break
        except Exception as exc:
            errori.append(f"{prodotto.nome}: {str(exc)}")
            logger.error(f"Error for '{prodotto.nome}': {exc}")

    return {
        "totale_prodotti_senza_blueprint": len(prodotti_senza_blueprint),
        "aggiornati": aggiornati,
        "non_trovati": non_trovati,
        "low_confidence": low_confidence,
        "errori": errori,
        "min_confidence_used": min_confidence,
        "max_requests_used": max_requests,
    }
