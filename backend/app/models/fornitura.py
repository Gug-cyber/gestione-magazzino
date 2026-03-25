import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class StatoFornitura(str, enum.Enum):
    bozza = "bozza"
    confermato = "confermato"
    spedito = "spedito"
    ricevuto = "ricevuto"
    annullato = "annullato"


class TipoVoceFornitura(str, enum.Enum):
    prodotto = "prodotto"
    packaging = "packaging"


class Fornitura(Base):
    __tablename__ = "forniture"

    id = Column(Integer, primary_key=True, index=True)
    numero_fornitura = Column(String, nullable=False, unique=True)
    fornitore_id = Column(Integer, ForeignKey("fornitori.id", ondelete="SET NULL"), nullable=True)
    fornitore_nome = Column(String, nullable=True)
    stato = Column(Enum(StatoFornitura), default=StatoFornitura.bozza, nullable=False)
    note = Column(String, nullable=True)
    data_fornitura = Column(DateTime(timezone=True), server_default=func.now())
    data_ricezione = Column(DateTime(timezone=True), nullable=True)
    totale = Column(Float, default=0.0)
    corriere = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True)
    # Flag: True quando lo stock e' gia' stato caricato per questa fornitura.
    # Impedisce doppi carichi in caso di aggiornamenti multipli di stato.
    stock_caricato = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    fornitore = relationship("Fornitore", backref="forniture")
    righe = relationship("RigaFornitura", back_populates="fornitura", cascade="all, delete-orphan")
    tracking_updates = relationship("TrackingUpdate", back_populates="fornitura")


class RigaFornitura(Base):
    __tablename__ = "righe_fornitura"

    id = Column(Integer, primary_key=True, index=True)
    fornitura_id = Column(Integer, ForeignKey("forniture.id"), nullable=False)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id"), nullable=True)
    tipo_voce = Column(String(20), default="prodotto", nullable=True)
    descrizione = Column(String(255), nullable=True)
    quantita = Column(Integer, nullable=False)
    prezzo_unitario = Column(Float, nullable=False)
    subtotale = Column(Float, nullable=False)

    fornitura = relationship("Fornitura", back_populates="righe")
    prodotto = relationship("Prodotto", backref="righe_fornitura")
