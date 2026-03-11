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
    tipo_documento: str = "fattura"
    imponibile: Optional[float] = None
    aliquota_iva: Optional[float] = None
    importo_iva: Optional[float] = None
    ordine_id: Optional[int] = None
    nota_credito_di: Optional[int] = None
    annullata: bool = False
    auto_generata: bool = False


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
    cliente_id: Optional[int] = None
    tipo_documento: Optional[str] = None
    imponibile: Optional[float] = None
    aliquota_iva: Optional[float] = None
    importo_iva: Optional[float] = None
    annullata: Optional[bool] = None


class FatturaResponse(FatturaBase):
    id: int
    file_path: Optional[str] = None
    nome_file: Optional[str] = None
    cliente_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
