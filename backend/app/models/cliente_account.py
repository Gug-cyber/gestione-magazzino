from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class ClienteAccount(Base):
    """Account cliente per l'e-commerce (login/registrazione)"""
    __tablename__ = "clienti_account"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    telefono = Column(String, nullable=True)
    indirizzo = Column(String, nullable=True)
    citta = Column(String, nullable=True)
    cap = Column(String, nullable=True)
    provincia = Column(String, nullable=True)
    paese = Column(String, default="Italia")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
