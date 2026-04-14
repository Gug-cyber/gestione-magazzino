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
    {
        "table": "ordini",
        "column": "corriere",
        "definition": "VARCHAR",
    },
    {
        "table": "ordini",
        "column": "tracking_number",
        "definition": "VARCHAR",
    },
    {
        "table": "ordini",
        "column": "stock_scalato",
        "definition": "BOOLEAN DEFAULT TRUE",
    },
    {
        "table": "forniture",
        "column": "corriere",
        "definition": "VARCHAR",
    },
    {
        "table": "forniture",
        "column": "tracking_number",
        "definition": "VARCHAR",
    },
    {
        "table": "forniture",
        "column": "stock_caricato",
        "definition": "BOOLEAN DEFAULT FALSE",
    },
    {
        "table": "utenti",
        "column": "ruolo",
        "definition": "VARCHAR(20) DEFAULT 'operatore'",
    },
    {
        "table": "righe_fornitura",
        "column": "tipo_voce",
        "definition": "VARCHAR(20)",
    },
    {
        "table": "righe_fornitura",
        "column": "descrizione",
        "definition": "VARCHAR(255)",
    },
    {
        "table": "spese_gestione",
        "column": "categoria",
        "definition": "VARCHAR(100)",
    },
    {
        "table": "spese_gestione",
        "column": "fornitura_id",
        "definition": "INTEGER",
    },
    {
        "table": "prodotti",
        "column": "barcode",
        "definition": "VARCHAR(100)",
    },
    {
        "table": "prodotti",
        "column": "barcode_generated_at",
        "definition": "TIMESTAMP WITH TIME ZONE",
    },
    {
        "table": "prodotti",
        "column": "cardtrader_blueprint_id",
        "definition": "INTEGER",
    },
    {
        "table": "utenti",
        "column": "must_change_password",
        "definition": "BOOLEAN DEFAULT FALSE",
    },
    {
        "table": "banner",
        "column": "posizione",
        "definition": "VARCHAR(50) DEFAULT 'top'",
    },
    {
        "table": "promozioni",
        "column": "prodotto_id",
        "definition": "INTEGER",
    },
    {
        "table": "promozioni",
        "column": "categoria_id",
        "definition": "INTEGER",
    },
]

# SQL statements to run after column migrations (idempotent)
POST_COLUMN_SQL = [
    # Set ruolo='admin' for all users with is_admin=TRUE
    "UPDATE utenti SET ruolo = 'admin' WHERE is_admin = TRUE AND ruolo != 'admin'",
    # Ensure all other users have a non-null ruolo
    "UPDATE utenti SET ruolo = 'operatore' WHERE ruolo IS NULL",
    # Backfill stock_scalato: ordini attivi hanno gia' lo stock scalato
    "UPDATE ordini SET stock_scalato = TRUE WHERE stock_scalato IS NULL AND stato != 'annullato'",
    "UPDATE ordini SET stock_scalato = FALSE WHERE stock_scalato IS NULL AND stato = 'annullato'",
    # Nuova logica: stock scalato solo al completamento.
    # Gli ordini in bozza creati con la vecchia logica (stock scalato alla creazione)
    # vengono resettati per essere coerenti con il nuovo comportamento.
    "UPDATE ordini SET stock_scalato = FALSE WHERE stato = 'bozza' AND stock_scalato = TRUE",
    # Forniture ricevute esistenti: segna stock_caricato = TRUE
    "UPDATE forniture SET stock_caricato = TRUE WHERE stato = 'ricevuto' AND (stock_caricato IS NULL OR stock_caricato = FALSE)",
    # Backfill tipo_voce per righe fornitura esistenti
    "UPDATE righe_fornitura SET tipo_voce = 'prodotto' WHERE tipo_voce IS NULL",
    # Unique index for barcode (partial: only non-null values)
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_prodotti_barcode ON prodotti(barcode) WHERE barcode IS NOT NULL",
    # Backfill posizione for existing banners
    "UPDATE banner SET posizione = 'top' WHERE posizione IS NULL",
    "UPDATE banner SET posizione = 'top' WHERE posizione IS NULL",
    # Unique index per ebay_order_id (idempotenza vendite)
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_ebay_sales_order_id ON ebay_sales(ebay_order_id)",
    # Unique index per prodotto/connessione su listings attivi
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_ebay_listings_product_active ON ebay_listings(product_id, connection_id) WHERE status = 'active'",
] 


def _validate_identifier(value: str, kind: str) -> None:
    if not _IDENTIFIER_RE.match(value):
        raise ValueError(f"Invalid {kind} identifier: {value!r}")


def _validate_definition(value: str) -> None:
    base = re.split(r"\bREFERENCES\b", value, flags=re.IGNORECASE)[0].strip()
    if not _DEFINITION_RE.match(base):
        raise ValueError(f"Invalid column definition: {value!r}")


def run_column_migrations(db) -> None:
    for migration in COLUMN_MIGRATIONS:
        table = migration["table"]
        column = migration["column"]
        definition = migration["definition"]
        try:
            _validate_identifier(table, "table")
            _validate_identifier(column, "column")
            _validate_definition(definition)
        except ValueError as exc:
            logger.error("Skipping unsafe migration: %s", exc)
            continue
        try:
            db.execute(
                text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}"
                )
            )
            db.commit()
            logger.info("Migration applied (or already present): %s.%s", table, column)
        except Exception as exc:
            db.rollback()
            logger.warning("Migration failed for %s.%s: %s", table, column, exc)

    for sql in POST_COLUMN_SQL:
        try:
            db.execute(text(sql))
            db.commit()
            logger.info("Post-column SQL applied: %s", sql[:80])
        except Exception as exc:
            db.rollback()
            logger.warning("Post-column SQL failed: %s — %s", sql[:80], exc)


ENUM_MIGRATIONS = [
    ("statoordine", "reso"),
    ("tipomovimento", "vendita_ebay"),
]


def run_enum_migrations(engine) -> None:
    """Aggiunge valori mancanti agli enum Postgres. Deve girare fuori transazione (AUTOCOMMIT)."""
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for enum_type, value in ENUM_MIGRATIONS:
            try:
                _validate_identifier(enum_type, "enum type")
                _validate_identifier(value, "enum value")
            except ValueError as exc:
                logger.error("Skipping unsafe enum migration: %s", exc)
                continue
            try:
                conn.execute(text(f"ALTER TYPE {enum_type} ADD VALUE IF NOT EXISTS '{value}'"))
                logger.info("Enum migration applied: %s += '%s'", enum_type, value)
            except Exception as exc:
                logger.warning("Enum migration skipped for %s.%s: %s", enum_type, value, exc)


def run_migrations(engine) -> None:
    """
    Entry point chiamato da main.py al startup.
    Accetta un SQLAlchemy Engine, apre una sessione e applica tutte le migrazioni.
    """
    run_enum_migrations(engine)   # PRIMA, fuori transazione
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        run_column_migrations(db)
        run_nullable_migrations(db)
    finally:
        db.close()


def run_nullable_migrations(db) -> None:
    """Rimuove eventuali vincoli NOT NULL da colonne che devono diventare nullable."""
    from sqlalchemy.exc import OperationalError, ProgrammingError
    try:
        db.execute(text("ALTER TABLE righe_fornitura ALTER COLUMN prodotto_id DROP NOT NULL"))
        db.commit()
        logger.info("Nullable migration applied: righe_fornitura.prodotto_id")
    except (OperationalError, ProgrammingError) as exc:
        db.rollback()
        logger.info("Nullable migration skipped (already nullable or not applicable): %s", exc)
