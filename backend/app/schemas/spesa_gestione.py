from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SpesaGestioneCreate(BaseModel):
    descrizione: str
    importo: float
    categoria: Optional[str] = None
    ricorrente: bool = False
    data: Optional[datetime] = None


class SpesaGestioneUpdate(BaseModel):
    descrizione: Optional[str] = None
    importo: Optional[float] = None
    categoria: Optional[str] = None
    ricorrente: Optional[bool] = None
    data: Optional[datetime] = None


class SpesaGestioneResponse(BaseModel):
    id: int
    descrizione: str
    importo: float
    categoria: Optional[str]
    ricorrente: bool
    data: Optional[datetime]

    model_config = {"from_attributes": True}
