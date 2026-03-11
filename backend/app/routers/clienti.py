from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse, ClienteConStorico, FatturaStorico
from ..crud import cliente as crud
from ..auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[ClienteResponse])
def get_clienti(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    clienti = crud.get_clienti(db, skip=skip, limit=limit, search=search)
    result = []
    for c in clienti:
        stats = crud.get_statistiche_cliente(db, c.id)
        cliente_dict = {
            **c.__dict__,
            "num_fatture": stats["num_fatture"],
            "totale_speso": stats["totale_speso"],
            "ultima_fattura": stats["ultima_fattura"],
        }
        result.append(ClienteResponse.model_validate(cliente_dict))
    return result


@router.post("/", response_model=ClienteResponse, status_code=201)
def create_cliente(
    cliente: ClienteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_cliente = crud.create_cliente(db, cliente)
    return ClienteResponse.model_validate({**db_cliente.__dict__, "num_fatture": 0, "totale_speso": 0.0})


@router.get("/{cliente_id}", response_model=ClienteResponse)
def get_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_cliente = crud.get_cliente(db, cliente_id)
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    stats = crud.get_statistiche_cliente(db, cliente_id)
    return ClienteResponse.model_validate({**db_cliente.__dict__, **stats})


@router.put("/{cliente_id}", response_model=ClienteResponse)
def update_cliente(
    cliente_id: int,
    cliente_update: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_cliente = crud.update_cliente(db, cliente_id, cliente_update)
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    stats = crud.get_statistiche_cliente(db, cliente_id)
    return ClienteResponse.model_validate({**db_cliente.__dict__, **stats})


@router.delete("/{cliente_id}", status_code=204)
def delete_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not crud.get_cliente(db, cliente_id):
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    crud.delete_cliente(db, cliente_id)


@router.get("/{cliente_id}/storico", response_model=ClienteConStorico)
def get_storico(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    result = crud.get_cliente_storico(db, cliente_id)
    if not result:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    cliente, fatture = result
    stats = crud.get_statistiche_cliente(db, cliente_id)
    fatture_list = [
        FatturaStorico(
            id=f.id,
            numero_fattura=f.numero_fattura,
            data_fattura=str(f.data_fattura),
            importo=f.importo,
            tipo=f.tipo.value if hasattr(f.tipo, "value") else str(f.tipo),
            pagata=f.pagata,
            note=f.note,
            nome_file=f.nome_file,
        )
        for f in fatture
    ]
    return ClienteConStorico.model_validate({
        **cliente.__dict__,
        **stats,
        "fatture": [f.model_dump() for f in fatture_list],
    })


@router.get("/{cliente_id}/statistiche")
def get_statistiche(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not crud.get_cliente(db, cliente_id):
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return crud.get_statistiche_cliente(db, cliente_id)
