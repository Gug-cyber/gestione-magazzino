from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class PrezzoStorico(Base):
    __tablename__ = "prezzi_storici"

    id = Column(Integer, primary_key=True, index=True)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id", ondelete="CASCADE"), nullable=False, index=True)
    fonte = Column(String(20), nullable=False)  # 'ebay' or 'cardmarket'
    prezzo_minimo = Column(Float, nullable=True)
    prezzo_medio = Column(Float, nullable=True)
    prezzo_venduto = Column(Float, nullable=True)
    numero_risultati = Column(Integer, nullable=True)
    rilevato_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    prodotto = relationship("Prodotto", backref="prezzi_storici")
