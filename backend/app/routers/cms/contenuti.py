from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ...database import get_db
from ...auth import get_current_active_user
from ...schemas.contenuto import ContenutoCreate, ContenutoUpdate, ContenutoResponse
from ...crud import contenuto as crud

router = APIRouter()


@router.get("/contenuti", response_model=List[ContenutoResponse])
def get_contenuti_pubblici(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Lista contenuti pubblicati (pubblico).
    """
    return crud.get_contenuti(db, skip=skip, limit=limit, pubblicato=True)


@router.get("/contenuti/{slug}", response_model=ContenutoResponse)
def get_contenuto_by_slug(slug: str, db: Session = Depends(get_db)):
    """
    Ottieni contenuto pubblicato per slug (pubblico).
    """
    contenuto = crud.get_contenuto_by_slug(db, slug)
    if not contenuto or not contenuto.pubblicato:
        raise HTTPException(status_code=404, detail="Contenuto non trovato")
    return contenuto


# --- ADMIN ENDPOINTS ---

@router.get("/admin/contenuti", response_model=List[ContenutoResponse])
def get_all_contenuti(
    skip: int = 0,
    limit: int = 100,
    pubblicato: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Lista tutti i contenuti (admin).
    """
    return crud.get_contenuti(db, skip=skip, limit=limit, pubblicato=pubblicato)


@router.post("/admin/contenuti", response_model=ContenutoResponse, status_code=201)
def create_contenuto(
    contenuto: ContenutoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Crea nuovo contenuto (admin).
    """
    # Verifica slug univoco
    existing = crud.get_contenuto_by_slug(db, contenuto.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Slug già esistente")

    return crud.create_contenuto(db, contenuto, current_user.id)


@router.put("/admin/contenuti/{contenuto_id}", response_model=ContenutoResponse)
def update_contenuto(
    contenuto_id: int,
    contenuto: ContenutoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Aggiorna contenuto (admin).
    """
    db_contenuto = crud.update_contenuto(db, contenuto_id, contenuto)
    if not db_contenuto:
        raise HTTPException(status_code=404, detail="Contenuto non trovato")
    return db_contenuto


@router.delete("/admin/contenuti/{contenuto_id}", status_code=204)
def delete_contenuto(
    contenuto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Elimina contenuto (admin).
    """
    if not crud.delete_contenuto(db, contenuto_id):
        raise HTTPException(status_code=404, detail="Contenuto non trovato")
