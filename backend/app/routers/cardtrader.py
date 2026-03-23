import os
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

from ..database import get_db
from ..schemas.prodotto import ProdottoCreate, ProdottoUpdate
from ..crud import prodotto as crud
from ..auth import get_current_active_user

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
    headers = {"Authorization": f"Bearer {token}"}

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                f"{CARDTRADER_API_BASE}/marketplace/products",
                headers=headers,
                params={"blueprint_id": blueprint_id},
            )
            resp.raise_for_status()

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
                    "ultimo_prezzo_venduto": None,
                }

            prezzo_minimo = round(min(prices), 2)
            prezzo_medio = round(sum(prices) / len(prices), 2)

            # Best-effort: retrieve the most recent sold price (first result in API order)
            ultimo_prezzo_venduto = None
            try:
                sold_resp = client.get(
                    f"{CARDTRADER_API_BASE}/marketplace/products",
                    headers=headers,
                    params={"blueprint_id": blueprint_id, "sold": "true"},
                )
                if sold_resp.status_code == 200:
                    sold_data = sold_resp.json()
                    if isinstance(sold_data, list):
                        sold_items = sold_data
                    else:
                        sold_items = sold_data.get("data") or sold_data.get("products") or []

                    for item in sold_items:
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
                            # Take the first matching result (most recent sale per API ordering)
                            ultimo_prezzo_venduto = round(cents / 100, 2)
                            break
            except Exception:
                pass

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Errore CardTrader API: {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Errore di rete: {exc}")

    return {
        "blueprint_id": blueprint_id,
        "condizione": condizione or None,
        "lingua": lingua or None,
        "prezzo_minimo": prezzo_minimo,
        "prezzo_medio": prezzo_medio,
        "numero_offerte": len(prices),
        "ultimo_prezzo_venduto": ultimo_prezzo_venduto,
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
