import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from .database import engine, Base, SessionLocal
from .routers import prodotti, categorie, movimenti, fornitori, ubicazioni
from .routers import auth
from .routers import spese_gestione, analisi, dati_storici, fatture, clienti
from .routers import ordini
from .routers import cardtrader
from .routers import forniture
from .routers import admin
from .routers import ebay
from .models import activity_log as _activity_log_model  # noqa: F401 – ensures activity_logs table is created
from .routers import activity_log as activity_log_router
from .models import dato_storico  # noqa: F401 – ensures dati_storici table is created
from .models import fattura as _fattura_model  # noqa: F401 – ensures fatture table is created
from .models import cliente as _cliente_model  # noqa: F401 – ensures clienti table is created
from .models import ordine as _ordine_model  # noqa: F401 – ensures ordini table is created
from .models import fornitura as _fornitura_model  # noqa: F401 – ensures forniture table is created
from .models import dati_azienda as _dati_azienda_model  # noqa: F401 – ensures dati_azienda table is created

load_dotenv()

# Controllo SECRET_KEY al boot
_SECRET_KEY = os.getenv("SECRET_KEY", "changeme-use-a-long-random-secret-key-in-production")
_DEFAULT_KEY = "changeme-use-a-long-random-secret-key-in-production"
_APP_ENV = os.getenv("APP_ENV", "production")

if _SECRET_KEY == _DEFAULT_KEY or len(_SECRET_KEY) < 32:
    if _APP_ENV == "production":
        print(
            "FATAL: SECRET_KEY non configurata o troppo corta. "
            "Imposta la variabile d'ambiente SECRET_KEY.",
            file=sys.stderr,
        )
        sys.exit(1)
    else:
        print(
            "WARNING: SECRET_KEY non sicura. Va bene solo in development.",
            file=sys.stderr,
        )

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestione Magazzino API",
    description="API per la gestione del magazzino",
    version="1.0.0",
)

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [o.strip() for o in allowed_origins_str.split(",") if o.strip()]

# When CORS_ALLOW_LAN=true, allow all origins so phones/tablets on the same
# Wi-Fi can reach the API. Note: allow_credentials must be False with allow_origins=["*"].
# This is fine because we use JWT in the Authorization header, not cookies.
allow_all_origins = os.getenv("CORS_ALLOW_LAN", "false").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allowed_origins,
    allow_credentials=False if allow_all_origins else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "fatture"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(activity_log_router.router, prefix="/api/activity-log", tags=["Activity Log"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(prodotti.router, prefix="/api/prodotti", tags=["Prodotti"])
app.include_router(categorie.router, prefix="/api/categorie", tags=["Categorie"])
app.include_router(movimenti.router, prefix="/api/movimenti", tags=["Movimenti"])
app.include_router(fornitori.router, prefix="/api/fornitori", tags=["Fornitori"])
app.include_router(ubicazioni.router, prefix="/api/ubicazioni", tags=["Ubicazioni"])
app.include_router(spese_gestione.router, prefix="/api/spese-gestione", tags=["Spese Gestione"])
app.include_router(analisi.router, prefix="/api/analisi", tags=["Analisi"])
app.include_router(dati_storici.router, prefix="/api/dati-storici", tags=["Dati Storici"])
app.include_router(fatture.router, prefix="/api/fatture", tags=["Fatture"])
app.include_router(clienti.router, prefix="/api/clienti", tags=["Clienti"])
app.include_router(ordini.router, prefix="/api/ordini", tags=["Ordini"])
app.include_router(cardtrader.router, prefix="/api/cardtrader", tags=["CardTrader"])
app.include_router(forniture.router, prefix="/api/forniture", tags=["Forniture"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(ebay.router, prefix="/api/ebay", tags=["eBay"])


@app.on_event("startup")
def startup():
    from .migrations import run_migrations
    run_migrations(engine)

    from .crud.utente import get_utenti, create_utente
    from .schemas.utente import UtenteCreate

    db = SessionLocal()
    try:
        if not get_utenti(db, skip=0, limit=1):
            admin = UtenteCreate(
                username="admin",
                email="admin@gestione-magazzino.local",
                password="admin123",
            )
            create_utente(db, admin, is_admin=True)
    finally:
        db.close()


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Gestione Magazzino API"}