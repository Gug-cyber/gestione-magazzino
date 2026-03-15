from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_admin, VALID_ROLES
from ..models.dati_azienda import DatiAzienda
from ..models.utente import Utente
from ..schemas.dati_azienda import DatiAziendaCreate, DatiAziendaUpdate, DatiAziendaResponse
from ..schemas.utente import UtenteResponse

router = APIRouter()


class UpdateRoleRequest(BaseModel):
    ruolo: str


# ---------------------------------------------------------------------------
# Dati Azienda
# ---------------------------------------------------------------------------

@router.get("/dati-azienda", response_model=DatiAziendaResponse)
def get_dati_azienda(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Return the (single) company data record, or 404 if none exists yet."""
    record = db.query(DatiAzienda).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dati azienda non ancora configurati")
    return record


@router.post("/dati-azienda", response_model=DatiAziendaResponse, status_code=201)
def create_dati_azienda(
    dati: DatiAziendaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Create the company data record (only allowed if none exists yet)."""
    existing = db.query(DatiAzienda).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="I dati azienda esistono già. Usa PUT per aggiornare.",
        )
    record = DatiAzienda(**dati.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/dati-azienda", response_model=DatiAziendaResponse)
def update_dati_azienda(
    dati: DatiAziendaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Update the existing company data record."""
    record = db.query(DatiAzienda).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dati azienda non ancora configurati")
    update_data = dati.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Gestione Utenti
# ---------------------------------------------------------------------------

@router.get("/utenti", response_model=List[UtenteResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Return a list of all users with their roles."""
    return db.query(Utente).order_by(Utente.id).all()


@router.put("/utenti/{user_id}/ruolo", response_model=UtenteResponse)
def update_user_role(
    user_id: int,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Update the role of a user. Cannot modify own role."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Non puoi modificare il tuo stesso ruolo")
    if payload.ruolo not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Ruolo non valido. Valori consentiti: {', '.join(VALID_ROLES)}",
        )
    utente = db.query(Utente).filter(Utente.id == user_id).first()
    if not utente:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    utente.ruolo = payload.ruolo
    # Keep is_admin in sync with ruolo
    utente.is_admin = payload.ruolo == "admin"
    db.commit()
    db.refresh(utente)
    return utente


@router.delete("/utenti/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Delete a user. Cannot delete self."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare il tuo stesso account")
    utente = db.query(Utente).filter(Utente.id == user_id).first()
    if not utente:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    db.delete(utente)
    db.commit()
