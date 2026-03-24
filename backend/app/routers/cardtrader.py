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
    Cerca blueprint su CardTrader per nome.
    Usa l'endpoint /blueprints con il parametro name per trovare corrispondenze.
    Ritorna una lista di blueprint con id, nome, espansione e gioco.
    """
    token = _get_token()

    # Sanitize for logging to prevent log injection
    nome_safe = nome.replace("\n", " ").replace("\r", " ")[:200]
    logger.info(f"Searching CardTrader blueprints for: {nome_safe}")

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                f"{CARDTRADER_API_BASE}/blueprints",
                headers={"Authorization": f"Bearer {token}"},
                params={"name": nome, "limit": 20},
            )
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        try:
            error_body = exc.response.text
            logger.error(
                f"CardTrader API error for query '{nome_safe}': {status_code} - {error_body}"
            )
        except Exception:
            logger.error(
                f"CardTrader API error for query '{nome_safe}': {status_code}"
            )
        if status_code == 404:
            logger.warning(f"Blueprint not found (404) for '{nome_safe}', returning empty array")
            return []
        raise HTTPException(
            status_code=502,
            detail=f"Errore CardTrader API: {status_code}",
        )
    except httpx.RequestError as exc:
        logger.error(f"Network error searching CardTrader for '{nome_safe}': {exc}")
        raise HTTPException(status_code=502, detail="Errore di rete con CardTrader")
    except Exception as exc:
        logger.error(f"Unexpected error searching CardTrader for '{nome_safe}': {exc}")
        raise HTTPException(status_code=500, detail="Errore interno del server")

    data = resp.json()
    # The API may return a list or a dict with a data key
    if isinstance(data, list):
        items = data
    else:
        items = data.get("data") or data.get("blueprints") or []

    if not items:
        logger.warning(f"No blueprints found for '{nome_safe}'")
        return []

    # Filter by name (case-insensitive contains) and return top 20
    nome_lower = nome.lower()
    results = []
    for item in items:
        item_name = item.get("name") or ""
        if nome_lower in item_name.lower():
            expansion = item.get("expansion") or {}
            results.append({
                "id": item.get("id"),
                "nome": item_name,
                "espansione": expansion.get("name") or expansion.get("code") or item.get("expansion_name", ""),
                "gioco": item.get("game_name") or item.get("category_name") or "",
            })
        if len(results) >= 20:
            break

    logger.info(f"CardTrader search successful for '{nome_safe}': {len(results)} results")
    return results


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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Popola automaticamente i cardtrader_blueprint_id per tutti i prodotti
    che non hanno ancora questo campo compilato.

    Cerca su CardTrader usando il nome del prodotto e prende il primo risultato
    con match esatto o il migliore match fuzzy.
    """
    token = _get_token()

    prodotti_senza_blueprint = db.query(Prodotto).filter(
        (Prodotto.cardtrader_blueprint_id.is_(None)) | (Prodotto.cardtrader_blueprint_id == 0)
    ).all()

    aggiornati = 0
    non_trovati = []
    errori = []

    with httpx.Client(timeout=30) as client:
        for prodotto in prodotti_senza_blueprint:
            try:
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
                        logger.info(f"Auto-populated blueprint_id {blueprint_id} for product {prodotto.id} ({prodotto.nome})")
                    else:
                        non_trovati.append(prodotto.nome)
                else:
                    non_trovati.append(prodotto.nome)

            except Exception as exc:
                errori.append(f"{prodotto.nome}: {str(exc)}")
                logger.error(f"Error auto-populating blueprint for product {prodotto.id}: {exc}")

    if aggiornati > 0:
        db.commit()

    return {
        "totale_prodotti_senza_blueprint": len(prodotti_senza_blueprint),
        "aggiornati": aggiornati,
        "non_trovati": non_trovati,
        "errori": errori,
    }
