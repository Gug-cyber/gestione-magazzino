from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class Categoria(Base):
    __tablename__ = "categorie"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    descrizione = Column(String(255), nullable=True)
    parent_id = Column(Integer, ForeignKey("categorie.id"), nullable=True, index=True)

    # Relazione padre → figli
    figli = relationship("Categoria", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Categoria", back_populates="figli", remote_side=[id])
