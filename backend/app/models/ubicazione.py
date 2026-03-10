from sqlalchemy import Column, Integer, String
from ..database import Base


class Ubicazione(Base):
    __tablename__ = "ubicazioni"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    zona = Column(String(50), nullable=True)
    scaffale = Column(String(50), nullable=True)
    piano = Column(Integer, nullable=True)
