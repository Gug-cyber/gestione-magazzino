from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class DatoStoricoCreate(BaseModel):
    tipo: str            # "costo" o "ricavo"
    data: date
    importo: float
    descrizione: Optional[str] = None
    categoria: Optional[str] = None


class DatoStoricoResponse(BaseModel):
    id: int
    tipo: str
    data: date
    importo: float
    descrizione: Optional[str]
    categoria: Optional[str]
    creato_il: Optional[datetime]

    model_config = {"from_attributes": True}
