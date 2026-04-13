from pydantic import BaseModel, Field, validator
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
    posizione: Optional[str] = "top"

    @validator('data_inizio', 'data_fine', pre=True)
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v

    @validator('immagine_url', pre=True)
    def immagine_url_not_empty(cls, v):
        if v is None or v == '':
            raise ValueError('immagine_url è obbligatorio e non può essere vuoto')
        return v

    @validator('link_url', 'descrizione', pre=True)
    def empty_link_to_none(cls, v):
        if v == '':
            return None
        return v


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
    posizione: Optional[str] = None

    @validator('data_inizio', 'data_fine', pre=True)
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v

    @validator('link_url', 'descrizione', pre=True)
    def empty_link_to_none(cls, v):
        if v == '':
            return None
        return v


class BannerResponse(BannerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True