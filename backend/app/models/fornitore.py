from sqlalchemy import Column, Integer, String, Text
from ..database import Base


class Fornitore(Base):
    __tablename__ = "fornitori"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    email = Column(String(150), nullable=True)
    telefono = Column(String(30), nullable=True)
    indirizzo = Column(String(255), nullable=True)
    partita_iva = Column(String(20), nullable=True)
    note = Column(Text, nullable=True)
