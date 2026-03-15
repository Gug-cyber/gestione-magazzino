from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum


class TipoFattura(str, enum.Enum):
    attiva = "attiva"
    passiva = "passiva"


class Fattura(Base):
    __tablename__ = "fatture"

    id = Column(Integer, primary_key=True, index=True)
    numero_fattura = Column(String, nullable=False)
    data_fattura = Column(Date, nullable=False)
    cliente = Column(String, nullable=False)
    importo = Column(Float, nullable=False)
    tipo = Column(Enum(TipoFattura), nullable=False)
    pagata = Column(Boolean, default=False)
    note = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    nome_file = Column(String, nullable=True)
    cliente_id = Column(Integer, ForeignKey("clienti.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Campi per la fatturazione automatica (normativa italiana)
    tipo_documento = Column(String, nullable=False, default="fattura")  # "fattura" | "nota_credito"
    imponibile = Column(Float, nullable=True)
    aliquota_iva = Column(Float, nullable=True)
    importo_iva = Column(Float, nullable=True)
    ordine_id = Column(Integer, ForeignKey("ordini.id", ondelete="SET NULL"), nullable=True)
    nota_credito_di = Column(Integer, ForeignKey("fatture.id", ondelete="SET NULL"), nullable=True)
    annullata = Column(Boolean, default=False)
    auto_generata = Column(Boolean, default=False)

    # Dati emittente (snapshot al momento della generazione — normativa italiana)
    # Denormalizzati: la fattura rimane immutabile anche se i dati azienda cambiano
    emittente_ragione_sociale = Column(String(255), nullable=True)
    emittente_partita_iva = Column(String(20), nullable=True)
    emittente_codice_fiscale = Column(String(20), nullable=True)
    emittente_indirizzo = Column(String(255), nullable=True)
    emittente_citta = Column(String(100), nullable=True)
    emittente_cap = Column(String(10), nullable=True)
    emittente_provincia = Column(String(2), nullable=True)
    emittente_nazione = Column(String(100), nullable=True)
    emittente_pec = Column(String(255), nullable=True)
    emittente_codice_sdi = Column(String(10), nullable=True)
    emittente_iban = Column(String(50), nullable=True)

    # foreign_keys= espliciti per evitare AmbiguousForeignKeysError (f405)
    ordine = relationship("Ordine", foreign_keys=[ordine_id], backref="fatture")
    # self-referential: nota di credito punta alla fattura originale
    fattura_originale = relationship("Fattura", foreign_keys=[nota_credito_di], remote_side=[id], backref="note_credito")
