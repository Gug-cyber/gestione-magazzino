from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaResponse
from ..crud import categoria as crud

router = APIRouter()


@router.get("/", response_model=List[CategoriaResponse])
def get_categorie(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_categorie(db, skip=skip, limit=limit)


@router.get("/{categoria_id}", response_model=CategoriaResponse)
def get_categoria(categoria_id: int, db: Session = Depends(get_db)):
    db_categoria = crud.get_categoria(db, categoria_id)
    if not db_categoria:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    return db_categoria


@router.post("/", response_model=CategoriaResponse, status_code=201)
def create_categoria(categoria: CategoriaCreate, db: Session = Depends(get_db)):
    return crud.create_categoria(db, categoria)


@router.put("/{categoria_id}", response_model=CategoriaResponse)
def update_categoria(categoria_id: int, categoria: CategoriaUpdate, db: Session = Depends(get_db)):
    db_categoria = crud.update_categoria(db, categoria_id, categoria)
    if not db_categoria:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    return db_categoria


@router.delete("/{categoria_id}", status_code=204)
def delete_categoria(categoria_id: int, db: Session = Depends(get_db)):
    if not crud.delete_categoria(db, categoria_id):
        raise HTTPException(status_code=404, detail="Categoria non trovata")
