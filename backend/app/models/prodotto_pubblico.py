from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from ..database import Base


class ProdottoPubblico(Base):
    """
    Configurazione prodotti per catalogo e-commerce pubblico.
    Estende le informazioni dei prodotti del magazzino con dati per lo shop.
    """
    __tablename__ = "prodotti_pubblici"

    id = Column(Integer, primary_key=True, index=True)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id"), unique=True, nullable=False)
    visibile = Column(Boolean, default=True)
    in_evidenza = Column(Boolean, default=False)
    ordine = Column(Integer, default=0)
    descrizione_estesa = Column(Text, nullable=True)
    immagini = Column(JSON, nullable=True)  # Array di URL immagini: ["url1", "url2"]
    seo_title = Column(String(200), nullable=True)
    seo_description = Column(String(300), nullable=True)

    prodotto = relationship("Prodotto", backref="configurazione_pubblica")
