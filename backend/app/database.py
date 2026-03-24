from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://magazzino:magazzino@db:5432/magazzino"
)

# connect_args per PostgreSQL/psycopg2 con keepalives TCP e timeout di connessione
_connect_args = {
    "connect_timeout": 10,
    "keepalives": 1,
    "keepalives_idle": 30,
    "keepalives_interval": 10,
    "keepalives_count": 5,
}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # verifica la connessione prima di usarla
    pool_recycle=1800,         # ricicla le connessioni ogni 30 minuti
    pool_size=5,               # connessioni nel pool
    max_overflow=10,           # connessioni extra ammesse
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
