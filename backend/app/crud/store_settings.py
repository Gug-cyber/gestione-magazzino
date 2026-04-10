from sqlalchemy.orm import Session
from ..models.store_settings import StoreSettings
from ..schemas.store_settings import StoreSettingsUpdate


def get_settings(db: Session) -> StoreSettings:
    """Restituisce le impostazioni store. Crea il singleton se non esiste."""
    settings = db.query(StoreSettings).first()
    if not settings:
        settings = StoreSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, data: StoreSettingsUpdate) -> StoreSettings:
    settings = get_settings(db)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings
