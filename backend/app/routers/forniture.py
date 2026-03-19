from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas.fornitura import FornituraCreate, FornituraUpdate, FornituraResponse
from ..crud import fornitura as crud
from ..auth import get_current_active_user
from ..crud.activity_log import log_activity

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
        "corriere": f.corriere,
        "tracking_number": f.tracking_number,
        "created_at": f.created_at,
        "righe": [
            {
                "id": r.id,
                "prodotto_id": r.prodotto_id,
                "tipo_voce": getattr(r, "tipo_voce", None) or "prodotto",
                "descrizione": getattr(r, "descrizione", None),
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
    nuova = crud.create_fornitura(db, fornitura)
    try:
        log_activity(db, azione="crea_fornitura", utente_id=current_user.id, username=current_user.username, entita="fornitura", entita_id=nuova.id, dettagli=nuova.numero_fornitura)
    except Exception:
        pass
    return _fornitura_to_response(nuova)


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


@router.delete("/{fornitura_id}", status_code=204)
def delete_fornitura(
    fornitura_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    f = crud.get_fornitura(db, fornitura_id)
    numero = f.numero_fornitura if f else None
    if not crud.delete_fornitura(db, fornitura_id):
        raise HTTPException(status_code=404, detail="Fornitura non trovata")
    try:
        log_activity(db, azione="elimina_fornitura", utente_id=current_user.id, username=current_user.username, entita="fornitura", entita_id=fornitura_id, dettagli=numero)
    except Exception:
        pass
