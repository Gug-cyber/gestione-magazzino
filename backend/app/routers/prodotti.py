from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.prodotto import ProdottoCreate, ProdottoUpdate, ProdottoResponse
from ..crud import prodotto as crud
from ..auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[ProdottoResponse])
def get_prodotti(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    return crud.get_prodotti(db, skip=skip, limit=limit)


@router.get("/sotto-scorta", response_model=List[ProdottoResponse])
def get_prodotti_sotto_scorta(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    return crud.get_prodotti_sotto_scorta(db)


@router.get("/{prodotto_id}", response_model=ProdottoResponse)
def get_prodotto(prodotto_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return db_prodotto


@router.post("/", response_model=ProdottoResponse, status_code=201)
def create_prodotto(prodotto: ProdottoCreate, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if crud.get_prodotto_by_sku(db, prodotto.sku):
        raise HTTPException(status_code=400, detail="SKU già esistente")
    return crud.create_prodotto(db, prodotto)


@router.put("/{prodotto_id}", response_model=ProdottoResponse)
def update_prodotto(prodotto_id: int, prodotto: ProdottoUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if prodotto.sku is not None:
        existing = crud.get_prodotto_by_sku(db, prodotto.sku)
        if existing and existing.id != prodotto_id:
            raise HTTPException(status_code=400, detail="SKU già utilizzato da un altro prodotto")
    db_prodotto = crud.update_prodotto(db, prodotto_id, prodotto)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return db_prodotto


@router.delete("/{prodotto_id}", status_code=204)
def delete_prodotto(prodotto_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if not crud.delete_prodotto(db, prodotto_id):
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
