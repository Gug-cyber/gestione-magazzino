from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Enum, ForeignKey
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
