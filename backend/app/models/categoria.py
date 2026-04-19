import json
from sqlalchemy import Boolean, Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class Categoria(Base):
    __tablename__ = "categorie"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    descrizione = Column(String(255), nullable=True)
    parent_id = Column(Integer, ForeignKey("categorie.id"), nullable=True, index=True)

    # Gerarchia
    slug = Column(String(200), nullable=True, index=True)
    level = Column(Integer, nullable=False, default=0)
    sort_order = Column(Integer, nullable=False, default=0, index=True)

    # Stato e visibilità
    is_active = Column(Boolean, nullable=False, default=True)
    show_in_store = Column(Boolean, nullable=False, default=True)
    show_in_warehouse = Column(Boolean, nullable=False, default=True)

    # Metadata JSON (raw text column)
    metadata_json = Column(Text, nullable=True)

    # Relazione padre → figli
    figli = relationship("Categoria", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Categoria", back_populates="figli", remote_side=[id])

    def get_metadata(self) -> dict:
        """Deserializza metadata_json come dict."""
        if self.metadata_json:
            try:
                return json.loads(self.metadata_json)
            except (ValueError, TypeError):
                return {}
        return {}

    def set_metadata(self, value: dict) -> None:
        """Serializza un dict in metadata_json."""
        self.metadata_json = json.dumps(value) if value else None
