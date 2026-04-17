"""
MultiPlatformSyncService — logica centralizzata di sincronizzazione stock
tra ordini (interni ed esterni) e tutti i marketplace attivi.

Quando viene ricevuto un ordine da qualsiasi piattaforma:
- Se stock > 0: aggiorna la quantità su tutti i marketplace attivi
- Se stock <= 0: cancella/ritira tutti gli annunci attivi su tutte le piattaforme

Garanzie:
- Errori su una piattaforma non bloccano le altre
- Tutti gli errori vengono loggati ma NON rilanciati
- Usa db.flush() — il commit è responsabilità del chiamante
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from ..models.ebay_listing import EbayListing
from ..models.prodotto import Prodotto
from .ebay_auth_service import EbayAuthService
from .ebay_inventory_service import EbayInventoryService
from .ebay_offer_service import EbayOfferService

logger = logging.getLogger(__name__)


def _sync_ebay_quantity(db: Session, product: Prodotto) -> None:
    """Aggiorna la quantità su tutti i listing eBay attivi del prodotto."""
    listings = (
        db.query(EbayListing)
        .options(joinedload(EbayListing.connection))
        .filter(
            EbayListing.product_id == product.id,
            EbayListing.ebay_item_id.isnot(None),
            EbayListing.status.notin_(["out_of_stock", "draft", "ended"]),
        )
        .all()
    )

    for listing in listings:
        if not listing.connection:
            continue
        try:
            token = EbayAuthService.get_valid_token(listing.connection, db)
            EbayInventoryService.update_quantity(
                token,
                listing.ebay_item_id,
                product.quantita,
                marketplace_id=listing.connection.marketplace_id or "EBAY_IT",
            )
            listing.quantity_published = product.quantita
            listing.last_sync_at = datetime.now(timezone.utc)
        except Exception as exc:
            logger.error(
                "Errore sync quantità eBay: prodotto_id=%s, sku=%s, error=%s",
                product.id,
                listing.ebay_item_id,
                exc,
            )

    db.flush()
    # TODO: integrare aggiornamento quantità CardMarket/CardTrader


def _cancel_all_ebay_listings(db: Session, product: Prodotto) -> None:
    """Cancella/ritira tutti i listing eBay attivi del prodotto (stock = 0)."""
    listings = (
        db.query(EbayListing)
        .options(joinedload(EbayListing.connection))
        .filter(
            EbayListing.product_id == product.id,
            EbayListing.ebay_offer_id.isnot(None),
            EbayListing.status.notin_(["out_of_stock", "draft", "ended"]),
        )
        .all()
    )

    for listing in listings:
        if not listing.connection:
            logger.warning(
                "Listing eBay senza connessione (prodotto_id=%s, offer_id=%s) — marcato out_of_stock senza chiamata API",
                product.id,
                listing.ebay_offer_id,
            )
            listing.status = "out_of_stock"
            listing.last_sync_at = datetime.now(timezone.utc)
            continue
        try:
            token = EbayAuthService.get_valid_token(listing.connection, db)
            EbayOfferService.end_listing(token, listing.ebay_offer_id, reason="OUT_OF_STOCK")
            listing.status = "out_of_stock"
            listing.last_sync_at = datetime.now(timezone.utc)
            logger.info(
                "Annuncio eBay cancellato per stock=0: prodotto_id=%s, offer_id=%s",
                product.id,
                listing.ebay_offer_id,
            )
        except Exception as exc:
            logger.error(
                "Errore cancellazione listing eBay: prodotto_id=%s, offer_id=%s, error=%s",
                product.id,
                listing.ebay_offer_id,
                exc,
            )
            # Aggiorna il DB comunque (best-effort)
            listing.status = "out_of_stock"
            listing.last_sync_at = datetime.now(timezone.utc)

    db.flush()
    # TODO: integrare cancellazione CardMarket/CardTrader


class MultiPlatformSyncService:
    @staticmethod
    def sync_after_order(db: Session, prodotto_id: int) -> None:
        """
        Da chiamare dopo ogni ordine (interno o esterno).
        - Se stock > 0: aggiorna la quantità su tutti i marketplace attivi
        - Se stock <= 0: cancella/ritira tutti gli annunci attivi su tutti i marketplace

        Non esegue db.commit(): il commit è responsabilità del chiamante.
        """
        product = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
        if not product:
            logger.warning("sync_after_order: prodotto_id=%s non trovato", prodotto_id)
            return

        if product.quantita > 0:
            _sync_ebay_quantity(db, product)
            # Aggiungere qui altre piattaforme quando disponibili
        else:
            _cancel_all_ebay_listings(db, product)
            # Aggiungere qui altre piattaforme quando disponibili
