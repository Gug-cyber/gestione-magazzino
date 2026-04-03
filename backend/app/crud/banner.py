from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..models.banner import Banner
from ..schemas.banner import BannerCreate, BannerUpdate


def get_banner(db: Session, skip: int = 0, limit: int = 100) -> List[Banner]:
    return db.query(Banner).order_by(Banner.ordine).offset(skip).limit(limit).all()


def get_banner_by_id(db: Session, banner_id: int) -> Optional[Banner]:
    return db.query(Banner).filter(Banner.id == banner_id).first()


def get_banner_attivi(db: Session) -> List[Banner]:
    """
    Restituisce solo i banner attivi e nel periodo di validità.
    """
    now = datetime.utcnow()
    return (
        db.query(Banner)
        .filter(
            Banner.attivo == True,
            (Banner.data_inizio == None) | (Banner.data_inizio <= now),
            (Banner.data_fine == None) | (Banner.data_fine >= now)
        )
        .order_by(Banner.ordine)
        .all()
    )


def create_banner(db: Session, banner: BannerCreate) -> Banner:
    db_banner = Banner(**banner.model_dump())
    db.add(db_banner)
    db.commit()
    db.refresh(db_banner)
    return db_banner


def update_banner(db: Session, banner_id: int, banner: BannerUpdate) -> Optional[Banner]:
    db_banner = get_banner_by_id(db, banner_id)
    if not db_banner:
        return None

    for field, value in banner.model_dump(exclude_unset=True).items():
        setattr(db_banner, field, value)

    db.commit()
    db.refresh(db_banner)
    return db_banner


def delete_banner(db: Session, banner_id: int) -> bool:
    db_banner = get_banner_by_id(db, banner_id)
    if not db_banner:
        return False
    db.delete(db_banner)
    db.commit()
    return True
