from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas.ordine import OrdineCreate, OrdineUpdate, OrdineResponse
from ..crud import ordine as crud
from ..auth import get_current_active_user

router = APIRouter()


def _ordine_to_response(o) -> OrdineResponse:
    o_dict = {
        "id": o.id,
        "numero_ordine": o.numero_ordine,
        "cliente_id": o.cliente_id,
        "cliente_nome": o.cliente_nome,
        "stato": o.stato,
        "note": o.note,
        "totale": o.totale,
        "data_ordine": o.data_ordine,
        "data_completamento": o.data_completamento,
        "righe": [
            {
                "id": r.id,
                "prodotto_id": r.prodotto_id,
                "quantita": r.quantita,
                "prezzo_unitario": r.prezzo_unitario,
                "subtotale": r.subtotale,
                "prodotto_nome": r.prodotto.nome if r.prodotto else None,
                "prodotto_sku": r.prodotto.sku if r.prodotto else None,
            }
            for r in o.righe
        ],
    }
    return OrdineResponse.model_validate(o_dict)


@router.get("/", response_model=List[OrdineResponse])
def get_ordini(
    skip: int = 0,
    limit: int = 100,
    stato: Optional[str] = Query(default=None),
    cliente_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    ordini = crud.get_ordini(db, skip=skip, limit=limit, stato=stato, cliente_id=cliente_id, search=search)
    return [_ordine_to_response(o) for o in ordini]


@router.post("/", response_model=OrdineResponse, status_code=201)
def create_ordine(
    ordine: OrdineCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return _ordine_to_response(crud.create_ordine(db, ordine))


@router.get("/{ordine_id}", response_model=OrdineResponse)
def get_ordine(
    ordine_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    o = crud.get_ordine(db, ordine_id)
    if not o:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return _ordine_to_response(o)


@router.put("/{ordine_id}", response_model=OrdineResponse)
def update_ordine(
    ordine_id: int,
    ordine_update: OrdineUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    o = crud.update_ordine(db, ordine_id, ordine_update)
    if not o:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return _ordine_to_response(o)


@router.delete("/{ordine_id}", status_code=204)
def delete_ordine(
    ordine_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not crud.delete_ordine(db, ordine_id):
        raise HTTPException(status_code=404, detail="Ordine non trovato")
