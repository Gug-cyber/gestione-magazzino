from sqlalchemy import text
import logging
import re

logger = logging.getLogger(__name__)

# Allowed identifier pattern: only letters, digits, and underscores
_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
# Allowed column definition pattern: word chars, spaces, and parentheses (e.g. VARCHAR(50))
_DEFINITION_RE = re.compile(r"^[A-Za-z0-9_\s()]+$")

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
        "definition": "TEXT",
    },
    {
        "table": "prodotti",
        "column": "lingua",
        "definition": "VARCHAR(50)",
    },
    {
        "table": "prodotti",
        "column": "foto_path",
        "definition": "VARCHAR(255)",
    },
    {
        "table": "fatture",
        "column": "cliente_id",
        "definition": "INTEGER REFERENCES clienti(id) ON DELETE SET NULL",
    },
    {
        "table": "fatture",
        "column": "tipo_documento",
        "definition": "VARCHAR",
    },
    {
        "table": "fatture",
        "column": "imponibile",
        "definition": "FLOAT",
    },
    {
        "table": "fatture",
        "column": "aliquota_iva",
        "definition": "FLOAT",
    },
    {
        "table": "fatture",
        "column": "importo_iva",
        "definition": "FLOAT",
    },
    {
        "table": "fatture",
        "column": "ordine_id",
        "definition": "INTEGER REFERENCES ordini(id) ON DELETE SET NULL",
    },
    {
        "table": "fatture",
        "column": "nota_credito_di",
        "definition": "INTEGER REFERENCES fatture(id) ON DELETE SET NULL",
    },
    {
        "table": "fatture",
        "column": "annullata",
        "definition": "BOOLEAN DEFAULT FALSE",
    },
    {
        "table": "fatture",
        "column": "auto_generata",
        "definition": "BOOLEAN DEFAULT FALSE",
    },
]


def _validate_identifier(value: str, kind: str) -> None:
    """Raises ValueError if value is not a safe SQL identifier."""
    if not _IDENTIFIER_RE.match(value):
        raise ValueError(f"Unsafe SQL {kind}: {value!r}")


def _validate_definition(value: str) -> None:
    """Raises ValueError if value is not a safe column type definition."""
    if not _DEFINITION_RE.match(value):
        raise ValueError(f"Unsafe column definition: {value!r}")


def _column_exists_sqlite(conn, table: str, column: str) -> bool:
    """Controlla se una colonna esiste in una tabella SQLite tramite PRAGMA."""
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result)


def run_migrations(engine):
    """
    Aggiunge colonne mancanti al DB in modo idempotente all'avvio.
    Supporta PostgreSQL (usa IF NOT EXISTS) e SQLite (usa PRAGMA table_info).
    Non fa crashare l'app se una migrazione fallisce — logga l'errore e continua.
    """
    is_sqlite = engine.dialect.name == "sqlite"

    with engine.connect() as conn:
        for m in COLUMN_MIGRATIONS:
            table = m["table"]
            column = m["column"]
            definition = m["definition"]
            try:
                _validate_identifier(table, "table name")
                _validate_identifier(column, "column name")
                _validate_definition(definition)
                if is_sqlite:
                    if _column_exists_sqlite(conn, table, column):
                        logger.info(
                            f"[migration] colonna {column} già presente in {table}, skip"
                        )
                        continue
                    conn.execute(
                        text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                    )
                else:
                    conn.execute(
                        text(
                            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}"
                        )
                    )
                conn.commit()
                logger.info(f"[migration] aggiunta colonna {column} a {table}")
            except Exception as e:
                logger.warning(f"[migration] errore su {table}.{column}: {e}")
                conn.rollback()