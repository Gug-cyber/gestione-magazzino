from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from ..database import Base


class DatiAzienda(Base):
    __tablename__ = "dati_azienda"

    id = Column(Integer, primary_key=True, index=True)
    ragione_sociale = Column(String(255), nullable=False)
    partita_iva = Column(String(20), nullable=False)
    codice_fiscale = Column(String(20))
    indirizzo = Column(String(255))
    citta = Column(String(100))
    cap = Column(String(10))
    provincia = Column(String(2))
    nazione = Column(String(100), default="Italia")
    telefono = Column(String(50))
    email = Column(String(255))
    pec = Column(String(255))
    sito_web = Column(String(255))
    iban = Column(String(50))
    codice_sdi = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
