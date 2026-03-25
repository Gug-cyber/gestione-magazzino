from sqlalchemy import Column, Integer, Numeric, ForeignKey, String, DateTime
from sqlalchemy.sql import func
from ..database import Base


class CardMarketPrice(Base):
    __tablename__ = "cardmarket_prices"

    id = Column(Integer, primary_key=True, index=True)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id", ondelete="CASCADE"), nullable=False, index=True)
    prezzo_minimo = Column(Numeric(10, 2), nullable=True)
    prezzo_medio = Column(Numeric(10, 2), nullable=True)
    url_cardmarket = Column(String(500), nullable=True)
    data_aggiornamento = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
