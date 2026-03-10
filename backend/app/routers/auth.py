from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..schemas.utente import Token, UtenteCreate, UtenteResponse, UtenteUpdateProfilo
from ..crud import utente as crud
from ..auth import create_access_token, get_current_active_user, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES

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
        data={"sub": utente.username},
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

    utente_aggiornato = crud.update_profilo_utente(db, current_user.id, dati)
    return utente_aggiornato


@router.post("/logout")
def logout():
    return {"message": "Logout effettuato. Rimuovi il token lato client."}
