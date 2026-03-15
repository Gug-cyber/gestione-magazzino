from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas.fornitura import FornituraCreate, FornituraUpdate, FornituraResponse
from ..crud import fornitura as crud
from ..auth import get_current_active_user
from ..models.fornitura import Fornitura

router = APIRouter()


def _fornitura_to_response(f) -> FornituraResponse:
    f_dict = {
        "id": f.id,
        "numero_fornitura": f.numero_fornitura,
        "fornitore_id": f.fornitore_id,
        "fornitore_nome": f.fornitore_nome,
        "stato": f.stato,
        "note": f.note,
        "totale": f.totale,
        "data_fornitura": f.data_fornitura,
        "data_ricezione": f.data_ricezione,
        "created_at": f.created_at,
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
            for r in f.righe
        ],
    }
    return FornituraResponse.model_validate(f_dict)


@router.get("/", response_model=List[FornituraResponse])
def get_forniture(
    skip: int = 0,
    limit: int = 100,
    stato: Optional[str] = Query(default=None),
    fornitore_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    forniture = crud.get_forniture(db, skip=skip, limit=limit, stato=stato, fornitore_id=fornitore_id, search=search)
    total = crud.count_forniture(db, stato=stato, fornitore_id=fornitore_id, search=search)
    if response is not None:
        response.headers["X-Total-Count"] = str(total)
    return [_fornitura_to_response(f) for f in forniture]


@router.post("/", response_model=FornituraResponse, status_code=201)
def create_fornitura(
    fornitura: FornituraCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return _fornitura_to_response(crud.create_fornitura(db, fornitura))


@router.get("/{fornitura_id}", response_model=FornituraResponse)
def get_fornitura(
    fornitura_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    f = crud.get_fornitura(db, fornitura_id)
    if not f:
        raise HTTPException(status_code=404, detail="Fornitura non trovata")
    return _fornitura_to_response(f)


@router.put("/{fornitura_id}", response_model=FornituraResponse)
def update_fornitura(
    fornitura_id: int,
    fornitura_update: FornituraUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    f = crud.update_fornitura(db, fornitura_id, fornitura_update)
    if not f:
        raise HTTPException(status_code=404, detail="Fornitura non trovata")
    return _fornitura_to_response(f)


@router.delete("/all", status_code=200)
def delete_all_forniture(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    """
    Elimina tutte le forniture dal database.
    Operazione riservata agli utenti autenticati.
    ATTENZIONE: Operazione irreversibile!
    """
    try:
        count = db.query(Fornitura).delete()
        db.commit()
        return {
            "message": "Tutte le forniture sono state eliminate con successo",
            "deleted_count": count,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante l'eliminazione delle forniture: {str(e)}",
        )


@router.delete("/{fornitura_id}", status_code=204)
def delete_fornitura(
    fornitura_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not crud.delete_fornitura(db, fornitura_id):
        raise HTTPException(status_code=404, detail="Fornitura non trovata")
