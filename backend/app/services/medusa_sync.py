"""
Servizio per sincronizzare stock e prezzi verso Medusa.
Viene chiamato indirettamente tramite Strapi, ma può anche agire direttamente.
"""
import os
import httpx
import logging

logger = logging.getLogger(__name__)

MEDUSA_URL = os.getenv("MEDUSA_URL", "http://medusa:9000")
MEDUSA_API_KEY = os.getenv("MEDUSA_API_KEY", "")


def _headers():
    h = {"Content-Type": "application/json"}
    if MEDUSA_API_KEY:
        h["x-medusa-access-token"] = MEDUSA_API_KEY
    return h


def _find_medusa_product_by_sku(sku: str) -> dict | None:
    """Cerca il prodotto su Medusa tramite SKU (cerca nella lista varianti)."""
    try:
        resp = httpx.get(
            f"{MEDUSA_URL}/admin/products",
            params={"q": sku, "limit": 5},
            headers=_headers(),
            timeout=5.0,
        )
        if resp.status_code == 200:
            products = resp.json().get("products", [])
            for p in products:
                for v in p.get("variants", []):
                    if v.get("sku") == sku:
                        return {"product_id": p["id"], "variant_id": v["id"]}
    except Exception as exc:
        logger.warning(f"[Medusa] Errore ricerca SKU {sku}: {exc}")
    return None


def sync_stock(prodotto) -> None:
    """Aggiorna lo stock di una variante su Medusa."""
    if not MEDUSA_URL or not MEDUSA_API_KEY:
        logger.debug("[Medusa] MEDUSA_API_KEY non configurata, skip sync stock")
        return

    result = _find_medusa_product_by_sku(prodotto.sku)
    if not result:
        logger.debug(f"[Medusa] Prodotto {prodotto.sku} non trovato su Medusa, skip")
        return

    variant_id = result["variant_id"]
    try:
        resp = httpx.post(
            f"{MEDUSA_URL}/admin/variants/{variant_id}/inventory-items",
            json={"quantity": prodotto.quantita},
            headers=_headers(),
            timeout=5.0,
        )
        if resp.status_code not in (200, 201):
            logger.warning(f"[Medusa] Stock update {prodotto.sku} → {resp.status_code}: {resp.text[:200]}")
        else:
            logger.info(f"[Medusa] Stock prodotto {prodotto.sku} aggiornato a {prodotto.quantita}")
    except Exception as exc:
        logger.error(f"[Medusa] Errore sync stock {prodotto.sku}: {exc}")


def sync_create_or_update(prodotto) -> None:
    """Crea o aggiorna prodotto su Medusa con nome, prezzo e stock."""
    if not MEDUSA_URL or not MEDUSA_API_KEY:
        logger.debug("[Medusa] MEDUSA_API_KEY non configurata, skip sync prodotto")
        return

    result = _find_medusa_product_by_sku(prodotto.sku)

    price_amount = int(float(prodotto.prezzo_vendita or 0) * 100)  # Medusa usa centesimi

    if result:
        # Aggiorna variante esistente
        variant_id = result["variant_id"]
        try:
            httpx.post(
                f"{MEDUSA_URL}/admin/products/{result['product_id']}/variants/{variant_id}",
                json={
                    "title": prodotto.nome,
                    "sku": prodotto.sku,
                    "inventory_quantity": prodotto.quantita,
                    "prices": [{"amount": price_amount, "currency_code": "eur"}],
                },
                headers=_headers(),
                timeout=5.0,
            )
            logger.info(f"[Medusa] Prodotto {prodotto.sku} aggiornato")
        except Exception as exc:
            logger.error(f"[Medusa] Errore update {prodotto.sku}: {exc}")
    else:
        # Crea nuovo prodotto
        try:
            httpx.post(
                f"{MEDUSA_URL}/admin/products",
                json={
                    "title": prodotto.nome,
                    "description": prodotto.descrizione or "",
                    "status": "published" if prodotto.quantita > 0 else "draft",
                    "variants": [{
                        "title": "Default",
                        "sku": prodotto.sku,
                        "inventory_quantity": prodotto.quantita,
                        "prices": [{"amount": price_amount, "currency_code": "eur"}],
                    }],
                },
                headers=_headers(),
                timeout=5.0,
            )
            logger.info(f"[Medusa] Prodotto {prodotto.sku} creato su Medusa")
        except Exception as exc:
            logger.error(f"[Medusa] Errore create {prodotto.sku}: {exc}")


def delete_product(sku: str) -> None:
    """Elimina il prodotto da Medusa."""
    if not MEDUSA_URL or not MEDUSA_API_KEY:
        return

    result = _find_medusa_product_by_sku(sku)
    if not result:
        return

    try:
        httpx.delete(
            f"{MEDUSA_URL}/admin/products/{result['product_id']}",
            headers=_headers(),
            timeout=5.0,
        )
        logger.info(f"[Medusa] Prodotto {sku} eliminato da Medusa")
    except Exception as exc:
        logger.error(f"[Medusa] Errore delete {sku}: {exc}")
