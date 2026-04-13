from typing import List, Dict
import logging
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
import cloudinary
import cloudinary.uploader
import os

from ..database import get_db
from ..auth import get_current_active_user
from ..models.utente import Utente
from ..schemas.feature_flag import FeatureFlagResponse, FeatureFlagUpdate, FeatureFlagBulkUpdate
from ..schemas.banner import BannerCreate, BannerUpdate, BannerResponse
from ..schemas.promozione import PromozioneCreate, PromozioneUpdate, PromozioneResponse
from ..schemas.warehouse_settings import WarehouseSettingsResponse, WarehouseSettingsUpdate
from ..schemas.store_settings import StoreSettingsResponse, StoreSettingsUpdate
from ..schemas.footer_page import FooterPageResponse, FooterPageCreate, FooterPageUpdate
from ..crud import feature_flag as crud_flags
from ..crud import banner as crud_banner
from ..crud import promozione as crud_promozione
from ..crud import warehouse_settings as crud_ws
from ..crud import store_settings as crud_store_settings
from ..crud import footer_page as crud_footer

router = APIRouter()

logger = logging.getLogger(__name__)


def _require_admin(current_user: Utente):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accesso negato: richiesto ruolo amministratore")


# ---------------------------------------------------------------------------
# FEATURE FLAGS
# ---------------------------------------------------------------------------

