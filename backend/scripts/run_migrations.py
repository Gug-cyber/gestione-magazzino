#!/usr/bin/env python3
"""
Script per eseguire le migration Alembic automaticamente durante il deploy.
Compatibile con uv (Vercel environment).
"""
import os
import sys
import subprocess
from pathlib import Path

# Aggiungi la directory backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def run_migrations():
    """Esegue tutte le migration pending."""
    alembic_ini = backend_dir / "alembic.ini"

    if not alembic_ini.exists():
        print("❌ alembic.ini non trovato!")
        sys.exit(1)

    print("🔄 Esecuzione migration database...")
    print(f"📂 Working directory: {os.getcwd()}")
    print(f"🐍 Python: {sys.executable}")

    # Verifica DATABASE_URL
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL non configurata!")
        sys.exit(1)
    print("✅ DATABASE_URL configurata")

    # Importa solo dopo aver configurato il path
    try:
        from alembic import command
        from alembic.config import Config
    except ImportError as e:
        print(f"❌ Errore import Alembic: {e}")
        print("🔧 Tento installazione con uv...")
        subprocess.run(["uv", "pip", "install", "alembic"], check=True)
        from alembic import command
        from alembic.config import Config

    # Configura Alembic
    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

    # Esegui migration
    try:
        command.upgrade(alembic_cfg, "head")
        print("✅ Migration completate con successo!")
    except Exception as e:
        print(f"❌ Errore durante la migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_migrations()
