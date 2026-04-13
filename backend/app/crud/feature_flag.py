from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.feature_flag import FeatureFlag

DEFAULT_FLAGS = [
    {"key": "store_enabled", "enabled": True, "description": "Abilita lo store pubblico"},
    {"key": "checkout_enabled", "enabled": True, "description": "Abilita il checkout"},
    {"key": "discounts_enabled", "enabled": True, "description": "Abilita sconti e promozioni"},
    {"key": "banners_enabled", "enabled": True, "description": "Abilita i banner pubblicitari"},
    {"key": "analytics_enabled", "enabled": True, "description": "Abilita le analisi"},
    {"key": "barcode_enabled", "enabled": True, "description": "Abilita la gestione barcode"},
    {"key": "invoices_enabled", "enabled": True, "description": "Abilita la gestione fatture"},
    {"key": "suppliers_enabled", "enabled": True, "description": "Abilita la gestione fornitori"},
    {"key": "warehouse_alerts_enabled", "enabled": True, "description": "Abilita gli alert di magazzino"},
    {"key": "analytics_channel_instagram", "enabled": True, "description": "Canale Instagram nelle statistiche"},
    {"key": "analytics_channel_facebook", "enabled": True, "description": "Canale Facebook nelle statistiche"},
    {"key": "analytics_channel_tiktok", "enabled": True, "description": "Canale TikTok nelle statistiche"},
    {"key": "analytics_channel_twitch", "enabled": True, "description": "Canale Twitch nelle statistiche"},
    {"key": "analytics_channel_youtube", "enabled": True, "description": "Canale YouTube nelle statistiche"},
    {"key": "analytics_channel_google", "enabled": True, "description": "Canale Google nelle statistiche"},
    {"key": "analytics_channel_bing", "enabled": True, "description": "Canale Bing nelle statistiche"},
    {"key": "analytics_channel_yahoo", "enabled": True, "description": "Canale Yahoo nelle statistiche"},
    {"key": "analytics_channel_ebay", "enabled": True, "description": "Canale eBay nelle statistiche"},
    {"key": "analytics_channel_direct", "enabled": True, "description": "Traffico diretto nelle statistiche"},
    {"key": "analytics_channel_other", "enabled": True, "description": "Canali altri nelle statistiche"},
]


def get_all_flags(db: Session) -> List[FeatureFlag]:
    return db.query(FeatureFlag).all()


def get_flag(db: Session, key: str) -> Optional[FeatureFlag]:
    return db.query(FeatureFlag).filter(FeatureFlag.key == key).first()


def upsert_flag(db: Session, key: str, enabled: bool, description: Optional[str] = None) -> FeatureFlag:
    flag = get_flag(db, key)
    if flag:
        flag.enabled = enabled
        if description is not None:
            flag.description = description
    else:
        flag = FeatureFlag(key=key, enabled=enabled, description=description)
        db.add(flag)
    db.commit()
    db.refresh(flag)
    return flag


def bulk_upsert_flags(db: Session, flags: List[dict]) -> List[FeatureFlag]:
    result = []
    for item in flags:
        flag = upsert_flag(
            db,
            key=item["key"],
            enabled=item["enabled"],
            description=item.get("description"),
        )
        result.append(flag)
    return result


def seed_default_flags(db: Session) -> None:
    """Crea i flag di default se non esistono. Idempotente."""
    for flag_data in DEFAULT_FLAGS:
        existing = get_flag(db, flag_data["key"])
        if not existing:
            flag = FeatureFlag(**flag_data)
            db.add(flag)
    db.commit()
