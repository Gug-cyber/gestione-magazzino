"""Configurazione database SQLAlchemy."""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gestione_magazzino.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency per ottenere sessione DB."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Crea tutte le tabelle nel database se non esistono."""
    from app.models import cliente_account, ordine_ecommerce, preferito  # noqa
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except Exception as e:
        logger.warning(f"create_all warning (tabelle probabilmente già esistenti): {e}")
