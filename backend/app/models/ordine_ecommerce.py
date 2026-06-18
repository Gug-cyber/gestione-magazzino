"""Modello DB per ordini e-commerce."""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class StatoOrdine(str, enum.Enum):
    IN_ATTESA = "in_attesa"
    CONFERMATO = "confermato"
    SPEDITO = "spedito"
    CONSEGNATO = "consegnato"
    RESO_RICHIESTO = "reso_richiesto"
    RESO_APPROVATO = "reso_approvato"
    ANNULLATO = "annullato"


class OrdineEcommerce(Base):
    __tablename__ = "ordini_ecommerce"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti_account.id"), nullable=False)
    numero_ordine = Column(String(50), unique=True, index=True, nullable=False)
    stato = Column(String(30), default=StatoOrdine.IN_ATTESA)
    totale = Column(Float, nullable=False)
    indirizzo_spedizione = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    motivo_reso = Column(Text, nullable=True)
    data_ordine = Column(DateTime, default=datetime.utcnow)
    data_spedizione = Column(DateTime, nullable=True)
    data_consegna = Column(DateTime, nullable=True)
    data_richiesta_reso = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relazioni
    cliente = relationship("ClienteAccount", back_populates="ordini")
    items = relationship("ItemOrdine", back_populates="ordine", cascade="all, delete-orphan")


class ItemOrdine(Base):
    __tablename__ = "items_ordine"

    id = Column(Integer, primary_key=True, index=True)
    ordine_id = Column(Integer, ForeignKey("ordini_ecommerce.id"), nullable=False)
    prodotto_id = Column(Integer, nullable=False)
    nome_prodotto = Column(String(255), nullable=False)
    quantita = Column(Integer, default=1)
    prezzo_unitario = Column(Float, nullable=False)
    immagine_url = Column(String(500), nullable=True)

    # Relazioni
    ordine = relationship("OrdineEcommerce", back_populates="items")