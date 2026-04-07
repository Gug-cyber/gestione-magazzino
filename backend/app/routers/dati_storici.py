import csv
import io
from datetime import date
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..auth import get_current_active_user
from ..crud.dato_storico import (
    get_dati_storici,
    create_dati_storici_bulk,
    delete_dati_storici_by_tipo,
)
from ..schemas.dato_storico import DatoStoricoCreate, DatoStoricoResponse

router = APIRouter()

ALLOWED_TIPI = {"costo", "ricavo"}

DATE_FORMATS = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
]


def _parse_date(value: str) -> Optional[date]:
    from datetime import datetime
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_csv(content: bytes, tipo: str):
    """Parse CSV bytes and return (records, errors)."""
    text = content.decode("utf-8-sig", errors="replace")
    # Detect separator
    first_line = text.split("\n")[0] if text else ""
    sep = ";" if first_line.count(";") >= first_line.count(",") else ","

    reader = csv.DictReader(io.StringIO(text), delimiter=sep)
    records: List[DatoStoricoCreate] = []
    errors: List[str] = []

    for i, row in enumerate(reader, start=2):  # start=2 because row 1 is the header
        # Normalize keys: strip whitespace
        row = {k.strip(): v.strip() for k, v in row.items() if k}

        # data
        raw_data = row.get("data", "")
        parsed_date = _parse_date(raw_data)
        if parsed_date is None:
            errors.append(f"Riga {i}: data non valida '{raw_data}'")
            continue

        # importo
        raw_importo = row.get("importo", "").replace(",", ".")
        try:
            importo = float(raw_importo)
        except ValueError:
            errors.append(f"Riga {i}: importo non valido '{raw_importo}'")
            continue

        descrizione = row.get("descrizione") or None
        categoria = row.get("categoria") or None

        records.append(
            DatoStoricoCreate(
                tipo=tipo,
                data=parsed_date,
                importo=importo,
                descrizione=descrizione,
                categoria=categoria,
            )
        )

    return records, errors


@router.post("/import/costi")
def import_costi(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    content = file.file.read()
    records, errors = _parse_csv(content, "costo")
    if records:
        create_dati_storici_bulk(db, records)
    return {"importati": len(records), "errori": errors}


@router.post("/import/ricavi")
def import_ricavi(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    content = file.file.read()
    records, errors = _parse_csv(content, "ricavo")
    if records:
        create_dati_storici_bulk(db, records)
    return {"importati": len(records), "errori": errors}


@router.get("/", response_model=List[DatoStoricoResponse])
def list_dati_storici(
    tipo: Optional[str] = Query(default=None),
    anno: Optional[int] = Query(default=None),
    skip: int = Query(default=0),
    limit: int = Query(default=10000),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return get_dati_storici(db, tipo=tipo, anno=anno, skip=skip, limit=limit)


@router.delete("/tipo/{tipo}")
def delete_tipo(
    tipo: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if tipo not in ALLOWED_TIPI:
        raise HTTPException(status_code=400, detail=f"Tipo non valido: {tipo}. Usare 'costo' o 'ricavo'.")
    deleted = delete_dati_storici_by_tipo(db, tipo)
    return {"eliminati": deleted}
