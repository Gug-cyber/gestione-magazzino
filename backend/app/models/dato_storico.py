from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date
from sqlalchemy.sql import func
from ..database import Base


class DatoStorico(Base):
    __tablename__ = "dati_storici"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(10), nullable=False)   # "costo" o "ricavo"
    data = Column(Date, nullable=False)          # data della voce (supporta anni passati)
    importo = Column(Numeric(12, 2), nullable=False)
    descrizione = Column(String(300), nullable=True)
    categoria = Column(String(100), nullable=True)
    creato_il = Column(DateTime(timezone=True), server_default=func.now())
