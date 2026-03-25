"""Router per tracking automatico spedizioni."""
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..auth import get_current_active_user
from ..services.poste_tracking import PosteTrackingService
from ..models.tracking_update import TrackingUpdate
from ..models.ordine import Ordine
from ..models.fornitura import Fornitura

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/refresh/{tracking_number}")
def refresh_tracking(
    tracking_number: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Forza aggiornamento tracking per un numero specifico."""
    background_tasks.add_task(_update_single_tracking_task, tracking_number)
    return {"message": "Aggiornamento tracking avviato"}


@router.post("/refresh-all")
def refresh_all_tracking(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Aggiorna tutti i tracking attivi (non consegnati) di Poste Italiane."""
    background_tasks.add_task(_update_all_active_tracking_task)
    return {"message": "Aggiornamento tracking in background avviato"}


@router.get("/history/{tracking_number}")
def get_tracking_history(
    tracking_number: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Recupera lo storico aggiornamenti per un numero di tracking."""
    updates = (
        db.query(TrackingUpdate)
        .filter(TrackingUpdate.tracking_number == tracking_number)
        .order_by(TrackingUpdate.created_at.desc())
        .all()
    )

    return {
        "tracking_number": tracking_number,
        "updates": [
            {
                "id": u.id,
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Recupera l'ultimo aggiornamento per un numero di tracking."""
    update = (
        db.query(TrackingUpdate)
        .filter(TrackingUpdate.tracking_number == tracking_number)
        .order_by(TrackingUpdate.created_at.desc())
        .first()
    )
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


def _update_single_tracking_task(tracking_number: str) -> None:
    """Background task wrapper: creates its own DB session for safety."""
    db = SessionLocal()
    try:
        _update_single_tracking(tracking_number, db)
    finally:
        db.close()


def _update_all_active_tracking_task() -> None:
    """Background task wrapper: creates its own DB session for safety."""
    db = SessionLocal()
    try:
        _update_all_active_tracking(db)
    finally:
        db.close()


def _update_single_tracking(tracking_number: str, db: Session) -> None:
    """Update tracking for a single shipment number."""
    try:
        service = PosteTrackingService()
        tracking_info = service.get_tracking_info(tracking_number)

        if not tracking_info:
            logger.warning("Nessuna info tracking per %s", tracking_number)
            return

        # Cerca ordine collegato
        ordine = (
            db.query(Ordine)
            .filter(
                Ordine.tracking_number == tracking_number,
                Ordine.corriere == "Poste Italiane",
            )
            .first()
        )

        # Cerca fornitura collegata
        fornitura = (
            db.query(Fornitura)
            .filter(
                Fornitura.tracking_number == tracking_number,
                Fornitura.corriere == "Poste Italiane",
            )
            .first()
        )

        update = TrackingUpdate(
            ordine_id=ordine.id if ordine else None,
            fornitura_id=fornitura.id if fornitura else None,
            tracking_number=tracking_number,
            corriere="Poste Italiane",
            status=tracking_info.get("status"),
            status_date=tracking_info.get("status_date"),
            location=tracking_info.get("location"),
            events=json.dumps(tracking_info.get("events", [])),
            delivered=tracking_info.get("delivered", False),
            delivery_date=tracking_info.get("delivery_date"),
        )
        db.add(update)
        db.commit()
        logger.info("Tracking aggiornato per %s", tracking_number)
    except Exception as e:
        logger.error("Errore aggiornamento tracking %s: %s", tracking_number, e)
        db.rollback()


def _update_all_active_tracking(db: Session) -> None:
    """Update all active Poste Italiane tracking numbers."""
    try:
        ordini_attivi = (
            db.query(Ordine)
            .filter(
                Ordine.corriere == "Poste Italiane",
                Ordine.tracking_number.isnot(None),
                Ordine.stato != "completato",
                Ordine.stato != "annullato",
            )
            .all()
        )

        forniture_attive = (
            db.query(Fornitura)
            .filter(
                Fornitura.corriere == "Poste Italiane",
                Fornitura.tracking_number.isnot(None),
                Fornitura.stato != "ricevuto",
                Fornitura.stato != "annullato",
            )
            .all()
        )

        tracking_numbers = list(
            set(
                [o.tracking_number for o in ordini_attivi if o.tracking_number]
                + [f.tracking_number for f in forniture_attive if f.tracking_number]
            )
        )

        if not tracking_numbers:
            logger.info("Nessun tracking attivo da aggiornare")
            return

        logger.info("Aggiornamento di %d tracking attivi", len(tracking_numbers))
        for tracking_number in tracking_numbers:
            _update_single_tracking(tracking_number, db)

    except Exception as e:
        logger.error("Errore aggiornamento batch tracking: %s", e)

