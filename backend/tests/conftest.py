"""
Configurazione fixtures per i test pytest.

Usa SQLite in-memory per isolare i test dal database di produzione.
"""
import os
import pytest

# Queste variabili devono essere impostate PRIMA di importare qualsiasi modulo dell'app
os.environ["APP_ENV"] = "development"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-must-be-long-enough-123456"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("UPLOAD_DIR", "/tmp/gestione_magazzino_test_uploads")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

# Importa database prima di app per poter patchare l'engine
import app.database as _db_module  # noqa: E402

SQLALCHEMY_TEST_URL = "sqlite:///:memory:"

# Crea un engine SQLite persistente per la sessione di test
# (same connection string ma con StaticPool per avere un'unica connessione in-memory)
from sqlalchemy.pool import StaticPool  # noqa: E402

engine_test = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

# Sostituisce l'engine dell'app con quello di test
_db_module.engine = engine_test
_db_module.SessionLocal = TestingSessionLocal

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.crud.utente import create_utente  # noqa: E402
from app.schemas.utente import UtenteCreate  # noqa: E402


@pytest.fixture(scope="function")
def db():
    """Fixture che crea tutte le tabelle in-memory e le elimina dopo il test."""
    Base.metadata.create_all(bind=engine_test)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(scope="function")
def client(db):
    """Fixture che crea un TestClient FastAPI con il database in-memory."""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def utente_admin(db):
    """Fixture che crea un utente admin di test."""
    utente = create_utente(
        db,
        UtenteCreate(
            username="admin_test",
            email="admin_test@example.com",
            password="AdminPassword123",
        ),
        is_admin=True,
    )
    return utente


@pytest.fixture(scope="function")
def auth_headers(client, utente_admin):
    """Fixture che restituisce gli header di autenticazione per l'utente admin."""
    response = client.post(
        "/api/auth/login",
        data={"username": utente_admin.username, "password": "AdminPassword123"},
    )
    assert response.status_code == 200, f"Login fallito: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}



@pytest.fixture(scope="function")
def db():
    """Fixture che crea tutte le tabelle in-memory e le elimina dopo il test."""
    Base.metadata.create_all(bind=engine_test)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(scope="function")
def client(db):
    """Fixture che crea un TestClient FastAPI con il database in-memory."""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def utente_admin(db):
    """Fixture che crea un utente admin di test."""
    utente = create_utente(
        db,
        UtenteCreate(
            username="admin_test",
            email="admin_test@example.com",
            password="AdminPassword123",
        ),
        is_admin=True,
    )
    return utente


@pytest.fixture(scope="function")
def auth_headers(client, utente_admin):
    """Fixture che restituisce gli header di autenticazione per l'utente admin."""
    response = client.post(
        "/api/auth/login",
        data={"username": utente_admin.username, "password": "AdminPassword123"},
    )
    assert response.status_code == 200, f"Login fallito: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
