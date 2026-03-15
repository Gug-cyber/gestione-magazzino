import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
from ..database import get_db
from ..schemas.utente import (
    Token, UtenteCreate, UtenteResponse, UtenteUpdateProfilo,
    ForgotUsernameRequest, ForgotUsernameResponse,
    ForgotPasswordRequest, ForgotPasswordResponse,
    ResetPasswordRequest, UtenteCreateAdmin, UtenteAdminUpdate,
)
from ..crud import utente as crud
from ..crud import reset_token as crud_token
from ..auth import create_access_token, get_current_active_user, verify_password, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from ..email_utils import send_forgot_username_email, send_reset_password_email

router = APIRouter()


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    utente = crud.authenticate_utente(db, form_data.username, form_data.password)
    if not utente:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password errati",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not utente.is_active:
        raise HTTPException(status_code=400, detail="Utente non attivo")
    access_token = create_access_token(
        data={"sub": utente.username, "ruolo": utente.ruolo or "operatore"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UtenteResponse, status_code=201)
def register(
    utente: UtenteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Solo gli admin possono registrare nuovi utenti")
    if crud.get_utente_by_username(db, utente.username):
        raise HTTPException(status_code=400, detail="Username già in uso")
    if crud.get_utente_by_email(db, utente.email):
        raise HTTPException(status_code=400, detail="Email già in uso")
    return crud.create_utente(db, utente)


@router.get("/me", response_model=UtenteResponse)
def get_me(current_user=Depends(get_current_active_user)):
    return current_user


@router.put("/me", response_model=UtenteResponse)
def update_me(
    dati: UtenteUpdateProfilo,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    # Validate new_password requires current_password
    if dati.new_password is not None:
        if not dati.current_password:
            raise HTTPException(status_code=400, detail="La password attuale è obbligatoria per cambiare la password")
        if len(dati.new_password) < 8:
            raise HTTPException(status_code=400, detail="La nuova password deve contenere almeno 8 caratteri")
        if not verify_password(dati.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Password attuale non corretta")

    # Validate username uniqueness
    if dati.username is not None and dati.username != current_user.username:
        existing = crud.get_utente_by_username(db, dati.username)
        if existing:
            raise HTTPException(status_code=400, detail="Username già in uso")

    # Validate email uniqueness
    if dati.email is not None and dati.email != current_user.email:
        existing_email = crud.get_utente_by_email(db, dati.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email già in uso")

    utente_aggiornato = crud.update_profilo_utente(db, current_user.id, dati)
    return utente_aggiornato


@router.post("/logout")
def logout():
    return {"message": "Logout effettuato. Rimuovi il token lato client."}


@router.post("/forgot-username", response_model=ForgotUsernameResponse)
def forgot_username(body: ForgotUsernameRequest, db: Session = Depends(get_db)):
    utente = crud.get_utente_by_email(db, body.email)
    if not utente:
        raise HTTPException(status_code=404, detail="Nessun account trovato con questa email")
    email_sent = send_forgot_username_email(utente.email, utente.username)
    if email_sent:
        return {"username": None, "message": "Username inviato via email", "email_sent": True}
    return {"username": utente.username, "message": "Username trovato (email non configurata)", "email_sent": False}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    utente = crud.get_utente_by_email(db, body.email)
    if not utente:
        raise HTTPException(status_code=404, detail="Nessun account trovato con questa email")
    token_obj = crud_token.create_reset_token(db, utente.id)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token_obj.token}"
    email_sent = send_reset_password_email(utente.email, token_obj.token, reset_url)
    if email_sent:
        return {"reset_token": None, "message": "Link di reset inviato via email", "email_sent": True}
    return {
        "reset_token": token_obj.token,
        "message": "Usa questo token per reimpostare la password (email non configurata)",
        "email_sent": False,
    }


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_obj = crud_token.get_reset_token(db, body.token)
    if not token_obj:
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")
    if token_obj.used:
        raise HTTPException(status_code=400, detail="Token già utilizzato")
    now = datetime.now(timezone.utc)
    expires = token_obj.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nuova password deve contenere almeno 8 caratteri")
    utente = crud.get_utente(db, token_obj.utente_id)
    if not utente:
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")
    utente.hashed_password = get_password_hash(body.new_password)
    db.commit()
    crud_token.use_reset_token(db, token_obj)
    return {"message": "Password reimpostata con successo"}


@router.get("/utenti", response_model=List[UtenteResponse])
def get_utenti_admin(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accesso riservato agli amministratori")
    return crud.get_utenti(db)


@router.post("/utenti", response_model=UtenteResponse, status_code=201)
def create_utente_admin(
    utente: UtenteCreateAdmin,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accesso riservato agli amministratori")
    if crud.get_utente_by_username(db, utente.username):
        raise HTTPException(status_code=400, detail="Username già in uso")
    if crud.get_utente_by_email(db, utente.email):
        raise HTTPException(status_code=400, detail="Email già in uso")
    return crud.create_utente(db, utente, is_admin=utente.is_admin)


@router.put("/utenti/{utente_id}", response_model=UtenteResponse)
def update_utente_admin(
    utente_id: int,
    dati: UtenteAdminUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accesso riservato agli amministratori")
    if utente_id == current_user.id:
        raise HTTPException(status_code=400, detail="Non puoi modificare il tuo account da qui. Usa la pagina Profilo.")
    if dati.username:
        existing = crud.get_utente_by_username(db, dati.username)
        if existing and existing.id != utente_id:
            raise HTTPException(status_code=400, detail="Username già in uso")
    if dati.email:
        existing = crud.get_utente_by_email(db, dati.email)
        if existing and existing.id != utente_id:
            raise HTTPException(status_code=400, detail="Email già in uso")
    result = crud.admin_update_utente(db, utente_id, dati)
    if not result:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return result


@router.delete("/utenti/{utente_id}", status_code=204)
def delete_utente_admin(
    utente_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accesso riservato agli amministratori")
    if utente_id == current_user.id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare il tuo stesso account")
    if not crud.get_utente(db, utente_id):
        raise HTTPException(status_code=404, detail="Utente non trovato")
    crud.delete_utente(db, utente_id)
