from pydantic import BaseModel
from typing import Optional


class UbicazioneBase(BaseModel):
    nome: str
    zona: Optional[str] = None
    scaffale: Optional[str] = None
    piano: Optional[int] = None


class UbicazioneCreate(UbicazioneBase):
    pass


class UbicazioneUpdate(BaseModel):
    nome: Optional[str] = None
    zona: Optional[str] = None
    scaffale: Optional[str] = None
    piano: Optional[int] = None


class UbicazioneResponse(UbicazioneBase):
    id: int

    class Config:
        from_attributes = True
