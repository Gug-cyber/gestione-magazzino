import os
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
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

    update_data = ProdottoUpdate(quantita=body.quantita)
    updated = crud.update_prodotto(db, prodotto_id, update_data)
    return updated
