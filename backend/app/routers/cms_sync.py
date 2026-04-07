"""
Router per sincronizzazione Magazzino → CMS Strapi
"""
import hashlib
import hmac
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import logging
import os

from ..database import get_db
from ..auth import get_current_active_user
from ..models.prodotto import Prodotto
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

# Configurazione Strapi
STRAPI_URL = os.getenv("STRAPI_URL", "http://localhost:1337")
STRAPI_API_TOKEN = os.getenv("STRAPI_API_TOKEN", "")
CMS_WEBHOOK_SECRET = os.getenv("CMS_WEBHOOK_SECRET", "")


class SyncResult(BaseModel):
    success: bool
    synced_count: int
    failed_count: int
    errors: List[str]


async def sync_product_to_strapi(product: Prodotto) -> dict:
    """
    Sincronizza un singolo prodotto da magazzino a Strapi CMS
    """
    headers = {
        "Authorization": f"Bearer {STRAPI_API_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "data": {
            "magazzino_id": product.id,
            "title": product.nome,
            "description": product.descrizione or "",
            "price": float(product.prezzo_vendita) if product.prezzo_vendita else 0,
            "original_price": float(product.prezzo_acquisto) if product.prezzo_acquisto else None,
            "quantity": product.quantita,
            "sku": product.sku,
            "featured": False,
            "publishedAt": None  # Publish manualmente dal CMS
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Verifica se prodotto esiste già
        check_url = f"{STRAPI_URL}/api/products?filters[magazzino_id][$eq]={product.id}"
        check_response = await client.get(check_url, headers=headers)

        if check_response.status_code == 200:
            existing = check_response.json().get("data", [])

            if existing:
                # UPDATE
                strapi_id = existing[0]["id"]
                update_url = f"{STRAPI_URL}/api/products/{strapi_id}"
                response = await client.put(update_url, json=payload, headers=headers)
            else:
                # CREATE
                create_url = f"{STRAPI_URL}/api/products"
                response = await client.post(create_url, json=payload, headers=headers)

            return {
                "success": response.status_code in [200, 201],
                "status_code": response.status_code,
                "data": response.json() if response.status_code in [200, 201] else None
            }

        return {"success": False, "status_code": check_response.status_code, "data": None}


@router.post("/sync-all", response_model=SyncResult)
async def sync_all_products(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Sincronizza TUTTI i prodotti dal magazzino al CMS
    """
    if not STRAPI_API_TOKEN:
        raise HTTPException(500, "STRAPI_API_TOKEN non configurato")

    products = db.query(Prodotto).filter(Prodotto.quantita > 0).all()

    synced = 0
    failed = 0
    errors = []

    for product in products:
        try:
            result = await sync_product_to_strapi(product)
            if result["success"]:
                synced += 1
            else:
                failed += 1
                errors.append(f"Prodotto {product.id}: HTTP {result['status_code']}")
        except Exception as e:
            failed += 1
            errors.append(f"Prodotto {product.id}: {str(e)}")

    logger.info(f"Sync completato: {synced} ok, {failed} falliti")

    return SyncResult(
        success=failed == 0,
        synced_count=synced,
        failed_count=failed,
        errors=errors
    )


@router.post("/sync-product/{product_id}")
async def sync_single_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Sincronizza un singolo prodotto specifico
    """
    product = db.query(Prodotto).filter(Prodotto.id == product_id).first()

    if not product:
        raise HTTPException(404, "Prodotto non trovato")

    result = await sync_product_to_strapi(product)

    if not result["success"]:
        raise HTTPException(500, f"Sync fallito: HTTP {result['status_code']}")

    return {"message": "Prodotto sincronizzato con successo", "data": result["data"]}


@router.post("/webhook/product-updated")
async def handle_product_update_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_strapi_signature: Optional[str] = Header(default=None),
):
    """
    Webhook chiamato da Strapi quando un prodotto viene modificato nel CMS
    Aggiorna il magazzino di conseguenza (sync bidirezionale)
    """
    raw_body = await request.body()
    if CMS_WEBHOOK_SECRET:
        if not x_strapi_signature:
            raise HTTPException(status_code=401, detail="Firma webhook mancante")
        expected = hmac.new(
            CMS_WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, x_strapi_signature):
            raise HTTPException(status_code=401, detail="Firma webhook non valida")
    # TODO: Implementare sync CMS → Magazzino se necessario
    logger.info("Webhook ricevuto da Strapi per aggiornamento prodotto")
    return {"message": "Webhook processato"}
