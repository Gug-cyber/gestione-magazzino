from collections.abc import Iterable

from ..crud import ordine as crud_ordini
from ..schemas.ordine import OrdineCreate, OrdineUpdate, RigaOrdineCreate, StatoOrdineSchema
from .multi_platform_sync_service import MultiPlatformSyncService


class MagazzinoService:
    @staticmethod
    def create_ebay_internal_order(db, ebay_order_id: str, righe: Iterable[dict]):
        ordine_create = OrdineCreate(
            cliente_id=None,
            cliente_nome=None,
            note=f"Ordine importato da eBay ({ebay_order_id})",
            righe=[
                RigaOrdineCreate(
                    prodotto_id=r["prodotto_id"],
                    quantita=r["quantita"],
                    prezzo_unitario=r["prezzo_unitario"],
                )
                for r in righe
            ],
        )
        ordine = crud_ordini.create_ordine(db, ordine_create)
        return crud_ordini.update_ordine(
            db,
            ordine.id,
            OrdineUpdate(stato=StatoOrdineSchema.confermato),
        )

    @staticmethod
    def sync_stock_after_ebay_sale(db, product_ids: set[int]) -> None:
        for product_id in product_ids:
            MultiPlatformSyncService.sync_after_order(db, product_id)
