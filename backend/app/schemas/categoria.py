from pydantic import BaseModel
from typing import Optional


class CategoriaBase(BaseModel):
    nome: str
    descrizione: Optional[str] = None


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nome: Optional[str] = None
    descrizione: Optional[str] = None


class CategoriaResponse(CategoriaBase):
    id: int

    class Config:
        from_attributes = True
