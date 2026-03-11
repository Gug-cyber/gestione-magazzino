from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


class ProdottoBase(BaseModel):
    nome: str
    descrizione: Optional[str] = None
    sku: str
    quantita: int = 0
    quantita_minima: int = 0
    prezzo_acquisto: Optional[Decimal] = None
    prezzo_vendita: Optional[Decimal] = None
    categoria_id: Optional[int] = None
    ubicazione_id: Optional[int] = None
    stato_conservazione: Optional[str] = None
    lingua: Optional[str] = None
    foto_path: Optional[str] = None


class ProdottoCreate(ProdottoBase):
    pass


class ProdottoUpdate(BaseModel):
    nome: Optional[str] = None
    descrizione: Optional[str] = None
    sku: Optional[str] = None
    quantita: Optional[int] = None
    quantita_minima: Optional[int] = None
    prezzo_acquisto: Optional[Decimal] = None
    prezzo_vendita: Optional[Decimal] = None
    categoria_id: Optional[int] = None
    ubicazione_id: Optional[int] = None
    stato_conservazione: Optional[str] = None
    lingua: Optional[str] = None


class ProdottoResponse(ProdottoBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    foto_url: Optional[str] = None

    class Config:
        from_attributes = True
