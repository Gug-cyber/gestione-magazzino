from sqlalchemy.orm import Session
from ..models.warehouse_settings import WarehouseSettings
from ..schemas.warehouse_settings import WarehouseSettingsUpdate


def get_settings(db: Session) -> WarehouseSettings:
    """Restituisce le impostazioni warehouse. Crea il singleton se non esiste."""
    settings = db.query(WarehouseSettings).first()
    if not settings:
        settings = WarehouseSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, data: WarehouseSettingsUpdate) -> WarehouseSettings:
    settings = get_settings(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
