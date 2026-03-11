import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from .database import engine, Base, SessionLocal
from .routers import prodotti, categorie, movimenti, fornitori, ubicazioni
from .routers import auth
from .routers import spese_gestione, analisi, dati_storici
from .models import dato_storico  # noqa: F401 – ensures dati_storici table is created

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestione Magazzino API",
    description="API per la gestione del magazzino",
    version="1.0.0",
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("/app/uploads", exist_ok=True)
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