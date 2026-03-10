"""
Webhook receiver per eventi da Medusa.
POST /api/webhook/medusa/order  →  scarica quantità prodotti dal magazzino
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..crud import prodotto as crud_prodotto
from ..crud import movimento as crud_movimento
from ..schemas.movimento import MovimentoCreate
from ..models.movimento import TipoMovimento

logger = logging.getLogger(__name__)
router = APIRouter()

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "magazzino-webhook-secret")


@router.post("/medusa/order")
async def medusa_order_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_secret: str = Header(default=""),
):
    # Verifica il secret
    if x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Webhook secret non valido")

    body = await request.json()
    order_id = body.get("order_id")
    items = body.get("items", [])  # lista di {sku, quantity}

    if not order_id and not items:
        return {"status": "no_action"}

    scaricati = []
    errori = []

    for item in items:
        sku = item.get("sku")
        qty = item.get("quantity", 1)

        if not sku:
            continue

        prodotto = crud_prodotto.get_prodotto_by_sku(db, sku)
        if not prodotto:
            errori.append(f"SKU {sku} non trovato nel magazzino")
            continue

        # Crea movimento di scarico
        movimento = MovimentoCreate(
            prodotto_id=prodotto.id,
            tipo=TipoMovimento.scarico,
            quantita=qty,
            note=f"Ordine Medusa #{order_id}",
        )
        crud_movimento.create_movimento(db, movimento)
        scaricati.append(sku)
        logger.info(f"[Webhook] Scarico {qty}x {sku} per ordine Medusa {order_id}")

    return {
        "status": "ok",
        "order_id": order_id,
        "scaricati": scaricati,
        "errori": errori,
    }
