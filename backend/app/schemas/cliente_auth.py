"""Schemas Pydantic per autenticazione clienti, ordini e preferiti."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# === AUTH SCHEMAS ===

class ClienteRegistrazione(BaseModel):
    email: EmailStr
    password: str
    nome: str
    cognome: str
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None


class ClienteLogin(BaseModel):
    email: EmailStr
    password: str


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
    is_active: bool
    created_at: datetime

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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    cliente: ClienteResponse


# === ORDINI SCHEMAS ===

class ItemOrdineSchema(BaseModel):
    prodotto_id: int
    nome_prodotto: str
    quantita: int = 1
    prezzo_unitario: float
    immagine_url: Optional[str] = None


class CreaOrdineSchema(BaseModel):
    items: List[ItemOrdineSchema]
    indirizzo_spedizione: Optional[str] = None
    note: Optional[str] = None


class ItemOrdineResponse(BaseModel):
    id: int
    prodotto_id: int
    nome_prodotto: str
    quantita: int
    prezzo_unitario: float
    immagine_url: Optional[str] = None

    class Config:
        from_attributes = True


class OrdineResponse(BaseModel):
    id: int
    numero_ordine: str
    stato: str
    totale: float
    indirizzo_spedizione: Optional[str] = None
    note: Optional[str] = None
    motivo_reso: Optional[str] = None
    data_ordine: datetime
    data_spedizione: Optional[datetime] = None
    data_consegna: Optional[datetime] = None
    data_richiesta_reso: Optional[datetime] = None
    items: List[ItemOrdineResponse] = []

    class Config:
        from_attributes = True


class RichiestaReso(BaseModel):
    motivo: str


# === PREFERITI SCHEMAS ===

class PreferitoCreate(BaseModel):
    prodotto_id: int
    nome_prodotto: str
    prezzo: Optional[float] = None
    immagine_url: Optional[str] = None


class PreferitoResponse(BaseModel):
    id: int
    prodotto_id: int
    nome_prodotto: str
    prezzo: Optional[float] = None
    immagine_url: Optional[str] = None
    added_at: datetime

    class Config:
        from_attributes = True