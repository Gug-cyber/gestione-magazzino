from pydantic import BaseModel
from typing import Optional

class FornitoreBase(BaseModel):
    nome: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    partita_iva: Optional[str] = None
    note: Optional[str] = None

class FornitoreCreate(FornitoreBase):
    pass

class FornitoreUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    partita_iva: Optional[str] = None
    note: Optional[str] = None

class FornitoreResponse(FornitoreBase):
    id: int

    class Config:
        from_attributes = True