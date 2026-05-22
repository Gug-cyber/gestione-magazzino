"""
InventoryService — logica centralizzata di sincronizzazione stock tra
ordini interni, magazzino ed eBay.

Regole garantite:
- SELECT FOR UPDATE su ``prodotti`` durante il decremento (lock di riga).
- Idempotenza: se viene passato un ``order_id``, la presenza di un
  ``Movimento`` già registrato per quello stesso ordine e prodotto
  impedisce un doppio scarico.
- Per le vendite eBay l'idempotenza è garantita dalla tabella
  ``ebay_order_events`` (un record per ogni ``ebay_order_id``).
- Nessuno stock negativo: eccezione esplicita prima del decremento.
- Ogni operazione viene loggata con prodotto_id, quantità, source e timestamp.
"""
import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..models.ebay_listing import EbayListing
from ..models.ebay_order_event import EbayOrderEvent
from ..models.movimento import Movimento, TipoMovimento
from ..models.prodotto import Prodotto
from .ebay_auth_service import EbayAuthService
from .ebay_inventory_service import EbayInventoryService
from .ebay_offer_service import EbayOfferService

logger = logging.getLogger(__name__)


class InventoryService:
    # ------------------------------------------------------------------ #
    # Decremento stock                                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def decrement_stock(
        db: Session,
        prodotto_id: int,
        quantity: int,
        source: str,
        order_id: int = None,
    ) -> Prodotto:
        """Decrementa lo stock di un prodotto con lock di riga e idempotenza.

        Args:
            db: sessione SQLAlchemy.
            prodotto_id: identificativo del prodotto.
            quantity: quantità da decrementare (deve essere > 0).
            source: sorgente dell'operazione (es. ``"internal_order"``,
                ``"ebay_sale"``).  Usato solo per il log.
            order_id: id dell'ordine interno associato (opzionale).
                Se fornito, la funzione verifica l'idempotenza controllando
                se esiste già un ``Movimento`` di scarico con lo stesso
                ``ordine_id`` per questo prodotto.

        Returns:
            L'istanza ``Prodotto`` aggiornata (senza commit).

        Raises:
            HTTPException 404: prodotto non trovato.
            HTTPException 400: quantità non valida o stock insufficiente.
        """
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantità non valida")

        # Idempotenza per ordini interni: non scalare due volte lo stesso ordine
        if order_id is not None:
            already_done = (
                db.query(Movimento)
                .filter(
                    Movimento.prodotto_id == prodotto_id,
                    Movimento.ordine_id == order_id,
                    Movimento.tipo == TipoMovimento.scarico,
                )
                .first()
            )
            if already_done:
                logger.info(
                    "decrement_stock idempotent skip: prodotto_id=%s, order_id=%s, source=%s",
                    prodotto_id,
                    order_id,
                    source,
                )
                return db.execute(
                    select(Prodotto).where(Prodotto.id == prodotto_id)
                ).scalars().first()

        # SELECT FOR UPDATE — lock di riga per prevenire race condition
        product = (
            db.execute(
                select(Prodotto).where(Prodotto.id == prodotto_id).with_for_update()
            )
            .scalars()
            .first()
        )
        if not product:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")

        if product.quantita < quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Stock insufficiente per '{product.nome}': "
                    f"disponibili {product.quantita}, richiesti {quantity}"
                ),
            )

        product.quantita -= quantity
        if product.quantita == 0:
            product.data_scarico = datetime.now(timezone.utc)
        movement = Movimento(
            prodotto_id=product.id,
            tipo=TipoMovimento.scarico,
            quantita=quantity,
            ordine_id=order_id,
            note=f"Scarico stock — source: {source}",
        )
        db.add(movement)

        logger.info(
            "Stock decrementato: prodotto_id=%s, quantita=%s, source=%s, order_id=%s, timestamp=%s",
            prodotto_id,
            quantity,
            source,
            order_id,
            datetime.now(timezone.utc).isoformat(),
        )
        return product

    # ------------------------------------------------------------------ #
    # Sync quantità eBay                                                   #
    # ------------------------------------------------------------------ #

    @staticmethod
    def sync_ebay_quantity(db: Session, prodotto_id: int) -> None:
        """Aggiorna la quantità del listing eBay associato al prodotto.

        Itera su tutti i listing attivi del prodotto e chiama l'API eBay
        per ciascuno.  Gli errori vengono loggati ma non rilanciati, così
        da non bloccare il flusso principale.
        """
        product = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
        if not product:
            logger.warning("sync_ebay_quantity: prodotto_id=%s non trovato", prodotto_id)
            return

        listings = (
            db.query(EbayListing)
            .options(joinedload(EbayListing.connection))
            .filter(
                EbayListing.product_id == prodotto_id,
                EbayListing.ebay_item_id.isnot(None),
                EbayListing.status.notin_(["out_of_stock", "draft"]),
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
                now = datetime.now(timezone.utc)
                listing.quantity_published = product.quantita
                listing.last_sync_at = now
                logger.info(
                    "eBay quantity synced: prodotto_id=%s, sku=%s, quantity=%s, timestamp=%s",
                    prodotto_id,
                    listing.ebay_item_id,
                    product.quantita,
                    now.isoformat(),
                )
            except Exception as exc:
                logger.error(
                    "Errore sync eBay quantity: prodotto_id=%s, sku=%s, error=%s",
                    prodotto_id,
                    listing.ebay_item_id,
                    exc,
                )

    # ------------------------------------------------------------------ #
    # Chiusura listing eBay a stock zero                                   #
    # ------------------------------------------------------------------ #

    @staticmethod
    def close_ebay_listing_if_zero(db: Session, prodotto_id: int) -> None:
        """Chiude/ritira i listing eBay del prodotto se lo stock è 0.

        Itera su tutti i listing attivi del prodotto.  Se la quantità del
        prodotto è > 0 non esegue nulla.  Gli errori vengono loggati.
        """
        product = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
        if not product or product.quantita > 0:
            return

        listings = (
            db.query(EbayListing)
            .options(joinedload(EbayListing.connection))
            .filter(
                EbayListing.product_id == prodotto_id,
                EbayListing.ebay_offer_id.isnot(None),
                EbayListing.status.notin_(["out_of_stock", "draft", "ended"]),
            )
            .all()
        )

        for listing in listings:
            if not listing.connection:
                logger.warning(
                    "Listing eBay senza connessione (prodotto_id=%s, offer_id=%s) — marcato out_of_stock senza chiamata API",
                    prodotto_id,
                    listing.ebay_offer_id,
                )
                listing.status = "out_of_stock"
                listing.last_sync_at = datetime.now(timezone.utc)
                continue
            try:
                token = EbayAuthService.get_valid_token(listing.connection, db)
                EbayOfferService.end_listing(token, listing.ebay_offer_id, reason="OUT_OF_STOCK")
                logger.info(
                    "eBay listing chiuso (stock=0): prodotto_id=%s, offer_id=%s",
                    prodotto_id,
                    listing.ebay_offer_id,
                )
            except Exception as exc:
                logger.error(
                    "Errore chiusura listing eBay (API): prodotto_id=%s, offer_id=%s, error=%s — marking out_of_stock anyway",
                    prodotto_id,
                    listing.ebay_offer_id,
                    exc,
                )
            finally:
                # Aggiorna SEMPRE il DB, indipendentemente dal successo API
                listing.status = "out_of_stock"
                listing.last_sync_at = datetime.now(timezone.utc)

    # ------------------------------------------------------------------ #
    # Gestione vendita eBay in arrivo                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def handle_ebay_sale(
        db: Session,
        ebay_order_id: str,
        sku: str,
        quantity: int,
    ) -> None:
        """Gestisce una vendita eBay in arrivo in modo idempotente.

        - Controlla nella tabella ``ebay_order_events`` se l'ordine è già
          stato processato; in caso affermativo esce senza fare nulla.
        - Trova il listing corrispondente allo SKU.
        - Chiama :meth:`decrement_stock` per decrementare il magazzino
          (con lock di riga).
        - Registra l'evento nella tabella ``ebay_order_events``.

        Non esegue ``db.commit()``: il chiamante è responsabile del commit.
        """
        # Idempotenza: controlla se l'ordine eBay è già stato processato
        existing_event = (
            db.query(EbayOrderEvent)
            .filter(EbayOrderEvent.ebay_order_id == ebay_order_id)
            .first()
        )
        if existing_event:
            logger.info(
                "handle_ebay_sale idempotent skip: ebay_order_id=%s, sku=%s",
                ebay_order_id,
                sku,
            )
            return

        # Trova il listing associato allo SKU
        listing = (
            db.query(EbayListing)
            .filter(EbayListing.ebay_item_id == sku)
            .first()
        )
        if not listing:
            logger.warning(
                "handle_ebay_sale: SKU non trovato: %s (ebay_order_id=%s)",
                sku,
                ebay_order_id,
            )
            return

        # Decrementa lo stock (SELECT FOR UPDATE incluso)
        InventoryService.decrement_stock(
            db,
            listing.product_id,
            quantity,
            source="ebay_sale",
        )

        # Registra l'evento per idempotenza futura
        event = EbayOrderEvent(
            ebay_order_id=ebay_order_id,
            sku=sku,
            quantity=quantity,
        )
        db.add(event)

        logger.info(
            "Vendita eBay processata: ebay_order_id=%s, sku=%s, quantity=%s, prodotto_id=%s, timestamp=%s",
            ebay_order_id,
            sku,
            quantity,
            listing.product_id,
            datetime.now(timezone.utc).isoformat(),
        )
