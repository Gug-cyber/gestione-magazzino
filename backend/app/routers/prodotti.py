import csv
import io
import os
import shutil
from datetime import datetime as dt_datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from ..database import get_db
from ..schemas.prodotto import ProdottoCreate, ProdottoUpdate, ProdottoResponse
from ..crud import prodotto as crud
from ..auth import get_current_active_user
from ..models.movimento import Movimento
from ..models.prodotto import Prodotto
router = APIRouter()

UPLOAD_DIR = "/app/uploads/prodotti"


def _build_foto_url(prodotto, request: Request) -> Optional[str]:
    if not prodotto.foto_path:
        return None
    return f"/api/prodotti/{prodotto.id}/foto"


@router.get("/", response_model=List[ProdottoResponse])
def get_prodotti(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    prodotti = crud.get_prodotti(db, skip=skip, limit=limit)
    result = []
    for p in prodotti:
        d = ProdottoResponse.model_validate(p).model_dump()
        d["foto_url"] = _build_foto_url(p, request)
        result.append(d)
    return result


@router.get("/sotto-scorta", response_model=List[ProdottoResponse])
def get_prodotti_sotto_scorta(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    prodotti = crud.get_prodotti_sotto_scorta(db)
    result = []
    for p in prodotti:
        d = ProdottoResponse.model_validate(p).model_dump()
        d["foto_url"] = _build_foto_url(p, request)
        result.append(d)
    return result


@router.get("/{prodotto_id}/scheda")
def get_scheda_prodotto(prodotto_id: int, request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    # Build prodotto dict with categoria_nome and ubicazione_nome
    prodotto_dict = ProdottoResponse.model_validate(db_prodotto).model_dump()
    prodotto_dict["foto_url"] = _build_foto_url(db_prodotto, request)
    prodotto_dict["categoria_nome"] = db_prodotto.categoria.nome if db_prodotto.categoria else None
    prodotto_dict["ubicazione_nome"] = db_prodotto.ubicazione.nome if db_prodotto.ubicazione else None

    # Fetch movements ordered by date DESC
    movimenti_db = (
        db.query(Movimento)
        .filter(Movimento.prodotto_id == prodotto_id)
        .order_by(Movimento.data_movimento.desc())
        .all()
    )

    movimenti_list = []
    for m in movimenti_db:
        m_dict = {
            "id": m.id,
            "prodotto_id": m.prodotto_id,
            "tipo": m.tipo.value if hasattr(m.tipo, "value") else m.tipo,
            "quantita": m.quantita,
            "note": m.note,
            "fornitore_id": m.fornitore_id,
            "data_movimento": m.data_movimento.isoformat() if m.data_movimento else None,
            "fornitore_nome": m.fornitore.nome if m.fornitore else None,
        }
        movimenti_list.append(m_dict)

    # Build storico_quantita in chronological order
    movimenti_cronologici = sorted(
        movimenti_db,
        key=lambda m: m.data_movimento if m.data_movimento else dt_datetime.max,
    )
    quantita_cumulativa = 0
    storico_quantita = []
    for m in movimenti_cronologici:
        variazione = m.quantita if (m.tipo.value if hasattr(m.tipo, "value") else m.tipo) == "carico" else -m.quantita
        quantita_cumulativa += variazione
        storico_quantita.append({
            "data": m.data_movimento.isoformat() if m.data_movimento else None,
            "quantita": quantita_cumulativa,
            "tipo": m.tipo.value if hasattr(m.tipo, "value") else m.tipo,
            "variazione": variazione,
        })

    # Prodotti correlati (same category, excluding current, max 5)
    prodotti_correlati = []
    if db_prodotto.categoria_id:
        correlati_db = (
            db.query(Prodotto)
            .filter(Prodotto.categoria_id == db_prodotto.categoria_id, Prodotto.id != prodotto_id)
            .limit(5)
            .all()
        )
        for pc in correlati_db:
            pc_dict = ProdottoResponse.model_validate(pc).model_dump()
            pc_dict["foto_url"] = _build_foto_url(pc, request)
            prodotti_correlati.append(pc_dict)

    # Stats
    totale_carico = sum(m.quantita for m in movimenti_db if (m.tipo.value if hasattr(m.tipo, "value") else m.tipo) == "carico")
    totale_scarico = sum(m.quantita for m in movimenti_db if (m.tipo.value if hasattr(m.tipo, "value") else m.tipo) == "scarico")
    prezzo_acquisto = float(db_prodotto.prezzo_acquisto) if db_prodotto.prezzo_acquisto else None
    prezzo_vendita = float(db_prodotto.prezzo_vendita) if db_prodotto.prezzo_vendita else None
    margine_lordo = None
    margine_percentuale = None
    if prezzo_acquisto is not None and prezzo_vendita is not None:
        margine_lordo = round(prezzo_vendita - prezzo_acquisto, 2)
        if prezzo_acquisto != 0:
            margine_percentuale = round((margine_lordo / prezzo_acquisto) * 100, 2)

    stats = {
        "totale_movimenti": len(movimenti_db),
        "totale_carico": totale_carico,
        "totale_scarico": totale_scarico,
        "margine_lordo": margine_lordo,
        "margine_percentuale": margine_percentuale,
    }

    return {
        "prodotto": prodotto_dict,
        "movimenti": movimenti_list,
        "storico_quantita": storico_quantita,
        "prodotti_correlati": prodotti_correlati,
        "stats": stats,
    }


@router.get("/{prodotto_id}", response_model=ProdottoResponse)
def get_prodotto(prodotto_id: int, request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.post("/", response_model=ProdottoResponse, status_code=201)
def create_prodotto(prodotto: ProdottoCreate, request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if crud.get_prodotto_by_sku(db, prodotto.sku):
        raise HTTPException(status_code=400, detail="SKU già esistente")
    db_prodotto = crud.create_prodotto(db, prodotto)
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.put("/{prodotto_id}", response_model=ProdottoResponse)
def update_prodotto(prodotto_id: int, prodotto: ProdottoUpdate, request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if prodotto.sku is not None:
        existing = crud.get_prodotto_by_sku(db, prodotto.sku)
        if existing and existing.id != prodotto_id:
            raise HTTPException(status_code=400, detail="SKU già utilizzato da un altro prodotto")
    db_prodotto = crud.update_prodotto(db, prodotto_id, prodotto)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.delete("/{prodotto_id}", status_code=204)
def delete_prodotto(prodotto_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    prodotto = crud.get_prodotto(db, prodotto_id)
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    try:
        crud.delete_prodotto(db, prodotto_id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Impossibile eliminare il prodotto: esistono movimenti o ordini collegati. Elimina prima i movimenti e le righe ordine associate."
        )


@router.post("/{prodotto_id}/foto", response_model=ProdottoResponse)
async def upload_foto_prodotto(prodotto_id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Il file deve essere un'immagine")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    dest_path = os.path.join(UPLOAD_DIR, f"{prodotto_id}.{ext}")
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    db_prodotto.foto_path = dest_path
    db.commit()
    db.refresh(db_prodotto)
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.get("/{prodotto_id}/foto")
def get_foto_prodotto(prodotto_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto or not db_prodotto.foto_path:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    if not os.path.exists(db_prodotto.foto_path):
        raise HTTPException(status_code=404, detail="File foto non trovato")
    return FileResponse(db_prodotto.foto_path)


@router.post("/import/csv")
async def import_prodotti_csv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    content = await file.read()
    try:
        text = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Encoding del file CSV non valido. Utilizzare UTF-8.")

    sample = text[:1024]
    delimiter = ';' if sample.count(';') > sample.count(',') else ','

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

    importati = 0
    saltati = 0
    errori = []

    def to_int(val, default=0):
        try:
            return int(val) if val and val.strip() else default
        except (ValueError, AttributeError):
            return default

    def to_float(val):
        try:
            return float(val) if val and val.strip() else None
        except (ValueError, AttributeError):
            return None

    for i, row in enumerate(reader, start=2):
        nome = (row.get('nome') or '').strip()
        sku = (row.get('sku') or '').strip()

        if not nome:
            errori.append(f"Riga {i}: nome mancante")
            saltati += 1
            continue
        if not sku:
            errori.append(f"Riga {i}: sku mancante")
            saltati += 1
            continue

        if crud.get_prodotto_by_sku(db, sku):
            errori.append(f"Riga {i}: SKU già esistente '{sku}'")
            saltati += 1
            continue

        prodotto_data = ProdottoCreate(
            nome=nome,
            sku=sku,
            quantita=to_int(row.get('quantita')),
            quantita_minima=to_int(row.get('quantita_minima')),
            prezzo_acquisto=to_float(row.get('prezzo_acquisto')),
            prezzo_vendita=to_float(row.get('prezzo_vendita')),
            descrizione=(row.get('descrizione') or '').strip() or None,
            stato_conservazione=(row.get('stato_conservazione') or '').strip() or None,
            lingua=(row.get('lingua') or '').strip() or None,
        )
        crud.create_prodotto(db, prodotto_data)
        importati += 1

    return {"importati": importati, "saltati": saltati, "errori": errori}
