from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActivityLogResponse(BaseModel):
    id: int
    utente_id: Optional[int] = None
    username: Optional[str] = None
    azione: str
    entita: Optional[str] = None
    entita_id: Optional[int] = None
    dettagli: Optional[str] = None
    ip_address: Optional[str] = None
    eseguito_il: datetime
    model_config = {"from_attributes": True}
