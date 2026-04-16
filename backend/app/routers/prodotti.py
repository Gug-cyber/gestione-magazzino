import csv
import io
import logging
import os
import cloudinary
import cloudinary.uploader
from datetime import datetime as dt_datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from ..database import get_db
from ..schemas.prodotto import ProdottoCreate, ProdottoUpdate, ProdottoResponse
from ..crud import prodotto as crud
from ..auth import get_current_active_user
from ..dependencies import get_current_admin
from ..models.movimento import Movimento, TipoMovimento
from ..models.ordine import RigaOrdine
from ..models.fornitura import RigaFornitura
from ..models.prodotto import Prodotto
from ..barcode_utils import generate_barcode_svg
from ..crud.activity_log import log_activity

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

logger = logging.getLogger(__name__)
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


@router.post("/admin/fix-movimenti-iniziali", status_code=200)
def fix_movimenti_iniziali(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    RECOVERY TOOL: Crea movimenti di carico iniziali per prodotti esistenti
    che hanno quantità > 0 ma nessun movimento registrato.

    Operazione riservata agli admin.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Solo gli admin possono eseguire questa operazione")

    prodotti_con_quantita = db.query(Prodotto).filter(Prodotto.quantita > 0).all()

    fixed_count = 0
    skipped_count = 0

    for prodotto in prodotti_con_quantita:
        movimenti_esistenti = db.query(Movimento).filter(
            Movimento.prodotto_id == prodotto.id
        ).count()

        if movimenti_esistenti == 0:
            data_movimento = (
                prodotto.created_at
                if hasattr(prodotto, "created_at") and prodotto.created_at
                else dt_datetime.now()
            )
            movimento = Movimento(
                prodotto_id=prodotto.id,
                tipo=TipoMovimento.carico,
                quantita=prodotto.quantita,
                data_movimento=data_movimento,
                note="Carico iniziale (recovery automatico)",
            )
            db.add(movimento)
            fixed_count += 1
        else:
            skipped_count += 1

    db.commit()

    return {
        "message": "Operazione di recovery completata",
        "prodotti_corretti": fixed_count,
        "prodotti_saltati": skipped_count,
        "dettaglio": f"Creati {fixed_count} movimenti di carico iniziali mancanti",
    }


@router.get("/barcode/{barcode_value}", response_model=ProdottoResponse)
def lookup_by_barcode(
    barcode_value: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Cerca un prodotto per valore barcode. Fallback su SKU e SKU normalizzato."""
    from ..barcode_utils import normalize_for_code39
    db_prodotto = crud.get_prodotto_by_barcode(db, barcode_value)
    if not db_prodotto:
        # Fallback: cerca per SKU esatto
        db_prodotto = crud.get_prodotto_by_sku(db, barcode_value)
    if not db_prodotto:
        # Fallback: cerca per SKU normalizzato
        normalized = normalize_for_code39(barcode_value)
        if normalized:
            db_prodotto = crud.get_prodotto_by_sku(db, normalized)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato per questo barcode")
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.post("/barcodes/bulk-generate")
def bulk_generate_barcodes(
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Genera barcode per più prodotti in una sola richiesta.
    Body: { "prodotto_ids": [1, 2, 3] } oppure { "all": true }
    """
    if body.get("all"):
        prodotti_da_aggiornare = (
            db.query(Prodotto).filter(Prodotto.barcode.is_(None)).all()
        )
        prodotto_ids = [p.id for p in prodotti_da_aggiornare]
    else:
        prodotto_ids = body.get("prodotto_ids", [])

    generated = 0
    result_prodotti = []
    for pid in prodotto_ids:
        db_prodotto = crud.generate_barcode_for_prodotto(db, pid)
        if db_prodotto:
            d = ProdottoResponse.model_validate(db_prodotto).model_dump()
            d["foto_url"] = _build_foto_url(db_prodotto, request)
            result_prodotti.append(d)
            generated += 1

    return {"generated": generated, "prodotti": result_prodotti}


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
    try:
        log_activity(db, azione="crea_prodotto", utente_id=current_user.id, username=current_user.username, entita="prodotto", entita_id=db_prodotto.id, dettagli=db_prodotto.nome)
    except Exception as e:
        logger.warning("log_activity failed: %s", e)
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
    try:
        log_activity(db, azione="modifica_prodotto", utente_id=current_user.id, username=current_user.username, entita="prodotto", entita_id=prodotto_id, dettagli=db_prodotto.nome)
    except Exception as e:
        logger.warning("log_activity failed: %s", e)
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.delete("/all", status_code=200)
def delete_all_prodotti(db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    """
    Elimina tutti i prodotti dal database insieme alle loro dipendenze.
    Operazione riservata agli amministratori.
    ATTENZIONE: Operazione irreversibile!
    """
    try:
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
        logger.exception("Errore durante l'eliminazione di tutti i prodotti")
        raise HTTPException(
            status_code=500,
            detail="Errore interno del server durante l'eliminazione.",
        )


@router.delete("/{prodotto_id}", status_code=204)
def delete_prodotto(prodotto_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    prodotto = crud.get_prodotto(db, prodotto_id)
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    prodotto_nome = prodotto.nome
    # Elimina la foto da Cloudinary se presente
    if prodotto.foto_path and prodotto.foto_path.startswith("https://res.cloudinary.com/"):
        try:
            get_cloudinary()
            cloudinary.uploader.destroy(f"prodotti/{prodotto_id}")
        except Exception as e:
            logger.warning("Cloudinary destroy failed for prodotto %s: %s", prodotto_id, e)
    try:
        crud.delete_prodotto(db, prodotto_id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Impossibile eliminare il prodotto: esistono movimenti o ordini collegati. Elimina prima i movimenti e le righe ordine associate."
        )
    try:
        log_activity(db, azione="elimina_prodotto", utente_id=current_user.id, username=current_user.username, entita="prodotto", entita_id=prodotto_id, dettagli=prodotto_nome)
    except Exception as e:
        logger.warning("log_activity failed: %s", e)


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
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Il file supera il limite massimo di 10 MB")
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
    current_user=Depends(get_current_active_user),
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


@router.post("/{prodotto_id}/foto-aggiuntive", response_model=ProdottoResponse)
async def upload_foto_aggiuntiva(
    prodotto_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
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
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Il file supera il limite massimo di 10 MB")
    existing = db_prodotto.foto_aggiuntive or []
    if len(existing) >= 11:
        raise HTTPException(status_code=400, detail="Limite massimo di foto aggiuntive raggiunto (11, più la foto principale = 12 totali per eBay)")
    get_cloudinary()
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    result = cloudinary.uploader.upload(
        contents,
        public_id=f"prodotti/{prodotto_id}/extra/{unique_id}",
        overwrite=False,
        resource_type="image",
        transformation=[{"width": 800, "height": 800, "crop": "limit", "quality": "auto"}],
    )
    updated = list(existing)
    updated.append(result["secure_url"])
    db_prodotto.foto_aggiuntive = updated
    flag_modified(db_prodotto, "foto_aggiuntive")
    db.commit()
    db.refresh(db_prodotto)
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.delete("/{prodotto_id}/foto-aggiuntive/{index}", response_model=ProdottoResponse)
def remove_foto_aggiuntiva(
    prodotto_id: int,
    index: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    existing = list(db_prodotto.foto_aggiuntive or [])
    if index < 0 or index >= len(existing):
        raise HTTPException(status_code=404, detail="Foto aggiuntiva non trovata all'indice specificato")
    existing.pop(index)
    db_prodotto.foto_aggiuntive = existing
    flag_modified(db_prodotto, "foto_aggiuntive")
    db.commit()
    db.refresh(db_prodotto)
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.post("/{prodotto_id}/barcode", response_model=ProdottoResponse)
def generate_barcode(
    prodotto_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Genera (o rigenera) il barcode per il prodotto specificato."""
    db_prodotto = crud.generate_barcode_for_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.delete("/{prodotto_id}/barcode", response_model=ProdottoResponse)
def delete_barcode(
    prodotto_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Rimuove il barcode dal prodotto (imposta barcode = None, barcode_generated_at = None)."""
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    db_prodotto.barcode = None
    db_prodotto.barcode_generated_at = None
    db.commit()
    db.refresh(db_prodotto)
    d = ProdottoResponse.model_validate(db_prodotto).model_dump()
    d["foto_url"] = _build_foto_url(db_prodotto, request)
    return d


@router.get("/{prodotto_id}/barcode/image")
def get_barcode_image(
    prodotto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Restituisce l'immagine SVG del barcode per il prodotto."""
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    if not db_prodotto.barcode:
        raise HTTPException(status_code=404, detail="Barcode non ancora generato per questo prodotto")

    svg_content = generate_barcode_svg(db_prodotto.barcode)
    if svg_content is None:
        raise HTTPException(
            status_code=503,
            detail="Generazione immagine non disponibile lato server. Usa la visualizzazione client-side.",
        )
    return Response(content=svg_content, media_type="image/svg+xml")


@router.post("/import/csv")
async def import_prodotti_csv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Il file supera il limite massimo di 10 MB")
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


# ---------------------------------------------------------------------------
# Google Drive endpoints
# ---------------------------------------------------------------------------

from pydantic import BaseModel as _BaseModel
from ..services.google_drive_service import drive_service


class _DriveFolderBody(_BaseModel):
    folder_id: Optional[str] = None


class _DriveCreateBody(_BaseModel):
    nome: Optional[str] = None


@router.put("/{prodotto_id}/drive-folder")
def set_drive_folder(
    prodotto_id: int,
    body: _DriveFolderBody,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Associa (o dissocia) una cartella Google Drive al prodotto."""
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    db_prodotto.google_drive_folder_id = body.folder_id
    db.commit()

    if body.folder_id:
        drive_service.share_folder_publicly(body.folder_id)

    return {"folder_id": body.folder_id}


@router.post("/{prodotto_id}/drive-folder/crea")
def crea_drive_folder(
    prodotto_id: int,
    body: _DriveCreateBody = _DriveCreateBody(),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Crea una nuova cartella Google Drive per il prodotto e la associa."""
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    folder_name = body.nome or db_prodotto.nome
    parent_folder_id = os.getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID")

    try:
        folder_id = drive_service.create_folder(folder_name, parent_folder_id=parent_folder_id)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    drive_service.share_folder_publicly(folder_id)

    db_prodotto.google_drive_folder_id = folder_id
    db.commit()

    return {
        "folder_id": folder_id,
        "folder_url": f"https://drive.google.com/drive/folders/{folder_id}",
    }


@router.get("/{prodotto_id}/immagini")
def get_immagini_prodotto(
    prodotto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Restituisce le immagini Drive associate al prodotto."""
    db_prodotto = crud.get_prodotto(db, prodotto_id)
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    folder_id = db_prodotto.google_drive_folder_id
    if not folder_id:
        return {"immagini": [], "folder_id": None, "folder_url": None}

    immagini = drive_service.list_images_in_folder(folder_id)
    return {
        "immagini": immagini,
        "folder_id": folder_id,
        "folder_url": f"https://drive.google.com/drive/folders/{folder_id}",
    }
