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
