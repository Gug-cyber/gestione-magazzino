import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class StatoOrdine(str, enum.Enum):
    bozza = "bozza"
    confermato = "confermato"
    spedito = "spedito"
    completato = "completato"
    annullato = "annullato"


class Ordine(Base):
    __tablename__ = "ordini"

    id = Column(Integer, primary_key=True, index=True)
    numero_ordine = Column(String, nullable=False, unique=True)
    cliente_id = Column(Integer, ForeignKey("clienti.id", ondelete="SET NULL"), nullable=True)
    cliente_nome = Column(String, nullable=True)
    stato = Column(Enum(StatoOrdine), default=StatoOrdine.bozza, nullable=False)
    note = Column(String, nullable=True)
    data_ordine = Column(DateTime(timezone=True), server_default=func.now())
    data_completamento = Column(DateTime(timezone=True), nullable=True)
    totale = Column(Float, default=0.0)
    corriere = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True)
    fornitore_id = Column(Integer, ForeignKey("fornitori.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", backref="ordini")
    fornitore = relationship("Fornitore", backref="ordini", foreign_keys=[fornitore_id])
    righe = relationship("RigaOrdine", back_populates="ordine", cascade="all, delete-orphan")


class RigaOrdine(Base):
    __tablename__ = "righe_ordine"

    id = Column(Integer, primary_key=True, index=True)
    ordine_id = Column(Integer, ForeignKey("ordini.id"), nullable=False)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id"), nullable=False)
    quantita = Column(Integer, nullable=False)
    prezzo_unitario = Column(Float, nullable=False)
    subtotale = Column(Float, nullable=False)

    ordine = relationship("Ordine", back_populates="righe")
    prodotto = relationship("Prodotto", backref="righe_ordine")
