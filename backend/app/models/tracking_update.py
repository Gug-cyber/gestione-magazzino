"""Modello per storico aggiornamenti tracking spedizioni."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class TrackingUpdate(Base):
    """Storico aggiornamenti tracking spedizioni."""
    __tablename__ = "tracking_updates"

    id = Column(Integer, primary_key=True, index=True)

    # Riferimento ordine o fornitura
    ordine_id = Column(Integer, ForeignKey("ordini.id", ondelete="SET NULL"), nullable=True)
    fornitura_id = Column(Integer, ForeignKey("forniture.id", ondelete="SET NULL"), nullable=True)

    # Dati tracking
    tracking_number = Column(String, index=True, nullable=False)
    corriere = Column(String, nullable=False)

    # Stato
    status = Column(String, nullable=True)
    status_date = Column(DateTime(timezone=True), nullable=True)
    location = Column(String, nullable=True)

    # Eventi (JSON serializzato)
    events = Column(Text, nullable=True)

    # Flags
    delivered = Column(Boolean, default=False)
    delivery_date = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    ordine = relationship("Ordine", back_populates="tracking_updates")
    fornitura = relationship("Fornitura", back_populates="tracking_updates")
