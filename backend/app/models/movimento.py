import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class TipoMovimento(str, enum.Enum):
    carico = "carico"
    scarico = "scarico"
    vendita_ebay = "vendita_ebay"


class Movimento(Base):
    __tablename__ = "movimenti"

    id = Column(Integer, primary_key=True, index=True)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id", ondelete="SET NULL"), nullable=True)
    tipo = Column(Enum(TipoMovimento), nullable=False)
    quantita = Column(Integer, nullable=False)
    note = Column(String(500), nullable=True)
    data_movimento = Column(DateTime(timezone=True), server_default=func.now())
    fornitore_id = Column(Integer, ForeignKey("fornitori.id"), nullable=True)
    ordine_id = Column(Integer, ForeignKey("ordini.id", ondelete="SET NULL"), nullable=True)

    prodotto = relationship("Prodotto", backref="movimenti")
    fornitore = relationship("Fornitore", backref="movimenti")
    ordine = relationship("Ordine", backref="movimenti")

    __table_args__ = (
        Index("ix_movimenti_prodotto_data", "prodotto_id", "data_movimento"),
    )
