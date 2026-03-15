from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UtenteBase(BaseModel):
    username: str
    email: str


class UtenteCreate(UtenteBase):
    password: str


class UtenteUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UtenteResponse(UtenteBase):
    id: int
    is_active: bool
    is_admin: bool
    ruolo: str = "operatore"
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UtenteLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UtenteUpdateProfilo(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class ForgotUsernameRequest(BaseModel):
    email: str


class ForgotUsernameResponse(BaseModel):
    username: Optional[str] = None
    message: str
    email_sent: bool


class ForgotPasswordRequest(BaseModel):
    email: str


class ForgotPasswordResponse(BaseModel):
    reset_token: Optional[str] = None
    message: str
    email_sent: bool


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UtenteCreateAdmin(BaseModel):
    """Usato dall'admin per creare un nuovo utente, con controllo del ruolo."""
    username: str
    email: str
    password: str
    is_admin: bool = False
    ruolo: Optional[str] = "operatore"


class UtenteAdminUpdate(BaseModel):
    """Usato dall'admin per modificare un utente esistente."""
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    ruolo: Optional[str] = None
