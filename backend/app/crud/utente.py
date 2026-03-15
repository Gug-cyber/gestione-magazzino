from sqlalchemy.orm import Session
from ..models.utente import Utente
from ..schemas.utente import UtenteCreate, UtenteUpdate, UtenteUpdateProfilo, UtenteAdminUpdate
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
    ruolo = getattr(utente, "ruolo", None) or ("admin" if is_admin else "operatore")
    db_utente = Utente(
        username=utente.username,
        email=utente.email,
        hashed_password=hashed_password,
        is_admin=is_admin,
        ruolo=ruolo,
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


def update_profilo_utente(db: Session, utente_id: int, dati: UtenteUpdateProfilo):
    db_utente = get_utente(db, utente_id)
    if not db_utente:
        return None
    if dati.username is not None and dati.username != db_utente.username:
        db_utente.username = dati.username
    if dati.email is not None and dati.email != db_utente.email:
        db_utente.email = dati.email
    if dati.new_password is not None:
        db_utente.hashed_password = get_password_hash(dati.new_password)
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


def admin_update_utente(db: Session, utente_id: int, dati: UtenteAdminUpdate):
    """Aggiornamento completo da parte dell'admin: username, email, password, ruolo, stato."""
    db_utente = get_utente(db, utente_id)
    if not db_utente:
        return None
    if dati.username is not None:
        db_utente.username = dati.username
    if dati.email is not None:
        db_utente.email = dati.email
    if dati.password is not None:
        db_utente.hashed_password = get_password_hash(dati.password)
    if dati.is_admin is not None:
        db_utente.is_admin = dati.is_admin
    if dati.is_active is not None:
        db_utente.is_active = dati.is_active
    if dati.ruolo is not None:
        db_utente.ruolo = dati.ruolo
        # Keep is_admin in sync with ruolo
        if dati.is_admin is None:
            db_utente.is_admin = dati.ruolo == "admin"
    db.commit()
    db.refresh(db_utente)
    return db_utente
