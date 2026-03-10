import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.prodotto import ProdottoCreate, ProdottoUpdate, ProdottoResponse
from ..crud import prodotto as crud
from ..auth import get_current_active_user
from ..services import strapi_sync, medusa_sync

router = APIRouter()


@router.get("/", response_model=List[ProdottoResponse])
def get_prodotti(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    return crud.get_prodotti(db, skip=skip, limit=limit)


@router.get("/sotto-scorta", response_model=List[ProdottoResponse])
def get_prodotti_sotto_scorta(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    return crud.get_prodotti_sotto_scorta(db)


@router.get("/{prodotto_id}", response_model=ProdottoResponse)
def get_prodotto(prodotto_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return db_prodotto


@router.post("/", response_model=ProdottoResponse, status_code=201)
def create_prodotto(prodotto: ProdottoCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if crud.get_prodotto_by_sku(db, prodotto.sku):
        raise HTTPException(status_code=400, detail="SKU già esistente")
    db_prodotto = crud.create_prodotto(db, prodotto)
    background_tasks.add_task(strapi_sync.sync_create_or_update, db_prodotto)
    background_tasks.add_task(medusa_sync.sync_create_or_update, db_prodotto)
    return db_prodotto


@router.put("/{prodotto_id}", response_model=ProdottoResponse)
def update_prodotto(prodotto_id: int, prodotto: ProdottoUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    if prodotto.sku is not None:
        existing = crud.get_prodotto_by_sku(db, prodotto.sku)
        if existing and existing.id != prodotto_id:
            raise HTTPException(status_code=400, detail="SKU già utilizzato da un altro prodotto")
    db_prodotto = crud.update_prodotto(db, prodotto_id, prodotto)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    background_tasks.add_task(strapi_sync.sync_create_or_update, db_prodotto)
    background_tasks.add_task(medusa_sync.sync_create_or_update, db_prodotto)
    return db_prodotto


@router.delete("/{prodotto_id}", status_code=204)
def delete_prodotto(prodotto_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    prodotto = crud.get_prodotto(db, prodotto_id)
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    sku = prodotto.sku
    crud.delete_prodotto(db, prodotto_id)
    background_tasks.add_task(strapi_sync.sync_delete, sku)
    background_tasks.add_task(medusa_sync.delete_product, sku)


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
