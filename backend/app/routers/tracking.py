"""Router per tracking automatico spedizioni multi-corriere."""
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..auth import get_current_active_user
from ..services.tracking_service import UnifiedTrackingService, TrackingServiceFactory
from ..models.tracking_update import TrackingUpdate
from ..models.ordine import Ordine
from ..models.fornitura import Fornitura

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/refresh/{tracking_number}")
def refresh_tracking(
    tracking_number: str,
    background_tasks: BackgroundTasks,
    corriere: str = Query(..., description="Nome del corriere (es: 'Poste Italiane', 'DHL')"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Forza aggiornamento tracking per un numero specifico e corriere."""
    background_tasks.add_task(_update_single_tracking_task, corriere, tracking_number)
    return {"message": f"Aggiornamento tracking {corriere} avviato"}


@router.post("/refresh-all")
def refresh_all_tracking(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Aggiorna tutti i tracking attivi (tutti i corrieri supportati)."""
    background_tasks.add_task(_update_all_active_tracking_task)
    return {"message": "Aggiornamento tracking multi-corriere avviato"}


@router.get("/history/{tracking_number}")
def get_tracking_history(
    tracking_number: str,
    corriere: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Recupera lo storico aggiornamenti per un numero di tracking."""
    query = (
        db.query(TrackingUpdate)
        .filter(TrackingUpdate.tracking_number == tracking_number)
    )
    if corriere:
        query = query.filter(TrackingUpdate.corriere == corriere)

    updates = query.order_by(TrackingUpdate.created_at.desc()).all()

    return {
        "tracking_number": tracking_number,
        "corriere": corriere,
        "updates": [
            {
                "id": u.id,
                "corriere": u.corriere,
                "status": u.status,
                "status_date": u.status_date,
                "location": u.location,
                "events": json.loads(u.events) if u.events else [],
                "delivered": u.delivered,
                "delivery_date": u.delivery_date,
                "updated_at": u.updated_at,
                "created_at": u.created_at,
            }
            for u in updates
        ],
    }


@router.get("/latest/{tracking_number}")
def get_latest_tracking(
    tracking_number: str,
    corriere: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Recupera l'ultimo aggiornamento per un numero di tracking."""
    query = (
        db.query(TrackingUpdate)
        .filter(TrackingUpdate.tracking_number == tracking_number)
    )
    if corriere:
        query = query.filter(TrackingUpdate.corriere == corriere)

    update = query.order_by(TrackingUpdate.created_at.desc()).first()
    if not update:
        raise HTTPException(status_code=404, detail="Nessun aggiornamento trovato per questo tracking")

    return {
        "id": update.id,
        "tracking_number": update.tracking_number,
        "corriere": update.corriere,
        "status": update.status,
        "status_date": update.status_date,
        "location": update.location,
        "events": json.loads(update.events) if update.events else [],
        "delivered": update.delivered,
        "delivery_date": update.delivery_date,
        "updated_at": update.updated_at,
        "created_at": update.created_at,
    }


def _update_single_tracking_task(corriere: str, tracking_number: str) -> None:
    """Background task wrapper: creates its own DB session for safety."""
    db = SessionLocal()
    try:
        _update_single_tracking(corriere, tracking_number, db)
    finally:
        db.close()


def _update_all_active_tracking_task() -> None:
    """Background task wrapper: creates its own DB session for safety."""
    db = SessionLocal()
    try:
        _update_all_active_tracking(db)
    finally:
        db.close()


def _update_single_tracking(corriere: str, tracking_number: str, db: Session) -> None:
    """Update tracking for a single shipment (any supported courier)."""
    try:
        service = UnifiedTrackingService()
        tracking_info = service.get_tracking_info(corriere, tracking_number)

        if not tracking_info:
            logger.warning("Nessuna info tracking per %s - %s", corriere, tracking_number)
            return

        # Cerca ordine collegato (per qualsiasi corriere)
        ordine = (
            db.query(Ordine)
            .filter(
                Ordine.tracking_number == tracking_number,
                Ordine.corriere == corriere,
            )
            .first()
        )

        # Cerca fornitura collegata (per qualsiasi corriere)
        fornitura = (
            db.query(Fornitura)
            .filter(
                Fornitura.tracking_number == tracking_number,
                Fornitura.corriere == corriere,
            )
            .first()
        )

        # Auto-chiusura ordine se il pacco è stato consegnato
        if tracking_info.get("delivered") and ordine:
            if ordine.stato != "completato":
                ordine.stato = "completato"
                db.add(ordine)
                logger.info(
                    "Ordine %s chiuso automaticamente - %s consegnato",
                    ordine.numero_ordine,
                    corriere,
                )

        # Auto-chiusura fornitura se il pacco è stato consegnato
        if tracking_info.get("delivered") and fornitura:
            if fornitura.stato != "ricevuto":
                fornitura.stato = "ricevuto"
                db.add(fornitura)
                logger.info(
                    "Fornitura %s chiusa automaticamente - %s consegnato",
                    fornitura.id,
                    corriere,
                )

        update = TrackingUpdate(
            ordine_id=ordine.id if ordine else None,
            fornitura_id=fornitura.id if fornitura else None,
            tracking_number=tracking_number,
            corriere=corriere,
            status=tracking_info.get("status"),
            status_date=tracking_info.get("status_date"),
            location=tracking_info.get("location"),
            events=json.dumps(tracking_info.get("events", [])),
            delivered=tracking_info.get("delivered", False),
            delivery_date=tracking_info.get("delivery_date"),
        )
        db.add(update)
        db.commit()
        logger.info("Tracking aggiornato per %s - %s", corriere, tracking_number)
    except Exception as e:
        logger.error("Errore aggiornamento tracking %s - %s: %s", corriere, tracking_number, e)
        db.rollback()


def _update_all_active_tracking(db: Session) -> None:
    """Update all active tracking numbers for all supported couriers."""
    try:
        supported_couriers = list(TrackingServiceFactory.PROVIDERS.keys())

        ordini_attivi = (
            db.query(Ordine)
            .filter(
                Ordine.corriere.in_(supported_couriers),
                Ordine.tracking_number.isnot(None),
                Ordine.stato != "completato",
                Ordine.stato != "annullato",
            )
            .all()
        )

        forniture_attive = (
            db.query(Fornitura)
            .filter(
                Fornitura.corriere.in_(supported_couriers),
                Fornitura.tracking_number.isnot(None),
                Fornitura.stato != "ricevuto",
                Fornitura.stato != "annullato",
            )
            .all()
        )

        # Raccogli coppie uniche (corriere, tracking_number)
        shipments = list(
            set(
                [(o.corriere, o.tracking_number) for o in ordini_attivi if o.tracking_number]
                + [(f.corriere, f.tracking_number) for f in forniture_attive if f.tracking_number]
            )
        )

        if not shipments:
            logger.info("Nessun tracking attivo da aggiornare")
            return

        logger.info("Aggiornamento di %d tracking attivi (multi-corriere)", len(shipments))
        for corriere, tracking_number in shipments:
            _update_single_tracking(corriere, tracking_number, db)

    except Exception as e:
        logger.error("Errore aggiornamento batch tracking: %s", e)

