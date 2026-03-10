"""
Servizio per sincronizzare i prodotti del magazzino verso Strapi CMS.
Viene chiamato automaticamente dopo ogni create/update/delete di prodotto.
"""
import os
import httpx
import logging

logger = logging.getLogger(__name__)

STRAPI_URL = os.getenv("STRAPI_URL", "http://strapi:1337")
STRAPI_API_TOKEN = os.getenv("STRAPI_API_TOKEN", "")


def _headers():
    h = {"Content-Type": "application/json"}
    if STRAPI_API_TOKEN:
        h["Authorization"] = f"Bearer {STRAPI_API_TOKEN}"
    return h


def _build_payload(prodotto) -> dict:
    return {
        "data": {
            "nome": prodotto.nome,
            "sku": prodotto.sku,
            "descrizione": prodotto.descrizione,
            "prezzo_vendita": float(prodotto.prezzo_vendita) if prodotto.prezzo_vendita else None,
            "quantita": prodotto.quantita,
            "stato_conservazione": prodotto.stato_conservazione,
            "lingua": prodotto.lingua,
            "magazzino_id": prodotto.id,
        }
    }


def _find_strapi_id_by_sku(sku: str) -> int | None:
    """Cerca il documento Strapi corrispondente allo SKU. Restituisce l'ID Strapi o None."""
    try:
        resp = httpx.get(
            f"{STRAPI_URL}/api/prodotti",
            params={"filters[sku][$eq]": sku, "pagination[pageSize]": 1},
            headers=_headers(),
            timeout=5.0,
        )
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if data:
                return data[0]["id"]
    except Exception as exc:
        logger.warning(f"[Strapi] Errore ricerca SKU {sku}: {exc}")
    return None


def sync_create_or_update(prodotto) -> None:
    """Crea o aggiorna il prodotto su Strapi. Chiamare dopo create/update."""
    if not STRAPI_URL:
        return

    strapi_id = _find_strapi_id_by_sku(prodotto.sku)
    payload = _build_payload(prodotto)

    try:
        if strapi_id:
            resp = httpx.put(
                f"{STRAPI_URL}/api/prodotti/{strapi_id}",
                json=payload,
                headers=_headers(),
                timeout=5.0,
            )
        else:
            resp = httpx.post(
                f"{STRAPI_URL}/api/prodotti",
                json=payload,
                headers=_headers(),
                timeout=5.0,
            )
        if resp.status_code not in (200, 201):
            logger.warning(f"[Strapi] Sync prodotto {prodotto.sku} → {resp.status_code}: {resp.text[:200]}")
        else:
            logger.info(f"[Strapi] Prodotto {prodotto.sku} sincronizzato (id strapi: {strapi_id})")
    except Exception as exc:
        logger.error(f"[Strapi] Errore sync prodotto {prodotto.sku}: {exc}")


def sync_delete(sku: str) -> None:
    """Elimina il prodotto da Strapi. Chiamare dopo delete."""
    if not STRAPI_URL:
        return

    strapi_id = _find_strapi_id_by_sku(sku)
    if not strapi_id:
        return

    try:
        resp = httpx.delete(
            f"{STRAPI_URL}/api/prodotti/{strapi_id}",
            headers=_headers(),
            timeout=5.0,
        )
        if resp.status_code not in (200, 204):
            logger.warning(f"[Strapi] Delete prodotto {sku} → {resp.status_code}")
        else:
            logger.info(f"[Strapi] Prodotto {sku} eliminato da Strapi")
    except Exception as exc:
        logger.error(f"[Strapi] Errore delete prodotto {sku}: {exc}")
