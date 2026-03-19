from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from ..database import get_db
from ..schemas.fornitura import FornituraCreate, FornituraUpdate, FornituraResponse, FornituraMobileConferma
from ..crud import fornitura as crud
from ..auth import get_current_active_user

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
    return _fornitura_to_response(crud.create_fornitura(db, fornitura))


@router.post("/mobile/conferma", response_model=FornituraResponse, status_code=201)
def conferma_fornitura_mobile(
    payload: FornituraMobileConferma,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Crea una fornitura direttamente in stato 'ricevuto', carica lo stock
    e registra i movimenti di carico in un'unica transazione atomica.
    """
    from ..crud.fornitura import _genera_numero_fornitura
    from ..models.fornitura import Fornitura, RigaFornitura, StatoFornitura
    from ..models.prodotto import Prodotto
    from ..models.movimento import Movimento, TipoMovimento
    from sqlalchemy.exc import IntegrityError

    if not payload.righe:
        raise HTTPException(status_code=400, detail="La fornitura deve avere almeno una riga prodotto")

    # Resolve fornitore_nome
    fornitore_nome = payload.fornitore_nome
    if payload.fornitore_id and not fornitore_nome:
        from ..models.fornitore import Fornitore
        f = db.query(Fornitore).filter(Fornitore.id == payload.fornitore_id).first()
        if f:
            fornitore_nome = f.nome

    # Validate products and build line items
    righe_data = []
    totale = 0.0
    for r in payload.righe:
        prodotto = db.query(Prodotto).filter(Prodotto.id == r.prodotto_id).first()
        if not prodotto:
            raise HTTPException(status_code=404, detail=f"Prodotto con id {r.prodotto_id} non trovato")
        subtotale = r.quantita * r.prezzo_unitario
        totale += subtotale
        righe_data.append({
            "prodotto": prodotto,
            "prodotto_id": r.prodotto_id,
            "quantita": r.quantita,
            "prezzo_unitario": r.prezzo_unitario,
            "subtotale": subtotale,
        })

    # Retry loop to handle rare numero_fornitura collisions
    for tentativo in range(5):
        numero_fornitura = _genera_numero_fornitura(db)
        righe = [
            RigaFornitura(
                prodotto_id=rd["prodotto_id"],
                tipo_voce="prodotto",
                quantita=rd["quantita"],
                prezzo_unitario=rd["prezzo_unitario"],
                subtotale=rd["subtotale"],
            )
            for rd in righe_data
        ]
        now = datetime.now(timezone.utc)
        fornitura = Fornitura(
            numero_fornitura=numero_fornitura,
            fornitore_id=payload.fornitore_id,
            fornitore_nome=fornitore_nome,
            note=payload.note,
            stato=StatoFornitura.ricevuto,
            stock_caricato=True,
            data_ricezione=now,
            totale=totale,
            righe=righe,
        )
        db.add(fornitura)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            if tentativo == 4:
                raise HTTPException(status_code=500, detail="Impossibile generare numero fornitura univoco dopo 5 tentativi")
            continue

        # Load stock and create movements inside the same transaction
        for rd in righe_data:
            prodotto = rd["prodotto"]
            prodotto.quantita += rd["quantita"]
            movimento = Movimento(
                prodotto_id=rd["prodotto_id"],
                tipo=TipoMovimento.carico,
                quantita=rd["quantita"],
                note=f"Carico automatico fornitura {numero_fornitura}",
                fornitore_id=payload.fornitore_id,
            )
            db.add(movimento)

        db.commit()
        db.refresh(fornitura)
        # Reload lines with product relationship for response
        from sqlalchemy.orm import joinedload
        fornitura = (
            db.query(Fornitura)
            .options(joinedload(Fornitura.righe).joinedload(RigaFornitura.prodotto))
            .filter(Fornitura.id == fornitura.id)
            .first()
        )
        return _fornitura_to_response(fornitura)


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
    if not crud.delete_fornitura(db, fornitura_id):
        raise HTTPException(status_code=404, detail="Fornitura non trovata")
