from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.movimento import MovimentoCreate, MovimentoUpdate, MovimentoResponse
from ..crud import movimento as crud

router = APIRouter()


@router.get("/", response_model=List[MovimentoResponse])
def get_movimenti(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_movimenti(db, skip=skip, limit=limit)


@router.get("/{movimento_id}", response_model=MovimentoResponse)
def get_movimento(movimento_id: int, db: Session = Depends(get_db)):
    db_movimento = crud.get_movimento(db, movimento_id)
    if not db_movimento:
        raise HTTPException(status_code=404, detail="Movimento non trovato")
    return db_movimento


@router.get("/prodotto/{prodotto_id}", response_model=List[MovimentoResponse])
def get_movimenti_by_prodotto(prodotto_id: int, db: Session = Depends(get_db)):
    return crud.get_movimenti_by_prodotto(db, prodotto_id)


@router.post("/", response_model=MovimentoResponse, status_code=201)
def create_movimento(movimento: MovimentoCreate, db: Session = Depends(get_db)):
    return crud.create_movimento(db, movimento)


@router.put("/{movimento_id}", response_model=MovimentoResponse)
def update_movimento(movimento_id: int, movimento: MovimentoUpdate, db: Session = Depends(get_db)):
    db_movimento = crud.update_movimento(db, movimento_id, movimento)
    if not db_movimento:
        raise HTTPException(status_code=404, detail="Movimento non trovato")
    return db_movimento


@router.delete("/{movimento_id}", status_code=204)
def delete_movimento(movimento_id: int, db: Session = Depends(get_db)):
    if not crud.delete_movimento(db, movimento_id):
        raise HTTPException(status_code=404, detail="Movimento non trovato")
