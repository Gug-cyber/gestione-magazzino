import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from ..database import get_db
from ..schemas.fattura import FatturaCreate, FatturaUpdate, FatturaResponse, TipoFatturaSchema
from ..crud import fattura as crud
from ..auth import get_current_active_user

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getenv("UPLOAD_DIR", "/app/uploads"), "fatture")


@router.get("/", response_model=List[FatturaResponse])
def get_fatture(
    skip: int = 0,
    limit: int = 100,
    cliente: Optional[str] = None,
    data_da: Optional[date] = None,
    data_a: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return crud.get_fatture(db, skip=skip, limit=limit, cliente=cliente, data_da=data_da, data_a=data_a)


@router.post("/", response_model=FatturaResponse, status_code=201)
async def create_fattura(
    numero_fattura: str = Form(...),
    data_fattura: date = Form(...),
    cliente: str = Form(...),
    importo: float = Form(...),
    tipo: TipoFatturaSchema = Form(...),
    pagata: bool = Form(False),
    note: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    file_path = None
    nome_file = None

    if file and file.filename:
        if file.content_type and file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Il file deve essere un PDF")
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "pdf"
        unique_name = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        nome_file = file.filename

    fattura_data = FatturaCreate(
        numero_fattura=numero_fattura,
        data_fattura=data_fattura,
        cliente=cliente,
        importo=importo,
        tipo=tipo,
        pagata=pagata,
        note=note,
    )
    return crud.create_fattura(db, fattura_data, file_path=file_path, nome_file=nome_file)


@router.get("/{fattura_id}", response_model=FatturaResponse)
def get_fattura(
    fattura_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_fattura = crud.get_fattura(db, fattura_id)
    if not db_fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    return db_fattura


@router.put("/{fattura_id}", response_model=FatturaResponse)
def update_fattura(
    fattura_id: int,
    fattura_update: FatturaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_fattura = crud.update_fattura(db, fattura_id, fattura_update)
    if not db_fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    return db_fattura


@router.patch("/{fattura_id}/pagata", response_model=FatturaResponse)
def toggle_pagata(
    fattura_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_fattura = crud.toggle_pagata(db, fattura_id)
    if not db_fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    return db_fattura


@router.delete("/{fattura_id}", status_code=204)
def delete_fattura(
    fattura_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    fattura = crud.get_fattura(db, fattura_id)
    if not fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    crud.delete_fattura(db, fattura_id)


@router.get("/{fattura_id}/download")
def download_fattura(
    fattura_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_fattura = crud.get_fattura(db, fattura_id)
    if not db_fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    if not db_fattura.file_path or not os.path.exists(db_fattura.file_path):
        raise HTTPException(status_code=404, detail="File PDF non trovato")
    return FileResponse(
        path=db_fattura.file_path,
        media_type="application/pdf",
        filename=db_fattura.nome_file or "fattura.pdf",
    )
