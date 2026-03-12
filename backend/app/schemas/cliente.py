from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ClienteBase(BaseModel):
    nome: str
    cognome: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    partita_iva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    tipo: str = "privato"
    note: Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    partita_iva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    tipo: Optional[str] = None
    note: Optional[str] = None


class ClienteResponse(ClienteBase):
    id: int
    created_at: Optional[datetime] = None
    num_fatture: int = 0
    totale_speso: float = 0.0
    ultima_fattura: Optional[str] = None
    num_ordini: int = 0
    totale_ordini: float = 0.0
    num_ordini_completati: int = 0
    ultimo_ordine: Optional[str] = None

    class Config:
        from_attributes = True


class FatturaStorico(BaseModel):
    id: int
    numero_fattura: str
    data_fattura: str
    importo: float
    tipo: str
    pagata: bool
    note: Optional[str] = None
    nome_file: Optional[str] = None

    class Config:
        from_attributes = True


class OrdineStorico(BaseModel):
    id: int
    numero_ordine: str
    data_ordine: Optional[str] = None
    stato: str
    totale: float
    note: Optional[str] = None

    class Config:
        from_attributes = True


class ClienteConStorico(ClienteResponse):
    fatture: List[FatturaStorico] = []
    ordini: List[OrdineStorico] = []
