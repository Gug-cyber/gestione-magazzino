from pydantic import BaseModel
from typing import Optional, List


class CategoriaBase(BaseModel):
    nome: str
    descrizione: Optional[str] = None
    parent_id: Optional[int] = None


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nome: Optional[str] = None
    descrizione: Optional[str] = None
    parent_id: Optional[int] = None


class CategoriaResponse(CategoriaBase):
    id: int

    class Config:
        from_attributes = True


class CategoriaTree(BaseModel):
    """Schema ricorsivo per restituire l'albero completo."""
    id: int
    nome: str
    descrizione: Optional[str] = None
    parent_id: Optional[int] = None
    figli: List['CategoriaTree'] = []

    class Config:
        from_attributes = True

CategoriaTree.model_rebuild()
