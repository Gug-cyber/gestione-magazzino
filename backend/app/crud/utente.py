from sqlalchemy.orm import Session
from ..models.utente import Utente
from ..schemas.utente import UtenteCreate, UtenteUpdate
from ..auth import get_password_hash, verify_password


def get_utente(db: Session, utente_id: int):
    return db.query(Utente).filter(Utente.id == utente_id).first()


def get_utente_by_username(db: Session, username: str):
    return db.query(Utente).filter(Utente.username == username).first()


def get_utente_by_email(db: Session, email: str):
    return db.query(Utente).filter(Utente.email == email).first()


def get_utenti(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Utente).offset(skip).limit(limit).all()


def create_utente(db: Session, utente: UtenteCreate, is_admin: bool = False):
    hashed_password = get_password_hash(utente.password)
    db_utente = Utente(
        username=utente.username,
        email=utente.email,
        hashed_password=hashed_password,
        is_admin=is_admin,
    )
    db.add(db_utente)
    db.commit()
    db.refresh(db_utente)
    return db_utente


def authenticate_utente(db: Session, username: str, password: str):
    utente = get_utente_by_username(db, username)
    if not utente:
        return None
    if not verify_password(password, utente.hashed_password):
        return None
    return utente


def update_utente(db: Session, utente_id: int, utente: UtenteUpdate):
    db_utente = get_utente(db, utente_id)
    if not db_utente:
        return None
    update_data = utente.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    for key, value in update_data.items():
        setattr(db_utente, key, value)
    db.commit()
    db.refresh(db_utente)
    return db_utente


def delete_utente(db: Session, utente_id: int):
    db_utente = get_utente(db, utente_id)
    if not db_utente:
        return False
    db.delete(db_utente)
    db.commit()
    return True
