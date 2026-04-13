import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Aggiungi il percorso del backend al sys.path per importare i modelli
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importa i modelli e la Base per il supporto autogenerate
from app.database import Base  # noqa: E402
from app.models import (  # noqa: E402, F401
    prodotto,
    categoria,
    ubicazione,
    movimento,
    fornitore,
    fattura,
    cliente,
    ordine,
    utente,
    dato_storico,
    spesa_gestione,
    reset_token,
    banner,
    promozione,
    feature_flag,
    contenuto,
    prodotto_pubblico,
    footer_page,
    store_settings,
    dati_azienda,
    activity_log,
    analytics,
    warehouse_settings,
    fornitura,
    tracking_update,
    cardmarket_price,
)

target_metadata = Base.metadata

# Usa DATABASE_URL da variabile d'ambiente se disponibile
database_url = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))
# Render fornisce postgres:// ma SQLAlchemy 2.x richiede postgresql://
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
