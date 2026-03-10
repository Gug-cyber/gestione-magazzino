from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.movimento import TipoMovimento


class MovimentoBase(BaseModel):
    prodotto_id: int
    tipo: TipoMovimento
    quantita: int
    note: Optional[str] = None
    fornitore_id: Optional[int] = None


class MovimentoCreate(MovimentoBase):
    pass


class MovimentoUpdate(BaseModel):
    tipo: Optional[TipoMovimento] = None
    quantita: Optional[int] = None
    note: Optional[str] = None
    fornitore_id: Optional[int] = None


class MovimentoResponse(MovimentoBase):
    id: int
    data_movimento: Optional[datetime] = None

    class Config:
        from_attributes = True
