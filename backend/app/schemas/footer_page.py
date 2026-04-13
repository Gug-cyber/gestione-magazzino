from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FooterPageResponse(BaseModel):
    id: int
    slug: str
    titolo: str
    sezione: str
    contenuto: Optional[str] = None
    abilitato: bool
    ordine: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FooterPageCreate(BaseModel):
    slug: str
    titolo: str
    sezione: str
    contenuto: Optional[str] = None
    abilitato: bool = True
    ordine: int = 0


class FooterPageUpdate(BaseModel):
    titolo: Optional[str] = None
    sezione: Optional[str] = None
    contenuto: Optional[str] = None
    abilitato: Optional[bool] = None
    ordine: Optional[int] = None
