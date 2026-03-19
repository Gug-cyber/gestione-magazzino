from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Optional, List

from ..database import get_db
from ..auth import get_current_active_user
from ..crud.activity_log import get_logs
from ..schemas.activity_log import ActivityLogResponse

router = APIRouter()


@router.get("/", response_model=List[ActivityLogResponse])
def list_logs(
    skip: int = Query(0),
    limit: int = Query(50),
    utente_id: Optional[int] = Query(None),
    azione: Optional[str] = Query(None),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Solo gli admin possono vedere tutti i log")
    items, total = get_logs(db, skip=skip, limit=limit, utente_id=utente_id, azione=azione)
    response.headers["X-Total-Count"] = str(total)
    return items


@router.get("/me", response_model=List[ActivityLogResponse])
def my_logs(
    skip: int = Query(0),
    limit: int = Query(20),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    items, total = get_logs(db, skip=skip, limit=limit, utente_id=current_user.id)
    response.headers["X-Total-Count"] = str(total)
    return items
