from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.ubicazione import UbicazioneCreate, UbicazioneUpdate, UbicazioneResponse
from ..crud import ubicazione as crud

router = APIRouter()


@router.get("/", response_model=List[UbicazioneResponse])
def get_ubicazioni(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_ubicazioni(db, skip=skip, limit=limit)


@router.get("/{ubicazione_id}", response_model=UbicazioneResponse)
def get_ubicazione(ubicazione_id: int, db: Session = Depends(get_db)):
    db_ubicazione = crud.get_ubicazione(db, ubicazione_id)
    if not db_ubicazione:
        raise HTTPException(status_code=404, detail="Ubicazione non trovata")
    return db_ubicazione


@router.post("/", response_model=UbicazioneResponse, status_code=201)
def create_ubicazione(ubicazione: UbicazioneCreate, db: Session = Depends(get_db)):
    return crud.create_ubicazione(db, ubicazione)


@router.put("/{ubicazione_id}", response_model=UbicazioneResponse)
def update_ubicazione(ubicazione_id: int, ubicazione: UbicazioneUpdate, db: Session = Depends(get_db)):
    db_ubicazione = crud.update_ubicazione(db, ubicazione_id, ubicazione)
    if not db_ubicazione:
        raise HTTPException(status_code=404, detail="Ubicazione non trovata")
    return db_ubicazione


@router.delete("/{ubicazione_id}", status_code=204)
def delete_ubicazione(ubicazione_id: int, db: Session = Depends(get_db)):
    if not crud.delete_ubicazione(db, ubicazione_id):
        raise HTTPException(status_code=404, detail="Ubicazione non trovata")
