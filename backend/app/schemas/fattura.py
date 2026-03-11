from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import enum


class TipoFatturaSchema(str, enum.Enum):
    attiva = "attiva"
    passiva = "passiva"


class FatturaBase(BaseModel):
    numero_fattura: str
    data_fattura: date
    cliente: str
    importo: float
    tipo: TipoFatturaSchema
    pagata: bool = False
    note: Optional[str] = None


class FatturaCreate(FatturaBase):
    pass


class FatturaUpdate(BaseModel):
    numero_fattura: Optional[str] = None
    data_fattura: Optional[date] = None
    cliente: Optional[str] = None
    importo: Optional[float] = None
    tipo: Optional[TipoFatturaSchema] = None
    pagata: Optional[bool] = None
    note: Optional[str] = None


class FatturaResponse(FatturaBase):
    id: int
    file_path: Optional[str] = None
    nome_file: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
