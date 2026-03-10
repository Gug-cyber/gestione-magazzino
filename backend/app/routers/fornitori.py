from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.fornitore import FornitoreCreate, FornitoreUpdate, FornitoreResponse
from ..crud import fornitore as crud
from ..auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[FornitoreResponse])
def get_fornitori(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    return crud.get_fornitori(db, skip=skip, limit=limit)


@router.get("/{fornitore_id}", response_model=FornitoreResponse)
def get_fornitore(fornitore_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_fornitore = crud.get_fornitore(db, fornitore_id)
    if not db_fornitore:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    return db_fornitore


@router.post("/", response_model=FornitoreResponse, status_code=201)
def create_fornitore(fornitore: FornitoreCreate, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    return crud.create_fornitore(db, fornitore)


@router.put("/{fornitore_id}", response_model=FornitoreResponse)
def update_fornitore(fornitore_id: int, fornitore: FornitoreUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_fornitore = crud.update_fornitore(db, fornitore_id, fornitore)
    if not db_fornitore:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    return db_fornitore


@router.delete("/{fornitore_id}", status_code=204)
def delete_fornitore(fornitore_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if not crud.delete_fornitore(db, fornitore_id):
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
