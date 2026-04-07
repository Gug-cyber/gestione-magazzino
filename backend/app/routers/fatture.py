import io
import logging
import os
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import FileResponse, StreamingResponse
from fpdf import FPDF
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from ..database import get_db
from ..schemas.fattura import FatturaCreate, FatturaUpdate, FatturaResponse, TipoFatturaSchema
from ..crud import fattura as crud
from ..auth import get_current_active_user
from ..dependencies import get_current_admin
from ..models.fattura import Fattura

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

router = APIRouter()
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.getenv("UPLOAD_DIR", "/app/uploads"), "fatture")


@router.get("/", response_model=List[FatturaResponse])
def get_fatture(
    skip: int = 0,
    limit: int = 100,
    cliente: Optional[str] = None,
    data_da: Optional[date] = None,
    data_a: Optional[date] = None,
    ordine_id: Optional[int] = None,
    response: Response = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    fatture = crud.get_fatture(db, skip=skip, limit=limit, cliente=cliente, data_da=data_da, data_a=data_a, ordine_id=ordine_id)
    total = crud.count_fatture(db, cliente=cliente, data_da=data_da, data_a=data_a, ordine_id=ordine_id)
    if response is not None:
        response.headers["X-Total-Count"] = str(total)
    return fatture


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
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="Il file supera il limite massimo di 10 MB")
        with open(file_path, "wb") as buffer:
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
    db_fattura = crud.get_fattura(db, fattura_id)
    if not db_fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    if db_fattura.auto_generata:
        raise HTTPException(status_code=400, detail="Le fatture generate automaticamente non possono essere modificate manualmente")
    db_fattura = crud.update_fattura(db, fattura_id, fattura_update)
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


@router.delete("/all", status_code=200)
def delete_all_fatture(db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    """
    Elimina tutte le fatture dal database.
    Nullifica prima la FK auto-referenziale nota_credito_di per evitare
    violazioni di integrità referenziale.
    Operazione riservata agli amministratori.
    ATTENZIONE: Operazione irreversibile!
    """
    try:
        db.query(Fattura).update({"nota_credito_di": None})

        count = db.query(Fattura).delete()
        db.commit()

        return {
            "message": "Tutte le fatture sono state eliminate",
            "deleted_count": count,
        }
    except Exception as e:
        db.rollback()
        logger.exception("Errore durante l'eliminazione di tutte le fatture")
        raise HTTPException(
            status_code=500,
            detail="Errore interno del server durante l'eliminazione.",
        )


@router.delete("/{fattura_id}", status_code=204)
def delete_fattura(
    fattura_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    fattura = crud.get_fattura(db, fattura_id)
    if not fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    if fattura.auto_generata:
        raise HTTPException(status_code=400, detail="Le fatture generate automaticamente non possono essere eliminate manualmente")
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

    if db_fattura.file_path and os.path.exists(db_fattura.file_path):
        return FileResponse(
            path=db_fattura.file_path,
            media_type="application/pdf",
            filename=db_fattura.nome_file or "fattura.pdf",
        )

    try:
        pdf_bytes = _genera_pdf_fattura(db_fattura)
    except Exception as e:
        logger.exception("Errore nella generazione del PDF per fattura %s", fattura_id)
        raise HTTPException(status_code=500, detail="Errore nella generazione del PDF.")

    # Sanitize filename: remove non-ASCII-safe characters
    numero_safe = re.sub(r"[^\w.\-]", "_", db_fattura.numero_fattura or "fattura")
    tipo_doc = getattr(db_fattura, "tipo_documento", None) or "fattura"
    prefix = "nota_credito" if tipo_doc == "nota_credito" else "fattura"
    filename = f"{prefix}_{numero_safe}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _genera_pdf_fattura(fattura) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Intestazione azienda
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "GESTIONE MAGAZZINO", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 5, "Via Esempio 1 - 00100 Roma (RM)", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 5, "P.IVA: 00000000000 - info@gestione-magazzino.local", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(8)

    # Linea separatrice
    pdf.set_draw_color(26, 35, 126)
    pdf.set_line_width(0.8)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # Determina tipo documento in modo robusto
    tipo_documento = getattr(fattura, "tipo_documento", None) or "fattura"
    tipo_value = ""
    if fattura.tipo is not None:
        tipo_value = fattura.tipo.value if hasattr(fattura.tipo, "value") else str(fattura.tipo)

    if tipo_documento == "nota_credito":
        tipo_label = "NOTA DI CREDITO"
    elif tipo_value == "passiva":
        tipo_label = "FATTURA PASSIVA"
    else:
        tipo_label = "FATTURA ATTIVA"

    # Titolo fattura
    pdf.set_font("Helvetica", "B", 14)
    numero = fattura.numero_fattura or "-"
    pdf.cell(0, 10, f"{tipo_label} N. {numero}", new_x="LMARGIN", new_y="NEXT")

    # Data
    pdf.set_font("Helvetica", "", 11)
    data_str = fattura.data_fattura.strftime("%d/%m/%Y") if fattura.data_fattura else "-"
    pdf.cell(0, 7, f"Data: {data_str}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Dati cliente
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "CLIENTE / FORNITORE:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, fattura.cliente or "-", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Tabella importi
    pdf.set_fill_color(26, 35, 126)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(120, 9, "Descrizione", border=1, fill=True)
    pdf.cell(35, 9, "Importo netto", border=1, fill=True, align="R")
    pdf.cell(35, 9, "Totale", border=1, fill=True, align="R")
    pdf.ln()

    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 11)
    importo = float(fattura.importo or 0)

    # Usa imponibile/iva salvati se disponibili, altrimenti calcola
    aliquota = float(getattr(fattura, "aliquota_iva", None) or 22)
    imponibile_salvato = getattr(fattura, "imponibile", None)
    iva_salvata = getattr(fattura, "importo_iva", None)

    if imponibile_salvato is not None:
        imponibile = float(imponibile_salvato)
        iva = float(iva_salvata or 0)
    else:
        imponibile = round(importo / (1 + aliquota / 100), 2)
        iva = round(importo - imponibile, 2)

    pdf.cell(120, 9, "Servizi / Prodotti", border=1)
    pdf.cell(35, 9, f"EUR {imponibile:.2f}", border=1, align="R")
    pdf.cell(35, 9, f"EUR {importo:.2f}", border=1, align="R")
    pdf.ln()

    # IVA riga
    pdf.cell(120, 9, f"IVA {aliquota:.0f}%", border=1)
    pdf.cell(35, 9, f"EUR {iva:.2f}", border=1, align="R")
    pdf.cell(35, 9, "", border=1)
    pdf.ln()

    # Totale
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(120, 10, "TOTALE", border=1, fill=True)
    pdf.cell(35, 10, "", border=1, fill=True)
    pdf.cell(35, 10, f"EUR {importo:.2f}", border=1, fill=True, align="R")
    pdf.ln(12)

    # Stato pagamento
    annullata = getattr(fattura, "annullata", False) or False
    if annullata:
        pdf.set_text_color(100, 100, 100)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 10, "ANNULLATA", new_x="LMARGIN", new_y="NEXT")
    elif fattura.pagata:
        pdf.set_text_color(46, 125, 50)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 10, "FATTURA PAGATA", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.set_text_color(198, 40, 40)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 10, "DA PAGARE", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    # Note
    if fattura.note:
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 7, "Note:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 6, fattura.note)

    # Footer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "Documento generato automaticamente da Gestione Magazzino", new_x="LMARGIN", new_y="NEXT", align="C")

    return bytes(pdf.output())
