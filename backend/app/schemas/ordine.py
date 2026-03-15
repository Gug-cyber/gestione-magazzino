from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import enum


class StatoOrdineSchema(str, enum.Enum):
    bozza = "bozza"
    confermato = "confermato"
    spedito = "spedito"
    completato = "completato"
    annullato = "annullato"


class RigaOrdineCreate(BaseModel):
    prodotto_id: int
    quantita: int
    prezzo_unitario: float


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
    fornitore_id: Optional[int] = None
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


class OrdineResponse(BaseModel):
    id: int
    numero_ordine: str
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    fornitore_id: Optional[int] = None
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
