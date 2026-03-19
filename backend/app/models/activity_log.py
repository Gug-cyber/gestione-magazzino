from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from ..database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    utente_id = Column(Integer, ForeignKey("utenti.id"), nullable=True)
    username = Column(String(100), nullable=True)
    azione = Column(String(100), nullable=False)
    entita = Column(String(100), nullable=True)
    entita_id = Column(Integer, nullable=True)
    dettagli = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    eseguito_il = Column(DateTime(timezone=True), server_default=func.now(), index=True)
