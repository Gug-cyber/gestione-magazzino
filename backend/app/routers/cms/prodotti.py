from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ...database import get_db
from ...auth import get_current_active_user
from ...schemas.prodotto import ProdottoResponse
from ...schemas.prodotto_pubblico import (
    ProdottoPubblicoCreate,
    ProdottoPubblicoUpdate,
    ProdottoPubblicoResponse
)
from ...crud import prodotto_pubblico as crud
from ...crud import prodotto as crud_prodotto

router = APIRouter()


@router.get("/prodotti", response_model=List[ProdottoResponse])
def get_prodotti_pubblici(
    categoria_id: Optional[int] = None,
    in_evidenza: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Lista prodotti visibili nel catalogo pubblico con stock disponibile.
    """
    return crud.get_prodotti_pubblici(
        db,
        categoria_id=categoria_id,
        in_evidenza=in_evidenza,
        search=search,
        skip=skip,
        limit=limit
    )


@router.get("/prodotti/{prodotto_id}", response_model=ProdottoResponse)
def get_prodotto_dettaglio(prodotto_id: int, db: Session = Depends(get_db)):
    """
    Dettaglio prodotto singolo con tutte le informazioni.
    """
    prodotto = crud_prodotto.get_prodotto(db, prodotto_id)
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    # Verifica che sia visibile
    config_pubblica = crud.get_prodotto_pubblico(db, prodotto_id)
    if not config_pubblica or not config_pubblica.visibile:
        raise HTTPException(status_code=404, detail="Prodotto non disponibile")

    return prodotto


# --- ADMIN ENDPOINTS ---

@router.post("/admin/prodotti-pubblici", response_model=ProdottoPubblicoResponse, status_code=201)
def create_prodotto_pubblico(
    prodotto_pubblico: ProdottoPubblicoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Crea configurazione prodotto pubblico (admin).
    """
    # Verifica che il prodotto esista
    prodotto = crud_prodotto.get_prodotto(db, prodotto_pubblico.prodotto_id)
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    # Verifica che non esista già
    existing = crud.get_prodotto_pubblico(db, prodotto_pubblico.prodotto_id)
    if existing:
        raise HTTPException(status_code=400, detail="Configurazione già esistente per questo prodotto")

    return crud.create_prodotto_pubblico(db, prodotto_pubblico)


@router.put("/admin/prodotti-pubblici/{prodotto_id}", response_model=ProdottoPubblicoResponse)
def update_prodotto_pubblico(
    prodotto_id: int,
    prodotto_pubblico: ProdottoPubblicoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Aggiorna configurazione prodotto pubblico (admin).
    """
    db_prodotto_pubblico = crud.update_prodotto_pubblico(db, prodotto_id, prodotto_pubblico)
    if not db_prodotto_pubblico:
        raise HTTPException(status_code=404, detail="Configurazione prodotto non trovata")
    return db_prodotto_pubblico


@router.delete("/admin/prodotti-pubblici/{prodotto_id}", status_code=204)
def delete_prodotto_pubblico(
    prodotto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Elimina configurazione prodotto pubblico (admin).
    """
    if not crud.delete_prodotto_pubblico(db, prodotto_id):
        raise HTTPException(status_code=404, detail="Configurazione prodotto non trovata")
