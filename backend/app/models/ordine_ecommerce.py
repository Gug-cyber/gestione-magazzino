import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class StatoOrdineEcommerce(str, enum.Enum):
    in_attesa = "in_attesa"
    confermato = "confermato"
    in_lavorazione = "in_lavorazione"
    spedito = "spedito"
    consegnato = "consegnato"
    annullato = "annullato"
    reso_richiesto = "reso_richiesto"
    reso_approvato = "reso_approvato"
    reso_completato = "reso_completato"
    rimborsato = "rimborsato"


class OrdineEcommerce(Base):
    """Ordini effettuati dai clienti sull'e-commerce"""
    __tablename__ = "ordini_ecommerce"

    id = Column(Integer, primary_key=True, index=True)
    numero_ordine = Column(String, unique=True, nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti_account.id"), nullable=False)
    stato = Column(Enum(StatoOrdineEcommerce), default=StatoOrdineEcommerce.in_attesa, nullable=False)
    totale = Column(Float, default=0.0)
    subtotale = Column(Float, default=0.0)
    spese_spedizione = Column(Float, default=0.0)
    metodo_pagamento = Column(String, nullable=True)
    
    # Indirizzo di spedizione (copiato al momento dell'ordine)
    indirizzo_spedizione = Column(Text, nullable=True)
    
    # Tracking
    corriere = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True)
    
    # Date
    data_ordine = Column(DateTime(timezone=True), server_default=func.now())
    data_spedizione = Column(DateTime(timezone=True), nullable=True)
    data_consegna = Column(DateTime(timezone=True), nullable=True)
    
    # Reso
    reso_richiesto_il = Column(DateTime(timezone=True), nullable=True)
    reso_motivo = Column(Text, nullable=True)
    
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    cliente = relationship("ClienteAccount", backref="ordini")
    righe = relationship("RigaOrdineEcommerce", back_populates="ordine", cascade="all, delete-orphan")


class RigaOrdineEcommerce(Base):
    __tablename__ = "righe_ordine_ecommerce"

    id = Column(Integer, primary_key=True, index=True)
    ordine_id = Column(Integer, ForeignKey("ordini_ecommerce.id"), nullable=False)
    prodotto_id = Column(Integer, nullable=True)
    nome_prodotto = Column(String, nullable=False)
    immagine_url = Column(String, nullable=True)
    quantita = Column(Integer, nullable=False, default=1)
    prezzo_unitario = Column(Float, nullable=False)
    subtotale = Column(Float, nullable=False)

    ordine = relationship("OrdineEcommerce", back_populates="righe")


class Preferito(Base):
    """Prodotti preferiti/wishlist del cliente"""
    __tablename__ = "preferiti"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti_account.id"), nullable=False)
    prodotto_id = Column(Integer, nullable=False)
    nome_prodotto = Column(String, nullable=True)
    immagine_url = Column(String, nullable=True)
    prezzo = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cliente = relationship("ClienteAccount", backref="preferiti")
