from pydantic import BaseModel, field_validator
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
    barcode: Optional[str] = None
    cardtrader_blueprint_id: Optional[int] = None

    @field_validator("quantita", "quantita_minima")
    @classmethod
    def quantita_non_negativa(cls, v):
        if v is not None and v < 0:
            raise ValueError("La quantità non può essere negativa")
        return v

    @field_validator("prezzo_acquisto", "prezzo_vendita")
    @classmethod
    def prezzo_non_negativo(cls, v):
        if v is not None and v < 0:
            raise ValueError("Il prezzo non può essere negativo")
        return v


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
    barcode: Optional[str] = None
    cardtrader_blueprint_id: Optional[int] = None


class ProdottoResponse(ProdottoBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    foto_url: Optional[str] = None
    barcode_generated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
