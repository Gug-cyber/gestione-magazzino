from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas.ordine import OrdineCreate, OrdineUpdate, OrdineResponse
from ..crud import ordine as crud
from ..auth import get_current_active_user
from ..crud.activity_log import log_activity

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
        "corriere": o.corriere,
        "tracking_number": o.tracking_number,
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
    response: Response = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    ordini = crud.get_ordini(db, skip=skip, limit=limit, stato=stato, cliente_id=cliente_id, search=search)
    total = crud.count_ordini(db, stato=stato, cliente_id=cliente_id, search=search)
    if response is not None:
        response.headers["X-Total-Count"] = str(total)
    return [_ordine_to_response(o) for o in ordini]


@router.post("/", response_model=OrdineResponse, status_code=201)
def create_ordine(
    ordine: OrdineCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    nuovo = crud.create_ordine(db, ordine)
    try:
        log_activity(db, azione="crea_ordine", utente_id=current_user.id, username=current_user.username, entita="ordine", entita_id=nuovo.id, dettagli=nuovo.numero_ordine)
    except Exception:
        pass
    return _ordine_to_response(nuovo)


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
    try:
        log_activity(db, azione="aggiorna_stato_ordine", utente_id=current_user.id, username=current_user.username, entita="ordine", entita_id=ordine_id, dettagli=o.numero_ordine)
    except Exception:
        pass
    return _ordine_to_response(o)


@router.delete("/{ordine_id}", status_code=204)
def delete_ordine(
    ordine_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    o = crud.get_ordine(db, ordine_id)
    numero = o.numero_ordine if o else None
    if not crud.delete_ordine(db, ordine_id):
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    try:
        log_activity(db, azione="elimina_ordine", utente_id=current_user.id, username=current_user.username, entita="ordine", entita_id=ordine_id, dettagli=numero)
    except Exception:
        pass


@router.patch("/{ordine_id}/tracking", response_model=OrdineResponse)
def update_tracking(
    ordine_id: int,
    corriere: Optional[str] = None,
    tracking_number: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Aggiorna solo corriere e numero tracking di un ordine."""
    o = crud.get_ordine(db, ordine_id)
    if not o:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    if corriere is not None:
        o.corriere = corriere
    if tracking_number is not None:
        o.tracking_number = tracking_number
    db.commit()
    db.refresh(o)
    return _ordine_to_response(o)
