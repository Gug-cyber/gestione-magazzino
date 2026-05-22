from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Prodotto(Base):
    __tablename__ = "prodotti"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    descrizione = Column(String(500), nullable=True)
    sku = Column(String(100), nullable=False, unique=True)
    quantita = Column(Integer, nullable=False, default=0)
    quantita_minima = Column(Integer, nullable=False, default=0)
    prezzo_acquisto = Column(Numeric(10, 2), nullable=True)
    prezzo_vendita = Column(Numeric(10, 2), nullable=True)
    categoria_id = Column(Integer, ForeignKey("categorie.id"), nullable=True)
    ubicazione_id = Column(Integer, ForeignKey("ubicazioni.id"), nullable=True)
    stato_conservazione = Column(String(50), nullable=True)
    lingua = Column(String(50), nullable=True)
    foto_path = Column(String(255), nullable=True)
    foto_aggiuntive = Column(JSON, nullable=True)
    su_vinted = Column(Boolean, nullable=False, default=False)
    su_wallapop = Column(Boolean, nullable=False, default=False)
    non_vendibile = Column(Boolean, nullable=False, default=False)
    barcode = Column(String(100), nullable=True, index=True, unique=True)
    barcode_generated_at = Column(DateTime(timezone=True), nullable=True)
    cardtrader_blueprint_id = Column(Integer, nullable=True)
    google_drive_folder_id = Column(String(255), nullable=True)
    # Timestamp impostato automaticamente quando la quantità scende a zero (per via di un ordine/vendita).
    # Usato per la cancellazione automatica dopo 10 giorni se il prodotto è collegato a un ordine.
    data_scarico = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    categoria = relationship("Categoria", backref="prodotti")
    ubicazione = relationship("Ubicazione", backref="prodotti")
    manual_listings = relationship("ManualListing", back_populates="product", cascade="all, delete-orphan")