@router.get("/feature-flags", response_model=Dict[str, bool])
def get_feature_flags(
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    """Restituisce tutti i flag come dict {key: bool} (richiede solo autenticazione)."""
    flags = crud_flags.get_all_flags(db)
    return {f.key: f.enabled for f in flags}


@router.get("/feature-flags/admin", response_model=List[FeatureFlagResponse])
def get_feature_flags_admin(
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    """Restituisce lista completa con description e updated_at (solo admin)."""
    _require_admin(current_user)
    return crud_flags.get_all_flags(db)


@router.put("/feature-flags/{key}", response_model=FeatureFlagResponse)
def update_feature_flag(
    key: str,
    data: FeatureFlagUpdate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    return crud_flags.upsert_flag(db, key=key, enabled=data.enabled, description=data.description)


@router.post("/feature-flags/bulk", response_model=List[FeatureFlagResponse])
def bulk_update_feature_flags(
    data: FeatureFlagBulkUpdate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    flags = [{"key": f.key, "enabled": f.enabled, "description": f.description} for f in data.flags]
    return crud_flags.bulk_upsert_flags(db, flags)


# ---------------------------------------------------------------------------
# BANNER
# ---------------------------------------------------------------------------

@router.get("/banners", response_model=List[BannerResponse])
def get_banners(
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    return crud_banner.get_banners(db)


@router.post("/banners", response_model=BannerResponse)
def create_banner(
    data: BannerCreate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    try:
        return crud_banner.create_banner(db, data)
    except Exception as exc:
        logger.error("Errore creazione banner: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Errore nel salvataggio del banner")


@router.put("/banners/{banner_id}", response_model=BannerResponse)
def update_banner(
    banner_id: int,
    data: BannerUpdate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    try:
        banner = crud_banner.update_banner(db, banner_id, data)
        if not banner:
            raise HTTPException(status_code=404, detail="Banner non trovato")
        return banner
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Errore aggiornamento banner %s: %s", banner_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Errore nell'aggiornamento del banner")


@router.delete("/banners/{banner_id}")
def delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    if not crud_banner.delete_banner(db, banner_id):
        raise HTTPException(status_code=404, detail="Banner non trovato")
    return {"ok": True}


# ---------------------------------------------------------------------------
# PROMOZIONI
# ---------------------------------------------------------------------------

def _promo_to_response(promo) -> PromozioneResponse:
    data = {
        "id": promo.id,
        "nome": promo.nome,
        "tipo": promo.tipo,
        "valore": float(promo.valore),
        "prodotto_id": promo.prodotto_id,
        "categoria_id": promo.categoria_id,
        "data_inizio": promo.data_inizio,
        "data_fine": promo.data_fine,
        "is_active": promo.is_active,
        "created_at": promo.created_at,
        "prodotto_nome": promo.prodotto.nome if promo.prodotto else None,
        "categoria_nome": promo.categoria.nome if promo.categoria else None,
    }
    return PromozioneResponse(**data)


@router.get("/promozioni", response_model=List[PromozioneResponse])
def get_promozioni(
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    promos = crud_promozione.get_promozioni(db)
    return [_promo_to_response(p) for p in promos]


@router.post("/promozioni", response_model=PromozioneResponse)
def create_promozione(
    data: PromozioneCreate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    promo = crud_promozione.create_promozione(db, data)
    db.refresh(promo)
    return _promo_to_response(promo)


@router.put("/promozioni/{promozione_id}", response_model=PromozioneResponse)
def update_promozione(
    promozione_id: int,
    data: PromozioneUpdate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    promo = crud_promozione.update_promozione(db, promozione_id, data)
    if not promo:
        raise HTTPException(status_code=404, detail="Promozione non trovata")
    return _promo_to_response(promo)


@router.delete("/promozioni/{promozione_id}")
def delete_promozione(
    promozione_id: int,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    if not crud_promozione.delete_promozione(db, promozione_id):
        raise HTTPException(status_code=404, detail="Promozione non trovata")
    return {"ok": True}


# ---------------------------------------------------------------------------
# WAREHOUSE SETTINGS
# ---------------------------------------------------------------------------

@router.get("/warehouse-settings", response_model=WarehouseSettingsResponse)
def get_warehouse_settings(
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    return crud_ws.get_settings(db)


@router.put("/warehouse-settings", response_model=WarehouseSettingsResponse)
def update_warehouse_settings(
    data: WarehouseSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    return crud_ws.update_settings(db, data)


# ---------------------------------------------------------------------------
# STORE SETTINGS
# ---------------------------------------------------------------------------

@router.get("/store-settings", response_model=StoreSettingsResponse)
def get_store_settings(
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    return crud_store_settings.get_settings(db)


@router.put("/store-settings", response_model=StoreSettingsResponse)
def update_store_settings(
    data: StoreSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    return crud_store_settings.update_settings(db, data)


MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB


def _configure_cloudinary():
    """Configure Cloudinary from env vars, raising 503 if not set."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(status_code=503, detail="Upload service temporarily unavailable")
    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)


async def _read_validated_image(file: UploadFile) -> bytes:
    """Read upload file, validating content-type and size."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Il file deve essere un'immagine")
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Il file supera 10 MB")
    return contents


@router.post("/store-settings/upload-logo", response_model=StoreSettingsResponse)
async def upload_store_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    _configure_cloudinary()
    contents = await _read_validated_image(file)
    result = cloudinary.uploader.upload(
        contents,
        public_id="store/logo",
        overwrite=True,
        resource_type="image",
        transformation=[{"width": 400, "height": 200, "crop": "limit", "quality": "auto"}],
    )
    settings = crud_store_settings.update_settings(db, StoreSettingsUpdate(store_logo_url=result["secure_url"]))
    return settings


@router.post("/store-settings/upload-sfondo", response_model=StoreSettingsResponse)
async def upload_store_sfondo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    _configure_cloudinary()
    contents = await _read_validated_image(file)
    result = cloudinary.uploader.upload(
        contents,
        public_id="store/sfondo",
        overwrite=True,
        resource_type="image",
        transformation=[{"width": 1920, "height": 1080, "crop": "limit", "quality": "auto"}],
    )
    settings = crud_store_settings.update_settings(db, StoreSettingsUpdate(store_sfondo_url=result["secure_url"]))
    return settings


@router.post("/banners/upload-image")
async def upload_banner_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    _configure_cloudinary()
    contents = await _read_validated_image(file)
    result = cloudinary.uploader.upload(
        contents,
        folder="store/banners",
        overwrite=False,
        resource_type="image",
        transformation=[{"width": 1200, "height": 400, "crop": "limit", "quality": "auto"}],
    )
    return {"immagine_url": result["secure_url"]}


# ---------------------------------------------------------------------------
# FOOTER PAGES
# ---------------------------------------------------------------------------

@router.get("/footer-pages", response_model=List[FooterPageResponse])
def get_footer_pages(
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    return crud_footer.get_all_pages(db)


@router.post("/footer-pages", response_model=FooterPageResponse, status_code=201)
def create_footer_page(
    data: FooterPageCreate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    existing = crud_footer.get_page_by_slug(db, data.slug)
    if existing:
        raise HTTPException(status_code=409, detail="Slug già esistente")
    return crud_footer.create_page(db, data)


@router.put("/footer-pages/{slug}", response_model=FooterPageResponse)
def update_footer_page(
    slug: str,
    data: FooterPageUpdate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    page = crud_footer.upsert_page(db, slug, data)
    if not page:
        raise HTTPException(status_code=404, detail="Pagina non trovata")
    return page


@router.delete("/footer-pages/{slug}")
def delete_footer_page(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    if not crud_footer.delete_page(db, slug):
        raise HTTPException(status_code=404, detail="Pagina non trovata")
    return {"ok": True}
