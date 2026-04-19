import re
import unicodedata
from pydantic import BaseModel
from typing import Any, Dict, List, Optional


def _slugify(text: str) -> str:
    """Genera uno slug da un testo, gestendo caratteri accentati italiani."""
    # Normalizza unicode (decompone i caratteri accentati)
    text = unicodedata.normalize("NFD", text)
    # Rimuovi i diacritici
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s]+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text


class CategoriaBase(BaseModel):
    nome: str
    descrizione: Optional[str] = None
    parent_id: Optional[int] = None
    slug: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    show_in_store: bool = True
    show_in_warehouse: bool = True
    metadata: Dict[str, Any] = {}


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nome: Optional[str] = None
    descrizione: Optional[str] = None
    parent_id: Optional[int] = None
    slug: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    show_in_store: Optional[bool] = None
    show_in_warehouse: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class CategoriaResponse(BaseModel):
    id: int
    nome: str
    descrizione: Optional[str] = None
    parent_id: Optional[int] = None
    slug: Optional[str] = None
    level: int = 0
    sort_order: int = 0
    is_active: bool = True
    show_in_store: bool = True
    show_in_warehouse: bool = True
    metadata: Dict[str, Any] = {}

    model_config = {"from_attributes": True}


class CategoriaTree(BaseModel):
    """Schema ricorsivo per restituire l'albero completo."""
    id: int
    nome: str
    descrizione: Optional[str] = None
    parent_id: Optional[int] = None
    slug: Optional[str] = None
    level: int = 0
    sort_order: int = 0
    is_active: bool = True
    show_in_store: bool = True
    show_in_warehouse: bool = True
    metadata: Dict[str, Any] = {}
    figli: List['CategoriaTree'] = []

    model_config = {"from_attributes": True}


CategoriaTree.model_rebuild()


class CategoriaReorder(BaseModel):
    new_parent_id: Optional[int] = None
    new_sort_order: int = 0


class CategoriaBreadcrumb(BaseModel):
    id: int
    nome: str
    slug: Optional[str] = None
    level: int = 0

    model_config = {"from_attributes": True}


