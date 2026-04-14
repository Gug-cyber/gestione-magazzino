from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.ebay_listing import EbayListing
from ..models.movimento import Movimento, TipoMovimento
from ..models.prodotto import Prodotto
from .ebay_auth_service import EbayAuthService
from .ebay_inventory_service import EbayInventoryService
from .ebay_offer_service import EbayOfferService


class InventorySyncService:
    @staticmethod
    def decrement_stock(product_id: int, quantity: int, db: Session) -> Prodotto:
        product = db.query(Prodotto).filter(Prodotto.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantità non valida")
        if product.quantita < quantity:
            raise HTTPException(status_code=400, detail="Quantità insufficiente in magazzino")

        product.quantita -= quantity
        movement = Movimento(
            prodotto_id=product.id,
            tipo=TipoMovimento.vendita_ebay,
            quantita=quantity,
            note="Vendita eBay sincronizzata automaticamente",
        )
        db.add(movement)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def sync_quantity_to_ebay(listing: EbayListing, connection, db: Session) -> EbayListing:
        if not listing.product:
            raise HTTPException(status_code=404, detail="Prodotto listing non trovato")
        if not listing.ebay_item_id:
            raise HTTPException(status_code=400, detail="Listing eBay senza SKU associato")

        token = EbayAuthService.get_valid_token(connection, db)
        EbayInventoryService.update_quantity(token, listing.ebay_item_id, listing.product.quantita)
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
