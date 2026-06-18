"""Modello DB per preferiti clienti."""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Preferito(Base):
    __tablename__ = "preferiti"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti_account.id"), nullable=False)
    prodotto_id = Column(Integer, nullable=False)
    nome_prodotto = Column(String(255), nullable=False)
    prezzo = Column(Float, nullable=True)
    immagine_url = Column(String(500), nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    # Relazioni
    cliente = relationship("ClienteAccount", back_populates="preferiti")