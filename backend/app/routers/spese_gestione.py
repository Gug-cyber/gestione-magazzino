from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.spesa_gestione import SpesaGestioneCreate, SpesaGestioneUpdate, SpesaGestioneResponse
from ..crud import spesa_gestione as crud
from ..auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[SpesaGestioneResponse])
def get_spese(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    return crud.get_spese(db, skip=skip, limit=limit)


@router.get("/{spesa_id}", response_model=SpesaGestioneResponse)
def get_spesa(spesa_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_spesa = crud.get_spesa(db, spesa_id)
    if not db_spesa:
        raise HTTPException(status_code=404, detail="Spesa non trovata")
    return db_spesa


@router.post("/", response_model=SpesaGestioneResponse, status_code=201)
def create_spesa(spesa: SpesaGestioneCreate, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    return crud.create_spesa(db, spesa)


@router.put("/{spesa_id}", response_model=SpesaGestioneResponse)
def update_spesa(spesa_id: int, spesa: SpesaGestioneUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_spesa = crud.update_spesa(db, spesa_id, spesa)
    if not db_spesa:
        raise HTTPException(status_code=404, detail="Spesa non trovata")
    return db_spesa


@router.delete("/{spesa_id}", status_code=204)
def delete_spesa(spesa_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if not crud.delete_spesa(db, spesa_id):
        raise HTTPException(status_code=404, detail="Spesa non trovata")
