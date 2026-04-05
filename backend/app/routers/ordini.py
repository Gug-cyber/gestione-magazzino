from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas.ordine import OrdineCreate, OrdineUpdate, OrdineResponse, OrdineStatoUpdate, TrackingUpdateBody, OrdineUpdateFull
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
    ordine_update: OrdineUpdateFull,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Aggiorna un ordine.
    - Se `stato` è fornito, esegue la transizione di stato (gestisce stock, fatture, ecc.).
    - Altrimenti aggiorna i dati completi dell'ordine (permesso solo in stato 'bozza').
    """
    if ordine_update.stato is not None:
        state_update = OrdineUpdate(stato=ordine_update.stato)
        updated = crud.update_ordine(db, ordine_id, state_update)
        azione = "aggiorna_stato_ordine"
    else:
        updated = crud.update_ordine_full(db, ordine_id, ordine_update)
        azione = "modifica_ordine"
    if not updated:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    try:
        log_activity(
            db,
            azione=azione,
            utente_id=current_user.id,
            username=current_user.username,
            entita="ordine",
            entita_id=ordine_id,
            dettagli=updated.numero_ordine,
        )
    except Exception:
        pass
    return _ordine_to_response(updated)


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
    tracking_data: TrackingUpdateBody,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Aggiorna solo corriere e numero tracking di un ordine."""
    o = crud.get_ordine(db, ordine_id)
    if not o:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    if tracking_data.corriere is not None:
        o.corriere = tracking_data.corriere
    if tracking_data.tracking_number is not None:
        o.tracking_number = tracking_data.tracking_number
    db.commit()
    db.refresh(o)
    try:
        log_activity(db, azione="aggiorna_tracking_ordine", utente_id=current_user.id, username=current_user.username, entita="ordine", entita_id=ordine_id, dettagli=o.numero_ordine)
    except Exception:
        pass
    return _ordine_to_response(o)


@router.patch("/{ordine_id}/stato", response_model=OrdineResponse)
def update_stato(
    ordine_id: int,
    stato_update: OrdineStatoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Aggiorna lo stato di un ordine gestendo correttamente lo stock di magazzino."""
    o = crud.get_ordine(db, ordine_id)
    if not o:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    ordine_update = OrdineUpdate(stato=stato_update.stato)
    o = crud.update_ordine(db, ordine_id, ordine_update)
    if not o:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    try:
        log_activity(
            db,
            azione="aggiorna_stato_ordine",
            utente_id=current_user.id,
            username=current_user.username,
            entita="ordine",
            entita_id=ordine_id,
            dettagli=f"{o.numero_ordine} → {o.stato}",
        )
    except Exception:
        pass
    return _ordine_to_response(o)
