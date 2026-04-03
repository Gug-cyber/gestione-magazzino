from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Banner(Base):
    """
    Gestione banner/slider per homepage e-commerce.
    """
    __tablename__ = "banner"

    id = Column(Integer, primary_key=True, index=True)
    titolo = Column(String(200), nullable=False)
    descrizione = Column(String(500), nullable=True)
    immagine_url = Column(String(500), nullable=False)
    link_url = Column(String(500), nullable=True)
    ordine = Column(Integer, default=0)
    attivo = Column(Boolean, default=True)
    data_inizio = Column(DateTime(timezone=True), nullable=True)
    data_fine = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
