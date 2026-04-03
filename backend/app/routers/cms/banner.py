from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ...auth import get_current_active_user
from ...schemas.banner import BannerCreate, BannerUpdate, BannerResponse
from ...crud import banner as crud

router = APIRouter()


@router.get("/banner/attivi", response_model=List[BannerResponse])
def get_banner_attivi(db: Session = Depends(get_db)):
    """
    Lista banner attivi per homepage (pubblico).
    """
    return crud.get_banner_attivi(db)


# --- ADMIN ENDPOINTS ---

@router.get("/admin/banner", response_model=List[BannerResponse])
def get_all_banner(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Lista tutti i banner (admin).
    """
    return crud.get_banner(db, skip=skip, limit=limit)


@router.post("/admin/banner", response_model=BannerResponse, status_code=201)
def create_banner(
    banner: BannerCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Crea nuovo banner (admin).
    """
    return crud.create_banner(db, banner)


@router.put("/admin/banner/{banner_id}", response_model=BannerResponse)
def update_banner(
    banner_id: int,
    banner: BannerUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Aggiorna banner (admin).
    """
    db_banner = crud.update_banner(db, banner_id, banner)
    if not db_banner:
        raise HTTPException(status_code=404, detail="Banner non trovato")
    return db_banner


@router.delete("/admin/banner/{banner_id}", status_code=204)
def delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Elimina banner (admin).
    """
    if not crud.delete_banner(db, banner_id):
        raise HTTPException(status_code=404, detail="Banner non trovato")
