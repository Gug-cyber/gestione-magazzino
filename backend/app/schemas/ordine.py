from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import enum


class StatoOrdineSchema(str, enum.Enum):
    bozza = "bozza"
    confermato = "confermato"
    spedito = "spedito"
    completato = "completato"
    annullato = "annullato"
    reso = "reso"


class RigaOrdineCreate(BaseModel):
    prodotto_id: int
    quantita: int
    prezzo_unitario: float

    @field_validator("quantita")
    @classmethod
    def quantita_positiva(cls, v):
        if v <= 0:
            raise ValueError("La quantità deve essere maggiore di 0")
        return v

    @field_validator("prezzo_unitario")
    @classmethod
    def prezzo_non_negativo(cls, v):
        if v < 0:
            raise ValueError("Il prezzo unitario non può essere negativo")
        return v


class RigaOrdineResponse(RigaOrdineCreate):
    id: int
    subtotale: float
    prodotto_nome: Optional[str] = None
    prodotto_sku: Optional[str] = None

    class Config:
        from_attributes = True


class OrdineCreate(BaseModel):
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    note: Optional[str] = None
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None
    righe: List[RigaOrdineCreate]


class OrdineUpdate(BaseModel):
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    note: Optional[str] = None
    stato: Optional[StatoOrdineSchema] = None
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None


class OrdineStatoUpdate(BaseModel):
    stato: StatoOrdineSchema


class TrackingUpdateBody(BaseModel):
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None


class OrdineUpdateFull(BaseModel):
    """Schema per aggiornamento completo ordine (solo bozza) o transizione di stato."""
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    note: Optional[str] = None
    stato: Optional[StatoOrdineSchema] = None
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None
    righe: Optional[List[RigaOrdineCreate]] = None


class OrdineResponse(BaseModel):
    id: int
    numero_ordine: str
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    stato: str
    note: Optional[str] = None
    totale: float
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None
    data_ordine: Optional[datetime] = None
    data_completamento: Optional[datetime] = None
    righe: List[RigaOrdineResponse] = []

    class Config:
        from_attributes = True
