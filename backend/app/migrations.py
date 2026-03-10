from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

# Lista di tutte le colonne da aggiungere/garantire nel DB
# Aggiungi qui ogni nuova colonna futura — viene applicata solo se mancante
COLUMN_MIGRATIONS = [
    {
        "table": "prodotti",
        "column": "stato_conservazione",
        "definition": "VARCHAR(50)",
    },
    {
        "table": "fornitori",
        "column": "note",
        "definition": "VARCHAR(1000)",
    },
]

def run_column_migrations(engine):
    """
    Aggiunge colonne mancanti al DB in modo idempotente all'avvio.
    Usa ALTER TABLE ... ADD COLUMN IF NOT EXISTS, quindi è sicuro
    eseguirlo ogni volta — non tocca colonne o dati già esistenti.
    """
    with engine.connect() as conn:
        for m in COLUMN_MIGRATIONS:
            try:
                conn.execute(text(
                    f"ALTER TABLE {m['table']} "
                    f"ADD COLUMN IF NOT EXISTS {m['column']} {m['definition']}"
                ))
                conn.commit()
                logger.info(f"Migration OK: {m['table']}.{m['column']}")
            except Exception as e:
                logger.warning(f"Migration skipped {m['table']}.{m['column']}: {e}")
                conn.rollback()