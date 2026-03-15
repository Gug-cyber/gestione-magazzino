import csv
import io
import os
import cloudinary
import cloudinary.uploader
from datetime import datetime as dt_datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from fastapi.responses import FileResponse, RedirectResponse, Response
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


def get_cloudinary():
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
    )
    return cloudinary


def _build_foto_url(prodotto, request: Request) -> Optional[str]:
    if not prodotto.foto_path:
        return None
    # Se è già un URL completo (Cloudinary), restituiscilo direttamente
    if prodotto.foto_path.startswith("http://") or prodotto.foto_path.startswith("https://"):
        return prodotto.foto_path
    # Path locale: restituisci il path API solo se il file esiste, altrimenti None
    if os.path.exists(prodotto.foto_path):
        return f"/api/prodotti/{prodotto.id}/foto"
    # File locale non trovato (filesystem effimero) — non restituire un URL destinato a 404
    return None


@router.get("/", response_model=List[ProdottoResponse])
def get_prodotti(
    request: Request,
    response: Response,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(default=None),
    categoria_id: Optional[int] = Query(default=None),
    ubicazione_id: Optional[int] = Query(default=None),
    stato_conservazione: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    prodotti = crud.get_prodotti(
        db,
        skip=skip,
        limit=limit,
        search=search,
        categoria_id=categoria_id,
        ubicazione_id=ubicazione_id,
        stato_conservazione=stato_conservazione,
    )
    total = crud.count_prodotti(
        db,
        search=search,
        categoria_id=categoria_id,
        ubicazione_id=ubicazione_id,
        stato_conservazione=stato_conservazione,
    )
    response.headers["X-Total-Count"] = str(total)
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


@router.post("/admin/clear-local-foto", status_code=200)
def clear_local_foto_paths(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Azzera i foto_path locali obsoleti (non URL Cloudinary) da tutti i prodotti."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Solo gli admin possono eseguire questa operazione")

    prodotti = db.query(Prodotto).filter(
        Prodotto.foto_path.isnot(None),
        ~Prodotto.foto_path.like("http://%"),
        ~Prodotto.foto_path.like("https://%"),
    ).all()

    count = len(prodotti)
    for p in prodotti:
        p.foto_path = None
    db.commit()

    return {"cleared": count, "message": f"Azzerati {count} foto_path locali obsoleti"}


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


@router.delete("/all", status_code=200)
def delete_all_prodotti(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    """
    Elimina tutti i prodotti dal database.
    Elimina anche tutti i movimenti, righe ordine e righe fornitura collegati.
    ATTENZIONE: Operazione irreversibile!
    """
    try:
        from ..models.ordine import RigaOrdine
        from ..models.fornitura import RigaFornitura

        db.query(Movimento).delete()
        db.query(RigaOrdine).delete()
        db.query(RigaFornitura).delete()

        count = db.query(Prodotto).delete()
        db.commit()

        return {
            "message": "Tutti i prodotti e le loro dipendenze sono stati eliminati",
            "deleted_count": count,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante l'eliminazione dei prodotti: {str(e)}",
        )


@router.delete("/{prodotto_id}", status_code=204)
def delete_prodotto(prodotto_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    prodotto = crud.get_prodotto(db, prodotto_id)
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    # Elimina la foto da Cloudinary se presente
    if prodotto.foto_path and prodotto.foto_path.startswith("https://res.cloudinary.com/"):
        try:
            get_cloudinary()
            cloudinary.uploader.destroy(f"prodotti/{prodotto_id}")
        except Exception:
            pass  # non bloccare la cancellazione del prodotto
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
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(
            status_code=503,
            detail="Cloudinary non configurato. Impostare CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET."
        )
    contents = await file.read()
    get_cloudinary()
    result = cloudinary.uploader.upload(
        contents,
        public_id=f"prodotti/{prodotto_id}",
        overwrite=True,
        resource_type="image",
        transformation=[{"width": 800, "height": 800, "crop": "limit", "quality": "auto"}],
    )
    db_prodotto.foto_path = result["secure_url"]
    db.commit()
    db.refresh(db_prodotto)
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.get("/{prodotto_id}/foto")
def get_foto_prodotto(
    prodotto_id: int,
    db: Session = Depends(get_db),
):
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto or not db_prodotto.foto_path:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    # Se è un URL Cloudinary, redirect diretto (302)
    if db_prodotto.foto_path.startswith("http://") or db_prodotto.foto_path.startswith("https://"):
        return RedirectResponse(url=db_prodotto.foto_path, status_code=302)
    # Fallback per path locali legacy
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
