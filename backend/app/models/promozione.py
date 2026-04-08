from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Promozione(Base):
    __tablename__ = "promozioni"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    tipo = Column(String(20), nullable=False)  # "percentage" | "fixed"
    valore = Column(Numeric(10, 2), nullable=False)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id"), nullable=True)
    categoria_id = Column(Integer, ForeignKey("categorie.id"), nullable=True)
    data_inizio = Column(DateTime(timezone=True), nullable=True)
    data_fine = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    prodotto = relationship("Prodotto", foreign_keys=[prodotto_id])
    categoria = relationship("Categoria", foreign_keys=[categoria_id])
