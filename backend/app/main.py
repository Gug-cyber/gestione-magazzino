import os
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
from .models import dato_storico  # noqa: F401 – ensures dati_storici table is created
from .models import fattura as _fattura_model  # noqa: F401 – ensures fatture table is created
from .models import cliente as _cliente_model  # noqa: F401 – ensures clienti table is created
from .models import ordine as _ordine_model  # noqa: F401 – ensures ordini table is created

load_dotenv()

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

os.makedirs("/app/uploads", exist_ok=True)
os.makedirs(os.path.join(os.getenv("UPLOAD_DIR", "/app/uploads"), "fatture"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

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