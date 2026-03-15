from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class RigaFornituraCreate(BaseModel):
    prodotto_id: int
    quantita: int
    prezzo_unitario: float


class RigaFornituraResponse(BaseModel):
    id: int
    prodotto_id: int
    quantita: int
    prezzo_unitario: float
    subtotale: float
    prodotto_nome: Optional[str] = None
    prodotto_sku: Optional[str] = None

    model_config = {"from_attributes": True}


class FornituraCreate(BaseModel):
    fornitore_id: Optional[int] = None
    fornitore_nome: Optional[str] = None
    note: Optional[str] = None
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None
    righe: List[RigaFornituraCreate]


class FornituraUpdate(BaseModel):
    stato: Optional[str] = None
    note: Optional[str] = None
    fornitore_id: Optional[int] = None
    fornitore_nome: Optional[str] = None
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None


class FornituraResponse(BaseModel):
    id: int
    numero_fornitura: str
    fornitore_id: Optional[int] = None
    fornitore_nome: Optional[str] = None
    stato: str
    note: Optional[str] = None
    data_fornitura: Optional[datetime] = None
    data_ricezione: Optional[datetime] = None
    totale: float
    corriere: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: Optional[datetime] = None
    righe: List[RigaFornituraResponse] = []

    model_config = {"from_attributes": True}
