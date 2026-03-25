#!/usr/bin/env python3
"""
Script per eseguire le migration Alembic automaticamente durante il deploy.
Usato da Vercel build process.
"""
import os
import sys
from pathlib import Path

# Aggiungi la directory backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from alembic import command
from alembic.config import Config
from alembic.util.exc import CommandError
from sqlalchemy.exc import SQLAlchemyError


def run_migrations():
    """Esegue tutte le migration pending."""
    alembic_ini = backend_dir / "alembic.ini"

    if not alembic_ini.exists():
        print(f"❌ alembic.ini non trovato! Percorso atteso: {alembic_ini}")
        sys.exit(1)

    if not os.environ.get("DATABASE_URL"):
        print("❌ Variabile DATABASE_URL non configurata!")
        sys.exit(1)

    print("🔄 Esecuzione migration database...")

    # Configura Alembic
    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

    # Esegui migration
    try:
        command.upgrade(alembic_cfg, "head")
        print("✅ Migration completate con successo!")
    except SQLAlchemyError as e:
        print(f"❌ Errore di connessione/schema database: {e}")
        print("   Verifica che DATABASE_URL sia corretto e il database sia raggiungibile.")
        sys.exit(1)
    except CommandError as e:
        print(f"❌ Errore Alembic durante la migration: {e}")
        print("   Verifica che le migration siano consistenti con lo schema attuale.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Errore inatteso durante la migration: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run_migrations()
