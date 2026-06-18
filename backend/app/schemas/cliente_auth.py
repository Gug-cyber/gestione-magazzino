from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# --- Auth schemas ---
class ClienteRegistrazione(BaseModel):
    email: str
    password: str
    nome: str
    cognome: str
    telefono: Optional[str] = None


class ClienteLogin(BaseModel):
    email: str
    password: str


class ClienteToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "ClienteResponse"


class ClienteResponse(BaseModel):
    id: int
    email: str
    nome: str
    cognome: str
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    paese: Optional[str] = "Italia"
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    paese: Optional[str] = None


class ClienteChangePassword(BaseModel):
    current_password: str
    new_password: str


# --- Order schemas ---
class RigaOrdineEcommerceResponse(BaseModel):
    id: int
    prodotto_id: Optional[int] = None
    nome_prodotto: str
    immagine_url: Optional[str] = None
    quantita: int
    prezzo_unitario: float
    subtotale: float

    class Config:
        from_attributes = True


class OrdineEcommerceResponse(BaseModel):
    id: int
    numero_ordine: str
    stato: str
    totale: float
    subtotale: float
    spese_spedizione: float
    metodo_pagamento: Optional[str] = None
    indirizzo_spedizione: Optional[str] = None
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None
    data_ordine: Optional[datetime] = None
    data_spedizione: Optional[datetime] = None
    data_consegna: Optional[datetime] = None
    reso_richiesto_il: Optional[datetime] = None
    reso_motivo: Optional[str] = None
    note: Optional[str] = None
    righe: list[RigaOrdineEcommerceResponse] = []
    reso_disponibile: bool = False  # Calcolato: True se entro 14 giorni dalla consegna

    class Config:
        from_attributes = True


class OrdineEcommerceListResponse(BaseModel):
    id: int
    numero_ordine: str
    stato: str
    totale: float
    data_ordine: Optional[datetime] = None
    data_consegna: Optional[datetime] = None
    reso_disponibile: bool = False

    class Config:
        from_attributes = True


class RichiestaReso(BaseModel):
    motivo: str


# --- Favorites schemas ---
class PreferitoCreate(BaseModel):
    prodotto_id: int
    nome_prodotto: Optional[str] = None
    immagine_url: Optional[str] = None
    prezzo: Optional[float] = None


class PreferitoResponse(BaseModel):
    id: int
    prodotto_id: int
    nome_prodotto: Optional[str] = None
    immagine_url: Optional[str] = None
    prezzo: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Fix forward reference
ClienteToken.model_rebuild()
