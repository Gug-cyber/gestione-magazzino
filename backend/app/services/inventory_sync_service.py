from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.ebay_listing import EbayListing
from ..models.movimento import Movimento, TipoMovimento
from ..models.prodotto import Prodotto
from .ebay_auth_service import EbayAuthService
from .ebay_inventory_service import EbayInventoryService
from .ebay_offer_service import EbayOfferService


class InventorySyncService:
    @staticmethod
    def decrement_stock(
        product_id: int,
        quantity: int,
        db: Session,
        *,
        tipo: TipoMovimento = TipoMovimento.vendita_ebay,
        note: str = "Vendita eBay sincronizzata automaticamente",
        ordine_id: int | None = None,
        auto_commit: bool = True,
    ) -> Prodotto:
        """
        Decrementa lo stock di un prodotto con lock pessimistico FOR UPDATE.
        Se auto_commit=False, non esegue commit (per uso in transazioni composite).
        Registra sempre un movimento di magazzino.
        """
        product = (
            db.execute(
                select(Prodotto).where(Prodotto.id == product_id).with_for_update()
            )
            .scalars()
            .first()
        )
        if not product:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantità non valida")
        if product.quantita < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Quantità insufficiente in magazzino (disponibile: {product.quantita}, richiesta: {quantity})",
            )

        product.quantita -= quantity
        movement = Movimento(
            prodotto_id=product.id,
            tipo=tipo,
            quantita=quantity,
            note=note,
            ordine_id=ordine_id,
        )
        db.add(movement)
        if auto_commit:
            db.commit()
            db.refresh(product)
        else:
            db.flush()
        return product

    @staticmethod
    def sync_quantity_to_ebay(listing: EbayListing, connection, db: Session) -> EbayListing:
        if not listing.product:
            raise HTTPException(status_code=404, detail="Prodotto listing non trovato")
        if not listing.ebay_item_id:
            raise HTTPException(status_code=400, detail="Listing eBay senza SKU associato")

        token = EbayAuthService.get_valid_token(connection, db)
        EbayInventoryService.update_quantity(
            token,
            listing.ebay_item_id,
            listing.product.quantita,
            marketplace_id=connection.marketplace_id or "EBAY_IT",
        )
        listing.quantity_published = listing.product.quantita
        listing.last_sync_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(listing)
        return listing

    @staticmethod
    def check_and_handle_zero_stock(listing: EbayListing, connection, db: Session) -> EbayListing:
        if not listing.product:
            raise HTTPException(status_code=404, detail="Prodotto listing non trovato")
        if listing.product.quantita > 0:
            return listing

        token = EbayAuthService.get_valid_token(connection, db)
        if listing.ebay_offer_id:
            EbayOfferService.end_listing(token, listing.ebay_offer_id, reason="OUT_OF_STOCK")
        listing.status = "out_of_stock"
        listing.last_sync_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(listing)
        return listing

    @staticmethod
    def sync_ebay_for_product(product_id: int, db: Session) -> dict:
        """
        Sincronizza il listing eBay attivo per il prodotto indicato.
        Chiama sync_quantity_to_ebay e check_and_handle_zero_stock.
        Restituisce dict con info sul risultato.
        Fallisce silenziosamente se non c'è connessione eBay attiva.
        """
        from ..models.ebay_connection import EbayConnection

        connection = (
            db.query(EbayConnection)
            .filter_by(status="active")
            .order_by(EbayConnection.id.desc())
            .first()
        )
        if not connection:
            return {"status": "no_connection"}

        listing = (
            db.query(EbayListing)
            .filter(
                EbayListing.product_id == product_id,
                EbayListing.status == "active",
            )
            .first()
        )
        if not listing:
            return {"status": "no_listing"}

        InventorySyncService.sync_quantity_to_ebay(listing, connection, db)
        InventorySyncService.check_and_handle_zero_stock(listing, connection, db)
        return {"status": "synced", "listing_status": listing.status}
