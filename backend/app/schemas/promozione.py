from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PromozioneBase(BaseModel):
    nome: str
    tipo: str  # "percentage" | "fixed"
    valore: float
    prodotto_id: Optional[int] = None
    categoria_id: Optional[int] = None
    data_inizio: Optional[datetime] = None
    data_fine: Optional[datetime] = None
    is_active: bool = True


class PromozioneCreate(PromozioneBase):
    pass


class PromozioneUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    valore: Optional[float] = None
    prodotto_id: Optional[int] = None
    categoria_id: Optional[int] = None
    data_inizio: Optional[datetime] = None
    data_fine: Optional[datetime] = None
    is_active: Optional[bool] = None


class PromozioneResponse(PromozioneBase):
    id: int
    created_at: Optional[datetime] = None
    prodotto_nome: Optional[str] = None
    categoria_nome: Optional[str] = None

    class Config:
        from_attributes = True
