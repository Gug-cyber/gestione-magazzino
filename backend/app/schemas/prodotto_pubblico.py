from pydantic import BaseModel, Field
from typing import Optional, List


class ProdottoPubblicoBase(BaseModel):
    visibile: bool = True
    in_evidenza: bool = False
    ordine: int = 0
    descrizione_estesa: Optional[str] = None
    immagini: Optional[List[str]] = None  # Lista di URL
    seo_title: Optional[str] = Field(None, max_length=200)
    seo_description: Optional[str] = Field(None, max_length=300)


class ProdottoPubblicoCreate(ProdottoPubblicoBase):
    prodotto_id: int


class ProdottoPubblicoUpdate(ProdottoPubblicoBase):
    pass


class ProdottoPubblicoResponse(ProdottoPubblicoBase):
    id: int
    prodotto_id: int

    class Config:
        from_attributes = True
