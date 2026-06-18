"""Modello DB per account clienti e-commerce."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class ClienteAccount(Base):
    __tablename__ = "clienti_account"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nome = Column(String(100), nullable=False)
    cognome = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=True)
    indirizzo = Column(String(255), nullable=True)
    citta = Column(String(100), nullable=True)
    cap = Column(String(10), nullable=True)
    provincia = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relazioni
    ordini = relationship("OrdineEcommerce", back_populates="cliente")
    preferiti = relationship("Preferito", back_populates="cliente")