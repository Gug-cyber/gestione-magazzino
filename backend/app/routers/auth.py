from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..schemas.utente import Token, UtenteCreate, UtenteResponse
from ..crud import utente as crud
from ..auth import create_access_token, get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES

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


@router.post("/logout")
def logout():
    return {"message": "Logout effettuato. Rimuovi il token lato client."}
