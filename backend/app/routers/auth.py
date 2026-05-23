import logging
import os
import io
import base64
from typing import List
import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from joserfc.errors import JoseError
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
from ..database import get_db
from ..schemas.utente import (
    LoginResponse, Token, UtenteCreate, UtenteResponse, UtenteUpdateProfilo,
    ForgotUsernameRequest, ForgotUsernameResponse,
    ForgotPasswordRequest, ForgotPasswordResponse,
    ResetPasswordRequest, UtenteCreateAdmin, UtenteAdminUpdate,
    TwoFactorDisableRequest, TwoFactorLoginRequest,
    TwoFactorSetupResponse, TwoFactorVerifySetupRequest,
)
from ..crud import utente as crud
from ..crud import reset_token as crud_token
from ..crud.activity_log import log_activity
from ..auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    TWO_FACTOR_TEMP_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    decode_token_claims,
    get_current_active_user,
    get_password_hash,
    verify_password,
)
from ..limiter import limiter

logger = logging.getLogger(__name__)
from ..email_utils import send_forgot_username_email, send_reset_password_email

router = APIRouter()


def _normalize_otp_code(code: str) -> str:
    return "".join(ch for ch in code if ch.isdigit())


def _build_qr_code_data_url(otpauth_uri: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(otpauth_uri)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):  # noqa: ARG001 – request is required by slowapi for rate limiting
    utente = crud.authenticate_utente(db, form_data.username, form_data.password)
    if not utente:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password errati",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not utente.is_active:
        raise HTTPException(status_code=400, detail="Utente non attivo")
    if utente.totp_enabled and utente.totp_secret:
        temporary_token = create_access_token(
            data={
                "sub": utente.username,
                "token_type": "2fa_pending",
            },
            expires_delta=timedelta(minutes=TWO_FACTOR_TEMP_TOKEN_EXPIRE_MINUTES),
        )
        return {
            "requires_2fa": True,
            "temporary_token": temporary_token,
        }
    access_token = create_access_token(
        data={"sub": utente.username, "ruolo": utente.ruolo or "operatore", "token_type": "access"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    try:
        log_activity(db, azione="login", utente_id=utente.id, username=utente.username)
    except Exception as e:
        logger.warning("log_activity failed: %s", e)
    return {"access_token": access_token, "token_type": "bearer"}  # nosec B105 – "bearer" is the standard OAuth2 token type, not a password


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_two_factor(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    current_user.totp_enabled = False
    db.commit()
    otpauth_uri = pyotp.TOTP(secret).provisioning_uri(
        name=current_user.username,
        issuer_name="Gestione Magazzino",
    )
    return {"qr_code_data_url": _build_qr_code_data_url(otpauth_uri)}


@router.post("/2fa/verify-setup")
def verify_two_factor_setup(
    body: TwoFactorVerifySetupRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Configura prima il 2FA")
    otp_code = _normalize_otp_code(body.otp_code)
    if len(otp_code) != 6:
        raise HTTPException(status_code=400, detail="Codice OTP non valido")
    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(otp_code, valid_window=1):
        raise HTTPException(status_code=400, detail="Codice OTP non valido o scaduto")
    current_user.totp_enabled = True
    db.commit()
    return {"message": "2FA attivato correttamente"}


@router.post("/2fa/disable")
def disable_two_factor(
    body: TwoFactorDisableRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA non attivo")
    if not body.password and not body.otp_code:
        raise HTTPException(status_code=400, detail="Inserisci password o codice OTP per confermare")

    if body.password:
        if not verify_password(body.password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Password non corretta")
    elif body.otp_code:
        otp_code = _normalize_otp_code(body.otp_code)
        if len(otp_code) != 6:
            raise HTTPException(status_code=400, detail="Codice OTP non valido")
        if not current_user.totp_secret:
            raise HTTPException(status_code=400, detail="Segreto 2FA non configurato")
        totp = pyotp.TOTP(current_user.totp_secret)
        if not totp.verify(otp_code, valid_window=1):
            raise HTTPException(status_code=400, detail="Codice OTP non valido o scaduto")

    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()
    return {"message": "2FA disabilitato"}


@router.post("/2fa/login", response_model=Token)
def two_factor_login(
    body: TwoFactorLoginRequest,
    db: Session = Depends(get_db),
):
    try:
        claims = decode_token_claims(body.temporary_token)
    except JoseError:
        raise HTTPException(status_code=401, detail="Token temporaneo non valido o scaduto")

    if claims.get("token_type") != "2fa_pending":
        raise HTTPException(status_code=401, detail="Token temporaneo non valido o scaduto")
    username = claims.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Token temporaneo non valido o scaduto")

    utente = crud.get_utente_by_username(db, username)
    if not utente or not utente.is_active:
        raise HTTPException(status_code=401, detail="Token temporaneo non valido o scaduto")
    if not utente.totp_enabled or not utente.totp_secret:
        raise HTTPException(status_code=400, detail="2FA non attivo per questo utente")

    otp_code = _normalize_otp_code(body.otp_code)
    if len(otp_code) != 6:
        raise HTTPException(status_code=400, detail="Codice OTP non valido")
    if not pyotp.TOTP(utente.totp_secret).verify(otp_code, valid_window=1):
        raise HTTPException(status_code=400, detail="Codice OTP non valido o scaduto")

    access_token = create_access_token(
        data={"sub": utente.username, "ruolo": utente.ruolo or "operatore", "token_type": "access"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    try:
        log_activity(db, azione="login", utente_id=utente.id, username=utente.username)
    except Exception as e:
        logger.warning("log_activity failed: %s", e)
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
def logout(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    try:
        log_activity(db, azione="logout", utente_id=current_user.id, username=current_user.username)
    except Exception as e:
        logger.warning("log_activity failed: %s", e)
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
        return {"reset_token": None, "message": "Link di reset inviato via email", "email_sent": True}  # nosec B105 – None is not a password; key name triggers false positive
    # Token is never returned in the API response — it is only delivered via email.
    # If email is not configured, instruct the admin to configure it.
    return {
        "reset_token": None,  # nosec B105 – never expose the token in the API response
        "message": "Token di reset generato. Configura il servizio email per inviarlo all'utente.",
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
    nuovo = crud.create_utente(db, utente, is_admin=utente.is_admin)
    try:
        log_activity(db, azione="crea_utente", utente_id=current_user.id, username=current_user.username, entita="utente", entita_id=nuovo.id, dettagli=nuovo.username)
    except Exception as e:
        logger.warning("log_activity failed: %s", e)
    return nuovo


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
    target = crud.get_utente(db, utente_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    target_username = target.username
    crud.delete_utente(db, utente_id)
    try:
        log_activity(db, azione="elimina_utente", utente_id=current_user.id, username=current_user.username, entita="utente", entita_id=utente_id, dettagli=target_username)
    except Exception as e:
        logger.warning("log_activity failed: %s", e)
