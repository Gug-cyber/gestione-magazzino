from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas.categoria import (
    CategoriaCreate, CategoriaUpdate, CategoriaResponse,
    CategoriaTree, CategoriaReorder, CategoriaBreadcrumb,
)
from ..crud import categoria as crud
from ..auth import get_current_active_user

router = APIRouter()


def _to_response(cat) -> CategoriaResponse:
    return CategoriaResponse(
        id=cat.id,
        nome=cat.nome,
        descrizione=cat.descrizione,
        parent_id=cat.parent_id,
        slug=cat.slug,
        level=cat.level,
        sort_order=cat.sort_order,
        is_active=cat.is_active,
        show_in_store=cat.show_in_store,
        show_in_warehouse=cat.show_in_warehouse,
        metadata=cat.get_metadata(),
    )


def _to_tree(cat) -> CategoriaTree:
    return CategoriaTree(
        id=cat.id,
        nome=cat.nome,
        descrizione=cat.descrizione,
        parent_id=cat.parent_id,
        slug=cat.slug,
        level=cat.level,
        sort_order=cat.sort_order,
        is_active=cat.is_active,
        show_in_store=cat.show_in_store,
        show_in_warehouse=cat.show_in_warehouse,
        metadata=cat.get_metadata(),
        figli=[_to_tree(f) for f in (cat.figli or [])],
    )


@router.get("/tree", response_model=List[CategoriaTree])
def get_categorie_tree(
    only_active: Optional[bool] = Query(None),
    show_in_store: Optional[bool] = Query(None),
    show_in_warehouse: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Restituisce l'albero completo delle categorie con figli annidati."""
    roots = crud.build_tree(db, only_active=only_active, show_in_store=show_in_store, show_in_warehouse=show_in_warehouse)
    return [_to_tree(r) for r in roots]


@router.get("/validate", response_model=List[str])
def validate_tree(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Valida l'integrità dell'albero categorie."""
    return crud.validate_tree(db)


@router.get("/", response_model=List[CategoriaResponse])
def get_categorie(
    skip: int = 0,
    limit: int = 1000,
    only_active: Optional[bool] = Query(None),
    show_in_store: Optional[bool] = Query(None),
    show_in_warehouse: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    cats = crud.get_categorie(db, skip=skip, limit=limit, only_active=only_active, show_in_store=show_in_store, show_in_warehouse=show_in_warehouse)
    return [_to_response(c) for c in cats]


@router.get("/{categoria_id}/breadcrumb", response_model=List[CategoriaBreadcrumb])
def get_breadcrumb(
    categoria_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Restituisce il percorso dalla radice alla categoria (breadcrumb)."""
    path = crud.build_category_path(db, categoria_id)
    if not path:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    return path


@router.get("/{categoria_id}/descendants", response_model=List[int])
def get_descendants(
    categoria_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Restituisce tutti gli ID dei discendenti della categoria."""
    if not crud.get_categoria(db, categoria_id):
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    return crud.get_descendant_ids(db, categoria_id)


@router.get("/{categoria_id}", response_model=CategoriaResponse)
def get_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    db_categoria = crud.get_categoria(db, categoria_id)
    if not db_categoria:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    return _to_response(db_categoria)


@router.post("/", response_model=CategoriaResponse, status_code=201)
def create_categoria(
    categoria: CategoriaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return _to_response(crud.create_categoria(db, categoria))


@router.put("/{categoria_id}", response_model=CategoriaResponse)
def update_categoria(
    categoria_id: int,
    categoria: CategoriaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    try:
        db_categoria = crud.update_categoria(db, categoria_id, categoria)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not db_categoria:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    return _to_response(db_categoria)


@router.delete("/{categoria_id}", status_code=204)
def delete_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not crud.delete_categoria(db, categoria_id):
        raise HTTPException(status_code=404, detail="Categoria non trovata")


@router.post("/{categoria_id}/reorder", response_model=CategoriaResponse)
def reorder_categoria(
    categoria_id: int,
    data: CategoriaReorder,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Riordina o sposta una categoria nell'albero."""
    try:
        db_categoria = crud.reorder_categoria(db, categoria_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not db_categoria:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    return _to_response(db_categoria)


