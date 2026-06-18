"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_tables
from app.routers.clienti_auth import router as clienti_router

app = FastAPI(
    title="Gestione Magazzino API",
    description="API per gestione magazzino e area privata clienti e-commerce",
    version="2.0.0"
)

# CORS - permetti frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Includi router
app.include_router(clienti_router)


@app.on_event("startup")
def on_startup():
    """Crea tabelle all'avvio."""
    create_tables()


@app.get("/")
def root():
    return {"message": "Gestione Magazzino API v2.0", "status": "online"}


@app.get("/health")
def health():
    return {"status": "healthy"}