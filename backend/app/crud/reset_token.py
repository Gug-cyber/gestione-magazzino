import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..models.reset_token import ResetToken


def create_reset_token(db: Session, utente_id: int) -> ResetToken:
    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db_token = ResetToken(utente_id=utente_id, token=token, expires_at=expires_at)
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token


def get_reset_token(db: Session, token: str):
    return db.query(ResetToken).filter(ResetToken.token == token).first()


def use_reset_token(db: Session, token_obj: ResetToken) -> ResetToken:
    token_obj.used = True
    db.commit()
    db.refresh(token_obj)
    return token_obj
