import os
import sys
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.orm import Session
from .limiter import limiter
from .database import engine, Base, SessionLocal, get_db
from .routers import prodotti, categorie, movimenti, fornitori, ubicazioni
from .routers import auth
from .routers import spese_gestione, analisi, dati_storici, fatture, clienti
from .routers import ordini
from .routers import cardtrader
from .routers import forniture
from .routers import admin
from .routers import ebay
from .routers import cardmarket_scraper
from .routers import cms_sync
from .routers import tracking as tracking_router
from .routers.cms import contenuti as cms_contenuti, banner as cms_banner, prodotti as cms_prodotti
from .models import activity_log as _activity_log_model  # noqa: F401 – ensures activity_logs table is created
from .models import contenuto as _contenuto_model  # noqa: F401 – ensures contenuti table is created
from .models import banner as _banner_model  # noqa: F401 – ensures banner table is created
from .models import prodotto_pubblico as _prodotto_pubblico_model  # noqa: F401 – ensures prodotti_pubblici table is created
from .models import tracking_update as _tracking_update_model  # noqa: F401 – ensures tracking_updates table is created
from .models import cardmarket_price as _cardmarket_price_model  # noqa: F401 – ensures cardmarket_prices table is created
from .routers import activity_log as activity_log_router
from .routers import store as store_router
from .routers import control_panel as control_panel_router
from .routers import analytics as analytics_router
from .models import dato_storico  # noqa: F401 – ensures dati_storici table is created
from .models import fattura as _fattura_model  # noqa: F401 – ensures fatture table is created
from .models import cliente as _cliente_model  # noqa: F401 – ensures clienti table is created
from .models import ordine as _ordine_model  # noqa: F401 – ensures ordini table is created
from .models import fornitura as _fornitura_model  # noqa: F401 – ensures forniture table is created
from .models import dati_azienda as _dati_azienda_model  # noqa: F401 – ensures dati_azienda table is created
from .models import feature_flag as _feature_flag_model  # noqa: F401 – ensures feature_flags table is created
from .models import promozione as _promozione_model  # noqa: F401 – ensures promozioni table is created
from .models import warehouse_settings as _warehouse_settings_model  # noqa: F401 – ensures warehouse_settings table is created
from .models import analytics as _analytics_model  # noqa: F401 – ensures analytics_events table is created
from .models import footer_page as _footer_page_model  # noqa: F401 – ensures footer_pages table is created
from .models import ebay_connection as _ebay_connection_model  # noqa: F401 – ensures ebay_connections table is created
from .models import ebay_listing as _ebay_listing_model  # noqa: F401 – ensures ebay_listings table is created
from .models import ebay_sale as _ebay_sale_model  # noqa: F401 – ensures ebay_sales table is created

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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,https://gestione-magazzino-blush.vercel.app")
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
app.include_router(cardmarket_scraper.router, prefix="/api/cardmarket-scraper", tags=["CardMarket Scraper"])
app.include_router(cms_sync.router, prefix="/api/cms", tags=["CMS Sync"])
app.include_router(tracking_router.router, prefix="/api/tracking", tags=["Tracking"])
app.include_router(cms_contenuti.router, prefix="/api/cms", tags=["CMS - Contenuti"])
app.include_router(cms_banner.router, prefix="/api/cms", tags=["CMS - Banner"])
app.include_router(cms_prodotti.router, prefix="/api/cms", tags=["CMS - Prodotti"])
app.include_router(store_router.router, prefix="/api/store", tags=["Store Pubblico"])
app.include_router(control_panel_router.router, prefix="/api/control-panel", tags=["Control Panel"])
app.include_router(analytics_router.router, prefix="/api/analytics", tags=["Analytics"])


@app.on_event("startup")
def startup():
    from .migrations import run_migrations
    run_migrations(engine)

    from .crud.utente import get_utenti, create_utente
    from .schemas.utente import UtenteCreate
    import secrets
    import string

    db = SessionLocal()
    try:
        if not get_utenti(db, skip=0, limit=1):
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            random_password = ''.join(secrets.choice(alphabet) for _ in range(16))
            admin = UtenteCreate(
                username="admin",
                email="admin@gestione-magazzino.local",
                password=random_password,
            )
            db_admin = create_utente(db, admin, is_admin=True)
            db_admin.must_change_password = True
            db.commit()
            print(
                f"\n{'='*60}\n"
                f"ADMIN ACCOUNT CREATED\n"
                f"Username : admin\n"
                f"Password : {random_password}\n"
                f"⚠️  Change this password immediately after first login!\n"
                f"{'='*60}\n",
                file=sys.stderr,
            )
    finally:
        db.close()

    db2 = SessionLocal()
    try:
        from .crud.feature_flag import seed_default_flags
        seed_default_flags(db2)
    finally:
        db2.close()

    db3 = SessionLocal()
    try:
        from .crud.footer_page import seed_default_pages
        seed_default_pages(db3)
    finally:
        db3.close()


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def health_db(db: Session = Depends(get_db)):
    """Check database connectivity by executing a simple SELECT 1 query.

    Returns 200 with ``{"status": "ok", "database": "connected"}`` on success,
    or 503 with an error payload if the database is unreachable.
    """
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "unreachable"},
        )


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Gestione Magazzino API"}
