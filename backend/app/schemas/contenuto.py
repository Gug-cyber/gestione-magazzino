from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ContenutoBase(BaseModel):
    titolo: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=200)
    tipo: str = Field(..., max_length=50)  # pagina, blog, news
    contenuto_html: Optional[str] = None
    meta_description: Optional[str] = Field(None, max_length=300)
    meta_keywords: Optional[str] = Field(None, max_length=300)
    pubblicato: bool = False
    data_pubblicazione: Optional[datetime] = None


class ContenutoCreate(ContenutoBase):
    pass


class ContenutoUpdate(BaseModel):
    titolo: Optional[str] = Field(None, max_length=200)
    slug: Optional[str] = Field(None, max_length=200)
    tipo: Optional[str] = Field(None, max_length=50)
    contenuto_html: Optional[str] = None
    meta_description: Optional[str] = Field(None, max_length=300)
    meta_keywords: Optional[str] = Field(None, max_length=300)
    pubblicato: Optional[bool] = None
    data_pubblicazione: Optional[datetime] = None


class ContenutoResponse(ContenutoBase):
    id: int
    autore_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
