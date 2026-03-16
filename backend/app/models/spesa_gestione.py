from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean
from sqlalchemy.sql import func
from ..database import Base


class SpesaGestione(Base):
    __tablename__ = "spese_gestione"

    id = Column(Integer, primary_key=True, index=True)
    descrizione = Column(String(200), nullable=False)
    importo = Column(Numeric(10, 2), nullable=False)
    categoria = Column(String(100), nullable=True)
    ricorrente = Column(Boolean, default=False)
    data = Column(DateTime(timezone=True), server_default=func.now())
    # Reference to the supply that generated this expense (for idempotent upsert)
    fornitura_id = Column(Integer, nullable=True, index=True)
