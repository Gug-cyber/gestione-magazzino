import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .database import engine, Base
from .routers import prodotti, categorie, movimenti, fornitori, ubicazioni

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

app.include_router(prodotti.router, prefix="/api/prodotti", tags=["Prodotti"])
app.include_router(categorie.router, prefix="/api/categorie", tags=["Categorie"])
app.include_router(movimenti.router, prefix="/api/movimenti", tags=["Movimenti"])
app.include_router(fornitori.router, prefix="/api/fornitori", tags=["Fornitori"])
app.include_router(ubicazioni.router, prefix="/api/ubicazioni", tags=["Ubicazioni"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Gestione Magazzino API"}
