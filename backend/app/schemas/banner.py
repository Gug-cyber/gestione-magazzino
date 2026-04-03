from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BannerBase(BaseModel):
    titolo: str = Field(..., max_length=200)
    descrizione: Optional[str] = Field(None, max_length=500)
    immagine_url: str = Field(..., max_length=500)
    link_url: Optional[str] = Field(None, max_length=500)
    ordine: int = 0
    attivo: bool = True
    data_inizio: Optional[datetime] = None
    data_fine: Optional[datetime] = None


class BannerCreate(BannerBase):
    pass


class BannerUpdate(BaseModel):
    titolo: Optional[str] = Field(None, max_length=200)
    descrizione: Optional[str] = Field(None, max_length=500)
    immagine_url: Optional[str] = Field(None, max_length=500)
    link_url: Optional[str] = Field(None, max_length=500)
    ordine: Optional[int] = None
    attivo: Optional[bool] = None
    data_inizio: Optional[datetime] = None
    data_fine: Optional[datetime] = None


class BannerResponse(BannerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
