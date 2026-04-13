from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class FooterPage(Base):
    __tablename__ = "footer_pages"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, nullable=False)
    titolo = Column(String(200), nullable=False)
    sezione = Column(String(50), nullable=False)
    contenuto = Column(Text, nullable=True)
    abilitato = Column(Boolean, default=True)
    ordine = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
