from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Contenuto(Base):
    """
    Gestione contenuti CMS (pagine statiche, blog, news).
    """
    __tablename__ = "contenuti"

    id = Column(Integer, primary_key=True, index=True)
    titolo = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    tipo = Column(String(50), nullable=False)  # pagina, blog, news
    contenuto_html = Column(Text, nullable=True)
    meta_description = Column(String(300), nullable=True)
    meta_keywords = Column(String(300), nullable=True)
    pubblicato = Column(Boolean, default=False)
    data_pubblicazione = Column(DateTime(timezone=True), nullable=True)
    autore_id = Column(Integer, ForeignKey("utenti.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    autore = relationship("Utente", backref="contenuti")
