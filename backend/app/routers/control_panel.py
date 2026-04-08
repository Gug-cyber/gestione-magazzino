from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_active_user
from ..models.utente import Utente
from ..schemas.feature_flag import FeatureFlagResponse, FeatureFlagUpdate, FeatureFlagBulkUpdate
from ..schemas.banner import BannerCreate, BannerUpdate, BannerResponse
from ..schemas.promozione import PromozioneCreate, PromozioneUpdate, PromozioneResponse
from ..schemas.warehouse_settings import WarehouseSettingsResponse, WarehouseSettingsUpdate
from ..crud import feature_flag as crud_flags
from ..crud import banner as crud_banner
from ..crud import promozione as crud_promozione
from ..crud import warehouse_settings as crud_ws

router = APIRouter()


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
    return crud_banner.create_banner(db, data)


@router.put("/banners/{banner_id}", response_model=BannerResponse)
def update_banner(
    banner_id: int,
    data: BannerUpdate,
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_active_user),
):
    _require_admin(current_user)
    banner = crud_banner.update_banner(db, banner_id, data)
    if not banner:
        raise HTTPException(status_code=404, detail="Banner non trovato")
    return banner


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
